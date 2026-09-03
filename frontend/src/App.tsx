import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { CalendarView } from './components/CalendarView';
import { DepartmentManager } from './components/DepartmentManager';
import { WorkReports } from './components/WorkReports';
import { SalaryManager } from './components/SalaryManager';

import { 
  LayoutDashboard, 
  FolderGit2, 
  CalendarDays, 
  Wallet, 
  Users2, 
  FileSpreadsheet, 
  LogOut 
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, token, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: '#020617',
        color: '#00f2fe',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: 'bold',
        fontFamily: "'Outfit', sans-serif"
      }}>
        Đang khởi tạo các phân hệ ERP...
      </div>
    );
  }

  if (!token || !user) {
    return <Login />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onCheckInChange={setIsCheckedIn} setActiveTab={setActiveTab} />;
      case 'projects':
        return <ProjectView />;
      case 'calendar':
        return <CalendarView />;
      case 'departments':
        return <DepartmentManager />;
      case 'reports':
        return <WorkReports />;
      case 'salary':
        return <SalaryManager />;
      default:
        return <Dashboard onCheckInChange={setIsCheckedIn} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      {/* MOBILE TOP BAR (CHỈ HIỆN TRÊN MOBILE) */}
      <header className="mobile-top-bar" style={{
        padding: '10px 16px',
        background: '#ffffff',
        borderBottom: '1px solid var(--border-color)',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5, #00f2fe)',
            color: '#fff',
            fontWeight: 900,
            fontSize: 12,
            padding: '4px 6px',
            borderRadius: 6
          }}>
            VBE
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>VBE Agency</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user.name} ({user.role})</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 12,
            background: isCheckedIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            color: isCheckedIn ? '#10b981' : '#f59e0b'
          }}>
            {isCheckedIn ? '● Đã vào ca' : '○ Chưa vào ca'}
          </span>
          <button 
            onClick={logout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 4
            }}
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* DESKTOP SIDEBAR */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCheckedIn={isCheckedIn} 
      />

      {/* MAIN CONTENT AREA */}
      <main className="main-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {renderTabContent()}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (CHỈ HIỆN TRÊN MOBILE) */}
      <nav className="mobile-bottom-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '62px',
        background: '#ffffff',
        borderTop: '1px solid var(--border-color)',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 100,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
      }}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'dashboard' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: activeTab === 'dashboard' ? 700 : 500
          }}
        >
          <LayoutDashboard size={20} />
          <span>Tổng quan</span>
        </button>

        <button 
          onClick={() => setActiveTab('projects')} 
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'projects' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: activeTab === 'projects' ? 700 : 500
          }}
        >
          <FolderGit2 size={20} />
          <span>Dự án</span>
        </button>

        <button 
          onClick={() => setActiveTab('calendar')} 
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'calendar' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: activeTab === 'calendar' ? 700 : 500
          }}
        >
          <CalendarDays size={20} />
          <span>Lịch & Ca</span>
        </button>

        <button 
          onClick={() => setActiveTab('salary')} 
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'salary' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: activeTab === 'salary' ? 700 : 500
          }}
        >
          <Wallet size={20} />
          <span>Bảng lương</span>
        </button>

        {user.role === 'Admin' || user.role === 'Lead' ? (
          <button 
            onClick={() => setActiveTab('departments')} 
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: activeTab === 'departments' ? '#4f46e5' : '#64748b',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: activeTab === 'departments' ? 700 : 500
            }}
          >
            <Users2 size={20} />
            <span>Nhân sự</span>
          </button>
        ) : (
          <button 
            onClick={() => setActiveTab('reports')} 
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: activeTab === 'reports' ? '#4f46e5' : '#64748b',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: activeTab === 'reports' ? 700 : 500
            }}
          >
            <FileSpreadsheet size={20} />
            <span>Báo cáo</span>
          </button>
        )}
      </nav>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
