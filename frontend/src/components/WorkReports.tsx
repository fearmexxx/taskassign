import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Calendar, Filter, User } from 'lucide-react';

interface Report {
  id: number;
  user_id: number;
  user_name: string;
  department_name: string;
  content: string;
  date: string;
  status: 'Submitted' | 'Approved';
}

interface TeamMember {
  id: number;
  name: string;
}

export const WorkReports: React.FC = () => {
  const { user, fetchWithAuth } = useAuth();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');

  const loadReports = async () => {
    try {
      let url = '/api/reports';
      if (selectedUser) {
        url += `?user_id=${selectedUser}`;
      }

      const res = await fetchWithAuth(url);
      if (res.ok) {
        setReports(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadTeam = async () => {
    try {
      const res = await fetchWithAuth('/api/users');
      if (res.ok) {
        setTeam(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedUser]);

  useEffect(() => {
    loadTeam();
  }, []);

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
    <div className="reports-page animate-fade-in">
      <style>{`
        .reports-page {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
          height: 100%;
          background: var(--bg-dark);
          font-family: var(--font-family);
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding: 12px 16px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .filter-select {
          padding: 8px 12px;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-family: var(--font-family);
          cursor: pointer;
        }
        .filter-select:focus {
          outline: none;
          border-color: #4f46e5;
        }
        .report-feed {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .report-feed-card {
          padding: 20px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          margin-bottom: 12px;
          font-size: 13px;
        }
        .reporter-name-dept {
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .reporter-dept {
          font-size: 11px;
          font-weight: 500;
          color: #4f46e5;
          background: rgba(79, 70, 229, 0.08);
          padding: 2px 8px;
          border-radius: 12px;
        }
        .report-date {
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .report-body {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-primary);
          white-space: pre-wrap;
        }
      `}</style>
 
      <div className="header-section">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Báo Cáo Công Việc Cuối Ngày</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Xem báo cáo tiến độ hoạt động ngày và ghi chú công việc của toàn agency</p>
        </div>
      </div>

      {/* THANH LỌC BÁO CÁO CHO ADMIN/LEADS */}
      {(user?.role === 'Admin' || user?.role === 'Lead') && (
        <div className="filter-bar glass-panel">
          <Filter size={16} className="text-cyan-400" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Lọc Theo Nhân Viên:</span>
          <select 
            className="filter-select"
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
          >
            <option value="">-- Tất cả nhân sự --</option>
            {team.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* FEED BÁO CÁO */}
      <div className="report-feed">
        {reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p>Chưa có báo cáo công việc nào được gửi trong hệ thống.</p>
          </div>
        ) : (
          reports.map(rep => (
            <div key={rep.id} className="report-feed-card glass-panel">
              <div className="card-meta">
                <div className="reporter-name-dept">
                  <User size={14} className="text-cyan-400" />
                  <span>{rep.user_name}</span>
                  <span className="reporter-dept">{translateDept(rep.department_name)}</span>
                </div>
                <div className="report-date">
                  <Calendar size={13} />
                  <span>{rep.date}</span>
                </div>
              </div>
              <div className="report-body">
                {rep.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
