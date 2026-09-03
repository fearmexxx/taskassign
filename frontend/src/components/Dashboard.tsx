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
  MapPin,
  Wifi,
  Navigation,
  RefreshCw,
  X,
  Smartphone
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

interface TeamMemberToday {
  id: number;
  name: string;
  email: string;
  role: string;
  department_name: string;
  check_in: string | null;
  check_out: string | null;
  attendance_status: string | null;
  check_in_distance?: number | null;
  check_in_location_type?: 'Office' | 'Remote' | null;
  check_in_reason?: string | null;
  check_in_address?: string | null;
}

interface CompanySettings {
  company_name: string;
  office_address: string;
  office_lat: number;
  office_lng: number;
  max_distance_meters: number;
  allowed_wifi_name: string;
  require_gps: number;
  require_wifi: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ onCheckInChange, setActiveTab }) => {
  const { user, fetchWithAuth } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<AttendanceToday>({ check_in: null, check_out: null, status: null });
  const [teamToday, setTeamToday] = useState<TeamMemberToday[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [reportText, setReportText] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // GPS & Wi-Fi Mobile Check-in States
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    company_name: 'VBE Agency',
    office_address: '772 EFG Sư Vạn Hạnh, Phường 12 (Hoà Hưng), Quận 10, TP.HCM',
    office_lat: 10.7745,
    office_lng: 106.6685,
    max_distance_meters: 200,
    allowed_wifi_name: 'VBE Agency',
    require_gps: 1,
    require_wifi: 0
  });
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('');
  const [remoteReasonType, setRemoteReasonType] = useState<string>('Làm việc tại nhà (WFH)');
  const [customReason, setCustomReason] = useState<string>('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Haversine distance calculator
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaPhi = toRad(lat2 - lat1);
    const deltaLambda = toRad(lon2 - lon1);

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const loadCompanySettings = async () => {
    try {
      const res = await fetchWithAuth('/api/company/settings');
      if (res.ok) {
        const data = await res.json();
        setCompanySettings(data);
        return data;
      }
    } catch (e) {
      console.warn("Could not load company settings", e);
    }
    return companySettings;
  };

  const requestLocation = (targetSettings = companySettings) => {
    setIsLocating(true);
    setGpsError(null);
    setUserAddress('');
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt không hỗ trợ định vị GPS.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });
        const dist = calculateDistance(lat, lng, targetSettings.office_lat, targetSettings.office_lng);
        setDistanceMeters(dist);
        setIsLocating(false);

        // Reverse Geocoding lấy tên địa chỉ đường phố cụ thể
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
          .then(res => res.json())
          .then(geo => {
            if (geo && geo.display_name) {
              setUserAddress(geo.display_name);
            } else {
              setUserAddress(`Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }
          })
          .catch(() => {
            setUserAddress(`Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          });
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setGpsError('Bạn đã từ chối cấp quyền vị trí. Vui lòng bấm "Cho phép truy cập vị trí" trên trình duyệt điện thoại để chấm công.');
        } else {
          setGpsError(`Không thể lấy vị trí GPS: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const openCheckInModal = async () => {
    setCheckInError(null);
    setShowCheckInModal(true);
    const latestSettings = await loadCompanySettings();
    requestLocation(latestSettings);
  };

  const handlePerformCheckIn = async () => {
    setIsCheckingIn(true);
    setCheckInError(null);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const deviceInfo = isMobile ? 'Mobile Smartphone' : 'Desktop Browser';

    const isOutOfRange = distanceMeters !== null && distanceMeters > companySettings.max_distance_meters;
    let finalReason = '';
    if (isOutOfRange) {
      finalReason = customReason.trim() ? `${remoteReasonType} - ${customReason.trim()}` : remoteReasonType;
      if (!finalReason) {
        setCheckInError('Vui lòng chọn hoặc nhập lý do làm việc ngoài văn phòng để tiếp tục chấm công.');
        setIsCheckingIn(false);
        return;
      }
    } else {
      finalReason = 'Tại văn phòng 772 Sư Vạn Hạnh';
    }

    try {
      const res = await fetchWithAuth('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: userCoords?.lat || null,
          longitude: userCoords?.lng || null,
          reason: finalReason,
          address: userAddress || null,
          device_info: deviceInfo
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setCheckInError(data.error || 'Chấm công thất bại. Vui lòng thử lại.');
        setIsCheckingIn(false);
        return;
      }

      setAttendance(data);
      onCheckInChange(true);
      setShowCheckInModal(false);
      fetchDashboardData();
    } catch (e: any) {
      setCheckInError(e.message || 'Lỗi kết nối khi gửi chấm công.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Đồng hồ thời gian thực chuẩn giờ Việt Nam (GMT+7)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const date = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
      setCurrentTime(`${time} • ${date}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

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

      const teamRes = await fetchWithAuth('/api/attendance/today-team');
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeamToday(teamData);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ 
              background: '#4f46e5', 
              color: '#fff', 
              fontSize: 11, 
              fontWeight: 800, 
              padding: '2px 8px', 
              borderRadius: 4, 
              letterSpacing: 0.5 
            }}>
              VBE AGENCY
            </span>
            <h1 className="header-title" style={{ margin: 0 }}>Chào mừng trở lại, {user?.name}</h1>
          </div>
          <p className="header-subtitle">
            {currentTime || `Hôm nay là ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
            {' • '}Ca chuẩn: <strong>09:30 - 18:30 (9.0h)</strong>
          </p>
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
            <span className="metric-value">{teamToday.filter(m => m.check_in !== null).length} / {teamToday.length || 10}</span>
            <span className="metric-label">Đã vào ca hôm nay</span>
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
                  <button onClick={openCheckInModal} className="btn-neon checkin-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <MapPin size={18} />
                    Chấm công GPS (VÀO CA)
                  </button>
                ) : !attendance.check_out ? (
                  <button onClick={handleCheckOut} className="btn-outline checkin-btn" style={{ borderColor: 'var(--accent-orange)', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Clock size={18} />
                    Chấm công ra (HẾT CA)
                  </button>
                ) : (
                  <span style={{ color: 'var(--accent-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={18} /> Hoàn thành ngày làm việc
                  </span>
                )}
              </div>

              <div style={{
                marginTop: 12,
                padding: '8px 12px',
                background: '#f8f9fa',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 6
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} style={{ color: '#4f46e5' }} />
                  <span>Trụ sở: <strong>772 EFG Sư Vạn Hạnh, Q.10</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Navigation size={13} style={{ color: '#00f2fe' }} />
                  <span>Bán kính: <strong>200m (Có hỗ trợ WFH / Gặp khách hàng)</strong></span>
                </div>
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

        {/* CỘT PHẢI: ĐIỂM DIỆN ĐỘI NGŨ VBE AGENCY HÔM NAY */}
        <div>
          <div className="section-panel glass-panel" style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 className="panel-title" style={{ margin: 0 }}>
                <Users size={20} className="text-cyan-400" />
                Điểm diện Đội ngũ VBE
              </h3>
              <span style={{ 
                fontSize: 12, 
                fontWeight: 600, 
                background: 'rgba(79, 70, 229, 0.1)', 
                color: '#4f46e5', 
                padding: '3px 8px', 
                borderRadius: 12 
              }}>
                {teamToday.filter(m => m.check_in !== null).length} / {teamToday.length} có mặt
              </span>
            </div>

            <div style={{ 
              background: '#f8f9fa', 
              padding: '8px 12px', 
              borderRadius: 8, 
              fontSize: 12, 
              color: 'var(--text-secondary)', 
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Ca chuẩn: <strong>09:30 - 18:30</strong></span>
              <span>Sau 09:30 tính đi trễ</span>
            </div>
            
            {teamToday.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Đang tải danh sách nhân sự...</p>
            ) : (
              <div className="team-grid" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {teamToday.map((member) => {
                  const isCheckedIn = !!member.check_in;
                  const isLate = member.attendance_status === 'Late';
                  return (
                    <div key={member.id} className="team-member-row" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: isCheckedIn ? '#ffffff' : '#fafafa',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div className="member-main" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="member-avatar-small" style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isCheckedIn ? '#4f46e5' : '#94a3b8',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {member.name.split(' ').map(n => n[0]).join('').slice(-2)}
                        </div>
                        <div className="member-text">
                          <span className="member-name" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</span>
                          <span className="member-dept" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {translateDept(member.department_name || '')}
                            {isCheckedIn ? ` • Vào lúc ${member.check_in}` : ' • Chưa vào ca'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        {isCheckedIn ? (
                          <>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{
                                fontSize: 10,
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontWeight: 600,
                                background: member.check_in_location_type === 'Remote' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(16, 185, 129, 0.1)',
                                color: member.check_in_location_type === 'Remote' ? '#7c3aed' : '#10b981'
                              }}>
                                {member.check_in_location_type === 'Remote' 
                                  ? `Ngoài VP (${member.check_in_distance ? (member.check_in_distance > 1000 ? (member.check_in_distance/1000).toFixed(1) + 'km' : member.check_in_distance + 'm') : 'Xa'})`
                                  : 'Tại VP'}
                              </span>

                              <span style={{
                                fontSize: 10,
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontWeight: 600,
                                background: isLate ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: isLate ? '#d97706' : '#10b981'
                              }}>
                                {isLate ? 'Đi trễ' : 'Đúng giờ'}
                              </span>
                            </div>

                            {member.check_in_location_type === 'Remote' && member.check_in_reason && (
                              <span 
                                style={{ fontSize: 10, color: '#7c3aed', fontWeight: 500, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                                title={`${member.check_in_reason}${member.check_in_address ? ` (${member.check_in_address})` : ''}`}
                              >
                                📍 {member.check_in_reason}
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{
                            fontSize: 10,
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontWeight: 500,
                            background: '#f1f5f9',
                            color: '#64748b'
                          }}>
                            Chưa vào ca
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL CHẤM CÔNG GPS & WI-FI CHO MOBILE & WEB */}
      {showCheckInModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 460,
            padding: 22,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #4f46e5, #00f2fe)',
                  color: '#fff',
                  borderRadius: 10,
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Điểm Danh GPS & Wi-Fi
                  </h3>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>VBE Agency • Mobile Attendance</span>
                </div>
              </div>

              <button 
                onClick={() => setShowCheckInModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Banner */}
            {checkInError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12,
                lineHeight: 1.4
              }}>
                {checkInError}
              </div>
            )}

            {/* Office Target Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 12
            }}>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} style={{ color: '#4f46e5' }} />
                <span>Trụ sở chính VBE Agency</span>
              </div>
              <div style={{ color: '#64748b' }}>{companySettings.office_address}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 12, color: '#475569', fontSize: 11 }}>
                <span>Bán kính cho phép: <strong>{companySettings.max_distance_meters}m</strong></span>
                <span>Tọa độ: <strong>{companySettings.office_lat}, {companySettings.office_lng}</strong></span>
              </div>
            </div>

            {/* GPS Radar / Detection Box */}
            <div style={{
              border: '2px dashed ' + (distanceMeters !== null && distanceMeters <= companySettings.max_distance_meters ? '#10b981' : isLocating ? '#4f46e5' : '#cbd5e1'),
              borderRadius: 12,
              padding: '18px 14px',
              textAlign: 'center',
              background: distanceMeters !== null && distanceMeters <= companySettings.max_distance_meters ? 'rgba(16, 185, 129, 0.04)' : '#fafafa'
            }}>
              {isLocating ? (
                <div>
                  <RefreshCw className="animate-spin" size={30} style={{ color: '#4f46e5', margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>Đang dò tìm tọa độ GPS của bạn...</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Vui lòng bấm Cho phép nếu trình duyệt hỏi quyền vị trí</div>
                </div>
              ) : distanceMeters !== null ? (
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontWeight: 700,
                    fontSize: 14,
                    background: distanceMeters <= companySettings.max_distance_meters ? '#dcfce7' : '#fef3c7',
                    color: distanceMeters <= companySettings.max_distance_meters ? '#15803d' : '#b45309',
                    marginBottom: 8
                  }}>
                    <Navigation size={15} />
                    <span>Khoảng cách: {distanceMeters} mét</span>
                  </div>

                  <div style={{ fontSize: 12, color: distanceMeters <= companySettings.max_distance_meters ? '#15803d' : '#b45309', fontWeight: 600 }}>
                    {distanceMeters <= companySettings.max_distance_meters 
                      ? '✓ Bạn đang ở trong phạm vi văn phòng 772 Sư Vạn Hạnh' 
                      : `⚠️ Bạn đang cách văn phòng ${distanceMeters}m (Vượt quá bán kính ${companySettings.max_distance_meters}m)`}
                  </div>

                  <button 
                    onClick={() => requestLocation()} 
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4f46e5',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 8,
                      textDecoration: 'underline'
                    }}
                  >
                    Đo lại vị trí GPS
                  </button>
                </div>
              ) : (
                <div>
                  <MapPin size={28} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                  {gpsError ? (
                    <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{gpsError}</div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Chưa có tín hiệu GPS</div>
                  )}
                  <button 
                    onClick={() => requestLocation()} 
                    className="btn-outline" 
                    style={{ padding: '6px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Navigation size={14} /> Lấy vị trí GPS
                  </button>
                </div>
              )}
            </div>

            {/* Trường hợp ở xa văn phòng (> 200m): Hỏi xác nhận, chọn lý do & ghi nhận địa chỉ */}
            {distanceMeters !== null && distanceMeters > companySettings.max_distance_meters ? (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 12,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309', fontWeight: 700, fontSize: 13 }}>
                  <AlertCircle size={18} />
                  <span>Xác Nhận Chấm Công Từ Xa / Ngoài Văn Phòng</span>
                </div>

                <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.4 }}>
                  Bạn đang ở cách trụ sở <strong>{distanceMeters > 1000 ? (distanceMeters / 1000).toFixed(1) + ' km' : distanceMeters + ' m'}</strong>. Bạn có muốn tiếp tục chấm công với trạng thái <strong>Ngoài văn phòng</strong> không?
                </p>

                {/* Địa chỉ thực tế ghi nhận qua reverse geocode */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #fcd34d',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 11,
                  color: '#475569',
                  lineHeight: 1.4
                }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>📍 Địa chỉ hiện tại: </span>
                  <span>{userAddress || 'Đang lấy địa chỉ thực tế từ GPS...'}</span>
                </div>

                {/* Chọn lý do */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' }}>
                    Lý do làm việc ngoài VP (Bắt buộc):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                    {[
                      'Làm việc tại nhà (WFH)',
                      'Gặp khách hàng / Đối tác',
                      'Đi công tác / Onsite',
                      'Lý do khác'
                    ].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setRemoteReasonType(type)}
                        style={{
                          padding: '7px 8px',
                          borderRadius: 6,
                          border: remoteReasonType === type ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                          background: remoteReasonType === type ? 'rgba(124, 58, 237, 0.08)' : '#ffffff',
                          color: remoteReasonType === type ? '#7c3aed' : '#475569',
                          fontSize: 11,
                          fontWeight: remoteReasonType === type ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="Ghi chú thêm lý do (VD: Họp khách hàng tại Quận 1, WFH do ốm...)"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            ) : distanceMeters !== null ? (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 12,
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <CheckCircle2 size={18} />
                <span>Bạn đang ở đúng trụ sở 772 Sư Vạn Hạnh (Hợp lệ để chấm công tại văn phòng).</span>
              </div>
            ) : null}

            {/* Submit Action Button */}
            <button
              onClick={handlePerformCheckIn}
              disabled={isCheckingIn || isLocating}
              className="btn-neon"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: 15,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 10,
                background: distanceMeters !== null && distanceMeters > companySettings.max_distance_meters 
                  ? 'linear-gradient(135deg, #7c3aed, #ec4899)' 
                  : 'linear-gradient(135deg, #4f46e5, #00f2fe)',
                cursor: (isCheckingIn || isLocating) ? 'not-allowed' : 'pointer'
              }}
            >
              {isCheckingIn ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  <span>Đang ghi nhận lượt chấm công...</span>
                </>
              ) : distanceMeters !== null && distanceMeters > companySettings.max_distance_meters ? (
                <>
                  <Send size={18} />
                  <span>XÁC NHẬN CHẤM CÔNG NGOÀI VĂN PHÒNG</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  <span>XÁC NHẬN CHẤM CÔNG TẠI VĂN PHÒNG</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
