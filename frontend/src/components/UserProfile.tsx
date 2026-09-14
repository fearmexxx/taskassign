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

  const roleLabel = user?.role === 'Admin' ? 'Quản trị viên' : user?.role === 'Lead' ? 'Trưởng phòng' : 'Nhân viên';

  return (
    <div className="profile-page-wrapper">
      <style>{`
        .profile-page-wrapper {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
          height: 100%;
          background: var(--bg-dark);
          font-family: var(--font-family);
          color: var(--text-primary);
        }

        .profile-container {
          max-width: 1100px;
          margin: 0 auto;
        }

        /* Warm Gold & Amber Theme Palette */
        .profile-banner {
          background: linear-gradient(135deg, #b45309 0%, #d97706 45%, #f59e0b 100%);
          border-radius: 16px;
          padding: 28px 32px;
          color: #ffffff;
          box-shadow: 0 10px 25px -5px rgba(217, 119, 6, 0.25), 0 8px 10px -6px rgba(217, 119, 6, 0.2);
          margin-bottom: 28px;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .banner-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .banner-avatar {
          width: 72px;
          height: 72px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.2);
          flex-shrink: 0;
        }

        .banner-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .banner-name {
          font-size: 26px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .banner-role-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(255, 255, 255, 0.22);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.35);
        }

        .banner-subtitle {
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #fef3c7;
          flex-wrap: wrap;
        }

        .banner-right-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }

        /* Nav Tabs */
        .profile-nav-tabs {
          display: flex;
          border-bottom: 2px solid var(--border-color);
          margin-bottom: 28px;
          gap: 28px;
          overflow-x: auto;
        }

        .profile-nav-tab {
          padding: 12px 4px 14px 4px;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition-smooth);
          white-space: nowrap;
        }

        .profile-nav-tab:hover {
          color: #d97706;
        }

        .profile-nav-tab.active {
          color: #b45309;
          border-bottom-color: #d97706;
        }

        /* Forms Layout */
        .forms-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .profile-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid var(--border-color);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-color);
        }

        .card-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #fef3c7;
          color: #d97706;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-header-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .card-header-desc {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon-left {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .profile-input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          font-size: 13px;
          background: #fdfdfd;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          font-family: var(--font-family);
          outline: none;
          transition: var(--transition-smooth);
        }

        .profile-input:focus {
          border-color: #d97706;
          box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.12);
        }

        .profile-input:disabled {
          background: #f3f4f6;
          color: var(--text-muted);
          cursor: not-allowed;
        }

        .input-btn-toggle {
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

        .input-btn-toggle:hover {
          color: var(--text-primary);
        }

        .two-cols-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .btn-warm-gold {
          background: linear-gradient(135deg, #d97706, #b45309);
          color: #ffffff;
          border: none;
          padding: 11px 20px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: var(--transition-smooth);
          box-shadow: 0 2px 6px rgba(217, 119, 6, 0.25);
        }

        .btn-warm-gold:hover:not(:disabled) {
          background: linear-gradient(135deg, #b45309, #92400e);
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);
        }

        .btn-warm-gold:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-dark-slate {
          background: #1e293b;
          color: #ffffff;
          border: none;
          padding: 11px 20px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: var(--transition-smooth);
        }

        .btn-dark-slate:hover:not(:disabled) {
          background: #0f172a;
        }

        .btn-dark-slate:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert-box {
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alert-box.success {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }

        .alert-box.error {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #9f1239;
        }

        /* Metric Cards for Attendance */
        .metrics-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-metric-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 18px 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .stat-metric-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }

        .stat-metric-val {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-primary);
          margin-top: 6px;
          line-height: 1;
        }

        .stat-metric-val.gold { color: #d97706; }
        .stat-metric-val.green { color: #059669; }
        .stat-metric-val.amber { color: #d97706; }
        .stat-metric-val.warm { color: #b45309; }

        .stat-metric-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 6px;
        }

        /* Table Design */
        .profile-table-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid var(--border-color);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }

        .table-top-bar {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .custom-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }

        .custom-table th {
          background: #fafaf9;
          padding: 12px 18px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-color);
        }

        .custom-table td {
          padding: 14px 18px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
        }

        .custom-table tr:last-child td {
          border-bottom: none;
        }

        .custom-table tr:hover td {
          background: #fcfbf9;
        }

        .badge-status {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .badge-status.on-time {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .badge-status.late {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .badge-status.remote {
          background: #fef9c3;
          color: #854d0e;
          border: 1px solid #fef08a;
        }

        .badge-status.office {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        /* Reports list cards */
        .report-item-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 18px 20px;
          margin-bottom: 14px;
          transition: var(--transition-smooth);
        }

        .report-item-card:hover {
          border-color: #d97706;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.08);
        }

        .report-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
        }

        .report-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 12px;
        }

        .report-field-box {
          background: #fcfbf9;
          border: 1px solid #f2ede4;
          border-radius: 8px;
          padding: 10px 12px;
        }

        .report-field-label {
          font-weight: 700;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .report-field-content {
          color: var(--text-primary);
          line-height: 1.5;
          white-space: pre-line;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .profile-page-wrapper {
            padding: 14px 12px 80px 12px;
          }
          .profile-banner {
            flex-direction: column;
            align-items: flex-start;
            padding: 20px;
          }
          .banner-avatar {
            width: 56px;
            height: 56px;
            font-size: 22px;
          }
          .banner-name {
            font-size: 20px;
          }
          .banner-right-badge {
            width: 100%;
          }
          .forms-grid {
            grid-template-columns: 1fr;
          }
          .two-cols-row {
            grid-template-columns: 1fr;
          }
          .metrics-grid-4 {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .report-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="profile-container">
        {/* Header Warm Gold Banner */}
        <div className="profile-banner">
          <div className="banner-left">
            <div className="banner-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="banner-title-group">
                <h1 className="banner-name">{user?.name}</h1>
                <span className="banner-role-badge">
                  {roleLabel}
                </span>
              </div>
              <div className="banner-subtitle">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Mail size={14} style={{ opacity: 0.9 }} /> {user?.email}
                </span>
                {user?.department_name && (
                  <>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Building size={14} style={{ opacity: 0.9 }} /> {user?.department_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="banner-right-badge">
            <Shield size={20} color="#fef3c7" />
            <div>
              <div style={{ fontSize: 10, color: '#fef3c7', fontWeight: 600, textTransform: 'uppercase' }}>Trạng thái tài khoản</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Nhân sự chính thức</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="profile-nav-tabs">
          <button
            onClick={() => setActiveTab('info')}
            className={`profile-nav-tab ${activeTab === 'info' ? 'active' : ''}`}
          >
            <UserIcon size={16} />
            Thông tin cá nhân & Đổi mật khẩu
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`profile-nav-tab ${activeTab === 'attendance' ? 'active' : ''}`}
          >
            <Clock size={16} />
            Lịch sử chấm công
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`profile-nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
          >
            <FileText size={16} />
            Báo cáo công việc đã gửi
          </button>
        </div>

        {/* Tab 1: Info & Password */}
        {activeTab === 'info' && (
          <div className="forms-grid">
            {/* Personal Information Card */}
            <div className="profile-card">
              <div>
                <div className="card-header">
                  <div className="card-icon-box">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h2 className="card-header-title">Thông tin cơ bản</h2>
                    <p className="card-header-desc">Cập nhật họ tên và địa chỉ email liên hệ của bạn</p>
                  </div>
                </div>

                {infoSuccess && (
                  <div className="alert-box success">
                    <CheckCircle2 size={16} />
                    <span>{infoSuccess}</span>
                  </div>
                )}

                {infoError && (
                  <div className="alert-box error">
                    <AlertTriangle size={16} />
                    <span>{infoError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateInfo}>
                  <div className="form-group">
                    <label className="form-label">Họ và tên</label>
                    <div className="input-wrapper">
                      <UserIcon size={16} className="input-icon-left" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="profile-input"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Địa chỉ Email</label>
                    <div className="input-wrapper">
                      <Mail size={16} className="input-icon-left" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="profile-input"
                        placeholder="user@vbe.vn"
                      />
                    </div>
                  </div>

                  <div className="two-cols-row form-group">
                    <div>
                      <label className="form-label">Phòng ban</label>
                      <input
                        type="text"
                        disabled
                        value={user?.department_name || 'Ban Quản Trị Chung'}
                        className="profile-input"
                        style={{ paddingLeft: 14 }}
                      />
                    </div>

                    <div>
                      <label className="form-label">Vai trò</label>
                      <input
                        type="text"
                        disabled
                        value={roleLabel}
                        className="profile-input"
                        style={{ paddingLeft: 14 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <button
                      type="submit"
                      disabled={infoLoading}
                      className="btn-warm-gold"
                    >
                      {infoLoading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                      Lưu thông tin cá nhân
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="profile-card">
              <div>
                <div className="card-header">
                  <div className="card-icon-box">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h2 className="card-header-title">Đổi mật khẩu</h2>
                    <p className="card-header-desc">Bảo vệ tài khoản với mật khẩu tối thiểu 6 ký tự</p>
                  </div>
                </div>

                {passSuccess && (
                  <div className="alert-box success">
                    <CheckCircle2 size={16} />
                    <span>{passSuccess}</span>
                  </div>
                )}

                {passError && (
                  <div className="alert-box error">
                    <AlertTriangle size={16} />
                    <span>{passError}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu hiện tại</label>
                    <div className="input-wrapper">
                      <Lock size={16} className="input-icon-left" />
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="profile-input"
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="input-btn-toggle"
                        title={showCurrentPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mật khẩu mới</label>
                    <div className="input-wrapper">
                      <Lock size={16} className="input-icon-left" />
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="profile-input"
                        placeholder="Tối thiểu 6 ký tự"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="input-btn-toggle"
                        title={showNewPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Xác nhận mật khẩu mới</label>
                    <div className="input-wrapper">
                      <Check size={16} className="input-icon-left" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="profile-input"
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <button
                      type="submit"
                      disabled={passLoading}
                      className="btn-dark-slate"
                    >
                      {passLoading ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
                      Cập nhật mật khẩu
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Attendance History */}
        {activeTab === 'attendance' && (
          <div>
            {/* Metric Cards */}
            <div className="metrics-grid-4">
              <div className="stat-metric-card">
                <div className="stat-metric-label">Tổng lượt chấm</div>
                <div className="stat-metric-val">{totalDays}</div>
                <div className="stat-metric-sub">Lượt ghi nhận trên hệ thống</div>
              </div>

              <div className="stat-metric-card">
                <div className="stat-metric-label">Đúng giờ</div>
                <div className="stat-metric-val green">{onTimeDays}</div>
                <div className="stat-metric-sub">
                  {totalDays > 0 ? Math.round((onTimeDays / totalDays) * 100) : 0}% tỷ lệ đúng giờ
                </div>
              </div>

              <div className="stat-metric-card">
                <div className="stat-metric-label">Đi muộn</div>
                <div className="stat-metric-val amber">{lateDays}</div>
                <div className="stat-metric-sub">Sau 09:30 sáng</div>
              </div>

              <div className="stat-metric-card">
                <div className="stat-metric-label">Làm ngoài VP (Remote)</div>
                <div className="stat-metric-val warm">{remoteDays}</div>
                <div className="stat-metric-sub">Cách trụ sở &gt; 200m</div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="profile-table-card">
              <div className="table-top-bar">
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Lịch sử chấm công chi tiết</h3>
                <button
                  onClick={fetchAttendance}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#d97706',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={14} className={loadingAttendance ? 'animate-spin' : ''} />
                  Làm mới
                </button>
              </div>

              {loadingAttendance ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Đang tải lịch sử chấm công...
                </div>
              ) : attendanceLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: 13 }}>
                  Chưa có dữ liệu chấm công nào được ghi nhận.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Giờ vào</th>
                        <th>Giờ ra</th>
                        <th>Trạng thái</th>
                        <th>Địa điểm</th>
                        <th>Ghi chú / Lý do</th>
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
                            <td style={{ fontWeight: 700, color: '#059669' }}>{formattedCheckIn}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{formattedCheckOut}</td>
                            <td>
                              <span className={`badge-status ${log.status === 'on_time' ? 'on-time' : 'late'}`}>
                                {log.status === 'on_time' ? 'Đúng giờ' : 'Đi muộn'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge-status ${isRemote ? 'remote' : 'office'}`}>
                                <MapPin size={12} style={{ marginRight: 4 }} />
                                {isRemote ? 'Ngoài VP (Từ xa)' : 'Tại văn phòng'}
                                {log.distance_meters !== undefined && log.distance_meters > 0 && (
                                  <span style={{ opacity: 0.8, marginLeft: 4 }}>({log.distance_meters}m)</span>
                                )}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

        {/* Tab 3: Reports History */}
        {activeTab === 'reports' && (
          <div className="profile-table-card" style={{ padding: 24 }}>
            <div className="table-top-bar" style={{ padding: '0 0 16px 0' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Báo cáo công việc đã gửi</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Danh sách các báo cáo ngày cá nhân bạn đã nộp lên hệ thống
                </p>
              </div>
              <button
                onClick={fetchReports}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d97706',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} className={loadingReports ? 'animate-spin' : ''} />
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
                  <div key={r.id} className="report-item-card">
                    <div className="report-card-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Calendar size={16} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                          Báo cáo ngày: {new Date(r.report_date).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`badge-status ${r.status === 'reviewed' ? 'on-time' : 'late'}`}>
                          {r.status === 'reviewed' ? 'Đã duyệt' : 'Chờ duyệt'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Gửi lúc: {new Date(r.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="report-details-grid">
                      <div className="report-field-box">
                        <div className="report-field-label" style={{ color: '#059669' }}>
                          <CheckCircle2 size={14} /> Việc đã hoàn thành:
                        </div>
                        <div className="report-field-content">{r.tasks_completed || '—'}</div>
                      </div>

                      <div className="report-field-box">
                        <div className="report-field-label" style={{ color: '#b45309' }}>
                          <Clock size={14} /> Đang triển khai:
                        </div>
                        <div className="report-field-content">{r.tasks_in_progress || '—'}</div>
                      </div>

                      <div className="report-field-box">
                        <div className="report-field-label" style={{ color: '#d97706' }}>
                          <Calendar size={14} /> Kế hoạch ngày mai:
                        </div>
                        <div className="report-field-content">{r.plans_for_tomorrow || '—'}</div>
                      </div>

                      <div className="report-field-box">
                        <div className="report-field-label" style={{ color: '#dc2626' }}>
                          <AlertTriangle size={14} /> Khó khăn / Đề xuất:
                        </div>
                        <div className="report-field-content">{r.issues_or_blockers || 'Không có khó khăn'}</div>
                      </div>
                    </div>

                    {r.feedback && (
                      <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12 }}>
                        <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 2 }}>Nhận xét từ Quản lý:</div>
                        <div style={{ color: '#78350f' }}>{r.feedback}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
