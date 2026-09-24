import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  CrmCustomer, 
  CrmDeal, 
  CrmStats, 
  DealStage, 
  canAccessCrm 
} from '../../types/crm';
import { CustomerModal } from './CustomerModal';
import { DealModal } from './DealModal';
import { DealDetailDrawer } from './DealDetailDrawer';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  Building, 
  Mail, 
  Share2, 
  Calendar, 
  Percent, 
  Rocket, 
  ChevronRight, 
  Eye, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

interface Props {
  onNavigateToProject?: (projectId: number) => void;
}

const STAGE_CONFIG: { key: DealStage; label: string; color: string }[] = [
  { key: 'lead', label: '1. Tìm hiểu / Lead', color: '#64748b' },
  { key: 'brief', label: '2. Nhận Brief', color: '#0ea5e9' },
  { key: 'proposal', label: '3. Báo giá & Pitch', color: '#8b5cf6' },
  { key: 'meeting', label: '4. Họp trao đổi', color: '#f59e0b' },
  { key: 'negotiation', label: '5. Phản hồi & Đàm phán', color: '#ec4899' },
  { key: 'won', label: '6. Ký Hợp Đồng', color: '#10b981' },
  { key: 'execution', label: '7. Bàn giao Triển khai', color: '#3b82f6' },
  { key: 'payment_report', label: '8. Quyết toán & Báo cáo', color: '#059669' }
];

export const CrmView: React.FC<Props> = ({ onNavigateToProject }) => {
  const { user, fetchWithAuth } = useAuth();

  // Kiểm tra phân quyền truy cập
  const hasAccess = canAccessCrm(user);

  const [activeTab, setActiveTab] = useState<'pipeline' | 'customers' | 'forecast'>('customers');
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: number; name: string }[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Modals state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CrmCustomer | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<CrmDeal | null>(null);
  const [viewingDeal, setViewingDeal] = useState<CrmDeal | null>(null);

  const loadData = async () => {
    if (!hasAccess) return;
    try {
      const [statsRes, custRes, dealsRes, teamRes] = await Promise.all([
        fetchWithAuth('/api/crm/stats'),
        fetchWithAuth(`/api/crm/customers?search=${encodeURIComponent(searchQuery)}&quarter=${selectedQuarter}&year=${selectedYear}`),
        fetchWithAuth(`/api/crm/deals?search=${encodeURIComponent(searchQuery)}`),
        fetchWithAuth('/api/users')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (dealsRes.ok) setDeals(await dealsRes.json());
      if (teamRes.ok) setTeamMembers(await teamRes.json());
    } catch (e) {
      console.error('Error loading CRM data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [hasAccess, searchQuery, selectedQuarter, selectedYear]);

  // Nếu không có quyền, render cảnh báo từ chối truy cập
  if (!hasAccess) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 24,
        textAlign: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <AlertTriangle size={32} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
          Truy Cập Bị Giới Hạn
        </h2>
        <p style={{ fontSize: 14, color: '#64748b', maxWidth: 450, lineHeight: 1.5 }}>
          Phân hệ Quản Lý Khách Hàng (CRM) được phân quyền bảo mật, chỉ dành riêng cho <strong>Ban Quản Lý (Admin)</strong> và <strong>Phòng Sales & Account</strong>.
        </p>
      </div>
    );
  }

  // Thao tác Khách hàng
  const handleSaveCustomer = async (data: Partial<CrmCustomer>) => {
    const isEdit = !!editingCustomer;
    const url = isEdit ? `/api/crm/customers/${editingCustomer.id}` : '/api/crm/customers';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi khi lưu khách hàng');
    }

    await loadData();
  };

  const handleDeleteCustomer = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khách hàng "${name}"? Thao tác này chỉ dành cho Admin.`)) return;
    try {
      const res = await fetchWithAuth(`/api/crm/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Xóa thất bại');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Thao tác Deal
  const handleSaveDeal = async (data: any) => {
    const isEdit = !!editingDeal;
    const url = isEdit ? `/api/crm/deals/${editingDeal.id}` : '/api/crm/deals';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi khi lưu deal');
    }

    await loadData();
  };

  const handleUpdateStage = async (dealId: number, newStage: DealStage) => {
    try {
      const res = await fetchWithAuth(`/api/crm/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });
      if (res.ok) {
        await loadData();
        // Cập nhật lại view drawer nếu đang mở
        if (viewingDeal && viewingDeal.id === dealId) {
          const detailRes = await fetchWithAuth(`/api/crm/deals/${dealId}`);
          if (detailRes.ok) setViewingDeal(await detailRes.json());
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePayment = async (dealId: number, payment_status: 'unpaid' | 'partial' | 'paid', paid_amount: number) => {
    const res = await fetchWithAuth(`/api/crm/deals/${dealId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status, paid_amount })
    });
    if (res.ok) {
      await loadData();
      if (viewingDeal && viewingDeal.id === dealId) {
        const detailRes = await fetchWithAuth(`/api/crm/deals/${dealId}`);
        if (detailRes.ok) setViewingDeal(await detailRes.json());
      }
    }
  };

  const handleConvertToProject = async (dealId: number) => {
    const res = await fetchWithAuth(`/api/crm/deals/${dealId}/convert-to-project`, {
      method: 'POST'
    });
    if (res.ok) {
      const result = await res.json();
      alert(result.message || 'Chuyển giao thành công!');
      await loadData();
      if (viewingDeal && viewingDeal.id === dealId) {
        const detailRes = await fetchWithAuth(`/api/crm/deals/${dealId}`);
        if (detailRes.ok) setViewingDeal(await detailRes.json());
      }
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Lỗi chuyển giao');
    }
  };

  const handleAddActivity = async (dealId: number, content: string, action_type: string) => {
    const res = await fetchWithAuth(`/api/crm/deals/${dealId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, action_type })
    });
    if (res.ok) {
      await loadData();
      if (viewingDeal && viewingDeal.id === dealId) {
        const detailRes = await fetchWithAuth(`/api/crm/deals/${dealId}`);
        if (detailRes.ok) setViewingDeal(await detailRes.json());
      }
    }
  };

  const openDealDrawer = async (dealId: number) => {
    try {
      const res = await fetchWithAuth(`/api/crm/deals/${dealId}`);
      if (res.ok) {
        setViewingDeal(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>
      {/* Top Header & Metrics */}
      <div style={{
        padding: '16px 24px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                CRM & Quản Lý Khách Hàng
              </h1>
              <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                VBE Agency
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0 0' }}>
              Theo dõi toàn diện danh bạ khách hàng, SĐT Unique, hoa hồng chiết khấu & pipeline 8 giai đoạn
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setEditingCustomer(null); setShowCustomerModal(true); }}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Users size={16} />
              <span>+ Thêm Khách Hàng</span>
            </button>

            <button
              onClick={() => { setEditingDeal(null); setShowDealModal(true); }}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5, #00f2fe)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
              }}
            >
              <Plus size={16} />
              <span>+ Khởi Tạo Deal Mới</span>
            </button>
          </div>
        </div>

        {/* 4 Quick Metric Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 11, fontWeight: 600 }}>
                <Users size={14} />
                <span>Tổng Khách Hàng (SĐT)</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {stats.total_customers}
              </div>
            </div>

            <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: 10, border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2563eb', fontSize: 11, fontWeight: 600 }}>
                <TrendingUp size={14} />
                <span>Giá Trị Pipeline</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
                {stats.pipeline_value ? (stats.pipeline_value / 1000000).toLocaleString('vi-VN') + ' tr' : '0 đ'}
              </div>
            </div>

            <div style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: 10, border: '1px solid #a7f3d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: 11, fontWeight: 600 }}>
                <Briefcase size={14} />
                <span>Doanh Số Đã Ký (HĐ)</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#047857', marginTop: 4 }}>
                {stats.won_value ? (stats.won_value / 1000000).toLocaleString('vi-VN') + ' tr' : '0 đ'}
              </div>
            </div>

            <div style={{ background: '#fffbeb', padding: '10px 14px', borderRadius: 10, border: '1px solid #fde68a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontSize: 11, fontWeight: 600 }}>
                <DollarSign size={14} />
                <span>Thực Thu (Đã Thu Tiền)</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#b45309', marginTop: 4 }}>
                {stats.total_collected ? (stats.total_collected / 1000000).toLocaleString('vi-VN') + ' tr' : '0 đ'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs & Filter Bar */}
      <div style={{
        padding: '10px 24px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Sub-Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('customers')}
            style={{
              padding: '7px 16px',
              borderRadius: 20,
              border: 'none',
              background: activeTab === 'customers' ? '#4f46e5' : '#f1f5f9',
              color: activeTab === 'customers' ? '#ffffff' : '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📋 Danh Bạ Khách Hàng ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            style={{
              padding: '7px 16px',
              borderRadius: 20,
              border: 'none',
              background: activeTab === 'pipeline' ? '#4f46e5' : '#f1f5f9',
              color: activeTab === 'pipeline' ? '#ffffff' : '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🎯 Pipeline Hành Trình 8 Bước ({deals.length})
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            style={{
              padding: '7px 16px',
              borderRadius: 20,
              border: 'none',
              background: activeTab === 'forecast' ? '#4f46e5' : '#f1f5f9',
              color: activeTab === 'forecast' ? '#ffffff' : '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🔮 Forecast Doanh Thu Quý/Năm
          </button>
        </div>

        {/* Search & Filter Inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo SĐT, Tên, Công ty..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px 6px 30px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 12.5,
                width: 220
              }}
            />
          </div>

          {activeTab === 'customers' && (
            <>
              <select
                value={selectedQuarter}
                onChange={e => setSelectedQuarter(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
              >
                <option value="">Tất cả Quý</option>
                <option value="Q1">Quý 1</option>
                <option value="Q2">Quý 2</option>
                <option value="Q3">Quý 3</option>
                <option value="Q4">Quý 4</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {/* TAB 1: DANH BẠ KHÁCH HÀNG (CUSTOMER DIRECTORY) */}
        {activeTab === 'customers' && (
          <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px' }}>Số Điện Thoại (Unique)</th>
                    <th style={{ padding: '12px 16px' }}>Họ Tên & Công Ty</th>
                    <th style={{ padding: '12px 16px' }}>Chiết Khấu Hoa Hồng</th>
                    <th style={{ padding: '12px 16px' }}>Tình Trạng Dự Án</th>
                    <th style={{ padding: '12px 16px' }}>Forecast Quý / Năm</th>
                    <th style={{ padding: '12px 16px' }}>Account Phụ Trách</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length > 0 ? (
                    customers.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                        {/* SĐT Unique */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Phone size={14} style={{ color: '#4f46e5' }} />
                            <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', fontSize: 13.5 }}>
                              {c.phone}
                            </span>
                          </div>
                          {c.social && (
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Share2 size={11} />
                              <span>{c.social}</span>
                            </div>
                          )}
                        </td>

                        {/* Name & Company */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Building size={11} />
                            <span>{c.company || 'Cá nhân'}</span>
                            {c.email && <span>• {c.email}</span>}
                          </div>
                        </td>

                        {/* Commission */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            background: c.commission_rate > 0 ? '#fee2e2' : '#f1f5f9',
                            color: c.commission_rate > 0 ? '#b91c1c' : '#64748b',
                            fontWeight: 700,
                            fontSize: 11
                          }}>
                            {c.commission_rate}% hoa hồng
                          </span>
                          {c.commission_notes && (
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                              {c.commission_notes}
                            </div>
                          )}
                        </td>

                        {/* Current Project Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: '#0f172a' }}>
                            {c.current_project_status || 'Mới tiếp cận'}
                          </div>
                          {c.past_projects_notes && (
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
                              Lịch sử: {c.past_projects_notes}
                            </div>
                          )}
                        </td>

                        {/* Forecast */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#047857' }}>
                            {c.forecast_revenue ? (c.forecast_revenue / 1000000).toLocaleString('vi-VN') + ' tr' : '0 đ'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {c.forecast_quarter} / {c.forecast_year}
                          </div>
                        </td>

                        {/* Assigned To */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 12, color: '#334155' }}>
                            {c.assigned_name || 'Chưa gán'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              onClick={() => { setEditingCustomer(c); setShowCustomerModal(true); }}
                              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 12 }}
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit3 size={13} />
                            </button>
                            {(user?.role === 'Admin' || user?.email === 'vinh@vbe.vn') && (
                              <button
                                onClick={() => handleDeleteCustomer(c.id, c.name)}
                                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                                title="Xóa khách hàng (Admin)"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                        Chưa có khách hàng nào trong danh bạ. Hãy nhấp nút "+ Thêm Khách Hàng" ở góc trên.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PIPELINE HÀNH TRÌNH 8 BƯỚC (KANBAN BOARD) */}
        {activeTab === 'pipeline' && (
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, height: '100%' }}>
            {STAGE_CONFIG.map(st => {
              const stageDeals = deals.filter(d => d.stage === st.key);
              const totalVal = stageDeals.reduce((sum, d) => sum + (d.contract_value || d.expected_value || 0), 0);

              return (
                <div
                  key={st.key}
                  style={{
                    width: 290,
                    minWidth: 290,
                    background: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '100%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                >
                  {/* Column Header */}
                  <div style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    borderTop: `3px solid ${st.color}`,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    background: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        {st.label}
                      </span>
                      <span style={{ fontSize: 11, background: '#e2e8f0', color: '#475569', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                        {stageDeals.length}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Tổng: <strong>{(totalVal / 1000000).toLocaleString('vi-VN')} tr</strong>
                    </div>
                  </div>

                  {/* Deals Card List */}
                  <div style={{ padding: 10, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stageDeals.map(d => (
                      <div
                        key={d.id}
                        onClick={() => openDealDrawer(d.id)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#4f46e5'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace' }}>
                            {d.customer_phone}
                          </span>
                          {d.project_id && (
                            <span style={{ fontSize: 9.5, background: '#ecfdf5', color: '#047857', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                              ✓ Đã có Dự án
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6, lineHeight: 1.3 }}>
                          {d.title}
                        </div>

                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                          {d.customer_name || 'Khách hàng'} {d.customer_company ? `(${d.customer_company})` : ''}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: 11 }}>
                          <span style={{ fontWeight: 700, color: d.contract_value ? '#059669' : '#2563eb' }}>
                            {d.contract_value ? (d.contract_value / 1000000).toLocaleString('vi-VN') + ' tr' : (d.expected_value ? (d.expected_value / 1000000).toLocaleString('vi-VN') + ' tr' : '0 đ')}
                          </span>
                          <span style={{ color: '#94a3b8' }}>
                            {d.assigned_name || 'Chưa gán'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {stageDeals.length === 0 && (
                      <div style={{ padding: '20px 10px', textAlign: 'center', color: '#cbd5e1', fontSize: 12 }}>
                        Không có deal
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: FORECAST DOANH THU (QUARTERLY & YEARLY) */}
        {activeTab === 'forecast' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Overview Forecast Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {stats?.forecast_by_quarter.map((fc, i) => (
                <div key={i} style={{ background: '#ffffff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#4f46e5' }}>
                      {fc.forecast_quarter} / {fc.forecast_year}
                    </span>
                    <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 10, color: '#475569', fontWeight: 600 }}>
                      {fc.customer_count} khách hàng
                    </span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#047857' }}>
                    {fc.total_forecast ? (fc.total_forecast / 1000000).toLocaleString('vi-VN') + ' triệu VNĐ' : '0 đ'}
                  </div>
                </div>
              ))}
            </div>

            {/* Customer Forecast Table */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#1e293b' }}>
                Chi Tiết Tiềm Năng Khách Hàng Theo Dự Báo
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 16px' }}>Khách Hàng (SĐT)</th>
                    <th style={{ padding: '10px 16px' }}>Công Ty</th>
                    <th style={{ padding: '10px 16px' }}>Quý / Năm</th>
                    <th style={{ padding: '10px 16px' }}>Dự Báo Doanh Thu</th>
                    <th style={{ padding: '10px 16px' }}>Ghi Chú Kế Hoạch</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.filter(c => c.forecast_revenue > 0).map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {c.name} ({c.phone})
                      </td>
                      <td style={{ padding: '12px 16px' }}>{c.company || 'Cá nhân'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4f46e5' }}>
                        {c.forecast_quarter} / {c.forecast_year}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#059669' }}>
                        {(c.forecast_revenue).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {c.forecast_notes || 'Chưa có ghi chú'}
                      </td>
                    </tr>
                  ))}
                  {customers.filter(c => c.forecast_revenue > 0).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                        Chưa có dữ liệu forecast doanh thu. Vui lòng cập nhật vào hồ sơ khách hàng.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Customer Modal (Add/Edit) */}
      {showCustomerModal && (
        <CustomerModal
          customer={editingCustomer}
          teamMembers={teamMembers}
          onClose={() => { setShowCustomerModal(false); setEditingCustomer(null); }}
          onSave={handleSaveCustomer}
        />
      )}

      {/* Deal Modal (Add/Edit) */}
      {showDealModal && (
        <DealModal
          deal={editingDeal}
          customers={customers}
          teamMembers={teamMembers}
          onClose={() => { setShowDealModal(false); setEditingDeal(null); }}
          onSave={handleSaveDeal}
        />
      )}

      {/* Deal Detail Drawer */}
      {viewingDeal && (
        <DealDetailDrawer
          deal={viewingDeal}
          onClose={() => setViewingDeal(null)}
          onUpdateStage={handleUpdateStage}
          onUpdatePayment={handleUpdatePayment}
          onConvertToProject={handleConvertToProject}
          onAddActivity={handleAddActivity}
          onNavigateToProject={onNavigateToProject}
        />
      )}
    </div>
  );
};
