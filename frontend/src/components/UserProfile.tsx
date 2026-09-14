import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Mail, Lock, Shield, Building, Calendar, Clock, MapPin, 
  CheckCircle2, AlertTriangle, FileText, Save, Check, RefreshCw,
  Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AttendanceLog {
  id: number;
  user_id: number;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  location_type?: string;
  distance_meters?: number;
  note?: string;
  created_at: string;
}

interface WorkReport {
  id: number;
  user_id: number;
  user_name: string;
  report_date: string;
  tasks_completed: string;
  tasks_in_progress: string;
  plans_for_tomorrow: string;
  issues_or_blockers: string;
  status: string;
  feedback?: string;
  created_at: string;
}

export const UserProfile: React.FC = () => {
  const { user, updateUser, fetchWithAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'reports'>('info');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Status & Feedback
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState('');
  const [infoError, setInfoError] = useState('');

  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  // Attendance states
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Report states
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  // Fetch Attendance logs
  useEffect(() => {
    if (activeTab === 'attendance' && user) {
      fetchAttendance();
    }
  }, [activeTab, user]);

  // Fetch Work Reports
  useEffect(() => {
    if (activeTab === 'reports' && user) {
      fetchReports();
    }
  }, [activeTab, user]);

  const fetchAttendance = async () => {
    setLoadingAttendance(true);
    try {
      const res = await fetchWithAuth(`/api/attendance/logs?user_id=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceLogs(data || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử chấm công:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetchWithAuth('/api/reports');
      if (res.ok) {
        const data = await res.json();
        const myReports = (data || []).filter((r: WorkReport) => r.user_id === user?.id);
        setReports(myReports);
      }
    } catch (err) {
      console.error('Lỗi khi tải báo cáo công việc:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError('');
    setInfoSuccess('');
    setInfoLoading(true);

    try {
      const res = await fetchWithAuth('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra khi cập nhật thông tin.');
      }
      updateUser(data.user);
      setInfoSuccess('Cập nhật thông tin cá nhân thành công!');
      setTimeout(() => setInfoSuccess(''), 4000);
    } catch (err: any) {
      setInfoError(err.message || 'Có lỗi xảy ra khi cập nhật thông tin.');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword.length < 6) {
      setPassError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Mật khẩu hiện tại không chính xác.');
      }
      setPassSuccess('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(''), 4000);
    } catch (err: any) {
      setPassError(err.message || 'Mật khẩu hiện tại không chính xác.');
    } finally {
      setPassLoading(false);
    }
  };

  // Metrics for attendance
  const totalDays = attendanceLogs.length;
  const onTimeDays = attendanceLogs.filter(l => l.status === 'on_time').length;
  const lateDays = attendanceLogs.filter(l => l.status === 'late').length;
  const remoteDays = attendanceLogs.filter(l => l.location_type === 'remote').length;

  const roleLabel = user?.role === 'Admin' ? 'Quản trị viên' : user?.role === 'Lead' ? 'Trưởng bộ phận' : 'Nhân viên';

  return (
    <div className="profile-page animate-fade-in">
      <style>{`
        .profile-page {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
          height: 100%;
          background: var(--bg-dark);
          font-family: var(--font-family);
          color: var(--text-primary);
        }

        /* Top Header section matching Dashboard & Departments */
        .profile-header-section {
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .profile-header-title {
          font-size: 26px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .profile-header-subtitle {
          color: var(--text-secondary);
          font-size: 14px;
          margin-top: 4px;
        }

        /* Overview User Identity Card (Clean Asana White Card) */
        .user-identity-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: var(--glass-shadow);
          padding: 24px 28px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .identity-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .identity-avatar {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #1e293b;
          color: #00f2fe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 700;
          border: 2px solid rgba(0, 242, 254, 0.2);
          flex-shrink: 0;
        }

        .identity-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .identity-name {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .identity-role-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 12px;
          background: rgba(79, 70, 229, 0.08);
          color: #4f46e5;
          border: 1px solid rgba(79, 70, 229, 0.15);
        }

        .identity-meta {
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          flex-wrap: wrap;
        }

        .identity-status-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid var(--border-color);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        /* Filter Tab Bar matching Asana list tabs */
        .profile-tabs-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          padding: 6px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          overflow-x: auto;
        }

        .profile-tab-btn {
          padding: 8px 18px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-family);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-smooth);
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .profile-tab-btn:hover {
          color: var(--text-primary);
          background: #f8f9fa;
        }

        .profile-tab-btn.active {
          background: #4f46e5;
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
        }

        /* Grid Layout for Forms */
        .profile-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .form-panel {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: var(--glass-shadow);
          padding: 24px;
        }

        .panel-header-line {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-color);
        }

        .panel-icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(79, 70, 229, 0.08);
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .panel-title-text {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .panel-desc-text {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .field-group {
          margin-bottom: 16px;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .field-input-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-input-box .field-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .standard-input {
          width: 100%;
          padding: 9px 12px 9px 38px;
          font-size: 13px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-primary);
          font-family: var(--font-family);
          transition: var(--transition-smooth);
        }

        .standard-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
        }

        .standard-input:disabled {
          background: #f8fafc;
          color: var(--text-muted);
          cursor: not-allowed;
        }

        .eye-toggle-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 2px;
        }

        .eye-toggle-btn:hover {
          color: var(--text-primary);
        }

        .row-2-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .notification-banner {
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notification-banner.success {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #065f46;
        }

        .notification-banner.error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #991b1b;
        }

        /* Metrics grid for Attendance tab */
        .stat-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-bottom: 24px;
        }

        .stat-card-clean {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: var(--glass-shadow);
          padding: 20px;
          display: flex;
          flex-direction: column;
        }

        .stat-title {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .stat-number {
          font-size: 26px;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 6px;
          line-height: 1;
        }

        .stat-foot {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 8px;
        }

        /* Table panel */
        .panel-table-clean {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: var(--glass-shadow);
          overflow: hidden;
        }

        .panel-table-bar {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logs-table-styled {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }

        .logs-table-styled th {
          background: #fafbfc;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-color);
        }

        .logs-table-styled td {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
        }

        .logs-table-styled tr:last-child td {
          border-bottom: none;
        }

        .logs-table-styled tr:hover td {
          background: #f8fafc;
        }

        .status-chip {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .status-chip.present {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .status-chip.late {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .status-chip.remote {
          background: rgba(168, 85, 247, 0.12);
          color: #7c3aed;
        }

        .status-chip.office {
          background: #f1f5f9;
          color: #475569;
        }

        /* Report item cards */
        .report-history-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          padding: 18px 20px;
          margin-bottom: 14px;
          transition: var(--transition-smooth);
        }

        .report-history-card:hover {
          border-color: #d0d5dd;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .report-header-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          margin-bottom: 14px;
          border-bottom: 1px solid var(--border-color);
        }

        .report-sections-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .report-box {
          background: #fafbfc;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 12px 14px;
          font-size: 12px;
        }

        .report-box-title {
          font-weight: 600;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .report-box-text {
          color: var(--text-primary);
          line-height: 1.5;
          white-space: pre-line;
        }

        /* Mobile Responsive adjustments */
        @media (max-width: 768px) {
          .profile-page {
            padding: 14px 12px 80px 12px;
          }
          .user-identity-card {
            flex-direction: column;
            align-items: flex-start;
            padding: 18px;
          }
          .identity-avatar {
            width: 48px;
            height: 48px;
            font-size: 18px;
          }
          .identity-name {
            font-size: 18px;
          }
          .identity-status-pill {
            width: 100%;
          }
          .profile-grid-2 {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .row-2-cols {
            grid-template-columns: 1fr;
          }
          .stat-grid-4 {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .report-sections-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Page Title Row */}
      <div className="profile-header-section">
        <div>
          <h1 className="profile-header-title">Hồ sơ cá nhân</h1>
          <p className="profile-header-subtitle">Quản lý thông tin tài khoản, mật khẩu, lịch sử chấm công và báo cáo công việc</p>
        </div>
      </div>

      {/* Identity Summary Card */}
      <div className="user-identity-card">
        <div className="identity-left">
          <div className="identity-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="identity-name-row">
              <span className="identity-name">{user?.name}</span>
              <span className="identity-role-badge">{roleLabel}</span>
            </div>
            <div className="identity-meta">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Mail size={14} color="var(--text-muted)" /> {user?.email}
              </span>
              {user?.department_name && (
                <>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Building size={14} color="var(--text-muted)" /> {user?.department_name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="identity-status-pill">
          <Shield size={16} color="#10b981" />
          <span>Tài khoản chính thức • VBE Agency</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="profile-tabs-bar">
        <button
          onClick={() => setActiveTab('info')}
          className={`profile-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
        >
          <UserIcon size={16} />
          Thông tin cá nhân & Đổi mật khẩu
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`profile-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
        >
          <Clock size={16} />
          Lịch sử chấm công
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`profile-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
        >
          <FileText size={16} />
          Báo cáo công việc đã gửi
        </button>
      </div>

      {/* TAB 1: Thông tin & Mật khẩu */}
      {activeTab === 'info' && (
        <div className="profile-grid-2">
          {/* Card: Thông tin cá nhân */}
          <div className="form-panel">
            <div className="panel-header-line">
              <div className="panel-icon-circle">
                <UserIcon size={18} />
              </div>
              <div>
                <h3 className="panel-title-text">Thông tin cơ bản</h3>
                <p className="panel-desc-text">Cập nhật họ tên và địa chỉ email liên hệ</p>
              </div>
            </div>

            {infoSuccess && (
              <div className="notification-banner success">
                <CheckCircle2 size={16} />
                <span>{infoSuccess}</span>
              </div>
            )}

            {infoError && (
              <div className="notification-banner error">
                <AlertTriangle size={16} />
                <span>{infoError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateInfo}>
              <div className="field-group">
                <label className="field-label">Họ và tên</label>
                <div className="field-input-box">
                  <UserIcon size={16} className="field-icon" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="standard-input"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Địa chỉ Email</label>
                <div className="field-input-box">
                  <Mail size={16} className="field-icon" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="standard-input"
                    placeholder="user@vbe.vn"
                  />
                </div>
              </div>

              <div className="row-2-cols field-group">
                <div>
                  <label className="field-label">Phòng ban</label>
                  <input
                    type="text"
                    disabled
                    value={user?.department_name || 'Ban Quản Trị Chung'}
                    className="standard-input"
                    style={{ paddingLeft: 12 }}
                  />
                </div>

                <div>
                  <label className="field-label">Vai trò</label>
                  <input
                    type="text"
                    disabled
                    value={roleLabel}
                    className="standard-input"
                    style={{ paddingLeft: 12 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 22 }}>
                <button
                  type="submit"
                  disabled={infoLoading}
                  className="btn-neon"
                  style={{ padding: '10px 20px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {infoLoading ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                  Lưu thay đổi thông tin
                </button>
              </div>
            </form>
          </div>

          {/* Card: Đổi mật khẩu */}
          <div className="form-panel">
            <div className="panel-header-line">
              <div className="panel-icon-circle">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="panel-title-text">Đổi mật khẩu</h3>
                <p className="panel-desc-text">Bảo mật tài khoản với mật khẩu tối thiểu 6 ký tự</p>
              </div>
            </div>

            {passSuccess && (
              <div className="notification-banner success">
                <CheckCircle2 size={16} />
                <span>{passSuccess}</span>
              </div>
            )}

            {passError && (
              <div className="notification-banner error">
                <AlertTriangle size={16} />
                <span>{passError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="field-group">
                <label className="field-label">Mật khẩu hiện tại</label>
                <div className="field-input-box">
                  <Lock size={16} className="field-icon" />
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="standard-input"
                    placeholder="Nhập mật khẩu đang dùng"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="eye-toggle-btn"
                    title={showCurrentPass ? 'Ẩn' : 'Hiện'}
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Mật khẩu mới</label>
                <div className="field-input-box">
                  <Lock size={16} className="field-icon" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="standard-input"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="eye-toggle-btn"
                    title={showNewPass ? 'Ẩn' : 'Hiện'}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Xác nhận mật khẩu mới</label>
                <div className="field-input-box">
                  <Check size={16} className="field-icon" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="standard-input"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>
              </div>

              <div style={{ marginTop: 22 }}>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="btn-outline"
                  style={{ padding: '10px 20px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {passLoading ? <RefreshCw size={15} className="animate-spin" /> : <Lock size={15} />}
                  Cập nhật mật khẩu mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Lịch sử chấm công */}
      {activeTab === 'attendance' && (
        <div>
          {/* 4 Cards Thống kê */}
          <div className="stat-grid-4">
            <div className="stat-card-clean">
              <span className="stat-title">Tổng số lượt chấm</span>
              <span className="stat-number">{totalDays}</span>
              <span className="stat-foot">Lượt ghi nhận trên hệ thống</span>
            </div>

            <div className="stat-card-clean">
              <span className="stat-title">Đúng giờ</span>
              <span className="stat-number" style={{ color: '#10b981' }}>{onTimeDays}</span>
              <span className="stat-foot">
                {totalDays > 0 ? Math.round((onTimeDays / totalDays) * 100) : 0}% tỷ lệ đúng giờ
              </span>
            </div>

            <div className="stat-card-clean">
              <span className="stat-title">Đi muộn</span>
              <span className="stat-number" style={{ color: '#f59e0b' }}>{lateDays}</span>
              <span className="stat-foot">Check-in sau 09:30 sáng</span>
            </div>

            <div className="stat-card-clean">
              <span className="stat-title">Làm ngoài VP (Remote)</span>
              <span className="stat-number" style={{ color: '#7c3aed' }}>{remoteDays}</span>
              <span className="stat-foot">Cách trụ sở 772 Sư Vạn Hạnh &gt; 200m</span>
            </div>
          </div>

          {/* Bảng chấm công chi tiết */}
          <div className="panel-table-clean">
            <div className="panel-table-bar">
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Chi tiết lịch sử chấm công</h3>
              <button
                onClick={fetchAttendance}
                className="btn-outline"
                style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={13} className={loadingAttendance ? 'animate-spin' : ''} />
                Làm mới
              </button>
            </div>

            {loadingAttendance ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>
                Đang tải dữ liệu chấm công...
              </div>
            ) : attendanceLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: 13 }}>
                Chưa có dữ liệu chấm công nào được ghi nhận.
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table className="logs-table-styled">
                  <thead>
                    <tr>
                      <th>Ngày làm việc</th>
                      <th>Giờ vào</th>
                      <th>Giờ ra</th>
                      <th>Trạng thái</th>
                      <th>Địa điểm</th>
                      <th>Lý do / Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLogs.map((log) => {
                      const checkInDate = new Date(log.check_in_time);
                      const formattedDate = checkInDate.toLocaleDateString('vi-VN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      });
                      const formattedCheckIn = checkInDate.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      const formattedCheckOut = log.check_out_time
                        ? new Date(log.check_out_time).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '—';

                      const isRemote = log.location_type === 'remote';

                      return (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 600 }}>{formattedDate}</td>
                          <td style={{ fontWeight: 600, color: '#10b981' }}>{formattedCheckIn}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{formattedCheckOut}</td>
                          <td>
                            <span className={`status-chip ${log.status === 'on_time' ? 'present' : 'late'}`}>
                              {log.status === 'on_time' ? 'Đúng giờ' : 'Đi muộn'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-chip ${isRemote ? 'remote' : 'office'}`}>
                              <MapPin size={11} style={{ marginRight: 4 }} />
                              {isRemote ? 'Ngoài VP' : 'Tại văn phòng'}
                              {log.distance_meters !== undefined && log.distance_meters > 0 && (
                                <span style={{ opacity: 0.8, marginLeft: 3 }}>({log.distance_meters}m)</span>
                              )}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.note || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Báo cáo công việc đã gửi */}
      {activeTab === 'reports' && (
        <div className="panel-table-clean" style={{ padding: 24 }}>
          <div className="panel-table-bar" style={{ padding: '0 0 16px 0' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Báo cáo công việc cá nhân</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Danh sách các báo cáo ngày bạn đã nộp lên hệ thống
              </p>
            </div>
            <button
              onClick={fetchReports}
              className="btn-outline"
              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} className={loadingReports ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>

          {loadingReports ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>
              Đang tải danh sách báo cáo...
            </div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: 13 }}>
              Bạn chưa nộp báo cáo công việc nào.
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              {reports.map((r) => (
                <div key={r.id} className="report-history-card">
                  <div className="report-header-line">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(79, 70, 229, 0.08)', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={16} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Báo cáo ngày: {new Date(r.report_date).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`status-chip ${r.status === 'reviewed' ? 'present' : 'late'}`}>
                        {r.status === 'reviewed' ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Gửi lúc: {new Date(r.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="report-sections-grid">
                    <div className="report-box">
                      <div className="report-box-title" style={{ color: '#10b981' }}>
                        <CheckCircle2 size={13} /> Việc đã hoàn thành:
                      </div>
                      <div className="report-box-text">{r.tasks_completed || '—'}</div>
                    </div>

                    <div className="report-box">
                      <div className="report-box-title" style={{ color: '#4f46e5' }}>
                        <Clock size={13} /> Đang triển khai:
                      </div>
                      <div className="report-box-text">{r.tasks_in_progress || '—'}</div>
                    </div>

                    <div className="report-box">
                      <div className="report-box-title" style={{ color: '#2563eb' }}>
                        <Calendar size={13} /> Kế hoạch ngày mai:
                      </div>
                      <div className="report-box-text">{r.plans_for_tomorrow || '—'}</div>
                    </div>

                    <div className="report-box">
                      <div className="report-box-title" style={{ color: '#e0533c' }}>
                        <AlertTriangle size={13} /> Khó khăn / Đề xuất:
                      </div>
                      <div className="report-box-text">{r.issues_or_blockers || 'Không có khó khăn'}</div>
                    </div>
                  </div>

                  {r.feedback && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Nhận xét từ Quản lý:</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{r.feedback}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
