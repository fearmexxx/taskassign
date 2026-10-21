import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { EventLogisticsItem, LogisticsStatus } from '../../types/eventSuite';
import { Plus, Trash2, CheckCircle2, AlertTriangle, ArrowRight, Package, Box, Tag } from 'lucide-react';

interface EventLogisticsProps {
  projectId: number;
  canManage: boolean;
}

export const EventLogistics: React.FC<EventLogisticsProps> = ({ projectId, canManage }) => {
  const { fetchWithAuth } = useAuth();
  const [items, setItems] = useState<EventLogisticsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('all');

  // Modal thêm hạng mục
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'Thiết bị AV',
    quantity: 1,
    unit: 'Cái',
    pic_name: '',
    notes: ''
  });

  const loadLogistics = async () => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/logistics`);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogistics();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/logistics`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setItems(await res.json());
        setShowModal(false);
        setFormData({ item_name: '', category: 'Thiết bị AV', quantity: 1, unit: 'Cái', pic_name: '', notes: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (item: EventLogisticsItem, nextStatus: LogisticsStatus) => {
    try {
      const res = await fetchWithAuth(`/api/logistics/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!window.confirm('Xóa thiết bị này khỏi danh sách?')) return;
    try {
      const res = await fetchWithAuth(`/api/logistics/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const statusLabel = (st: LogisticsStatus) => {
    switch (st) {
      case 'planned': return { text: 'Chuẩn bị', bg: '#f1f5f9', color: '#64748b' };
      case 'checked_out': return { text: 'Đã xuất kho', bg: '#e0f2fe', color: '#0369a1' };
      case 'onsite': return { text: 'Tại sự kiện', bg: '#fef3c7', color: '#b45309' };
      case 'returned': return { text: 'Đã thu hồi', bg: '#dcfce7', color: '#15803d' };
      case 'issue': return { text: 'Sự cố / Hư hại', bg: '#fee2e2', color: '#dc2626' };
      default: return { text: st, bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category || 'Khác')))];
  const filtered = filterCat === 'all' ? items : items.filter(i => i.category === filterCat);

  const returnedCount = items.filter(i => i.status === 'returned').length;
  const onsiteCount = items.filter(i => i.status === 'onsite').length;

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      border: '1px solid var(--border-color)',
      padding: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Box size={18} color="#4f46e5" /> Quản Lý Hậu Cần, Thiết Bị & Packing List Sự Kiện
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            Kiểm soát 2 chiều: Xuất kho mang đi sự kiện $\rightarrow$ Bàn giao tại hiện trường $\rightarrow$ Thu hồi về kho
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Thu hồi: <strong style={{ color: '#15803d' }}>{returnedCount}/{items.length}</strong> món
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: '#4f46e5',
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
            <Plus size={14} /> Thêm Thiết Bị
          </button>
        </div>
      </div>

      {/* FILTER CATEGORY */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            style={{
              padding: '4px 12px',
              borderRadius: 16,
              fontSize: 11,
              fontWeight: 600,
              border: filterCat === cat ? '1px solid #4f46e5' : '1px solid #cbd5e1',
              background: filterCat === cat ? 'rgba(79, 70, 229, 0.08)' : '#fff',
              color: filterCat === cat ? '#4f46e5' : '#64748b',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {cat === 'all' ? 'Tất cả' : cat}
          </button>
        ))}
      </div>

      {/* TABLE PACKING LIST */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
              <th style={{ padding: '8px 10px' }}>Tên thiết bị / Ấn phẩm</th>
              <th style={{ padding: '8px 10px' }}>Phân loại</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Số lượng</th>
              <th style={{ padding: '8px 10px' }}>PIC phụ trách</th>
              <th style={{ padding: '8px 10px' }}>Ghi chú</th>
              <th style={{ padding: '8px 10px' }}>Trạng thái luân chuyển</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Cập nhật luân chuyển</th>
              {canManage && <th style={{ padding: '8px 10px', width: 40 }}></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                  Chưa có thiết bị nào trong danh sách.
                </td>
              </tr>
            ) : (
              filtered.map(item => {
                const badge = statusLabel(item.status);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: '#1e293b' }}>
                      {item.item_name}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#64748b' }}>
                      <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700 }}>
                      {item.quantity} {item.unit}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#475569' }}>
                      {item.pic_name || '--'}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#64748b' }}>
                      {item.notes || '--'}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
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
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        {item.status === 'planned' && (
                          <button
                            onClick={() => handleUpdateStatus(item, 'checked_out')}
                            style={{ padding: '3px 8px', fontSize: 10, borderRadius: 4, border: '1px solid #0284c7', color: '#0284c7', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Xuất kho
                          </button>
                        )}
                        {item.status === 'checked_out' && (
                          <button
                            onClick={() => handleUpdateStatus(item, 'onsite')}
                            style={{ padding: '3px 8px', fontSize: 10, borderRadius: 4, border: '1px solid #b45309', color: '#b45309', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Đã đến Show
                          </button>
                        )}
                        {item.status === 'onsite' && (
                          <button
                            onClick={() => handleUpdateStatus(item, 'returned')}
                            style={{ padding: '3px 8px', fontSize: 10, borderRadius: 4, border: '1px solid #16a34a', color: '#16a34a', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Thu hồi về kho
                          </button>
                        )}
                        {item.status !== 'issue' && (
                          <button
                            onClick={() => handleUpdateStatus(item, 'issue')}
                            style={{ padding: '3px 6px', fontSize: 10, borderRadius: 4, border: '1px solid #ef4444', color: '#ef4444', background: '#fff', cursor: 'pointer' }}
                            title="Báo sự cố hỏng / thất lạc"
                          >
                            Báo lỗi
                          </button>
                        )}
                      </div>
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

      {/* MODAL THÊM THIẾT BỊ */}
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
            maxWidth: 480,
            padding: 20,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 700 }}>Thêm Thiết Bị / Ấn Phẩm Sự Kiện</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Tên thiết bị / Ấn phẩm *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Micro không dây Shure GLXD4"
                  value={formData.item_name}
                  onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Phân loại</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  >
                    <option value="Thiết bị AV">Thiết bị AV (Âm thanh/Ánh sáng)</option>
                    <option value="Máy tính / IT">Máy tính / IT điều khiển</option>
                    <option value="Ấn phẩm / POSM">Ấn phẩm / Backdrop / Standee</option>
                    <option value="Đạo cụ sân khấu">Đạo cụ sân khấu</option>
                    <option value="Bộ đàm & Phụ kiện">Bộ đàm & Phụ kiện</option>
                    <option value="Quà tặng & Khác">Quà tặng & Khác</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Số lượng & Đơn vị</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      style={{ width: '60%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="Cái"
                      style={{ width: '40%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Người phụ trách mang / nhận (PIC)</label>
                <input
                  type="text"
                  placeholder="VD: Tuấn Kỹ thuật"
                  value={formData.pic_name}
                  onChange={e => setFormData({ ...formData, pic_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Ghi chú</label>
                <input
                  type="text"
                  placeholder="Ghi chú đóng gói, tình trạng pin..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                />
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
                  style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Thêm Thiết Bị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
