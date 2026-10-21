import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HrLeaveRequest, HrFreelancer } from '../../types/eventSuite';
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Star, 
  Phone, 
  Calendar, 
  DollarSign,
  AlertCircle
} from 'lucide-react';

export const EventHrManagement: React.FC = () => {
  const { fetchWithAuth, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'freelancers'>('requests');
  
  // State Đơn từ
  const [requests, setRequests] = useState<HrLeaveRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    request_type: 'show_allowance',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    hours_or_days: 1,
    allowance_amount: 500000,
    reason: ''
  });

  // State Freelancers
  const [freelancers, setFreelancers] = useState<HrFreelancer[]>([]);
  const [showFreelancerModal, setShowFreelancerModal] = useState(false);
  const [freelancerForm, setFreelancerForm] = useState({
    name: '',
    phone: '',
    role_specialty: 'MC / Hoạt náo',
    daily_rate: 3000000,
    portfolio_link: '',
    bank_info: '',
    rating: 5,
    notes: ''
  });

  const loadRequests = async () => {
    try {
      const res = await fetchWithAuth('/api/hr/requests');
      if (res.ok) setRequests(await res.json());
    } catch (err) { console.error(err); }
  };

  const loadFreelancers = async () => {
    try {
      const res = await fetchWithAuth('/api/hr/freelancers');
      if (res.ok) setFreelancers(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadRequests();
    if (user?.role === 'Admin' || user?.role === 'Lead') {
      loadFreelancers();
    }
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/hr/requests', {
        method: 'POST',
        body: JSON.stringify(requestForm)
      });
      if (res.ok) {
        setShowRequestModal(false);
        loadRequests();
        setRequestForm({
          request_type: 'show_allowance',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          hours_or_days: 1,
          allowance_amount: 500000,
          reason: ''
        });
      }
    } catch (err) { console.error(err); }
  };

  const handleReviewRequest = async (id: number, decision: 'Approved' | 'Rejected') => {
    try {
      const res = await fetchWithAuth(`/api/hr/requests/${id}/review`, {
        method: 'PUT',
        body: JSON.stringify({ decision })
      });
      if (res.ok) loadRequests();
    } catch (err) { console.error(err); }
  };

  const handleCreateFreelancer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/hr/freelancers', {
        method: 'POST',
        body: JSON.stringify(freelancerForm)
      });
      if (res.ok) {
        setShowFreelancerModal(false);
        loadFreelancers();
      }
    } catch (err) { console.error(err); }
  };

  const formatMoney = (n: number) => `${(n || 0).toLocaleString('vi-VN')} đ`;

  const getRequestBadge = (type: string) => {
    switch (type) {
      case 'leave': return { text: 'Nghỉ phép', bg: '#f1f5f9', color: '#475569' };
      case 'comp_off': return { text: 'Nghỉ bù sự kiện', bg: '#e0e7ff', color: '#4338ca' };
      case 'overtime': return { text: 'Tăng ca (OT)', bg: '#fef3c7', color: '#b45309' };
      case 'show_allowance': return { text: 'Phụ cấp chạy Show', bg: '#dcfce7', color: '#15803d' };
      default: return { text: type, bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div style={{
      flex: 1,
      padding: '24px 32px',
      overflowY: 'auto',
      height: '100%',
      background: 'var(--bg-dark)',
      fontFamily: 'var(--font-family)'
    }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Quản Trị Nhân Sự & Chế Độ Sự Kiện (Event HR)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Nghỉ bù sau sự kiện khuya (Comp-off), phụ cấp chạy show onsite & kho tài năng Freelancer/CTV
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowRequestModal(true)}
            style={{
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={16} /> Gửi Đơn Nghỉ Bù / Phụ Cấp
          </button>

          {(user?.role === 'Admin' || user?.role === 'Lead') && (
            <button
              onClick={() => setShowFreelancerModal(true)}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Plus size={16} /> Thêm Freelancer / CTV
            </button>
          )}
        </div>
      </div>

      {/* TABS SWITCH */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: activeTab === 'requests' ? '1px solid #4f46e5' : '1px solid var(--border-color)',
            background: activeTab === 'requests' ? '#ffffff' : 'transparent',
            color: activeTab === 'requests' ? '#4f46e5' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          📝 Đơn Từ & Phụ Cấp Chạy Show ({requests.length})
        </button>

        {(user?.role === 'Admin' || user?.role === 'Lead') && (
          <button
            onClick={() => setActiveTab('freelancers')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: activeTab === 'freelancers' ? '1px solid #4f46e5' : '1px solid var(--border-color)',
              background: activeTab === 'freelancers' ? '#ffffff' : 'transparent',
              color: activeTab === 'freelancers' ? '#4f46e5' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            👥 Danh Bạ Freelancers & CTV ({freelancers.length})
          </button>
        )}
      </div>

      {/* NỘI DUNG TAB 1: DANH SÁCH ĐƠN TỪ */}
      {activeTab === 'requests' && (
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '12px 14px' }}>Nhân sự</th>
                <th style={{ padding: '12px 14px' }}>Loại chế độ</th>
                <th style={{ padding: '12px 14px' }}>Thời gian</th>
                <th style={{ padding: '12px 14px' }}>Số ngày / Giờ</th>
                <th style={{ padding: '12px 14px' }}>Mức phụ cấp đề xuất</th>
                <th style={{ padding: '12px 14px' }}>Lý do & Dự án</th>
                <th style={{ padding: '12px 14px' }}>Trạng thái</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Xét duyệt</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                    Chưa có đơn từ nào được gửi.
                  </td>
                </tr>
              ) : (
                requests.map(req => {
                  const badge = getRequestBadge(req.request_type);
                  const isPending = req.status === 'Pending';
                  const isApproved = req.status === 'Approved';

                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        {req.user_name}
                        {req.department_name && <div style={{ fontSize: 11, color: '#64748b' }}>{req.department_name}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700
                        }}>
                          {badge.text}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#334155' }}>
                        {req.start_date} {req.end_date !== req.start_date && `→ ${req.end_date}`}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {req.hours_or_days} {req.request_type === 'overtime' ? 'giờ' : 'ngày'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#15803d' }}>
                        {req.allowance_amount > 0 ? formatMoney(req.allowance_amount) : '--'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569', maxWidth: 260 }}>
                        <div>{req.reason}</div>
                        {req.project_name && <div style={{ fontSize: 11, color: '#4f46e5' }}>🎯 {req.project_name}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background: isApproved ? '#dcfce7' : isPending ? '#fef3c7' : '#fee2e2',
                          color: isApproved ? '#15803d' : isPending ? '#b45309' : '#dc2626'
                        }}>
                          {isApproved ? 'Đã duyệt' : isPending ? 'Chờ duyệt' : 'Từ chối'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {isPending && (user?.role === 'Admin' || (user?.role === 'Lead' && req.user_id !== user.id)) ? (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              onClick={() => handleReviewRequest(req.id, 'Approved')}
                              style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleReviewRequest(req.id, 'Rejected')}
                              style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {req.approver_name ? `Bởi ${req.approver_name}` : '--'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* NỘI DUNG TAB 2: KHO TÀI NĂNG FREELANCERS / CTV */}
      {activeTab === 'freelancers' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16
        }}>
          {freelancers.map(f => (
            <div key={f.id} style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid var(--border-color)',
              padding: 18,
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{f.name}</h4>
                  <span style={{
                    display: 'inline-block',
                    background: '#ede9fe',
                    color: '#6d28d9',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    marginTop: 4
                  }}>
                    {f.role_specialty}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>
                  <Star size={14} fill="#f59e0b" /> {f.rating}/5
                </div>
              </div>

              <div style={{ margin: '14px 0', fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>📞 SĐT: <strong>{f.phone}</strong></div>
                <div>💰 Thù lao show: <strong style={{ color: '#15803d' }}>{formatMoney(f.daily_rate)} / ngày</strong></div>
                {f.bank_info && <div>🏦 TK: {f.bank_info}</div>}
                {f.notes && <div style={{ color: '#64748b' }}>📝 {f.notes}</div>}
              </div>

              {f.portfolio_link && (
                <a
                  href={f.portfolio_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '6px',
                    background: '#f8fafc',
                    borderRadius: 6,
                    fontSize: 11,
                    color: '#4f46e5',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  Xem Portfolio / Profile ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL GỬI ĐƠN NGHỈ BÙ / PHỤ CẤP */}
      {showRequestModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 480,
            padding: 22,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 17, fontWeight: 700 }}>Gửi Đơn Nghỉ Bù / Đề Xuất Phụ Cấp</h3>
            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Loại chế độ *</label>
                <select
                  value={requestForm.request_type}
                  onChange={e => setRequestForm({ ...requestForm, request_type: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, marginTop: 4 }}
                >
                  <option value="show_allowance">Phụ cấp chạy sự kiện Onsite</option>
                  <option value="comp_off">Nghỉ bù sau sự kiện khuya (Comp-off)</option>
                  <option value="overtime">Tăng ca chuẩn bị sự kiện (OT)</option>
                  <option value="leave">Nghỉ phép thường niên</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Từ ngày</label>
                  <input
                    type="date"
                    required
                    value={requestForm.start_date}
                    onChange={e => setRequestForm({ ...requestForm, start_date: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Đến ngày</label>
                  <input
                    type="date"
                    required
                    value={requestForm.end_date}
                    onChange={e => setRequestForm({ ...requestForm, end_date: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Số ngày / Giờ</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={requestForm.hours_or_days}
                    onChange={e => setRequestForm({ ...requestForm, hours_or_days: parseFloat(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Mức phụ cấp (VNĐ)</label>
                  <input
                    type="number"
                    step="50000"
                    value={requestForm.allowance_amount}
                    onChange={e => setRequestForm({ ...requestForm, allowance_amount: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Lý do chi tiết *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ghi rõ tên show hoặc công việc thực hiện..."
                  value={requestForm.reason}
                  onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Gửi Đơn Xét Duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM FREELANCER */}
      {showFreelancerModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 480,
            padding: 22,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 17, fontWeight: 700 }}>Thêm Freelancer / Cộng Tác Viên Mới</h3>
            <form onSubmit={handleCreateFreelancer} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Họ tên *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={freelancerForm.name}
                  onChange={e => setFreelancerForm({ ...freelancerForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 0909 111 222"
                    value={freelancerForm.phone}
                    onChange={e => setFreelancerForm({ ...freelancerForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Chuyên môn</label>
                  <select
                    value={freelancerForm.role_specialty}
                    onChange={e => setFreelancerForm({ ...freelancerForm, role_specialty: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  >
                    <option value="MC / Hoạt náo">MC / Hoạt náo</option>
                    <option value="Kỹ thuật Âm thanh">Kỹ thuật Âm thanh</option>
                    <option value="Kỹ thuật Ánh sáng">Kỹ thuật Ánh sáng</option>
                    <option value="VJ / Điều khiển LED">VJ / Điều khiển LED</option>
                    <option value="Cameraman / Photographer">Cameraman / Photographer</option>
                    <option value="PG / PB / Lễ tân">PG / PB / Lễ tân</option>
                    <option value="Helper / Stage Crew">Helper / Stage Crew</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Thù lao dự kiến / show (VNĐ)</label>
                  <input
                    type="number"
                    step="100000"
                    value={freelancerForm.daily_rate}
                    onChange={e => setFreelancerForm({ ...freelancerForm, daily_rate: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Đánh giá chất lượng (1-5 sao)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={freelancerForm.rating}
                    onChange={e => setFreelancerForm({ ...freelancerForm, rating: parseInt(e.target.value) || 5 })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Link Portfolio / Facebook / Profile</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={freelancerForm.portfolio_link}
                  onChange={e => setFreelancerForm({ ...freelancerForm, portfolio_link: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowFreelancerModal(false)}
                  style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Thêm CTV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
