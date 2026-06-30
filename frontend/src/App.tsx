import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { CalendarView } from './components/CalendarView';
import { DepartmentManager } from './components/DepartmentManager';
import { WorkReports } from './components/WorkReports';

const AppContent: React.FC = () => {
  const { user, token, isLoading } = useAuth();
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
      default:
        return <Dashboard onCheckInChange={setIsCheckedIn} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCheckedIn={isCheckedIn} 
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {renderTabContent()}
      </main>
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
