// PHÂN HỆ KỊCH BẢN ĐIỀU HÀNH (RUN OF SHOW / CUE SHEET) + LIVE SHOW MODE
const { num } = require('./eventHelpers');

const CUE_FIELDS = ['cue_code', 'start_time', 'duration_mins', 'segment_title', 'mc_script', 'audio_cue', 'lighting_cue', 'visual_cue', 'stage_notes', 'pic_id', 'pic_name'];

// Mẫu kịch bản sự kiện tiêu chuẩn VBE
const CUE_TEMPLATE = [
  ['17:00', 30, 'Đón khách & Check-in', 'MC chưa lên sân khấu', 'Nhạc nền nhẹ (BGM Lobby)', 'Ánh sáng sảnh 100%', 'Loop Key Visual', 'Lễ tân sẵn sàng tại bàn check-in'],
  ['17:30', 5, 'Ổn định chỗ ngồi', 'Mời quý khách ổn định chỗ ngồi, chương trình sắp bắt đầu', 'Fade out BGM', 'Hạ đèn khán phòng 50%', 'Countdown 5 phút', 'Kiểm tra mic MC'],
  ['17:35', 5, 'Opening Video / Tiết mục mở màn', '', 'Âm thanh Opening Video', 'Blackout -> Effect mở màn', 'Opening Video', 'Vũ đoàn standby cánh gà'],
  ['17:40', 5, 'MC chào mừng & Giới thiệu đại biểu', 'Kính thưa quý vị đại biểu...', 'Mic MC 1, 2 ON', 'Spot MC', 'Slide Giới thiệu đại biểu', ''],
  ['17:45', 10, 'Phát biểu khai mạc', 'Trân trọng kính mời đại diện BTC lên phát biểu', 'Mic bục phát biểu ON', 'Spot bục phát biểu', 'Logo khách hàng', 'Lễ tân dẫn đại biểu lên sân khấu'],
  ['17:55', 20, 'Nội dung chính / Nghi thức', '', 'Nhạc nghi thức', 'Effect nghi thức', 'Visual nghi thức', 'Đạo cụ nghi thức sẵn sàng'],
  ['18:15', 60, 'Tiệc & Giao lưu văn nghệ', 'Mời quý khách dùng tiệc', 'Playlist tiệc', 'Ánh sáng tiệc', 'Loop KV', 'Ca sĩ standby'],
  ['19:15', 10, 'Bế mạc & Chụp ảnh lưu niệm', 'Cảm ơn quý vị đã tham dự...', 'Nhạc kết', 'Full sáng sân khấu', 'Thank you slide', 'Photographer lên vị trí']
];

module.exports = (app, ctx) => {
  const { dbAll, dbGet, dbRun, authenticateToken, helpers, createNotification } = ctx;
  const { canAccessProject, canManageProject } = helpers;

  const listCues = (projectId) => dbAll(
    `SELECT * FROM event_cues WHERE project_id = ? ORDER BY cue_order ASC, id ASC`,
    [projectId]
  );

  const respondCues = async (res, projectId) => {
    const cues = await listCues(projectId);
    res.json({ cues, server_time: new Date().toISOString() });
  };

  // Lấy toàn bộ kịch bản (dùng cho polling Live Show, kèm server_time để client bù lệch đồng hồ)
  app.get('/api/projects/:id/cues', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessProject(req.user, req.params.id))) {
        return res.status(403).json({ error: 'Bạn không có quyền xem kịch bản dự án này' });
      }
      await respondCues(res, req.params.id);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Thêm cue mới
  app.post('/api/projects/:id/cues', authenticateToken, async (req, res) => {
    const projectId = req.params.id;
    try {
      if (!(await canManageProject(req.user, projectId))) {
        return res.status(403).json({ error: 'Chỉ Admin / Trưởng bộ phận / Chủ trì dự án mới được chỉnh kịch bản' });
      }
      const b = req.body || {};
      if (!b.segment_title || !b.segment_title.trim()) return res.status(400).json({ error: 'Tên hạng mục là bắt buộc' });
      const maxRow = await dbGet(`SELECT MAX(cue_order) as max_order FROM event_cues WHERE project_id = ?`, [projectId]);
      const nextOrder = num(maxRow && maxRow.max_order) + 1;
      await dbRun(
        `INSERT INTO event_cues (project_id, cue_order, cue_code, start_time, duration_mins, segment_title, mc_script, audio_cue, lighting_cue, visual_cue, stage_notes, pic_id, pic_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [projectId, nextOrder, b.cue_code || `C${String(nextOrder).padStart(2, '0')}`, b.start_time || '', num(b.duration_mins) || 5,
         b.segment_title.trim(), b.mc_script || '', b.audio_cue || '', b.lighting_cue || '', b.visual_cue || '', b.stage_notes || '',
         b.pic_id || null, b.pic_name || '']
      );
      await respondCues(res.status(201), projectId);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Nạp mẫu kịch bản chuẩn (chỉ khi kịch bản đang trống)
  app.post('/api/projects/:id/cues/template', authenticateToken, async (req, res) => {
    const projectId = req.params.id;
    try {
      if (!(await canManageProject(req.user, projectId))) return res.status(403).json({ error: 'Không có quyền chỉnh kịch bản' });
      const existing = await listCues(projectId);
      if (existing.length > 0) return res.status(400).json({ error: 'Kịch bản đã có nội dung, không thể nạp mẫu' });
      let order = 1;
      for (const t of CUE_TEMPLATE) {
        await dbRun(
          `INSERT INTO event_cues (project_id, cue_order, cue_code, start_time, duration_mins, segment_title, mc_script, audio_cue, lighting_cue, visual_cue, stage_notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [projectId, order, `C${String(order).padStart(2, '0')}`, ...t]
        );
        order++;
      }
      await respondCues(res.status(201), projectId);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Cập nhật 1 cue
  app.put('/api/cues/:cueId', authenticateToken, async (req, res) => {
    try {
      const cue = await dbGet(`SELECT * FROM event_cues WHERE id = ?`, [req.params.cueId]);
      if (!cue) return res.status(404).json({ error: 'Không tìm thấy cue' });
      if (!(await canManageProject(req.user, cue.project_id))) return res.status(403).json({ error: 'Không có quyền chỉnh kịch bản' });
      const b = req.body || {};
      const values = CUE_FIELDS.map(f => (b[f] !== undefined ? b[f] : cue[f]));
      values[2] = num(values[2]) || 5; // duration_mins
      await dbRun(
        `UPDATE event_cues SET ${CUE_FIELDS.map(f => `${f} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, cue.id]
      );
      await respondCues(res, cue.project_id);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Xóa cue
  app.delete('/api/cues/:cueId', authenticateToken, async (req, res) => {
    try {
      const cue = await dbGet(`SELECT * FROM event_cues WHERE id = ?`, [req.params.cueId]);
      if (!cue) return res.status(404).json({ error: 'Không tìm thấy cue' });
      if (!(await canManageProject(req.user, cue.project_id))) return res.status(403).json({ error: 'Không có quyền chỉnh kịch bản' });
      await dbRun(`DELETE FROM event_cues WHERE id = ?`, [cue.id]);
      await respondCues(res, cue.project_id);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Đổi thứ tự cue: body { order: [cueId1, cueId2, ...] }
  app.put('/api/projects/:id/cues-reorder', authenticateToken, async (req, res) => {
    const projectId = req.params.id;
    try {
      if (!(await canManageProject(req.user, projectId))) return res.status(403).json({ error: 'Không có quyền chỉnh kịch bản' });
      const order = Array.isArray(req.body.order) ? req.body.order : [];
      for (let i = 0; i < order.length; i++) {
        await dbRun(`UPDATE event_cues SET cue_order = ? WHERE id = ? AND project_id = ?`, [i + 1, order[i], projectId]);
      }
      await respondCues(res, projectId);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ĐIỀU KHIỂN LIVE SHOW: action = 'go' | 'back' | 'goto' | 'reset'
  app.post('/api/projects/:id/cues/live', authenticateToken, async (req, res) => {
    const projectId = req.params.id;
    const { action, cue_id } = req.body || {};
    try {
      if (!(await canManageProject(req.user, projectId))) {
        return res.status(403).json({ error: 'Chỉ Đạo diễn / Chủ trì / Admin mới được điều khiển Live Show' });
      }
      const cues = await listCues(projectId);
      if (cues.length === 0) return res.status(400).json({ error: 'Kịch bản trống' });

      const nowIso = new Date().toISOString();
      const liveIdx = cues.findIndex(c => c.status === 'live');
      let targetIdx = -1;

      if (action === 'reset') {
        await dbRun(`UPDATE event_cues SET status = 'pending', live_started_at = NULL WHERE project_id = ?`, [projectId]);
        return respondCues(res, projectId);
      } else if (action === 'go') {
        targetIdx = liveIdx + 1; // liveIdx = -1 -> bắt đầu từ cue đầu tiên
      } else if (action === 'back') {
        targetIdx = Math.max(0, liveIdx - 1);
      } else if (action === 'goto') {
        targetIdx = cues.findIndex(c => String(c.id) === String(cue_id));
      } else {
        return res.status(400).json({ error: 'Hành động không hợp lệ' });
      }

      // Đã qua cue cuối cùng -> kết thúc show
      if (targetIdx >= cues.length) {
        await dbRun(`UPDATE event_cues SET status = 'done' WHERE project_id = ?`, [projectId]);
        return respondCues(res, projectId);
      }
      if (targetIdx < 0) return res.status(400).json({ error: 'Không tìm thấy cue đích' });

      // Cập nhật trạng thái: trước target = done, target = live, kế tiếp = standby, còn lại = pending
      for (let i = 0; i < cues.length; i++) {
        let status = 'pending';
        let started = null;
        if (i < targetIdx) { status = 'done'; started = cues[i].live_started_at; }
        else if (i === targetIdx) { status = 'live'; started = nowIso; }
        else if (i === targetIdx + 1) status = 'standby';
        await dbRun(`UPDATE event_cues SET status = ?, live_started_at = ? WHERE id = ?`, [status, started, cues[i].id]);
      }

      // Ghi lệnh GO vào kênh bộ đàm Sân khấu để toàn ekip cùng thấy
      const target = cues[targetIdx];
      const next = cues[targetIdx + 1];
      const text = `🎬 GO ${target.cue_code || ''} — ${target.segment_title}${next ? ` | Standby: ${next.segment_title}` : ' | Cue cuối'}`;
      await dbRun(
        `INSERT INTO voice_comms_messages (project_id, channel, user_id, user_name, user_role, message_type, text_message)
         VALUES (?, 'STAGE', ?, ?, ?, 'cue_call', ?)`,
        [projectId, req.user.id, req.user.name || 'Đạo diễn', req.user.role, text]
      );

      // Thông báo cho PIC của cue standby để chuẩn bị
      if (next && next.pic_id && next.pic_id !== req.user.id && createNotification) {
        createNotification(next.pic_id, 'cue_standby', '⏳ Standby cue tiếp theo', `Chuẩn bị: ${next.segment_title}`, Number(projectId), 'project');
      }

      await respondCues(res, projectId);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
};
