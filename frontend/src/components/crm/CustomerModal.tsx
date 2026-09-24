import React, { useState } from 'react';
import { CrmCustomer } from '../../types/crm';
import { X, Save, Phone, User, Building, Mail, Share2, MapPin, Percent, DollarSign, Calendar, AlertCircle } from 'lucide-react';

interface Props {
  customer?: CrmCustomer | null;
  teamMembers: { id: number; name: string }[];
  onClose: () => void;
  onSave: (data: Partial<CrmCustomer>) => Promise<void>;
}

export const CustomerModal: React.FC<Props> = ({
  customer,
  teamMembers,
  onClose,
  onSave
}) => {
  const isEdit = !!customer;
  const currentYear = new Date().getFullYear();

  const [phone, setPhone] = useState(customer?.phone || '');
  const [name, setName] = useState(customer?.name || '');
  const [company, setCompany] = useState(customer?.company || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [social, setSocial] = useState(customer?.social || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [commissionRate, setCommissionRate] = useState<number>(customer?.commission_rate || 0);
  const [commissionNotes, setCommissionNotes] = useState(customer?.commission_notes || '');
  const [currentProjectStatus, setCurrentProjectStatus] = useState(customer?.current_project_status || 'Mới tiếp cận');
  const [pastProjectsNotes, setPastProjectsNotes] = useState(customer?.past_projects_notes || '');
  const [forecastQuarter, setForecastQuarter] = useState(customer?.forecast_quarter || 'Q1');
  const [forecastYear, setForecastYear] = useState<number>(customer?.forecast_year || currentYear);
  const [forecastRevenue, setForecastRevenue] = useState<number>(customer?.forecast_revenue || 0);
  const [forecastNotes, setForecastNotes] = useState(customer?.forecast_notes || '');
  const [assignedTo, setAssignedTo] = useState<number | ''>(customer?.assigned_to || (teamMembers[0]?.id || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !name.trim()) {
      setErrorMsg('Vui lòng nhập Họ tên và Số điện thoại khách hàng.');
      return;
    }

    if (isEdit && customer && phone.trim() !== customer.phone) {
      const confirmChange = window.confirm(
        `⚠️ CẢNH BÁO QUAN TRỌNG:\nBạn đang đổi số điện thoại từ "${customer.phone}" sang "${phone.trim()}".\n` +
        `Số điện thoại này là KHÓA ĐỘC NHẤT (Unique Key). Việc thay đổi sẽ tự động đồng bộ chéo trên toàn bộ Deals, Lịch sử tương tác và Dự án liên quan.\n\n` +
        `Bạn có chắc chắn muốn cập nhật?`
      );
      if (!confirmChange) return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSave({
        phone: phone.trim(),
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        social: social.trim(),
        address: address.trim(),
        commission_rate: Number(commissionRate) || 0,
        commission_notes: commissionNotes.trim(),
        current_project_status: currentProjectStatus.trim(),
        past_projects_notes: pastProjectsNotes.trim(),
        forecast_quarter: forecastQuarter,
        forecast_year: Number(forecastYear) || currentYear,
        forecast_revenue: Number(forecastRevenue) || 0,
        forecast_notes: forecastNotes.trim(),
        assigned_to: assignedTo ? Number(assignedTo) : null
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi lưu khách hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
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
        maxWidth: 780,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              {isEdit ? `Chỉnh sửa Khách hàng: ${customer.name}` : 'Thêm Khách Hàng Mới Vào CRM'}
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
              Số điện thoại là Khóa Nhận Diện Độc Nhất (Unique Key) cho mỗi khách hàng
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Group 1: Thông tin liên hệ cơ bản */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              1. Thông Tin Nhận Diện & Liên Hệ (Khóa Unique SĐT)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Số điện thoại (Unique Key) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    placeholder="VD: 0901234567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Họ và tên người đại diện <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn A"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Công ty / Nhãn hàng
                </label>
                <div style={{ position: 'relative' }}>
                  <Building size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="VD: VNG Corporation, VinFast..."
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Email liên hệ
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  <input
                    type="email"
                    placeholder="VD: contact@client.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Mạng xã hội / Kênh chat
                </label>
                <div style={{ position: 'relative' }}>
                  <Share2 size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Facebook / Zalo / Telegram link"
                    value={social}
                    onChange={e => setSocial(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Địa chỉ liên hệ
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="VD: Q.1, TP.HCM"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

          {/* Group 2: Chiết khấu hoa hồng & Tình trạng dự án */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              2. Chiết Khấu Hoa Hồng & Tình Trạng Dự Án
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Tỷ lệ hoa hồng chiết khấu (%)
                </label>
                <div style={{ position: 'relative' }}>
                  <Percent size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    placeholder="VD: 5"
                    value={commissionRate}
                    onChange={e => setCommissionRate(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Ghi chú chiết khấu hoa hồng
                </label>
                <input
                  type="text"
                  placeholder="VD: Chiết khấu 5% cho đầu mối sau khi tất toán"
                  value={commissionNotes}
                  onChange={e => setCommissionNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Tình trạng dự án hiện tại
                </label>
                <input
                  type="text"
                  placeholder="VD: Đang đàm phán hợp đồng, Đang chạy sự kiện..."
                  value={currentProjectStatus}
                  onChange={e => setCurrentProjectStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Nhân viên Account phụ trách
                </label>
                <select
                  value={assignedTo}
                  onChange={e => setAssignedTo(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                >
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Lịch sử / Dự án đã từng liên hệ & thực hiện trước đây
              </label>
              <textarea
                rows={2}
                placeholder="VD: Năm 2025 từng làm Event ra mắt sản phẩm A (150tr), năm 2024 làm TVC..."
                value={pastProjectsNotes}
                onChange={e => setPastProjectsNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  color: '#0f172a',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

          {/* Group 3: Dự báo Forecast theo Quý & Năm */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              3. Dự Báo Doanh Thu Tương Lai (Quarterly / Yearly Forecast)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Dự báo Quý
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  <select
                    value={forecastQuarter}
                    onChange={e => setForecastQuarter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      background: '#ffffff',
                      color: '#0f172a'
                    }}
                  >
                    <option value="Q1">Quý 1 (Q1)</option>
                    <option value="Q2">Quý 2 (Q2)</option>
                    <option value="Q3">Quý 3 (Q3)</option>
                    <option value="Q4">Quý 4 (Q4)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Dự báo Năm
                </label>
                <input
                  type="number"
                  value={forecastYear}
                  onChange={e => setForecastYear(parseInt(e.target.value) || currentYear)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Dự kiến doanh số (VNĐ)
                </label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  <input
                    type="number"
                    step="1000000"
                    placeholder="VD: 50000000"
                    value={forecastRevenue}
                    onChange={e => setForecastRevenue(parseInt(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#047857'
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Ghi chú tiềm năng dự báo
              </label>
              <textarea
                rows={2}
                placeholder="VD: Kế hoạch mở rộng chi nhánh mới vào Q4, ngân sách dự trù khoảng 150-200 triệu..."
                value={forecastNotes}
                onChange={e => setForecastNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  color: '#0f172a',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          background: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '9px 22px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #00f2fe)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
            }}
          >
            <Save size={16} />
            <span>{isSubmitting ? 'Đang lưu...' : (isEdit ? 'Lưu Thay Đổi' : 'Thêm Khách Hàng')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
