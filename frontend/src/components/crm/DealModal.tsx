import React, { useState } from 'react';
import { CrmDeal, DealStage, CrmCustomer } from '../../types/crm';
import { X, Save, Phone, DollarSign, Calendar, FileText, Link, AlertCircle } from 'lucide-react';

interface Props {
  deal?: CrmDeal | null;
  customers: CrmCustomer[];
  teamMembers: { id: number; name: string }[];
  onClose: () => void;
  onSave: (data: Partial<CrmDeal> & { customer_name?: string; customer_company?: string }) => Promise<void>;
}

export const DealModal: React.FC<Props> = ({
  deal,
  customers,
  teamMembers,
  onClose,
  onSave
}) => {
  const isEdit = !!deal;

  const [title, setTitle] = useState(deal?.title || '');
  const [customerPhone, setCustomerPhone] = useState(deal?.customer_phone || '');
  const [customerName, setCustomerName] = useState(deal?.customer_name || '');
  const [customerCompany, setCustomerCompany] = useState(deal?.customer_company || '');
  const [stage, setStage] = useState<DealStage>(deal?.stage || 'lead');
  const [expectedValue, setExpectedValue] = useState<number>(deal?.expected_value || 0);
  const [contractValue, setContractValue] = useState<number>(deal?.contract_value || 0);
  const [briefContent, setBriefContent] = useState(deal?.brief_content || '');
  const [proposalUrl, setProposalUrl] = useState(deal?.proposal_url || '');
  const [expectedCloseDate, setExpectedCloseDate] = useState(deal?.expected_close_date || '');
  const [assignedTo, setAssignedTo] = useState<number | ''>(deal?.assigned_to || (teamMembers[0]?.id || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Khi chọn SĐT từ danh sách có sẵn, tự động điền Tên & Công ty
  const handleSelectCustomer = (phone: string) => {
    setCustomerPhone(phone);
    const found = customers.find(c => c.phone === phone);
    if (found) {
      setCustomerName(found.name);
      setCustomerCompany(found.company || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customerPhone.trim()) {
      setErrorMsg('Vui lòng nhập Tên cơ hội và Số điện thoại khách hàng.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSave({
        title: title.trim(),
        customer_phone: customerPhone.trim(),
        customer_name: customerName.trim(),
        customer_company: customerCompany.trim(),
        stage,
        expected_value: Number(expectedValue) || 0,
        contract_value: Number(contractValue) || 0,
        brief_content: briefContent.trim(),
        proposal_url: proposalUrl.trim(),
        expected_close_date: expectedCloseDate,
        assigned_to: assignedTo ? Number(assignedTo) : null
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu cơ hội kinh doanh');
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
        maxWidth: 720,
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
              {isEdit ? `Chỉnh sửa Deal: ${deal.title}` : 'Khởi Tạo Cơ Hội Kinh Doanh (Deal Mới)'}
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
              Liên kết chặt chẽ với Khách hàng bằng Số điện thoại (Unique Key)
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
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
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

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Tên cơ hội / Tên chiến dịch <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Tổ chức Lễ Kỷ Niệm 10 Năm - Doanh nghiệp ABC"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                fontWeight: 600,
                color: '#0f172a'
              }}
            />
          </div>

          {/* Chọn hoặc nhập SĐT khách hàng */}
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>
                Thông Tin Khách Hàng (SĐT Unique)
              </span>
              {customers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Chọn nhanh từ danh bạ:</span>
                  <select
                    onChange={e => handleSelectCustomer(e.target.value)}
                    style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- Chọn khách hàng sẵn có --</option>
                    {customers.map(c => (
                      <option key={c.phone} value={c.phone}>{c.name} - {c.phone} {c.company ? `(${c.company})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Số điện thoại KH <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    placeholder="VD: 0901234567"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Họ tên người liên hệ
                </label>
                <input
                  type="text"
                  placeholder="Tên đại diện khách"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Tên Công ty / Nhãn hàng
                </label>
                <input
                  type="text"
                  placeholder="Công ty đối tác"
                  value={customerCompany}
                  onChange={e => setCustomerCompany(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>
            </div>
          </div>

          {/* Giai đoạn & Giá trị */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Giai đoạn quy trình
              </label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value as DealStage)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontWeight: 600,
                  background: '#ffffff'
                }}
              >
                <option value="lead">1. Lead / Tìm hiểu mới</option>
                <option value="brief">2. Nhận Brief & Yêu cầu</option>
                <option value="proposal">3. Báo giá & Proposal</option>
                <option value="meeting">4. Họp trao đổi / Pitching</option>
                <option value="negotiation">5. Phản hồi & Đàm phán</option>
                <option value="won">6. Chốt Deal & Ký Hợp Đồng</option>
                <option value="execution">7. Bàn giao Triển khai</option>
                <option value="payment_report">8. Quyết toán & Báo cáo</option>
                <option value="lost">Lost / Đã dừng</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Giá trị dự kiến (VNĐ)
              </label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                <input
                  type="number"
                  step="1000000"
                  value={expectedValue}
                  onChange={e => setExpectedValue(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Giá trị hợp đồng chính thức (VNĐ)
              </label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#10b981' }} />
                <input
                  type="number"
                  step="1000000"
                  value={contractValue}
                  onChange={e => setContractValue(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#047857' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Account phụ trách
              </label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(Number(e.target.value))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff' }}
              >
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Ngày dự kiến chốt / Sự kiện
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={e => setExpectedCloseDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Link file Báo giá / Proposal
              </label>
              <div style={{ position: 'relative' }}>
                <Link size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={proposalUrl}
                  onChange={e => setProposalUrl(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Nội dung Brief / Yêu cầu từ khách hàng
            </label>
            <textarea
              rows={3}
              placeholder="Yêu cầu chi tiết về quy mô, concept, mục tiêu, ngân sách tối đa..."
              value={briefContent}
              onChange={e => setBriefContent(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit' }}
            />
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
            <span>{isSubmitting ? 'Đang lưu...' : (isEdit ? 'Lưu Deal' : 'Tạo Deal Mới')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
