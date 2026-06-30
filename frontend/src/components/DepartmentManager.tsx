import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus } from 'lucide-react';

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
  const [showAddDept, setShowAddDept] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const loadData = async () => {
    try {
      const deptRes = await fetchWithAuth('/api/departments');
      if (deptRes.ok) {
        setDepartments(await deptRes.ok ? await deptRes.json() : []);
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
      }
    } catch (e) {
      console.error(e);
    }
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
        }
        .dept-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .dept-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
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
        .form-group input, .form-group textarea {
          padding: 10px;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-family: var(--font-family);
        }
        .form-group input:focus, .form-group textarea:focus {
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
          <button className="btn-neon" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowAddDept(true)}>
            <Plus size={16} /> Tạo phòng ban
          </button>
        )}
      </div>
 
      <div className="dept-grid">
        {departments.map(dept => {
          const members = teamMembers.filter(m => m.department_id === dept.id);
          return (
            <div key={dept.id} className="dept-card">
              <div className="dept-card-header">
                <span className="dept-title">{translateDept(dept.name)}</span>
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
                      <span>{member.name}</span>
                      <span className={`member-role role-${member.role}`}>{translateRole(member.role)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
 
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
    </div>
  );
};
