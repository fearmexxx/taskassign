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
    <div className="p-4 sm:p-8 max-w-6xl mx-auto overflow-y-auto" style={{ maxHeight: '100%' }}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-indigo-100 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-inner">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{user?.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase border ${
                user?.role === 'Admin' 
                  ? 'bg-amber-400/20 text-amber-200 border-amber-400/30' 
                  : user?.role === 'Lead'
                  ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30'
                  : 'bg-white/20 text-white border-white/30'
              }`}>
                {roleLabel}
              </span>
            </div>
            <p className="text-indigo-100 mt-1 flex items-center gap-2 text-sm sm:text-base">
              <Mail className="w-4 h-4 opacity-80" /> {user?.email}
              {user?.department_name && (
                <>
                  <span className="opacity-40">•</span>
                  <Building className="w-4 h-4 opacity-80" /> {user?.department_name}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-sm">
          <Shield className="w-5 h-5 text-indigo-200" />
          <div>
            <div className="text-xs text-indigo-200 font-medium">Trạng thái tài khoản</div>
            <div className="font-semibold text-white">Chính thức</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-8 space-x-2 sm:space-x-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('info')}
          className={`pb-4 px-2 text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all border-b-2 ${
            activeTab === 'info'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          Thông tin cá nhân & Đổi mật khẩu
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-4 px-2 text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all border-b-2 ${
            activeTab === 'attendance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          Lịch sử chấm công
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-4 px-2 text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all border-b-2 ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Báo cáo công việc đã gửi
        </button>
      </div>

      {/* Tab 1: Info & Password */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information Form */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-semibold">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Thông tin cơ bản</h2>
                  <p className="text-xs text-gray-500">Cập nhật họ tên và địa chỉ email liên hệ của bạn</p>
                </div>
              </div>

              {infoSuccess && (
                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{infoSuccess}</span>
                </div>
              )}

              {infoError && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{infoError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateInfo} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium text-gray-900"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium text-gray-900"
                      placeholder="user@vbe.vn"
                    />
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Phòng ban
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.department_name || 'Ban Quản Trị Chung'}
                      className="w-full px-4 py-2.5 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-600 font-medium cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Vai trò
                    </label>
                    <input
                      type="text"
                      disabled
                      value={roleLabel}
                      className="w-full px-4 py-2.5 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-600 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={infoLoading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {infoLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Lưu thông tin cá nhân
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-semibold">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Đổi mật khẩu</h2>
                  <p className="text-xs text-gray-500">Bảo vệ tài khoản với mật khẩu tối thiểu 6 ký tự</p>
                </div>
              </div>

              {passSuccess && (
                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              {passError && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-gray-900"
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-gray-900"
                      placeholder="Tối thiểu 6 ký tự"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <Check className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-gray-900"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={passLoading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {passLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
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
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng lượt chấm</div>
              <div className="text-2xl font-black text-gray-900 mt-2">{totalDays}</div>
              <div className="text-xs text-gray-400 mt-1">Lượt ghi nhận</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
              <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Đúng giờ</div>
              <div className="text-2xl font-black text-emerald-600 mt-2">{onTimeDays}</div>
              <div className="text-xs text-gray-400 mt-1">
                {totalDays > 0 ? Math.round((onTimeDays / totalDays) * 100) : 0}% tỷ lệ
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
              <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Đi muộn</div>
              <div className="text-2xl font-black text-amber-600 mt-2">{lateDays}</div>
              <div className="text-xs text-gray-400 mt-1">Sau 08:30 sáng</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Làm từ xa (Remote)</div>
              <div className="text-2xl font-black text-blue-600 mt-2">{remoteDays}</div>
              <div className="text-xs text-gray-400 mt-1">Ngoài văn phòng (&gt;200m)</div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">Lịch sử chấm công chi tiết</h3>
              <button
                onClick={fetchAttendance}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAttendance ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>

            {loadingAttendance ? (
              <div className="p-12 text-center text-gray-400 text-sm">Đang tải lịch sử chấm công...</div>
            ) : attendanceLogs.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">Chưa có dữ liệu chấm công nào được ghi nhận.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/75 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Ngày</th>
                      <th className="px-6 py-3.5">Giờ vào</th>
                      <th className="px-6 py-3.5">Giờ ra</th>
                      <th className="px-6 py-3.5">Trạng thái</th>
                      <th className="px-6 py-3.5">Địa điểm</th>
                      <th className="px-6 py-3.5">Ghi chú / Lý do</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
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
                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{formattedDate}</td>
                          <td className="px-6 py-4 font-semibold text-emerald-600">{formattedCheckIn}</td>
                          <td className="px-6 py-4 text-gray-500">{formattedCheckOut}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              log.status === 'on_time'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {log.status === 'on_time' ? 'Đúng giờ' : 'Đi muộn'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isRemote 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <MapPin className="w-3 h-3" />
                              {isRemote ? 'Ngoài VP (Từ xa)' : 'Tại văn phòng'}
                              {log.distance_meters !== undefined && log.distance_meters > 0 && (
                                <span className="opacity-75 font-normal">({log.distance_meters}m)</span>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
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
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Báo cáo công việc đã gửi</h3>
                <p className="text-xs text-gray-500">Danh sách các báo cáo ngày bạn đã nộp lên hệ thống</p>
              </div>
              <button
                onClick={fetchReports}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingReports ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>

            {loadingReports ? (
              <div className="p-12 text-center text-gray-400 text-sm">Đang tải danh sách báo cáo...</div>
            ) : reports.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">Bạn chưa nộp báo cáo công việc nào.</div>
            ) : (
              <div className="space-y-4">
                {reports.map((r) => (
                  <div key={r.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-200/60">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-gray-900 text-sm">
                          Báo cáo ngày: {new Date(r.report_date).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.status === 'reviewed' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {r.status === 'reviewed' ? 'Đã duyệt' : 'Chờ duyệt'}
                        </span>
                        <span className="text-xs text-gray-400">
                          Gửi lúc: {new Date(r.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Việc đã hoàn thành:
                        </div>
                        <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-line leading-relaxed">
                          {r.tasks_completed || '—'}
                        </p>
                      </div>

                      <div>
                        <div className="font-semibold text-blue-700 mb-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Đang triển khai:
                        </div>
                        <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-line leading-relaxed">
                          {r.tasks_in_progress || '—'}
                        </p>
                      </div>

                      <div>
                        <div className="font-semibold text-indigo-700 mb-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Kế hoạch ngày mai:
                        </div>
                        <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-line leading-relaxed">
                          {r.plans_for_tomorrow || '—'}
                        </p>
                      </div>

                      <div>
                        <div className="font-semibold text-amber-700 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Khó khăn / Đề xuất:
                        </div>
                        <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-line leading-relaxed">
                          {r.issues_or_blockers || 'Không có khó khăn'}
                        </p>
                      </div>
                    </div>

                    {r.feedback && (
                      <div className="mt-3 p-3 bg-indigo-50/80 border border-indigo-100 rounded-lg text-xs">
                        <div className="font-bold text-indigo-900 mb-0.5">Nhận xét từ Quản lý:</div>
                        <div className="text-indigo-800">{r.feedback}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
