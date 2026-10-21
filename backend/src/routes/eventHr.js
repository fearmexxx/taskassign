// PHÂN HỆ NHÂN SỰ SỰ KIỆN (NGHỈ PHÉP / NGHỈ BÙ / OT / PHỤ CẤP SHOW / CTV-FREELANCER) & BỘ ĐÀM (VOICE COMMS / SOS)
const { num } = require('./eventHelpers');

const REQUEST_TYPES = ['leave', 'comp_off', 'overtime', 'show_allowance'];
const TYPE_LABEL = { leave: 'Nghỉ phép', comp_off: 'Nghỉ bù', overtime: 'Tăng ca (OT)', show_allowance: 'Phụ cấp chạy show' };
const CHANNELS = ['ALL', 'STAGE', 'TECH', 'FOH', 'LOGISTICS'];

module.exports = (app, ctx) => {
  const { dbAll, dbGet, dbRun, authenticateToken, requireRole, helpers, createNotification } = ctx;
  const { canAccessProject, getProjectUserIds } = helpers;

  // ================= ĐƠN TỪ HR =================
  const baseLeaveQuery = `
    SELECT r.*, u.name as user_name, u.department_id, d.name as department_name, a.name as approver_name, p.name as project_name
    FROM hr_leave_requests r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN users a ON r.approved_by = a.id
    LEFT JOIN projects p ON r.project_id = p.id`;

  // Admin xem tất cả, Lead xem phòng mình + của mình, Member chỉ xem của mình
  app.get('/api/hr/requests', authenticateToken, async (req, res) => {
    try {
      const { status, month } = req.query;
      const where = [];
      const params = [];
      if (req.user.role === 'Lead') { where.push('(u.department_id = ? OR r.user_id = ?)'); params.push(req.user.department_id || -1, req.user.id); }
      else if (req.user.role !== 'Admin') { where.push('r.user_id = ?'); params.push(req.user.id); }
      if (status) { where.push('r.status = ?'); params.push(status); }
      if (month) { where.push('r.start_date LIKE ?'); params.push(`${month}-%`); }
      const rows = await dbAll(`${baseLeaveQuery} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY r.id DESC`, params);
      res.json(rows.map(r => ({ ...r, allowance_amount: num(r.allowance_amount), hours_or_days: num(r.hours_or_days) })));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/hr/requests', authenticateToken, async (req, res) => {
    try {
      const b = req.body || {};
      if (!REQUEST_TYPES.includes(b.request_type)) return res.status(400).json({ error: 'Loại đơn không hợp lệ' });
      if (!b.start_date || !b.reason || !b.reason.trim()) return res.status(400).json({ error: 'Ngày bắt đầu và lý do là bắt buộc' });
      const endDate = b.end_date || b.start_date;
      if (endDate < b.start_date) return res.status(400).json({ error: 'Ngày kết thúc phải sau ngày bắt đầu' });

      const result = await dbRun(
        `INSERT INTO hr_leave_requests (user_id, project_id, request_type, start_date, end_date, hours_or_days, allowance_amount, reason, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
        [req.user.id, b.project_id || null, b.request_type, b.start_date, endDate, num(b.hours_or_days) || 1, num(b.allowance_amount), b.reason.trim()]
      );

      // Thông báo cho người duyệt: Lead cùng phòng + Admin
      const approvers = await dbAll(
        `SELECT id FROM users WHERE id <> ? AND (role = 'Admin' OR (role = 'Lead' AND department_id = ?))`,
        [req.user.id, req.user.department_id || -1]
      );
      for (const a of approvers) {
        createNotification(a.id, 'hr_request', `📝 Đơn ${TYPE_LABEL[b.request_type]} cần duyệt`,
          `${req.user.name} gửi đơn ${TYPE_LABEL[b.request_type]} (${b.start_date} → ${endDate}): ${b.reason.trim()}`, result.lastID || null, 'hr_request');
      }
      res.status(201).json({ message: 'Đã gửi đơn thành công', id: result.lastID });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Duyệt / Từ chối đơn: Admin duyệt tất cả, Lead duyệt nhân sự phòng mình (không tự duyệt đơn của mình)
  app.put('/api/hr/requests/:id/review', authenticateToken, requireRole(['Admin', 'Lead']), async (req, res) => {
    try {
      const { decision, allowance_amount } = req.body || {};
      if (!['Approved', 'Rejected'].includes(decision)) return res.status(400).json({ error: 'Quyết định không hợp lệ' });
      const r = await dbGet(`SELECT r.*, u.department_id FROM hr_leave_requests r JOIN users u ON r.user_id = u.id WHERE r.id = ?`, [req.params.id]);
      if (!r) return res.status(404).json({ error: 'Không tìm thấy đơn' });
      if (r.user_id === req.user.id && req.user.role !== 'Admin') return res.status(403).json({ error: 'Không thể tự duyệt đơn của chính mình' });
      if (req.user.role === 'Lead' && r.department_id !== req.user.department_id) return res.status(403).json({ error: 'Chỉ duyệt đơn nhân sự thuộc phòng ban của bạn' });

      await dbRun(
        `UPDATE hr_leave_requests SET status = ?, approved_by = ?, approved_at = ?, allowance_amount = ? WHERE id = ?`,
        [decision, req.user.id, new Date().toISOString(), allowance_amount !== undefined ? num(allowance_amount) : num(r.allowance_amount), r.id]
      );
      createNotification(r.user_id, 'hr_request', decision === 'Approved' ? '✅ Đơn đã được duyệt' : '❌ Đơn bị từ chối',
        `Đơn ${TYPE_LABEL[r.request_type]} (${r.start_date}) đã được ${req.user.name} ${decision === 'Approved' ? 'phê duyệt' : 'từ chối'}.`, r.id, 'hr_request');
      res.json({ message: 'Đã cập nhật đơn' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Người gửi được hủy đơn khi còn chờ duyệt
  app.delete('/api/hr/requests/:id', authenticateToken, async (req, res) => {
    try {
      const r = await dbGet(`SELECT * FROM hr_leave_requests WHERE id = ?`, [req.params.id]);
      if (!r) return res.status(404).json({ error: 'Không tìm thấy đơn' });
      if (r.user_id !== req.user.id && req.user.role !== 'Admin') return res.status(403).json({ error: 'Không có quyền hủy đơn này' });
      if (r.status !== 'Pending' && req.user.role !== 'Admin') return res.status(400).json({ error: 'Chỉ hủy được đơn đang chờ duyệt' });
      await dbRun(`DELETE FROM hr_leave_requests WHERE id = ?`, [r.id]);
      res.json({ message: 'Đã hủy đơn' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ================= CTV / FREELANCER (Admin & Lead) =================
  app.get('/api/hr/freelancers', authenticateToken, requireRole(['Admin', 'Lead']), async (req, res) => {
    try {
      const rows = await dbAll(`SELECT * FROM hr_freelancers ORDER BY role_specialty ASC, rating DESC, name ASC`);
      res.json(rows.map(r => ({ ...r, daily_rate: num(r.daily_rate), rating: num(r.rating) })));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/hr/freelancers', authenticateToken, requireRole(['Admin', 'Lead']), async (req, res) => {
    try {
      const b = req.body || {};
      if (!b.name || !b.phone || !b.role_specialty) return res.status(400).json({ error: 'Họ tên, SĐT và chuyên môn là bắt buộc' });
      await dbRun(
        `INSERT INTO hr_freelancers (name, phone, role_specialty, daily_rate, portfolio_link, bank_info, rating, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.name.trim(), String(b.phone).replace(/[\s.\-()]/g, ''), b.role_specialty, num(b.daily_rate), b.portfolio_link || '', b.bank_info || '', Math.min(5, Math.max(1, num(b.rating) || 5)), b.notes || '']
      );
      res.status(201).json({ message: 'Đã thêm CTV' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.put('/api/hr/freelancers/:id', authenticateToken, requireRole(['Admin', 'Lead']), async (req, res) => {
    try {
      const f = await dbGet(`SELECT * FROM hr_freelancers WHERE id = ?`, [req.params.id]);
      if (!f) return res.status(404).json({ error: 'Không tìm thấy CTV' });
      const b = req.body || {};
      const pick = (k) => (b[k] !== undefined ? b[k] : f[k]);
      await dbRun(
        `UPDATE hr_freelancers SET name = ?, phone = ?, role_specialty = ?, daily_rate = ?, portfolio_link = ?, bank_info = ?, rating = ?, notes = ? WHERE id = ?`,
        [pick('name'), pick('phone'), pick('role_specialty'), num(pick('daily_rate')), pick('portfolio_link'), pick('bank_info'), Math.min(5, Math.max(1, num(pick('rating')) || 5)), pick('notes'), f.id]
      );
      res.json({ message: 'Đã cập nhật CTV' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/hr/freelancers/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
    try {
      await dbRun(`DELETE FROM hr_freelancers WHERE id = ?`, [req.params.id]);
      res.json({ message: 'Đã xóa CTV' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ================= BỘ ĐÀM / VOICE COMMS (Push-to-Talk qua polling) =================
  // Lấy tin nhắn mới theo since_id (client polling 2s). project_id rỗng = kênh chung toàn công ty
  app.get('/api/comms/messages', authenticateToken, async (req, res) => {
    try {
      const projectId = req.query.project_id ? Number(req.query.project_id) : null;
      const sinceId = Number(req.query.since_id) || 0;
      if (projectId && !(await canAccessProject(req.user, projectId))) return res.status(403).json({ error: 'Không có quyền vào kênh bộ đàm dự án này' });

      const rows = await dbAll(
        `SELECT * FROM voice_comms_messages
         WHERE ${projectId ? 'project_id = ?' : 'project_id IS NULL'} AND id > ?
         ORDER BY id DESC LIMIT 60`,
        projectId ? [projectId, sinceId] : [sinceId]
      );
      res.json({ messages: rows.reverse().map(m => ({ ...m, duration_sec: num(m.duration_sec) })), server_time: new Date().toISOString() });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Gửi voice (base64 audio ≤ 30s), SOS hoặc tin nhắn nhanh
  app.post('/api/comms/messages', authenticateToken, async (req, res) => {
    try {
      const b = req.body || {};
      const projectId = b.project_id ? Number(b.project_id) : null;
      const channel = CHANNELS.includes(b.channel) ? b.channel : 'ALL';
      const type = ['voice', 'sos', 'cue_call'].includes(b.message_type) ? b.message_type : 'voice';
      if (projectId && !(await canAccessProject(req.user, projectId))) return res.status(403).json({ error: 'Không có quyền' });
      if (type === 'voice' && !b.audio_data) return res.status(400).json({ error: 'Thiếu dữ liệu âm thanh' });
      if (b.audio_data && String(b.audio_data).length > 2_000_000) return res.status(413).json({ error: 'Đoạn ghi âm quá dài (tối đa ~30 giây)' });

      const result = await dbRun(
        `INSERT INTO voice_comms_messages (project_id, channel, user_id, user_name, user_role, message_type, text_message, audio_data, duration_sec)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [projectId, channel, req.user.id, req.user.name || 'Thành viên', req.user.role, type, b.text_message || '', b.audio_data || null, num(b.duration_sec)]
      );

      // SOS: đẩy thông báo chuông cho toàn bộ thành viên dự án (hoặc Admin/Lead nếu kênh chung)
      if (type === 'sos') {
        const targets = projectId ? await getProjectUserIds(projectId)
          : (await dbAll(`SELECT id FROM users WHERE role IN ('Admin', 'Lead')`)).map(u => u.id);
        targets.filter(id => id !== req.user.id).forEach(id =>
          createNotification(id, 'sos', `🚨 SOS [${channel}] từ ${req.user.name}`, b.text_message || 'Sự cố khẩn cấp tại hiện trường', projectId, 'project'));
      }

      // Dọn dữ liệu cũ: chỉ giữ 500 tin gần nhất để DB gọn nhẹ
      const newId = Number(result.lastID) || 0;
      if (newId > 500 && newId % 50 === 0) await dbRun(`DELETE FROM voice_comms_messages WHERE id < ?`, [newId - 500]);

      res.status(201).json({ id: newId });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
};
