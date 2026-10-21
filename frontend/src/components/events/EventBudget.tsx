import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { EventBudgetItem, EventBudgetSummary } from '../../types/eventSuite';
import { Plus, Trash2, DollarSign, TrendingUp, AlertCircle, Building2, Phone, CheckCircle2 } from 'lucide-react';

interface EventBudgetProps {
  projectId: number;
  canManage: boolean;
}

export const EventBudget: React.FC<EventBudgetProps> = ({ projectId, canManage }) => {
  const { fetchWithAuth } = useAuth();
  const [items, setItems] = useState<EventBudgetItem[]>([]);
  const [summary, setSummary] = useState<EventBudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Sản xuất & Kỹ thuật',
    item_name: '',
    vendor_name: '',
    vendor_phone: '',
    unit: 'Gói',
    quantity: 1,
    estimated_unit_price: 0,
    actual_unit_price: 0,
    paid_amount: 0,
    payment_status: 'unpaid',
    payment_due_date: '',
    notes: ''
  });

  const loadBudget = async () => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/budget`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudget();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/budget`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary(data.summary || null);
        setShowModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePayment = async (item: EventBudgetItem, paidAmount: number) => {
    try {
      const res = await fetchWithAuth(`/api/budget/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ paid_amount: paidAmount })
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!window.confirm('Xóa hạng mục chi phí này?')) return;
    try {
      const res = await fetchWithAuth(`/api/budget/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatMoney = (n: number) => `${(n || 0).toLocaleString('vi-VN')} đ`;

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      border: '1px solid var(--border-color)',
      padding: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      {/* SUMMARY CARDS / METRIC BAR */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 20
        }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Doanh Thu Dự Án (CRM)</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
              {formatMoney(summary.revenue)}
            </div>
            <div style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>
              Đã thu từ khách: {formatMoney(summary.collected_from_client)}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Tổng Chi Phí Thực Tế</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
              {formatMoney(summary.actual_cost)}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              Dự toán ban đầu: {formatMoney(summary.estimated_cost)}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Công Nợ Nhà Cung Cấp</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: summary.vendor_debt > 0 ? '#ea580c' : '#16a34a', marginTop: 4 }}>
              {formatMoney(summary.vendor_debt)}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              Đã thanh toán: {formatMoney(summary.paid_to_vendors)}
            </div>
          </div>

          <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Lãi Gộp (P&L)</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: summary.gross_profit >= 0 ? '#15803d' : '#dc2626', marginTop: 4 }}>
              {formatMoney(summary.gross_profit)}
            </div>
            <div style={{ fontSize: 10, color: '#166534', marginTop: 2 }}>
              Biên LN: <strong>{summary.gross_margin}%</strong> {summary.commission > 0 && `(Hoa hồng: ${formatMoney(summary.commission)})`}
            </div>
          </div>
        </div>
      )}

      {/* HEADER & ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={18} color="#16a34a" /> Dự Toán P&L & Theo Dõi Thanh Toán Nhà Cung Cấp
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            Theo dõi chi tiết giá dự toán vs thực tế, tiến độ cọc / quyết toán cho từng hạng mục dịch vụ sự kiện
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <Plus size={14} /> Thêm Chi Phí / NCC
        </button>
      </div>

      {/* BẢNG CHI PHÍ & NHÀ CUNG CẤP */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
              <th style={{ padding: '8px 10px' }}>Hạng mục chi phí</th>
              <th style={{ padding: '8px 10px' }}>Nhà cung cấp (Vendor)</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Dự toán (Est)</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thực tế (Act)</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Đã thanh toán</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Còn nợ</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Trạng thái</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Hạn thanh toán</th>
              {canManage && <th style={{ padding: '8px 10px', width: 40 }}></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                  Chưa có hạng mục chi phí nào. Bấm <strong>"+ Thêm Chi Phí / NCC"</strong> để lập dự toán.
                </td>
              </tr>
            ) : (
              items.map(item => {
                const isPaid = item.payment_status === 'paid';
                const isDeposit = item.payment_status === 'deposit';

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.item_name}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{item.category} • {item.quantity} {item.unit}</div>
                    </td>
                    <td style={{ padding: '10px 10px', color: '#334155' }}>
                      {item.vendor_name ? (
                        <div>
                          <strong>{item.vendor_name}</strong>
                          {item.vendor_phone && <div style={{ fontSize: 10, color: '#64748b' }}>📞 {item.vendor_phone}</div>}
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>--</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#64748b' }}>
                      {formatMoney(item.estimated_total)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {formatMoney(item.actual_total || item.estimated_total)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                      {formatMoney(item.paid_amount)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: item.remaining > 0 ? '#dc2626' : '#15803d', fontWeight: 700 }}>
                      {formatMoney(item.remaining)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: isPaid ? '#dcfce7' : isDeposit ? '#fef3c7' : '#fee2e2',
                        color: isPaid ? '#15803d' : isDeposit ? '#b45309' : '#dc2626'
                      }}>
                        {isPaid ? 'Đã quyết toán' : isDeposit ? 'Đã đặt cọc' : 'Chưa thanh toán'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', color: '#64748b', fontSize: 11 }}>
                      {item.payment_due_date || '--'}
                    </td>
                    {canManage && (
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL THÊM HẠNG MỤC DỰ TOÁN */}
      {showModal && (
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
            maxWidth: 520,
            padding: 20,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 700 }}>Thêm Hạng Mục Ngân Sách / Nhà Cung Cấp</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Tên hạng mục *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Thuê Màn hình LED P3 (20m2)"
                  value={formData.item_name}
                  onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Nhà cung cấp (Vendor)</label>
                  <input
                    type="text"
                    placeholder="VD: Ánh Sáng Việt Co."
                    value={formData.vendor_name}
                    onChange={e => setFormData({ ...formData, vendor_name: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Số điện thoại NCC</label>
                  <input
                    type="text"
                    placeholder="VD: 0909 123 456"
                    value={formData.vendor_phone}
                    onChange={e => setFormData({ ...formData, vendor_phone: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Số lượng</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Đơn giá Dự toán (VNĐ)</label>
                  <input
                    type="number"
                    step="50000"
                    placeholder="VD: 15000000"
                    value={formData.estimated_unit_price}
                    onChange={e => setFormData({ ...formData, estimated_unit_price: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Đơn giá Thực tế (VNĐ)</label>
                  <input
                    type="number"
                    step="50000"
                    placeholder="VD: 14000000"
                    value={formData.actual_unit_price}
                    onChange={e => setFormData({ ...formData, actual_unit_price: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Đã thanh toán (Cọc/Full)</label>
                  <input
                    type="number"
                    step="50000"
                    placeholder="VD: 5000000"
                    value={formData.paid_amount}
                    onChange={e => setFormData({ ...formData, paid_amount: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Lưu Hạng Mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
