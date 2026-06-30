import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  due_date: string;
  status: string;
  project_name: string;
}

interface AttendanceLog {
  date: string;
  check_in: string;
  check_out: string | null;
  status: 'Present' | 'Late' | 'Absent';
}

export const CalendarView: React.FC = () => {
  const { user, fetchWithAuth } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadData = async () => {
    try {
      const taskRes = await fetchWithAuth('/api/tasks');
      if (taskRes.ok) {
        setTasks(await taskRes.json());
      }

      const attRes = await fetchWithAuth(`/api/attendance/logs?user_id=${user?.id}`);
      if (attRes.ok) {
        setAttendanceLogs(await attRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const prevLastDay = new Date(year, month, 0).getDate();
  
  const days: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  const startDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Tuần bắt đầu từ Thứ 2
  for (let i = startDay; i > 0; i--) {
    const prevMonthDate = new Date(year, month - 1, prevLastDay - i + 1);
    days.push({
      day: prevLastDay - i + 1,
      dateStr: prevMonthDate.toISOString().split('T')[0],
      isCurrentMonth: false
    });
  }

  for (let i = 1; i <= lastDay; i++) {
    const d = new Date(year, month, i);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset*60*1000));
    days.push({
      day: i,
      dateStr: localDate.toISOString().split('T')[0],
      isCurrentMonth: true
    });
  }

  const totalCells = 42;
  const remainingCells = totalCells - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonthDate = new Date(year, month + 1, i);
    days.push({
      day: i,
      dateStr: nextMonthDate.toISOString().split('T')[0],
      isCurrentMonth: false
    });
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getAttendanceStatus = (dateStr: string) => {
    const log = attendanceLogs.find(l => l.date === dateStr);
    if (log) return log;

    const dateObj = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (dateObj < today && dateObj.getDay() !== 0 && dateObj.getDay() !== 6) {
      return { status: 'Absent', check_in: '-', check_out: '-' } as AttendanceLog;
    }
    return null;
  };

  const monthLogs = attendanceLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate.getFullYear() === year && logDate.getMonth() === month;
  });

  const presentDays = monthLogs.filter(l => l.status === 'Present').length;
  const lateDays = monthLogs.filter(l => l.status === 'Late').length;
  const absentDays = days.filter(d => {
    if (!d.isCurrentMonth) return false;
    const stat = getAttendanceStatus(d.dateStr);
    return stat?.status === 'Absent';
  }).length;

  return (
    <div className="calendar-page animate-fade-in">
      <style>{`
        .calendar-page {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
          height: 100%;
          background: var(--bg-dark);
          display: grid;
          grid-template-columns: 3fr 1fr;
          gap: 24px;
          font-family: var(--font-family);
        }
        .calendar-main-panel {
          padding: 24px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .month-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .nav-btns {
          display: flex;
          gap: 8px;
        }
        .nav-btn {
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
        }
        .weekday-labels {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          grid-auto-rows: 100px;
        }
        .calendar-cell {
          padding: 8px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          transition: var(--transition-smooth);
        }
        .calendar-cell:hover {
          border-color: var(--text-muted);
          background: #f8f9fa;
        }
        .cell-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .day-num {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .calendar-cell.inactive .day-num {
          color: var(--text-muted);
          opacity: 0.4;
        }
        .calendar-cell.active-month .day-num {
          color: var(--text-primary);
        }
        .attendance-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .dot-Present { background-color: var(--accent-green); }
        .dot-Late { background-color: orange; }
        .dot-Absent { background-color: var(--accent-orange); }
 
        .cell-status-Present { background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.2); }
        .cell-status-Late { background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.2); }
        .cell-status-Absent { background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2); }
 
        .cell-tasks {
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: hidden;
          margin-top: 6px;
          flex: 1;
        }
        .cell-task-badge {
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 4px;
          background: rgba(79, 70, 229, 0.08);
          color: #4f46e5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cell-task-badge.done {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          text-decoration: line-through;
        }
 
        .side-stats-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .stat-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .stat-box-label {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .stat-box-val {
          font-size: 16px;
          font-weight: 700;
        }
        .att-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>

      {/* MAIN CALENDAR GRID */}
      <div className="calendar-main-panel glass-panel">
        <div className="calendar-header">
          <div className="month-title">
            <Calendar className="text-cyan-400" />
            <span>
              {currentDate.toLocaleString('vi-VN', { month: 'long' })} Năm {year}
            </span>
          </div>
          <div className="nav-btns">
            <button className="btn-outline nav-btn" onClick={prevMonth}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn-outline nav-btn" onClick={nextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="weekday-labels">
          <span>Thứ 2</span>
          <span>Thứ 3</span>
          <span>Thứ 4</span>
          <span>Thứ 5</span>
          <span>Thứ 6</span>
          <span>Thứ 7</span>
          <span>Chủ nhật</span>
        </div>

        <div className="calendar-grid">
          {days.map((cell, idx) => {
            const att = getAttendanceStatus(cell.dateStr);
            const dayTasks = tasks.filter(t => t.due_date === cell.dateStr);
            
            return (
              <div 
                key={idx} 
                className={`calendar-cell ${cell.isCurrentMonth ? 'active-month' : 'inactive'} ${att ? `cell-status-${att.status}` : ''}`}
              >
                <div className="cell-header">
                  <span className="day-num">{cell.day}</span>
                  {att && (
                    <div 
                      className={`attendance-dot dot-${att.status}`} 
                      title={`Điểm danh: ${att.status === 'Present' ? 'Đúng giờ' : att.status === 'Late' ? 'Đi trễ' : 'Vắng mặt'} ${att.check_in !== '-' ? `(${att.check_in})` : ''}`}
                    />
                  )}
                </div>

                <div className="cell-tasks">
                  {dayTasks.map(task => (
                    <span 
                      key={task.id} 
                      className={`cell-task-badge ${task.status === 'Done' ? 'done' : ''}`}
                      title={`${task.project_name}: ${task.title}`}
                    >
                      {task.title}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* THÔNG TIN CHẤM CÔNG */}
      <div className="side-stats-panel glass-panel">
        <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} className="text-cyan-400" />
          Bảng Công Cá Nhân
        </h3>
        
        <div className="att-legend">
          <div className="legend-item">
            <div className="attendance-dot dot-Present" />
            <span>Đúng giờ / Đủ công</span>
          </div>
          <div className="legend-item">
            <div className="attendance-dot dot-Late" />
            <span>Đi trễ</span>
          </div>
          <div className="legend-item">
            <div className="attendance-dot dot-Absent" />
            <span>Vắng mặt (Không phép)</span>
          </div>
        </div>

        <div className="stat-box">
          <span className="stat-box-label">Ngày đúng giờ</span>
          <span className="stat-box-val" style={{ color: 'var(--accent-green)' }}>{presentDays}</span>
        </div>

        <div className="stat-box">
          <span className="stat-box-label">Ngày đi trễ</span>
          <span className="stat-box-val" style={{ color: 'orange' }}>{lateDays}</span>
        </div>

        <div className="stat-box">
          <span className="stat-box-label">Ngày vắng</span>
          <span className="stat-box-val" style={{ color: 'var(--accent-orange)' }}>{absentDays}</span>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Quy định giờ giấc</h4>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Ca làm việc tiêu chuẩn bắt đầu vào 9:00 sáng. Nhân viên check-in sau 9:00 sẽ tự động bị hệ thống ghi nhận đi trễ.
          </p>
        </div>
      </div>
    </div>
  );
};
