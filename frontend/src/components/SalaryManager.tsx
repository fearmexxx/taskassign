import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, DollarSign, Clock, Users } from 'lucide-react';

interface SalaryReportRow {
  user_id: number;
  name: string;
  email: string;
  role: string;
  department_name: string;
  base_salary: number;
  target_days: number;
  present_days: number;
  late_days: number;
  absent_days: number;
  hours_worked: number;
  calculated_salary: number;
}

export const SalaryManager: React.FC = () => {
  const { user, fetchWithAuth } = useAuth();
  const [report, setReport] = useState<SalaryReportRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7); // Default YYYY-MM
  });
  const [personalLogs, setPersonalLogs] = useState<any[]>([]);

  const loadReport = async () => {
    try {
      const res = await fetchWithAuth(`/api/attendance/salary-report?month=${selectedMonth}`);
      if (res.ok) {
        setReport(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPersonalLogs = async () => {
    try {
      const res = await fetchWithAuth(`/api/attendance/logs?user_id=${user?.id}`);
      if (res.ok) {
        const logs = await res.json();
        // Filter logs matching the selected month
        const filtered = logs.filter((log: any) => log.date.startsWith(selectedMonth));
        setPersonalLogs(filtered);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadReport();
    if (user?.role === 'Member') {
      loadPersonalLogs();
    }
  }, [selectedMonth]);

  const getMonthOptions = () => {
    const options = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const m = date.getMonth() - i;
      const d = new Date(date.getFullYear(), m, 1);
      const val = d.toISOString().slice(0, 7);
      const label = `Tháng ${d.getMonth() + 1} - Năm ${d.getFullYear()}`;
      options.push({ val, label });
    }
    return options;
  };

  // Helper to convert time strings (HH:MM:SS) to hours
  const parseTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    if (parts.length < 2) return null;
    const h = parts[0];
    const m = parts[1];
    return h + m / 60;
  };

  // Helper to calculate daily worked hours based on standard 9:30 - 18:30
  const calculateDailyHours = (checkIn: string | null, checkOut: string | null) => {
    const inHour = parseTime(checkIn);
    const outHour = parseTime(checkOut);
    if (inHour !== null && outHour !== null && outHour > inHour) {
      const start = Math.max(inHour, 9.5); // Max start counting from 9:30 AM
      const end = Math.min(outHour, 18.5); // Min stop counting at 6:30 PM
      return Math.max(0, end - start);
    }
    return 0;
  };

  const formatVND = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' ₫';
  };

  // If Member role, render personal payslip & daily breakdown
  const renderPersonalView = () => {
    const personalData = report.find(r => r.user_id === user?.id);
    if (!personalData) {
      return (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Đang tải dữ liệu công và lương...
        </div>
      );
    }

    return (
      <div className="personal-salary-grid">
        <style>{`
          .personal-salary-grid {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .payslip-summary-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .info-banner {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px 20px;
            font-size: 13px;
            color: var(--text-secondary);
            line-height: 1.6;
          }
          .logs-card {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 24px;
          }
          .logs-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 16px;
          }
          .logs-table th {
            text-align: left;
            padding: 12px;
            border-bottom: 2px solid #e8ecef;
            color: var(--text-secondary);
            font-weight: 600;
          }
          .logs-table td {
            padding: 12px;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-primary);
          }
        `}</style>

        {/* PAYSLIP SUMMARY CARDS */}
        <div className="payslip-summary-row">
          <div className="stat-box" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={16} /> Lương Thực Nhận (Tạm tính)</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#4f46e5' }}>{formatVND(personalData.calculated_salary)}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lương cơ bản: {formatVND(personalData.base_salary)}</span>
          </div>

          <div className="stat-box" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={16} /> Ngày Công Đi Làm</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>{personalData.present_days} / 23 <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>ngày công</span></span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vắng: {personalData.absent_days} ngày | Trễ: {personalData.late_days} lần</span>
          </div>

          <div className="stat-box" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={16} /> Tổng Số Giờ Làm Việc</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>{personalData.hours_worked} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>giờ</span></span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Trung bình ~{personalData.present_days > 0 ? Math.round((personalData.hours_worked / personalData.present_days) * 10) / 10 : 0}h / ngày công</span>
          </div>
        </div>

        {/* WORK HOUR POLICY RULES BANNER */}
        <div className="info-banner">
          💡 <strong>Quy chế tính công của công ty:</strong> Một ngày công tiêu chuẩn kéo dài <strong>9.0 giờ</strong>. Thời gian bắt đầu tính công chính thức từ <strong>9:30 AM</strong> đến <strong>6:30 PM (18:30)</strong>. Tổng ngày công quy định trong 1 tháng là <strong>23 ngày công</strong>.
          Các trường hợp check-in sau 9:30 sẽ bị ghi nhận đi trễ, lương ngày công được tính tỷ lệ thuận theo số giờ làm việc thực tế trong ngày.
        </div>

        {/* DAILY LOG DETAILS */}
        <div className="logs-card">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Chi Tiết Chấm Công Hàng Ngày</h3>
          {personalLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
              Không tìm thấy nhật ký chấm công nào cho tháng này.
            </div>
          ) : (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Ngày làm việc</th>
                  <th>Giờ vào (Check-in)</th>
                  <th>Giờ ra (Check-out)</th>
                  <th>Số giờ tính công</th>
                  <th>Trạng thái</th>
                  <th>Lương ngày công</th>
                </tr>
              </thead>
              <tbody>
                {personalLogs.map((log, idx) => {
                  const hours = calculateDailyHours(log.check_in, log.check_out);
                  const dailyRate = personalData.base_salary / 23.0;
                  const dayPay = (hours / 9.0) * dailyRate;
                  
                  return (
                    <tr key={idx}>
                      <td>{log.date}</td>
                      <td>{log.check_in || '-'}</td>
                      <td>{log.check_out || '-'}</td>
                      <td><strong>{hours}h</strong> / 9h</td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: log.status === 'Present' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: log.status === 'Present' ? '#10b981' : '#f59e0b'
                        }}>
                          {log.status === 'Present' ? 'Đúng giờ' : 'Đi trễ'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatVND(Math.round(dayPay))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // If Admin or Lead role, render company-wide overview table
  const renderManagementView = () => {
    const totalPayout = report.reduce((sum, r) => sum + r.calculated_salary, 0);
    const avgPresentDays = report.length > 0 ? Math.round((report.reduce((sum, r) => sum + r.present_days, 0) / report.length) * 10) / 10 : 0;
    
    return (
      <div className="management-salary-grid">
        <style>{`
          .management-salary-grid {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .mgmt-summary-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .table-card {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 24px;
            overflow-x: auto;
          }
          .salary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          .salary-table th {
            text-align: left;
            padding: 12px;
            border-bottom: 2px solid #e8ecef;
            color: var(--text-secondary);
            font-weight: 600;
            white-space: nowrap;
          }
          .salary-table td {
            padding: 12px;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-primary);
            white-space: nowrap;
          }
          .salary-table tr:hover {
            background-color: #f9f9fb;
          }
        `}</style>

        {/* MANAGEMENT OVERVIEW CARDS */}
        <div className="mgmt-summary-row">
          <div className="stat-box" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={16} /> Tổng Quỹ Lương Chi Trả</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#4f46e5' }}>{formatVND(totalPayout)}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phạm vi: {user?.role === 'Admin' ? 'Toàn bộ agency' : 'Nhân sự bộ phận'}</span>
          </div>

          <div className="stat-box" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Users size={16} /> Tổng Số Nhân Sự</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>{report.length} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>người</span></span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Trung bình ngày công làm việc: {avgPresentDays} / 23</span>
          </div>

          <div className="stat-box" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={16} /> Giờ Bắt Đầu Quy Định</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>09:30 - 18:30</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Khung giờ tính công chuẩn 9h/ngày</span>
          </div>
        </div>

        {/* DETAILED EMPLOYEES SALARY TABLE */}
        <div className="table-card">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Báo Cáo Bảng Công & Quỹ Lương</h3>
          <table className="salary-table">
            <thead>
              <tr>
                <th>Tên nhân sự</th>
                <th>Phòng ban</th>
                <th>Vai trò</th>
                <th>Công chuẩn</th>
                <th>Ngày đi làm</th>
                <th>Đi trễ</th>
                <th>Vắng mặt</th>
                <th>Tổng giờ công</th>
                <th>Lương cơ bản</th>
                <th>Thực nhận</th>
              </tr>
            </thead>
            <tbody>
              {report.map(row => (
                <tr key={row.user_id}>
                  <td><strong>{row.name}</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{row.email}</span></td>
                  <td>{translateDept(row.department_name)}</td>
                  <td>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      backgroundColor: row.role === 'Admin' ? 'rgba(239, 68, 68, 0.1)' : row.role === 'Lead' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                      color: row.role === 'Admin' ? '#ef4444' : row.role === 'Lead' ? '#4f46e5' : '#64748b'
                    }}>
                      {translateRole(row.role)}
                    </span>
                  </td>
                  <td>{row.target_days} ngày</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>{row.present_days} ngày</td>
                  <td style={{ color: row.late_days > 0 ? '#f59e0b' : 'inherit' }}>{row.late_days} lần</td>
                  <td style={{ color: row.absent_days > 0 ? '#ef4444' : 'inherit' }}>{row.absent_days} ngày</td>
                  <td><strong>{row.hours_worked}h</strong></td>
                  <td>{formatVND(row.base_salary)}</td>
                  <td style={{ fontWeight: 700, color: '#4f46e5', fontSize: 14 }}>{formatVND(row.calculated_salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
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
    <div className="salary-page animate-fade-in">
      <style>{`
        .salary-page {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
          height: 100%;
          background: var(--bg-dark);
          font-family: var(--font-family);
        }
        .salary-header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .month-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .month-select {
          padding: 8px 12px;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-family: var(--font-family);
          cursor: pointer;
          font-weight: 500;
        }
        .month-select:focus {
          outline: none;
          border-color: #4f46e5;
        }
      `}</style>

      <div className="salary-header-section">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Bảng Công & Tính Lương Tự Động</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Theo dõi ngày công làm việc thực tế, thời gian tính công và mức chi trả</p>
        </div>

        <div className="month-selector">
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Chọn kỳ lương:</span>
          <select 
            className="month-select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            {getMonthOptions().map(opt => (
              <option key={opt.val} value={opt.val}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {user?.role === 'Admin' || user?.role === 'Lead' ? renderManagementView() : renderPersonalView()}
    </div>
  );
};
