import React, { useState } from 'react';
import { CrmDeal, DealStage } from '../../types/crm';
import { 
  X, 
  Rocket, 
  CheckCircle2, 
  Phone, 
  Building, 
  Mail, 
  DollarSign, 
  Percent, 
  Calendar, 
  FileText, 
  ExternalLink, 
  Send, 
  User, 
  Clock, 
  MessageSquare,
  CreditCard,
  Check
} from 'lucide-react';

interface Props {
  deal: CrmDeal;
  onClose: () => void;
  onUpdateStage: (dealId: number, newStage: DealStage) => Promise<void>;
  onUpdatePayment: (dealId: number, status: 'unpaid' | 'partial' | 'paid', paidAmount: number) => Promise<void>;
  onConvertToProject: (dealId: number) => Promise<void>;
  onAddActivity: (dealId: number, content: string, actionType: string) => Promise<void>;
  onNavigateToProject?: (projectId: number) => void;
}

const STAGES: { key: DealStage; label: string; step: number }[] = [
  { key: 'lead', label: '1. Lead', step: 1 },
  { key: 'brief', label: '2. Brief', step: 2 },
  { key: 'proposal', label: '3. Báo giá', step: 3 },
  { key: 'meeting', label: '4. Họp pitch', step: 4 },
  { key: 'negotiation', label: '5. Phản hồi', step: 5 },
  { key: 'won', label: '6. Ký HĐ', step: 6 },
  { key: 'execution', label: '7. Triển khai', step: 7 },
  { key: 'payment_report', label: '8. Quyết toán', step: 8 }
];

export const DealDetailDrawer: React.FC<Props> = ({
  deal,
  onClose,
  onUpdateStage,
  onUpdatePayment,
  onConvertToProject,
  onAddActivity,
  onNavigateToProject
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payment' | 'activities'>('overview');
  const [newComment, setNewComment] = useState('');
  const [actionType, setActionType] = useState('note');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Payment update state
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'partial' | 'paid'>(deal.payment_status);
  const [paidAmount, setPaidAmount] = useState<number>(deal.paid_amount || 0);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  const handleSendActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddActivity(deal.id, newComment.trim(), actionType);
      setNewComment('');
    } catch (err: any) {
      alert(err.message || 'Lỗi thêm hoạt động');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvert = async () => {
    if (!window.confirm(`Xác nhận chuyển giao Deal "${deal.title}" sang Dự án thực thi?\n\nHệ thống sẽ tự động tạo Project mới, phân bổ task khởi động và thông báo cho người phụ trách.`)) {
      return;
    }
    setIsConverting(true);
    try {
      await onConvertToProject(deal.id);
    } catch (err: any) {
      alert(err.message || 'Lỗi chuyển giao dự án');
    } finally {
      setIsConverting(false);
    }
  };

  const handleSavePayment = async () => {
    setIsUpdatingPayment(true);
    try {
      await onUpdatePayment(deal.id, paymentStatus, Number(paidAmount) || 0);
      alert('Đã cập nhật tiến độ thanh toán thành công!');
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật thanh toán');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: 750,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
        animation: 'slideInRight 0.25s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: 12,
                background: 'rgba(79, 70, 229, 0.1)',
                color: '#4f46e5'
              }}>
                Deal #{deal.id}
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Phụ trách: <strong>{deal.assigned_name || 'Chưa gán'}</strong>
              </span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {deal.title}
            </h1>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6 }}>
            <X size={20} />
          </button>
        </div>

        {/* 8-Stage Progress Stepper */}
        <div style={{ padding: '12px 24px', background: '#ffffff', borderBottom: '1px solid #f1f5f9', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 620 }}>
            {STAGES.map((st, idx) => {
              const currentStep = STAGES.find(s => s.key === deal.stage)?.step || 1;
              const isPassed = currentStep > st.step;
              const isCurrent = deal.stage === st.key;

              return (
                <button
                  key={st.key}
                  onClick={() => onUpdateStage(deal.id, st.key)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: isCurrent ? '#4f46e5' : (isPassed ? '#cbd5e1' : '#e2e8f0'),
                    background: isCurrent ? 'linear-gradient(135deg, #4f46e5, #00f2fe)' : (isPassed ? '#f1f5f9' : '#ffffff'),
                    color: isCurrent ? '#ffffff' : (isPassed ? '#334155' : '#94a3b8'),
                    fontSize: 11,
                    fontWeight: isCurrent ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  title={`Nhấp để chuyển sang giai đoạn ${st.label}`}
                >
                  {isPassed ? <Check size={12} style={{ color: '#10b981' }} /> : null}
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1-Click Convert to Project Banner */}
        <div style={{ padding: '12px 24px', background: deal.project_id ? '#ecfdf5' : '#eff6ff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {deal.project_id ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>
                  Đã chuyển giao sang Dự án thực thi: {deal.project_name || `#${deal.project_id}`}
                </div>
                <div style={{ fontSize: 11, color: '#047857' }}>
                  Trạng thái dự án: <strong>{deal.project_status || 'Active'}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Rocket size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>
                  Sẵn sàng bàn giao dự án thực thi
                </div>
                <div style={{ fontSize: 11, color: '#3b82f6' }}>
                  1-Click tự động sinh Project & bộ tasks triển khai trong TaskAssign
                </div>
              </div>
            </div>
          )}

          {deal.project_id ? (
            onNavigateToProject && (
              <button
                onClick={() => onNavigateToProject(deal.project_id!)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #10b981',
                  background: '#ffffff',
                  color: '#065f46',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>Mở trong Dự án</span>
                <ExternalLink size={14} />
              </button>
            )
          ) : (
            <button
              onClick={handleConvert}
              disabled={isConverting}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #00f2fe)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                cursor: isConverting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Rocket size={14} />
              <span>{isConverting ? 'Đang tạo...' : '🚀 Bàn Giao Dự Án'}</span>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff', padding: '0 24px' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #4f46e5' : '2px solid transparent',
              color: activeTab === 'overview' ? '#4f46e5' : '#64748b',
              fontWeight: activeTab === 'overview' ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Thông Tin & Brief
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'payment' ? '2px solid #4f46e5' : '2px solid transparent',
              color: activeTab === 'payment' ? '#4f46e5' : '#64748b',
              fontWeight: activeTab === 'payment' ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>Hợp Đồng & Thanh Toán</span>
            {deal.contract_value > 0 && (
              <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                {Math.round((deal.paid_amount / deal.contract_value) * 100) || 0}%
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'activities' ? '2px solid #4f46e5' : '2px solid transparent',
              color: activeTab === 'activities' ? '#4f46e5' : '#64748b',
              fontWeight: activeTab === 'activities' ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Nhật Ký Tương Tác ({deal.activities?.length || 0})
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Customer Box */}
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 10 }}>
                  Khách Hàng (SĐT Unique: {deal.customer_phone})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Họ tên đại diện:</span>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{deal.customer_name || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Công ty / Nhãn hàng:</span>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{deal.customer_company || 'Cá nhân'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Email:</span>
                    <div style={{ fontSize: 13, color: '#0f172a' }}>{deal.customer_email || 'Chưa có'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Kênh chat / Social:</span>
                    <div style={{ fontSize: 13, color: '#0f172a' }}>{deal.customer_social || 'Chưa có'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Chiết khấu hoa hồng:</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e11d48' }}>
                      {deal.commission_rate || 0}% {deal.commission_notes ? `(${deal.commission_notes})` : ''}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Ngày chốt dự kiến:</span>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{deal.expected_close_date || 'Chưa định'}</div>
                  </div>
                </div>
              </div>

              {/* Brief Content */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 8 }}>
                  Nội Dung Brief / Yêu Cầu Của Khách
                </h3>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {deal.brief_content || 'Chưa có thông tin brief cụ thể.'}
                </div>
              </div>

              {/* Proposal URL */}
              {deal.proposal_url && (
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 8 }}>
                    File Báo Giá & Idea Proposal
                  </h3>
                  <a
                    href={deal.proposal_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: 'rgba(79, 70, 229, 0.08)',
                      color: '#4f46e5',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    <FileText size={16} />
                    <span>Mở tài liệu Báo giá / Proposal</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Giá trị dự kiến</span>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#334155' }}>
                    {deal.expected_value ? deal.expected_value.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                  </div>
                </div>

                <div style={{ background: '#ecfdf5', padding: 14, borderRadius: 10, border: '1px solid #a7f3d0' }}>
                  <span style={{ fontSize: 11, color: '#047857' }}>Giá trị hợp đồng ký kết</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>
                    {deal.contract_value ? deal.contract_value.toLocaleString('vi-VN') + ' đ' : 'Chưa chốt'}
                  </div>
                </div>

                <div style={{ background: '#eff6ff', padding: 14, borderRadius: 10, border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: 11, color: '#1d4ed8' }}>Đã thanh toán (Thực thu)</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>
                    {deal.paid_amount ? deal.paid_amount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                  </div>
                </div>
              </div>

              {/* Form cập nhật thanh toán */}
              <div style={{ background: '#ffffff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
                  Cập Nhật Tiến Độ & Đợt Thanh Toán
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                      Trạng thái thanh toán
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={e => setPaymentStatus(e.target.value as any)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                    >
                      <option value="unpaid">Chưa thanh toán</option>
                      <option value="partial">Đã tạm ứng / Thanh toán 1 phần</option>
                      <option value="paid">Đã tất toán 100%</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                      Số tiền đã thu (VNĐ)
                    </label>
                    <input
                      type="number"
                      step="1000000"
                      value={paidAmount}
                      onChange={e => setPaidAmount(parseInt(e.target.value) || 0)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#2563eb' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleSavePayment}
                    disabled={isUpdatingPayment}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isUpdatingPayment ? 'Đang cập nhật...' : 'Cập nhật thanh toán'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Form thêm note/activity */}
              <form onSubmit={handleSendActivity} style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <select
                    value={actionType}
                    onChange={e => setActionType(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                  >
                    <option value="note">📝 Ghi chú</option>
                    <option value="meeting">🤝 Cuộc họp</option>
                    <option value="call">📞 Cuộc gọi</option>
                    <option value="email">✉️ Gửi Email</option>
                  </select>
                  <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center' }}>Thêm tương tác mới với khách hàng</span>
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="Ghi lại nội dung trao đổi, phản hồi của khách, thỏa thuận chiết khấu..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Send size={12} />
                    <span>{isSubmitting ? 'Đang gửi...' : 'Ghi nhận'}</span>
                  </button>
                </div>
              </form>

              {/* Activity Timeline List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {deal.activities && deal.activities.length > 0 ? (
                  deal.activities.map(act => (
                    <div key={act.id} style={{ display: 'flex', gap: 10, padding: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: act.action_type === 'stage_change' ? '#fef3c7' : '#e0e7ff',
                        color: act.action_type === 'stage_change' ? '#d97706' : '#4338ca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        flexShrink: 0
                      }}>
                        {act.action_type === 'stage_change' ? '⚡' : (act.action_type === 'meeting' ? '🤝' : (act.action_type === 'call' ? '📞' : '📝'))}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{act.user_name || 'Hệ thống'}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(act.created_at).toLocaleString('vi-VN')}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.4 }}>{act.content}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>
                    Chưa có hoạt động tương tác nào được ghi nhận.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
