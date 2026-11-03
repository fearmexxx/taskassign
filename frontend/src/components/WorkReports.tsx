import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Calendar, Filter, User, Sparkles, Send, CheckCircle } from 'lucide-react';

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
  const [reportContent, setReportContent] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleAutoGenerateReport = async () => {
    if (!user) return;
    setAutoFilling(true);
    try {
      const res = await fetchWithAuth('/api/tasks');
      if (res.ok) {
        const allTasks: any[] = await res.json();
        const myTasks = allTasks.filter(t =>
          t.owner_id === user.id ||
          t.sub_owner_id === user.id ||
          t.assignee_id === user.id ||
          (t.members && t.members.some((m: any) => m.user_id === user.id))
        );
        const doneTasks = myTasks.filter(t => t.status === 'Done');
        const inProgressTasks = myTasks.filter(t => t.status === 'InProgress' || t.status === 'Review');
        const todoTasks = myTasks.filter(t => t.status === 'Todo');

        const lines: string[] = [
          `📅 BÁO CÁO CÔNG VIỆC NGÀY ${new Date().toLocaleDateString('vi-VN')}:`,
          '',
          `✅ Đã hoàn thành (${doneTasks.length} việc):`,
          ...(doneTasks.length > 0
            ? doneTasks.slice(0, 10).map(t => `- [${t.project_name || 'Dự án'}] ${t.title}`)
            : ['- (Chưa có đầu việc đánh dấu hoàn thành)']),
          '',
          `🔄 Đang triển khai & Chờ duyệt (${inProgressTasks.length} việc):`,
          ...(inProgressTasks.length > 0
            ? inProgressTasks.slice(0, 10).map(t => `- [${t.project_name || 'Dự án'}] ${t.title} (Hạn: ${t.due_date || 'N/A'})`)
            : ['- (Không có)']),
          '',
          `📋 Kế hoạch tiếp theo (${todoTasks.length} việc chờ làm):`,
          ...(todoTasks.length > 0
            ? todoTasks.slice(0, 6).map(t => `- [${t.project_name || 'Dự án'}] ${t.title} (Hạn: ${t.due_date || 'N/A'})`)
            : ['- Tiếp tục theo dõi tiến độ dự án được phân công.'])
        ];
        setReportContent(lines.join('\n'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAutoFilling(false);
    }
  };

  const handleSubmitNewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ content: reportContent })
      });
      if (res.ok) {
        setReportContent('');
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
        loadReports();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

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
        @media (max-width: 768px) {
          .reports-content {
            padding: 14px 12px 80px 12px !important;
          }
          .header-section {
            margin-bottom: 14px !important;
          }
          .header-section h1 {
            font-size: 19px !important;
          }
          .filter-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
            padding: 12px !important;
          }
          .report-feed-card {
            padding: 14px !important;
          }
        }
      `}</style>
 
      <div className="header-section">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Báo Cáo Công Việc Cuối Ngày</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Xem báo cáo tiến độ hoạt động ngày và ghi chú công việc của toàn agency</p>
        </div>
      </div>

      {/* KHUNG VIẾT & TỰ ĐỘNG TỔNG HỢP BÁO CÁO NGÀY (1-CLICK EOD REPORT) */}
      <form
        onSubmit={handleSubmitNewReport}
        className="glass-panel"
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 24
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            ✍️ Gửi Báo Cáo Công Việc Hôm Nay ({new Date().toLocaleDateString('vi-VN')})
          </div>
          <button
            type="button"
            onClick={handleAutoGenerateReport}
            disabled={autoFilling}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #c084fc',
              background: 'rgba(168, 85, 247, 0.08)',
              color: '#7e22ce',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: autoFilling ? 'wait' : 'pointer'
            }}
          >
            <Sparkles size={14} />
            <span>{autoFilling ? 'Đang tổng hợp...' : '✨ Tự động tổng hợp việc hôm nay'}</span>
          </button>
        </div>

        <textarea
          rows={5}
          placeholder="Bấm nút '✨ Tự động tổng hợp việc hôm nay' để hệ thống tự lấy các Task bạn đã hoàn thành & đang làm, hoặc nhập ghi chú bổ sung tại đây..."
          value={reportContent}
          onChange={e => setReportContent(e.target.value)}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            fontSize: 13.5,
            fontFamily: 'var(--font-family)',
            lineHeight: 1.5,
            marginBottom: 10,
            resize: 'vertical'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {submitSuccess && (
              <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={15} /> Đã lưu báo cáo cuối ngày thành công!
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || !reportContent.trim()}
            className="btn-neon"
            style={{ padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Send size={14} />
            <span>{submitting ? 'Đang gửi...' : 'Gửi Báo Cáo EOD'}</span>
          </button>
        </div>
      </form>

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
