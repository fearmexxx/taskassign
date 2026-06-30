import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  Send,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface DashboardProps {
  onCheckInChange: (checkedIn: boolean) => void;
  setActiveTab: (tab: string) => void;
}

interface Task {
  id: number;
  title: string;
  description: string;
  project_id: number;
  assignee_id: number;
  status: 'Todo' | 'InProgress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  due_date: string;
  project_name: string;
  assignee_name: string;
}

interface AttendanceToday {
  check_in: string | null;
  check_out: string | null;
  status: 'Present' | 'Late' | 'Absent' | null;
}

interface TeamStatus {
  user_name: string;
  department_name: string;
  check_in: string;
  status: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onCheckInChange, setActiveTab }) => {
  const { user, fetchWithAuth } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<AttendanceToday>({ check_in: null, check_out: null, status: null });
  const [teamLogs, setTeamLogs] = useState<TeamStatus[]>([]);
  const [reportText, setReportText] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const attRes = await fetchWithAuth('/api/attendance/today');
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData);
        onCheckInChange(!!attData.check_in);
      }

      const tasksRes = await fetchWithAuth('/api/tasks');
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }

      const teamRes = await fetchWithAuth('/api/attendance/admin-logs');
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLogs = teamData.filter((log: any) => log.date === todayStr);
        setTeamLogs(todayLogs);
      }
    } catch (e) {
      console.error("Error loading dashboard data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCheckIn = async () => {
    try {
      const res = await fetchWithAuth('/api/attendance/checkin', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAttendance(data);
        onCheckInChange(true);
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await fetchWithAuth('/api/attendance/checkout', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAttendance(data);
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;

    try {
      const res = await fetchWithAuth('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ content: reportText }),
      });
      if (res.ok) {
        setReportText('');
        setReportSubmitted(true);
        setTimeout(() => setReportSubmitted(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, currentStatus: string) => {
    const nextStatusMap: Record<string, 'Todo' | 'InProgress' | 'Review' | 'Done'> = {
      'Todo': 'InProgress',
      'InProgress': 'Review',
      'Review': 'Done',
      'Done': 'Todo'
    };
    const nextStatus = nextStatusMap[currentStatus] || 'Todo';

    try {
      const res = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const myPendingTasks = tasks.filter(t => t.assignee_id === user?.id && t.status !== 'Done');
  const myTasksCount = tasks.filter(t => t.assignee_id === user?.id).length;
  const myCompletedCount = tasks.filter(t => t.assignee_id === user?.id && t.status === 'Done').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueTasksCount = tasks.filter(t => t.assignee_id === user?.id && t.status !== 'Done' && t.due_date < todayStr).length;

  const translateStatus = (status: string) => {
    const statuses: Record<string, string> = {
      'Todo': 'Cần làm',
      'InProgress': 'Đang làm',
      'Review': 'Đánh giá',
      'Done': 'Hoàn thành'
    };
    return statuses[status] || status;
  };

  const translatePriority = (priority: string) => {
    const priorities: Record<string, string> = {
      'High': 'Cao',
      'Medium': 'Trung bình',
      'Low': 'Thấp'
    };
    return priorities[priority] || priority;
  };

  const translateAttStatus = (status: string) => {
    const stats: Record<string, string> = {
      'Present': 'Đúng giờ',
      'Late': 'Đi trễ',
      'Absent': 'Vắng mặt'
    };
    return stats[status] || status;
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

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <style>{`
          .dashboard-loading {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-cyan);
            font-size: 18px;
            font-family: var(--font-family);
          }
        `}</style>
        <span>Đang kết nối cơ sở dữ liệu phân hệ ERP...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-content animate-fade-in">
      <style>{`
        .dashboard-content {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
          height: 100%;
          background: var(--bg-dark);
          font-family: var(--font-family);
        }
        .header-section {
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-title {
          font-size: 26px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .header-subtitle {
          color: var(--text-secondary);
          font-size: 14px;
          margin-top: 4px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .metric-card {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .metric-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .metric-info {
          display: flex;
          flex-direction: column;
        }
        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
          margin-bottom: 4px;
        }
        .metric-label {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .main-dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        .section-panel {
          padding: 24px;
          margin-bottom: 24px;
        }
        .panel-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .checkin-widget {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          background: #ffffff;
          border: 1px dashed var(--border-color);
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .checkin-time-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .checkin-time-label {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .checkin-time-value {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .checkin-actions {
          display: flex;
          gap: 12px;
        }
        .checkin-btn {
          padding: 10px 20px;
          font-size: 14px;
        }
        .report-form textarea {
          width: 100%;
          height: 100px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          padding: 12px;
          font-size: 14px;
          resize: none;
          margin-bottom: 12px;
          transition: var(--transition-smooth);
        }
        .report-form textarea:focus {
          outline: none;
          border-color: var(--accent-cyan);
        }
        .report-submit-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .success-msg {
          color: var(--accent-green);
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .task-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          transition: var(--transition-smooth);
        }
        .task-item:hover {
          border-color: var(--text-muted);
          background: #f8f9fa;
        }
        .task-main {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        .task-checkbox {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 2px solid var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-smooth);
        }
        .task-checkbox.checked {
          border-color: var(--accent-green);
          background: var(--accent-green);
        }
        .task-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .task-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .task-meta {
          font-size: 12px;
          color: var(--text-secondary);
          display: flex;
          gap: 10px;
        }
        .priority-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .priority-High { background: rgba(224, 83, 60, 0.1); color: var(--accent-orange); }
        .priority-Medium { background: rgba(32, 160, 255, 0.1); color: var(--accent-cyan); }
        .priority-Low { background: rgba(140, 155, 165, 0.1); color: var(--text-secondary); }
        
        .status-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
          background: #f1f3f5;
          color: var(--text-secondary);
        }
        .status-InProgress { color: var(--accent-cyan); background: rgba(32, 160, 255, 0.05); }
        .status-Review { color: var(--accent-purple); background: rgba(155, 81, 224, 0.05); }

        .team-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .team-member-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid var(--border-color);
        }
        .member-main {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .member-avatar-small {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1f3f5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }
        .member-text {
          display: flex;
          flex-direction: column;
        }
        .member-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .member-dept {
          font-size: 10px;
          color: var(--text-muted);
        }
        .checkin-badge {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }
        .badge-Present { background: rgba(39, 174, 96, 0.1); color: var(--accent-green); }
        .badge-Late { background: rgba(255, 165, 0, 0.1); color: orange; }
      `}</style>

      <div className="header-section">
        <div>
          <h1 className="header-title">Chào mừng trở lại, {user?.name}</h1>
          <p className="header-subtitle">Hệ thống ERP • Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* THẺ CHỈ SỐ */}
      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <div className="metric-icon-box" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)' }}>
            <Layers size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{myTasksCount}</span>
            <span className="metric-label">Công việc của tôi</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon-box" style={{ background: 'rgba(0, 255, 135, 0.1)', color: 'var(--accent-green)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{myCompletedCount}</span>
            <span className="metric-label">Đã hoàn thành</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon-box" style={{ background: 'rgba(255, 88, 88, 0.1)', color: 'var(--accent-orange)' }}>
            <AlertCircle size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{overdueTasksCount}</span>
            <span className="metric-label">Công việc trễ hạn</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon-box" style={{ background: 'rgba(79, 172, 254, 0.1)', color: 'var(--accent-purple)' }}>
            <Users size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{teamLogs.length} / 10</span>
            <span className="metric-label">Đã chấm công hôm nay</span>
          </div>
        </div>
      </div>

      <div className="main-dashboard-grid">
        {/* CỘT TRÁI */}
        <div>
          {/* CHẤM CÔNG HÀNG NGÀY */}
          <div className="section-panel glass-panel">
            <h3 className="panel-title">
              <Clock size={20} className="text-cyan-400" />
              Chấm Công Hàng Ngày
            </h3>
            
            <div className="checkin-widget">
              <div className="checkin-time-info">
                <span className="checkin-time-label">Nhật ký chấm công hôm nay:</span>
                {attendance.check_in ? (
                  <span className="checkin-time-value">
                    Giờ vào: {attendance.check_in} {attendance.status === 'Late' && <span style={{ color: 'orange', fontSize: 13 }}>(Đi trễ)</span>}
                    {attendance.check_out ? ` | Giờ ra: ${attendance.check_out}` : ''}
                  </span>
                ) : (
                  <span className="checkin-time-value" style={{ color: 'var(--text-muted)' }}>
                    Chưa có lịch sử chấm công
                  </span>
                )}
              </div>

              <div className="checkin-actions">
                {!attendance.check_in ? (
                  <button onClick={handleCheckIn} className="btn-neon checkin-btn">
                    Chấm công vào (VÀO CA)
                  </button>
                ) : !attendance.check_out ? (
                  <button onClick={handleCheckOut} className="btn-outline checkin-btn" style={{ borderColor: 'var(--accent-orange)', color: 'var(--accent-orange)' }}>
                    Chấm công ra (HẾT CA)
                  </button>
                ) : (
                  <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Hoàn thành ngày làm việc</span>
                )}
              </div>
            </div>

            {/* BÁO CÁO CÔNG VIỆC CUỐI NGÀY */}
            <form onSubmit={handleSubmitReport} className="report-form">
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Báo cáo công việc hàng ngày (EOD)</h4>
              <textarea
                placeholder="Nhập nội dung công việc, đầu việc đã thực hiện hoặc ghi chú khó khăn hôm nay..."
                value={reportText}
                onChange={e => setReportText(e.target.value)}
              />
              <div className="report-submit-bar">
                {reportSubmitted ? (
                  <span className="success-msg">
                    <CheckCircle size={16} /> Gửi báo cáo thành công!
                  </span>
                ) : <span />}
                <button type="submit" className="btn-neon" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Send size={14} /> Gửi báo cáo
                </button>
              </div>
            </form>
          </div>

          {/* DANH SÁCH NHIỆM VỤ CẬN DEADLINE */}
          <div className="section-panel glass-panel">
            <h3 className="panel-title">
              <Calendar size={20} />
              Nhiệm vụ sắp tới của tôi
            </h3>
            
            {myPendingTasks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Tất cả đã hoàn thành! Bạn không có công việc nào đang chờ xử lý.</p>
            ) : (
              <div className="task-list">
                {myPendingTasks.map(task => (
                  <div key={task.id} className="task-item">
                    <div className="task-main">
                      <div 
                        className="task-checkbox" 
                        onClick={() => handleUpdateTaskStatus(task.id, task.status)}
                      />
                      <div className="task-details">
                        <span className="task-title">{task.title}</span>
                        <div className="task-meta">
                          <span>Dự án: {task.project_name}</span>
                          <span>•</span>
                          <span style={{ color: task.due_date < todayStr ? 'var(--accent-orange)' : 'inherit' }}>
                            Hạn chót: {task.due_date} {task.due_date < todayStr && '(Trễ hạn)'}
                          </span>
                          <span className={`priority-badge priority-${task.priority}`}>{translatePriority(task.priority)}</span>
                        </div>
                      </div>
                    </div>
                    <span 
                      className={`status-badge status-${task.status}`}
                      onClick={() => handleUpdateTaskStatus(task.id, task.status)}
                      style={{ cursor: 'pointer' }}
                    >
                      {translateStatus(task.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: THÀNH VIÊN ĐÃ ĐI LÀM HÔM NAY */}
        <div>
          <div className="section-panel glass-panel" style={{ height: '100%' }}>
            <h3 className="panel-title">
              <Users size={20} />
              Nhân sự đã check-in
            </h3>
            
            {teamLogs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Chưa có nhân viên nào check-in hôm nay.</p>
            ) : (
              <div className="team-grid">
                {teamLogs.map((log, idx) => (
                  <div key={idx} className="team-member-row">
                    <div className="member-main">
                      <div className="member-avatar-small">
                        {log.user_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="member-text">
                        <span className="member-name">{log.user_name}</span>
                        <span className="member-dept">{translateDept(log.department_name)} • {log.check_in}</span>
                      </div>
                    </div>
                    <span className={`checkin-badge badge-${log.status}`}>
                      {translateAttStatus(log.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
