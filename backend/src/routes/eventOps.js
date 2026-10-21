// PHÂN HỆ HẬU CẦN THIẾT BỊ (LOGISTICS / PACKING LIST) & NGÂN SÁCH SỰ KIỆN (P&L / NHÀ CUNG CẤP)
const { num } = require('./eventHelpers');

const LOGI_STATUSES = ['planned', 'checked_out', 'onsite', 'returned', 'issue'];
const PAY_STATUSES = ['unpaid', 'deposit', 'paid'];

module.exports = (app, ctx) => {
  const { dbAll, dbGet, dbRun, authenticateToken, helpers } = ctx;
  const { canAccessProject, canManageProject, canAccessBudget } = helpers;

  // ================= HẬU CẦN / THIẾT BỊ =================
  const listLogistics = (projectId) => dbAll(
    `SELECT * FROM event_logistics WHERE project_id = ? ORDER BY category ASC, id ASC`, [projectId]
  );

  app.get('/api/projects/:id/logistics', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessProject(req.user, req.params.id))) return res.status(403).json({ error: 'Không có quyền xem hậu cần dự án này' });
      res.json(await listLogistics(req.params.id));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/projects/:id/logistics', authenticateToken, async (req, res) => {
    const projectId = req.params.id;
    try {
      if (!(await canAccessProject(req.user, projectId))) return res.status(403).json({ error: 'Không có quyền' });
      const b = req.body || {};
      if (!b.item_name || !b.item_name.trim()) return res.status(400).json({ error: 'Tên thiết bị / vật tư là bắt buộc' });
      await dbRun(
        `INSERT INTO event_logistics (project_id, item_name, category, quantity, unit, pic_id, pic_name, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'planned', ?)`,
        [projectId, b.item_name.trim(), b.category || 'Thiết bị AV', num(b.quantity) || 1, b.unit || 'Cái', b.pic_id || null, b.pic_name || '', b.notes || '']
      );
      res.status(201).json(await listLogistics(projectId));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Mọi thành viên dự án được cập nhật trạng thái (xuất kho / tại sự kiện / thu hồi / sự cố)
  app.put('/api/logistics/:itemId', authenticateToken, async (req, res) => {
    try {
      const item = await dbGet(`SELECT * FROM event_logistics WHERE id = ?`, [req.params.itemId]);
      if (!item) return res.status(404).json({ error: 'Không tìm thấy hạng mục' });
      if (!(await canAccessProject(req.user, item.project_id))) return res.status(403).json({ error: 'Không có quyền' });
      const b = req.body || {};
      const status = b.status && LOGI_STATUSES.includes(b.status) ? b.status : item.status;
      await dbRun(
        `UPDATE event_logistics SET item_name = ?, category = ?, quantity = ?, unit = ?, pic_id = ?, pic_name = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [b.item_name ?? item.item_name, b.category ?? item.category, num(b.quantity ?? item.quantity) || 1, b.unit ?? item.unit,
         b.pic_id !== undefined ? b.pic_id : item.pic_id, b.pic_name ?? item.pic_name, status, b.notes ?? item.notes, item.id]
      );
      res.json(await listLogistics(item.project_id));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/logistics/:itemId', authenticateToken, async (req, res) => {
    try {
      const item = await dbGet(`SELECT * FROM event_logistics WHERE id = ?`, [req.params.itemId]);
      if (!item) return res.status(404).json({ error: 'Không tìm thấy hạng mục' });
      if (!(await canManageProject(req.user, item.project_id))) return res.status(403).json({ error: 'Chỉ quản lý dự án mới được xóa' });
      await dbRun(`DELETE FROM event_logistics WHERE id = ?`, [item.id]);
      res.json(await listLogistics(item.project_id));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ================= NGÂN SÁCH / P&L =================
  const buildBudget = async (projectId) => {
    const items = await dbAll(`SELECT * FROM event_budget_items WHERE project_id = ? ORDER BY category ASC, id ASC`, [projectId]);
    const project = await dbGet(`SELECT id, name, crm_deal_id FROM projects WHERE id = ?`, [projectId]);

    // Doanh thu lấy từ CRM Deal liên kết (nếu có)
    let deal = null;
    if (project) {
      deal = await dbGet(
        `SELECT d.id, d.title, d.contract_value, d.expected_value, d.paid_amount, d.payment_status, c.commission_rate, c.name as customer_name
         FROM crm_deals d LEFT JOIN crm_customers c ON d.customer_phone = c.phone
         WHERE d.project_id = ? OR d.id = ? ORDER BY d.id DESC`,
        [projectId, project.crm_deal_id || -1]
      );
    }

    const normalized = items.map(i => {
      const qty = num(i.quantity);
      const est = qty * num(i.estimated_unit_price);
      const act = qty * num(i.actual_unit_price);
      return { ...i, quantity: qty, estimated_unit_price: num(i.estimated_unit_price), actual_unit_price: num(i.actual_unit_price),
               paid_amount: num(i.paid_amount), estimated_total: est, actual_total: act, remaining: Math.max(0, (act || est) - num(i.paid_amount)) };
    });

    const revenue = deal ? (num(deal.contract_value) || num(deal.expected_value)) : 0;
    const estimatedCost = normalized.reduce((s, i) => s + i.estimated_total, 0);
    const actualCost = normalized.reduce((s, i) => s + (i.actual_total || i.estimated_total), 0);
    const paidToVendors = normalized.reduce((s, i) => s + i.paid_amount, 0);
    const commission = deal ? Math.round(revenue * num(deal.commission_rate) / 100) : 0;
    const grossProfit = revenue - actualCost - commission;

    return {
      items: normalized,
      summary: {
        revenue,
        collected_from_client: deal ? num(deal.paid_amount) : 0,
        estimated_cost: estimatedCost,
        actual_cost: actualCost,
        paid_to_vendors: paidToVendors,
        vendor_debt: Math.max(0, actualCost - paidToVendors),
        commission,
        commission_rate: deal ? num(deal.commission_rate) : 0,
        gross_profit: grossProfit,
        gross_margin: revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
        deal: deal ? { id: deal.id, title: deal.title, customer_name: deal.customer_name, payment_status: deal.payment_status } : null
      }
    };
  };

  app.get('/api/projects/:id/budget', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessBudget(req.user, req.params.id))) return res.status(403).json({ error: 'Chỉ Ban Quản Lý, Sales & Account hoặc Chủ trì dự án được xem ngân sách' });
      res.json(await buildBudget(req.params.id));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/projects/:id/budget', authenticateToken, async (req, res) => {
    const projectId = req.params.id;
    try {
      if (!(await canAccessBudget(req.user, projectId))) return res.status(403).json({ error: 'Không có quyền chỉnh ngân sách' });
      const b = req.body || {};
      if (!b.item_name || !b.item_name.trim()) return res.status(400).json({ error: 'Tên hạng mục chi phí là bắt buộc' });
      await dbRun(
        `INSERT INTO event_budget_items (project_id, category, item_name, vendor_name, vendor_phone, unit, quantity, estimated_unit_price, actual_unit_price, paid_amount, payment_status, payment_due_date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [projectId, b.category || 'Sản xuất & Kỹ thuật', b.item_name.trim(), b.vendor_name || '', b.vendor_phone || '', b.unit || 'Gói',
         num(b.quantity) || 1, num(b.estimated_unit_price), num(b.actual_unit_price), num(b.paid_amount),
         PAY_STATUSES.includes(b.payment_status) ? b.payment_status : 'unpaid', b.payment_due_date || null, b.notes || '', req.user.id]
      );
      res.status(201).json(await buildBudget(projectId));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.put('/api/budget/:itemId', authenticateToken, async (req, res) => {
    try {
      const item = await dbGet(`SELECT * FROM event_budget_items WHERE id = ?`, [req.params.itemId]);
      if (!item) return res.status(404).json({ error: 'Không tìm thấy hạng mục' });
      if (!(await canAccessBudget(req.user, item.project_id))) return res.status(403).json({ error: 'Không có quyền' });
      const b = req.body || {};
      const pick = (k) => (b[k] !== undefined ? b[k] : item[k]);
      const paid = num(pick('paid_amount'));
      // Tự suy ra trạng thái thanh toán nếu client không gửi
      let payStatus = b.payment_status && PAY_STATUSES.includes(b.payment_status) ? b.payment_status : item.payment_status;
      if (!b.payment_status && b.paid_amount !== undefined) {
        const total = num(pick('quantity')) * (num(pick('actual_unit_price')) || num(pick('estimated_unit_price')));
        payStatus = paid <= 0 ? 'unpaid' : paid >= total ? 'paid' : 'deposit';
      }
      await dbRun(
        `UPDATE event_budget_items SET category = ?, item_name = ?, vendor_name = ?, vendor_phone = ?, unit = ?, quantity = ?,
           estimated_unit_price = ?, actual_unit_price = ?, paid_amount = ?, payment_status = ?, payment_due_date = ?, notes = ? WHERE id = ?`,
        [pick('category'), pick('item_name'), pick('vendor_name'), pick('vendor_phone'), pick('unit'), num(pick('quantity')) || 1,
         num(pick('estimated_unit_price')), num(pick('actual_unit_price')), paid, payStatus, pick('payment_due_date'), pick('notes'), item.id]
      );
      res.json(await buildBudget(item.project_id));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/budget/:itemId', authenticateToken, async (req, res) => {
    try {
      const item = await dbGet(`SELECT * FROM event_budget_items WHERE id = ?`, [req.params.itemId]);
      if (!item) return res.status(404).json({ error: 'Không tìm thấy hạng mục' });
      if (!(await canAccessBudget(req.user, item.project_id))) return res.status(403).json({ error: 'Không có quyền' });
      await dbRun(`DELETE FROM event_budget_items WHERE id = ?`, [item.id]);
      res.json(await buildBudget(item.project_id));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Danh bạ nhà cung cấp tổng hợp từ lịch sử ngân sách mọi dự án
  app.get('/api/vendors', authenticateToken, async (req, res) => {
    try {
      const allowed = req.user.role === 'Admin' || req.user.role === 'Lead' || (await helpers.isSalesAccount(req.user));
      if (!allowed) return res.status(403).json({ error: 'Không có quyền xem danh bạ nhà cung cấp' });
      const rows = await dbAll(
        `SELECT b.vendor_name, b.vendor_phone, b.category, b.project_id, b.quantity, b.estimated_unit_price, b.actual_unit_price, b.paid_amount, p.name as project_name
         FROM event_budget_items b LEFT JOIN projects p ON b.project_id = p.id
         WHERE b.vendor_name IS NOT NULL AND b.vendor_name <> ''`
      );
      const map = new Map();
      rows.forEach(r => {
        const key = r.vendor_name.trim().toLowerCase();
        const total = num(r.quantity) * (num(r.actual_unit_price) || num(r.estimated_unit_price));
        const v = map.get(key) || { vendor_name: r.vendor_name, vendor_phone: r.vendor_phone, categories: new Set(), projects: new Set(), total_spend: 0, total_paid: 0 };
        if (r.vendor_phone && !v.vendor_phone) v.vendor_phone = r.vendor_phone;
        v.categories.add(r.category);
        if (r.project_name) v.projects.add(r.project_name);
        v.total_spend += total;
        v.total_paid += num(r.paid_amount);
        map.set(key, v);
      });
      res.json([...map.values()].map(v => ({ ...v, categories: [...v.categories], projects: [...v.projects], debt: Math.max(0, v.total_spend - v.total_paid) }))
        .sort((a, b) => b.total_spend - a.total_spend));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
};
