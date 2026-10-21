// Helper dùng chung cho các phân hệ Event Suite (Kịch bản, Hậu cần, Ngân sách, HR, Bộ đàm)

// PostgreSQL trả BIGINT/SUM dạng chuỗi -> chuẩn hóa về số
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const createHelpers = ({ dbGet, dbAll }) => {
  // Kiểm tra user có thuộc phòng Sales & Account không
  const isSalesAccount = async (user) => {
    if (!user || !user.department_id) return false;
    const dept = await dbGet(`SELECT name FROM departments WHERE id = ?`, [user.department_id]);
    return !!(dept && (dept.name.includes('Sales') || dept.name.includes('Account')));
  };

  // Quyền XEM dự án: Admin, người tạo, chủ trì, phó chủ trì, thành viên, hoặc Lead của phòng ban tham gia
  const canAccessProject = async (user, projectId) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    const p = await dbGet(`SELECT id, owner_id, sub_owner_id, created_by FROM projects WHERE id = ?`, [projectId]);
    if (!p) return false;
    if ([p.owner_id, p.sub_owner_id, p.created_by].includes(user.id)) return true;
    const member = await dbGet(`SELECT user_id FROM project_members WHERE project_id = ? AND user_id = ?`, [projectId, user.id]);
    if (member) return true;
    const assigned = await dbGet(
      `SELECT t.id FROM tasks t LEFT JOIN task_members tm ON tm.task_id = t.id
       WHERE t.project_id = ? AND (t.assignee_id = ? OR t.owner_id = ? OR t.sub_owner_id = ? OR tm.user_id = ?)`,
      [projectId, user.id, user.id, user.id, user.id]
    );
    if (assigned) return true;
    if (user.role === 'Lead' && user.department_id) {
      const dep = await dbGet(`SELECT project_id FROM project_departments WHERE project_id = ? AND department_id = ?`, [projectId, user.department_id]);
      if (dep) return true;
    }
    return false;
  };

  // Quyền QUẢN LÝ dự án (sửa kịch bản, điều khiển Live Show): Admin, người tạo, chủ trì, phó chủ trì, hoặc Lead có quyền xem
  const canManageProject = async (user, projectId) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    const p = await dbGet(`SELECT owner_id, sub_owner_id, created_by FROM projects WHERE id = ?`, [projectId]);
    if (!p) return false;
    if ([p.owner_id, p.sub_owner_id, p.created_by].includes(user.id)) return true;
    if (user.role === 'Lead') return canAccessProject(user, projectId);
    return false;
  };

  // Quyền xem NGÂN SÁCH / P&L: Admin, Sales & Account, hoặc chủ trì / người tạo dự án
  const canAccessBudget = async (user, projectId) => {
    if (!user) return false;
    if (user.role === 'Admin' || user.email === 'vinh@vbe.vn') return true;
    if (await isSalesAccount(user)) return true;
    const p = await dbGet(`SELECT owner_id, sub_owner_id, created_by FROM projects WHERE id = ?`, [projectId]);
    return !!(p && [p.owner_id, p.sub_owner_id, p.created_by].includes(user.id));
  };

  // Danh sách user tham gia dự án (để gửi thông báo)
  const getProjectUserIds = async (projectId) => {
    const p = await dbGet(`SELECT owner_id, sub_owner_id, created_by FROM projects WHERE id = ?`, [projectId]);
    const rows = await dbAll(`SELECT user_id FROM project_members WHERE project_id = ?`, [projectId]);
    const ids = new Set(rows.map(r => r.user_id));
    if (p) [p.owner_id, p.sub_owner_id, p.created_by].forEach(id => id && ids.add(id));
    return [...ids];
  };

  return { isSalesAccount, canAccessProject, canManageProject, canAccessBudget, getProjectUserIds };
};

module.exports = { num, createHelpers };
