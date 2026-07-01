import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FolderGit2, 
  CalendarDays, 
  Users2, 
  FileSpreadsheet, 
  LogOut, 
  User,
  Wallet
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCheckedIn: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isCheckedIn }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  // Translate roles & department names to Vietnamese
  const translateRole = (role: string) => {
    const roles: Record<string, string> = {
      'Admin': 'Quản trị viên',
      'Lead': 'Trưởng bộ phận',
      'Member': 'Thành viên'
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
    <aside className="sidebar">
      <style>{`
        .sidebar {
          width: 280px;
          background-color: var(--bg-sidebar);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          padding: 24px;
          height: 100%;
          justify-content: space-between;
          font-family: var(--font-family);
        }
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }
        .brand-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #000;
        }
        .brand-text {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #fff, var(--text-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .profile-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 24px;
          position: relative;
        }
        .profile-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-cyan);
        }
        .profile-info {
          flex: 1;
          min-width: 0;
        }
        .profile-name {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .profile-role-dept {
          font-size: 11px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }
        .status-indicator {
          position: absolute;
          bottom: 12px;
          left: 44px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--bg-sidebar);
          background-color: ${isCheckedIn ? 'var(--accent-green)' : 'var(--accent-orange)'};
          box-shadow: 0 0 8px ${isCheckedIn ? 'rgba(0, 255, 135, 0.5)' : 'rgba(255, 88, 88, 0.5)'};
        }
        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-smooth);
          border: 1px solid transparent;
        }
        .menu-item:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.03);
        }
        .menu-item.active {
          color: #fff;
          background: rgba(0, 242, 254, 0.07);
          border-color: rgba(0, 242, 254, 0.15);
          box-shadow: inset 0 0 10px rgba(0, 242, 254, 0.05);
        }
        .menu-item-icon {
          width: 18px;
          height: 18px;
        }
        .logout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          color: var(--accent-orange);
          background: transparent;
          border: 1px solid transparent;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-smooth);
          margin-top: auto;
          text-align: left;
        }
        .logout-btn:hover {
          background: rgba(255, 88, 88, 0.05);
          border-color: rgba(255, 88, 88, 0.1);
        }
      `}</style>

      <div>
        <div className="sidebar-brand">
          <div className="brand-icon">T</div>
          <span className="brand-text">TaskAssign Pro</span>
        </div>

        <div className="profile-card">
          <div className="profile-avatar">
            <User size={20} />
          </div>
          <div className="status-indicator" title={isCheckedIn ? 'Đã Chấm Công' : 'Chưa Chấm Công'} />
          <div className="profile-info">
            <div className="profile-name">{user.name}</div>
            <div className="profile-role-dept">
              {translateRole(user.role)} • {translateDept(user.department_name || '')}
            </div>
          </div>
        </div>

        <nav className="sidebar-menu">
          <div 
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard className="menu-item-icon" />
            <span>Tổng quan</span>
          </div>

          <div 
            className={`menu-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <FolderGit2 className="menu-item-icon" />
            <span>Dự án & Công việc</span>
          </div>

          <div 
            className={`menu-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <CalendarDays className="menu-item-icon" />
            <span>Lịch & Chấm công</span>
          </div>

          <div 
            className={`menu-item ${activeTab === 'departments' ? 'active' : ''}`}
            onClick={() => setActiveTab('departments')}
          >
            <Users2 className="menu-item-icon" />
            <span>Phòng ban & Nhân sự</span>
          </div>

          <div 
            className={`menu-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileSpreadsheet className="menu-item-icon" />
            <span>Báo cáo ngày</span>
          </div>

          <div 
            className={`menu-item ${activeTab === 'salary' ? 'active' : ''}`}
            onClick={() => setActiveTab('salary')}
          >
            <Wallet className="menu-item-icon" />
            <span>Bảng công & Lương</span>
          </div>
        </nav>
      </div>

      <button className="logout-btn" onClick={logout}>
        <LogOut className="menu-item-icon" />
        <span>Đăng xuất</span>
      </button>
    </aside>
  );
};
