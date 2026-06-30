import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Department {
  id: number;
  name: string;
  description: string;
  member_count: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Lead' | 'Member';
  department_id: number | null;
  department_name?: string;
}

export const DepartmentManager: React.FC = () => {
  const { user, fetchWithAuth } = useAuth();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  
  // Department Modal State
  const [showAddDept, setShowAddDept] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // User Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'Admin' | 'Lead' | 'Member'>('Member');
  const [userDeptId, setUserDeptId] = useState<string>('');

  const loadData = async () => {
    try {
      const deptRes = await fetchWithAuth('/api/departments');
      if (deptRes.ok) {
        setDepartments(await deptRes.json());
      }

      const teamRes = await fetchWithAuth('/api/users');
      if (teamRes.ok) {
        setTeamMembers(await teamRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- DEPARTMENT OPERATIONS ---
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    try {
      const res = await fetchWithAuth('/api/departments', {
        method: 'POST',
        body: JSON.stringify({ name: deptName, description: deptDesc })
      });
      if (res.ok) {
        setDeptName('');
        setDeptDesc('');
        setShowAddDept(false);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !deptName.trim()) return;

    try {
      const res = await fetchWithAuth(`/api/departments/${editingDept.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: deptName, description: deptDesc })
      });
      if (res.ok) {
        setDeptName('');
        setDeptDesc('');
        setEditingDept(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDept = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phòng ban này? Các thành viên thuộc phòng ban sẽ được chuyển sang trạng thái chưa phân bổ.')) return;

    try {
      const res = await fetchWithAuth(`/api/departments/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- USER OPERATIONS ---
  const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) return;
    if (!editingUser && !userPassword.trim()) {
      alert('Mật khẩu là bắt buộc khi tạo tài khoản mới');
      return;
    }

    const payload = {
      name: userName,
      email: userEmail,
      password: userPassword,
      role: userRole,
      department_id: userDeptId === '' ? null : parseInt(userDeptId)
    };

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        closeUserModal();
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (id === user?.id) {
      alert('Bạn không thể xóa chính tài khoản của mình');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhân sự này khỏi hệ thống?')) return;

    try {
      const res = await fetchWithAuth(`/api/users/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- MODAL UTILS ---
  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptDesc(dept.description);
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserRole('Member');
    setUserDeptId('');
    setShowUserModal(true);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserPassword('');
    setUserRole(u.role);
    setUserDeptId(u.department_id ? u.department_id.toString() : '');
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
  };

  const translateRole = (role: string) => {
    const roles: Record<string, string> = {
      'Admin': 'Quản trị viên',
      'Lead': 'Trưởng bộ phận',
      'Member': 'Nhân viên'
    };
    return roles[role] || role;
  };

  const translateDept = (dept: string) => {
    const depts: Record<string, string> = {
      'Management': 'Ban quản lý',
      'Development': 'Phòng Phát triển',
      'Design': 'Phòng Thiết kế',
      'Marketing': 'Phòng Marketing'
    };
    return depts[dept] || dept;
  };

  const unassignedMembers = teamMembers.filter(m => !m.department_id);

  return (
    <div className="dept-page animate-fade-in">
      <style>{`
        .dept-page {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
          height: 100%;
          background: var(--bg-dark);
          font-family: var(--font-family);
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .dept-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        .dept-card {
          padding: 24px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
        }
        .dept-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .dept-title-area {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dept-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .dept-actions {
          display: flex;
          gap: 8px;
          opacity: 0.7;
        }
        .dept-actions:hover {
          opacity: 1;
        }
        .dept-member-count {
          font-size: 11px;
          background: rgba(79, 70, 229, 0.08);
          color: #4f46e5;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 600;
        }
        .dept-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 16px;
          flex-grow: 1;
        }
        .dept-members-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
        }
        .dept-member-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .member-role-area {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .member-role {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .role-Admin { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .role-Lead { background: rgba(79, 70, 229, 0.1); color: #4f46e5; }
        .role-Member { background: #f1f3f5; color: var(--text-secondary); }
 
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .modal-body {
          width: 440px;
          padding: 30px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .form-group {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        .form-group input, .form-group textarea, .form-group select {
          padding: 10px;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-family: var(--font-family);
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          outline: none;
          border-color: #4f46e5;
        }
      `}</style>
 
      <div className="header-row">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Phòng Ban & Nhân Sự</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Xem sơ đồ phân chia bộ phận và chức vụ của agency</p>
        </div>
 
        {user?.role === 'Admin' && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-outline" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={openAddUser}>
              <Plus size={16} /> Thêm nhân sự
            </button>
            <button className="btn-neon" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowAddDept(true)}>
              <Plus size={16} /> Tạo phòng ban
            </button>
          </div>
        )}
      </div>
 
      <div className="dept-grid">
        {departments.map(dept => {
          const members = teamMembers.filter(m => m.department_id === dept.id);
          return (
            <div key={dept.id} className="dept-card">
              <div className="dept-card-header">
                <div className="dept-title-area">
                  <span className="dept-title">{translateDept(dept.name)}</span>
                  {user?.role === 'Admin' && (
                    <div className="dept-actions">
                      <button style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => openEditDept(dept)}>
                        <Edit2 size={12} />
                      </button>
                      <button style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: '#ef4444' }} onClick={() => handleDeleteDept(dept.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <span className="dept-member-count">{members.length} nhân sự</span>
              </div>
              <p className="dept-desc">{dept.description || 'Chưa cập nhật mô tả phòng ban.'}</p>
 
              <div className="dept-members-list">
                <h4 style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Danh sách nhân sự</h4>
                {members.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chưa có nhân viên trực thuộc.</span>
                ) : (
                  members.map(member => (
                    <div key={member.id} className="dept-member-item">
                      <span>{member.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({member.email})</span></span>
                      <div className="member-role-area">
                        <span className={`member-role role-${member.role}`}>{translateRole(member.role)}</span>
                        {user?.role === 'Admin' && (
                          <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }} onClick={() => openEditUser(member)}>Sửa</button>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }} onClick={() => handleDeleteUser(member.id)}>Xóa</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}

        {/* UNASSIGNED PERSONNEL CARD */}
        {(unassignedMembers.length > 0 || user?.role === 'Admin') && (
          <div className="dept-card" style={{ borderColor: 'dashed var(--border-color)', background: 'rgba(0,0,0,0.01)' }}>
            <div className="dept-card-header">
              <span className="dept-title" style={{ color: 'var(--text-muted)' }}>Chưa phân phòng ban</span>
              <span className="dept-member-count" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' }}>{unassignedMembers.length} nhân sự</span>
            </div>
            <p className="dept-desc" style={{ color: 'var(--text-muted)' }}>Nhân viên mới hoặc nhân viên hoạt động tự do chưa được chỉ định phòng ban cụ thể.</p>

            <div className="dept-members-list">
              <h4 style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Danh sách nhân sự</h4>
              {unassignedMembers.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mọi nhân sự đều đã được phân bổ phòng ban.</span>
              ) : (
                unassignedMembers.map(member => (
                  <div key={member.id} className="dept-member-item">
                    <span>{member.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({member.email})</span></span>
                    <div className="member-role-area">
                      <span className={`member-role role-${member.role}`}>{translateRole(member.role)}</span>
                      {user?.role === 'Admin' && (
                        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }} onClick={() => openEditUser(member)}>Sửa</button>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }} onClick={() => handleDeleteUser(member.id)}>Xóa</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
 
      {/* ADD DEPARTMENT MODAL */}
      {showAddDept && (
        <div className="modal-overlay">
          <div className="modal-body">
            <h3 style={{ marginBottom: 20, color: 'var(--text-primary)' }}>Thêm phòng ban mới</h3>
            <form onSubmit={handleCreateDept}>
              <div className="form-group">
                <label>Tên phòng ban</label>
                <input required type="text" placeholder="Ví dụ: Truyền Thông & Media" value={deptName} onChange={e => setDeptName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Mô tả nhiệm vụ</label>
                <textarea rows={3} placeholder="Mô tả chức năng nhiệm vụ chính..." value={deptDesc} onChange={e => setDeptDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn-outline" style={{ padding: '8px 16px' }} onClick={() => setShowAddDept(false)}>Hủy</button>
                <button type="submit" className="btn-neon" style={{ padding: '8px 16px' }}>Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DEPARTMENT MODAL */}
      {editingDept && (
        <div className="modal-overlay">
          <div className="modal-body">
            <h3 style={{ marginBottom: 20, color: 'var(--text-primary)' }}>Chỉnh sửa phòng ban</h3>
            <form onSubmit={handleUpdateDept}>
              <div className="form-group">
                <label>Tên phòng ban</label>
                <input required type="text" value={deptName} onChange={e => setDeptName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Mô tả nhiệm vụ</label>
                <textarea rows={3} value={deptDesc} onChange={e => setDeptDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn-outline" style={{ padding: '8px 16px' }} onClick={() => setEditingDept(null)}>Hủy</button>
                <button type="submit" className="btn-neon" style={{ padding: '8px 16px' }}>Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER CRUD MODAL */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-body">
            <h3 style={{ marginBottom: 20, color: 'var(--text-primary)' }}>
              {editingUser ? 'Chỉnh sửa thông tin nhân sự' : 'Thêm nhân sự mới'}
            </h3>
            <form onSubmit={handleCreateOrUpdateUser}>
              <div className="form-group">
                <label>Họ và tên</label>
                <input required type="text" placeholder="Nguyễn Văn A" value={userName} onChange={e => setUserName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Địa chỉ Email</label>
                <input required type="email" placeholder="nva@agency.com" value={userEmail} onChange={e => setUserEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Mật khẩu {editingUser && '(để trống nếu không đổi)'}</label>
                <input type="password" placeholder="••••••" value={userPassword} onChange={e => setUserPassword(e.target.value)} required={!editingUser} />
              </div>
              <div className="form-group">
                <label>Chức vụ (Vai trò)</label>
                <select value={userRole} onChange={e => setUserRole(e.target.value as any)}>
                  <option value="Member">Nhân viên (Member)</option>
                  <option value="Lead">Trưởng phòng (Lead)</option>
                  <option value="Admin">Quản trị viên (Admin)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Phòng ban trực thuộc</label>
                <select value={userDeptId} onChange={e => setUserDeptId(e.target.value)}>
                  <option value="">-- Chưa phân bổ phòng ban --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{translateDept(d.name)}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn-outline" style={{ padding: '8px 16px' }} onClick={closeUserModal}>Hủy</button>
                <button type="submit" className="btn-neon" style={{ padding: '8px 16px' }}>Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
