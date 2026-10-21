import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { EventCue } from '../../types/eventSuite';
import { 
  Play, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  Radio, 
  FileText, 
  Volume2, 
  Sun, 
  Tv, 
  UserCheck, 
  ChevronRight,
  Maximize2,
  Minimize2,
  Sparkles
} from 'lucide-react';

interface EventRunOfShowProps {
  projectId: number;
  projectName: string;
  canManage: boolean;
}

export const EventRunOfShow: React.FC<EventRunOfShowProps> = ({ projectId, projectName, canManage }) => {
  const { fetchWithAuth, user } = useAuth();
  const [cues, setCues] = useState<EventCue[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mc' | 'tech' | 'stage'>('all');
  
  // Timer state
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Modal thêm / sửa cue
  const [showModal, setShowModal] = useState(false);
  const [editingCue, setEditingCue] = useState<EventCue | null>(null);
  const [formData, setFormData] = useState({
    cue_code: '',
    start_time: '',
    duration_mins: 5,
    segment_title: '',
    mc_script: '',
    audio_cue: '',
    lighting_cue: '',
    visual_cue: '',
    stage_notes: '',
    pic_name: ''
  });

  const loadCues = async () => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/cues`);
      if (res.ok) {
        const data = await res.json();
        setCues(data.cues || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải kịch bản:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCues();
    // Polling nhẹ mỗi 4s để đồng bộ trạng thái Live Cue khi có người bấm GO
    const interval = setInterval(loadCues, 4000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Đếm thời gian cho cue đang LIVE
  const liveCue = cues.find(c => c.status === 'live');
  const standbyCue = cues.find(c => c.status === 'standby');

  useEffect(() => {
    if (!liveCue || !liveCue.live_started_at) {
      setSecondsElapsed(0);
      return;
    }
    const startTime = new Date(liveCue.live_started_at).getTime();
    const updateTimer = () => {
      const now = Date.now();
      setSecondsElapsed(Math.max(0, Math.floor((now - startTime) / 1000)));
    };
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [liveCue?.id, liveCue?.live_started_at]);

  const handleAction = async (action: 'go' | 'back' | 'reset', cueId?: number) => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/cues/live`, {
        method: 'POST',
        body: JSON.stringify({ action, cue_id: cueId })
      });
      if (res.ok) {
        const data = await res.json();
        setCues(data.cues || []);
      }
    } catch (err) {
      console.error('Lỗi điều khiển kịch bản:', err);
    }
  };

  const handleLoadTemplate = async () => {
    if (!window.confirm('Nạp kịch bản khung chuẩn cho sự kiện?')) return;
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/cues/template`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setCues(data.cues || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCue ? `/api/cues/${editingCue.id}` : `/api/projects/${projectId}/cues`;
      const method = editingCue ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        setCues(data.cues || []);
        setShowModal(false);
        setEditingCue(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCue = async (cueId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa dòng kịch bản này?')) return;
    try {
      const res = await fetchWithAuth(`/api/cues/${cueId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setCues(data.cues || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setEditingCue(null);
    setFormData({
      cue_code: `C${String(cues.length + 1).padStart(2, '0')}`,
      start_time: '',
      duration_mins: 5,
      segment_title: '',
      mc_script: '',
      audio_cue: '',
      lighting_cue: '',
      visual_cue: '',
      stage_notes: '',
      pic_name: ''
    });
    setShowModal(true);
  };

  const openEditModal = (c: EventCue) => {
    setEditingCue(c);
    setFormData({
      cue_code: c.cue_code || '',
      start_time: c.start_time || '',
      duration_mins: c.duration_mins || 5,
      segment_title: c.segment_title || '',
      mc_script: c.mc_script || '',
      audio_cue: c.audio_cue || '',
      lighting_cue: c.lighting_cue || '',
      visual_cue: c.visual_cue || '',
      stage_notes: c.stage_notes || '',
      pic_name: c.pic_name || ''
    });
    setShowModal(true);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const liveTargetSec = (liveCue?.duration_mins || 0) * 60;
  const isOvertime = liveTargetSec > 0 && secondsElapsed > liveTargetSec;

  return (
    <div className={`event-ros-container ${liveMode ? 'live-fullscreen' : ''}`} style={{
      background: '#ffffff',
      borderRadius: liveMode ? 0 : 12,
      border: liveMode ? 'none' : '1px solid var(--border-color)',
      padding: liveMode ? '20px' : '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      position: liveMode ? 'fixed' : 'relative',
      top: liveMode ? 0 : 'auto',
      left: liveMode ? 0 : 'auto',
      right: liveMode ? 0 : 'auto',
      bottom: liveMode ? 0 : 'auto',
      zIndex: liveMode ? 9999 : 1,
      overflowY: 'auto'
    }}>
      {/* HEADER SECTION: ĐIỀU HÀNH LIVE SHOW CALLER */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        paddingBottom: 16,
        borderBottom: '2px solid #f1f5f9',
        marginBottom: 20
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 6,
              letterSpacing: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <Radio size={13} className="animate-pulse" /> RUN OF SHOW
            </span>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Kịch Bản Điều Hành Sự Kiện & Cue-to-Cue
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            Điều phối kịch bản thời gian thực cho Đạo diễn, MC, Âm thanh, Ánh sáng, Màn LED và Hậu trường
          </p>
        </div>

        {/* CÁC NÚT ĐIỀU KHIỂN SHOW */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {canManage && (
            <>
              <button
                onClick={() => handleAction('go')}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
                title="Bấm để kích hoạt Cue tiếp theo và đồng bộ tức thời"
              >
                <Play size={16} fill="#fff" /> GO CUE
              </button>

              <button
                onClick={() => handleAction('reset')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
                title="Đặt lại kịch bản về trạng thái ban đầu"
              >
                <RotateCcw size={14} /> Reset
              </button>

              {cues.length === 0 && (
                <button
                  onClick={handleLoadTemplate}
                  style={{
                    background: 'rgba(79, 70, 229, 0.1)',
                    border: '1px solid #4f46e5',
                    color: '#4f46e5',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Sparkles size={14} /> Nạp kịch bản mẫu
                </button>
              )}

              <button
                onClick={openAddModal}
                style={{
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Plus size={14} /> Thêm Cue
              </button>
            </>
          )}

          <button
            onClick={() => setLiveMode(!liveMode)}
            style={{
              background: liveMode ? '#1e293b' : '#f1f5f9',
              color: liveMode ? '#38bdf8' : '#475569',
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            {liveMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {liveMode ? 'Thu nhỏ' : 'Toàn màn hình'}
          </button>
        </div>
      </div>

      {/* DASHBOARD LIVE ĐANG DIỄN RA */}
      {liveCue && (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          borderRadius: 12,
          padding: '16px 20px',
          color: '#fff',
          marginBottom: 20,
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: 10,
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: 0.5
              }}>
                ● ON AIR: {liveCue.cue_code}
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>Dự kiến: {liveCue.duration_mins} phút</span>
              {standbyCue && (
                <span style={{ fontSize: 12, color: '#f59e0b', marginLeft: 8 }}>
                  ⏳ Kế tiếp (Standby): <strong>{standbyCue.cue_code} - {standbyCue.segment_title}</strong>
                </span>
              )}
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0', color: '#f8fafc' }}>
              {liveCue.segment_title}
            </h3>
            {liveCue.mc_script && (
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#cbd5e1', fontStyle: 'italic', maxWidth: 800 }}>
                🎤 MC: "{liveCue.mc_script}"
              </p>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Thời gian chạy</div>
            <div style={{
              fontSize: 34,
              fontWeight: 900,
              fontFamily: 'monospace',
              color: isOvertime ? '#ef4444' : '#10b981',
              letterSpacing: 1
            }}>
              {formatTimer(secondsElapsed)}
            </div>
            {isOvertime && (
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>⚠️ Quá giờ tiết mục</span>
            )}
          </div>
        </div>
      )}

      {/* FILTER THEO BỘ PHẬN */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Tất cả các cột' },
          { key: 'mc', label: '🎤 Kịch bản MC & Lời dẫn' },
          { key: 'tech', label: '🎛️ Âm thanh / Ánh sáng / LED Visual' },
          { key: 'stage', label: '🎭 Sân khấu & Hậu trường' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              border: activeTab === tab.key ? '1px solid #4f46e5' : '1px solid #e2e8f0',
              background: activeTab === tab.key ? 'rgba(79, 70, 229, 0.08)' : '#fff',
              color: activeTab === tab.key ? '#4f46e5' : '#64748b',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DANH SÁCH BẢNG CUE SHEET */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
              <th style={{ padding: '10px 12px', width: 60 }}>Cue</th>
              <th style={{ padding: '10px 12px', width: 80 }}>Thời gian</th>
              <th style={{ padding: '10px 12px', minWidth: 160 }}>Nội dung tiết mục</th>
              {(activeTab === 'all' || activeTab === 'mc') && (
                <th style={{ padding: '10px 12px', minWidth: 220 }}>MC Script / Lời dẫn</th>
              )}
              {(activeTab === 'all' || activeTab === 'tech') && (
                <>
                  <th style={{ padding: '10px 12px', minWidth: 130 }}>🔊 Âm thanh (Audio)</th>
                  <th style={{ padding: '10px 12px', minWidth: 130 }}>💡 Ánh sáng (Lighting)</th>
                  <th style={{ padding: '10px 12px', minWidth: 130 }}>🖥️ Visual / LED</th>
                </>
              )}
              {(activeTab === 'all' || activeTab === 'stage') && (
                <th style={{ padding: '10px 12px', minWidth: 150 }}>🎭 Sân khấu & Hậu trường</th>
              )}
              <th style={{ padding: '10px 12px', width: 100 }}>Trạng thái</th>
              {canManage && <th style={{ padding: '10px 12px', width: 80, textAlign: 'center' }}>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {cues.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                  Chưa có kịch bản điều hành. Bấm <strong>"+ Thêm Cue"</strong> hoặc <strong>"Nạp kịch bản mẫu"</strong> để bắt đầu.
                </td>
              </tr>
            ) : (
              cues.map((cue, idx) => {
                const isLive = cue.status === 'live';
                const isStandby = cue.status === 'standby';
                const isDone = cue.status === 'done';

                return (
                  <tr
                    key={cue.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: isLive ? '#fef2f2' : isStandby ? '#fffbeb' : isDone ? '#fafbfc' : '#ffffff',
                      fontWeight: isLive ? 600 : 400,
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <span style={{
                        fontWeight: 800,
                        color: isLive ? '#ef4444' : isStandby ? '#d97706' : '#475569',
                        fontSize: 12
                      }}>
                        {cue.cue_code || `#${idx + 1}`}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#64748b' }}>
                      <div>{cue.start_time || '--:--'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{cue.duration_mins}p</div>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: isLive ? '#991b1b' : '#1e293b' }}>
                        {cue.segment_title}
                      </div>
                      {cue.pic_name && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          👤 PIC: <strong>{cue.pic_name}</strong>
                        </div>
                      )}
                    </td>

                    {(activeTab === 'all' || activeTab === 'mc') && (
                      <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#334155', lineHeight: 1.4 }}>
                        {cue.mc_script || <span style={{ color: '#cbd5e1' }}>--</span>}
                      </td>
                    )}

                    {(activeTab === 'all' || activeTab === 'tech') && (
                      <>
                        <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#0369a1' }}>
                          {cue.audio_cue || <span style={{ color: '#cbd5e1' }}>--</span>}
                        </td>
                        <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#b45309' }}>
                          {cue.lighting_cue || <span style={{ color: '#cbd5e1' }}>--</span>}
                        </td>
                        <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#4338ca' }}>
                          {cue.visual_cue || <span style={{ color: '#cbd5e1' }}>--</span>}
                        </td>
                      </>
                    )}

                    {(activeTab === 'all' || activeTab === 'stage') && (
                      <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#475569' }}>
                        {cue.stage_notes || <span style={{ color: '#cbd5e1' }}>--</span>}
                      </td>
                    )}

                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 12,
                        textTransform: 'uppercase',
                        background: isLive ? '#fee2e2' : isStandby ? '#fef3c7' : isDone ? '#e2e8f0' : '#f1f5f9',
                        color: isLive ? '#dc2626' : isStandby ? '#d97706' : isDone ? '#475569' : '#64748b'
                      }}>
                        {isLive ? '● LIVE' : isStandby ? 'STANDBY' : isDone ? 'ĐÃ QUA' : 'CHỜ'}
                      </span>
                    </td>

                    {canManage && (
                      <td style={{ padding: '10px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => openEditModal(cue)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}
                            title="Sửa kịch bản"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCue(cue.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}
                            title="Xóa dòng"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL THÊM / SỬA CUE */}
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
            maxWidth: 620,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {editingCue ? 'Chỉnh Sửa Dòng Kịch Bản Cue' : 'Thêm Dòng Kịch Bản Mới'}
            </h3>

            <form onSubmit={handleSaveCue} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Mã Cue</label>
                  <input
                    type="text"
                    value={formData.cue_code}
                    onChange={e => setFormData({ ...formData, cue_code: e.target.value })}
                    placeholder="VD: C01"
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Giờ Bắt Đầu</label>
                  <input
                    type="text"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    placeholder="VD: 18:00"
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Thời Lượng (Phút)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_mins}
                    onChange={e => setFormData({ ...formData, duration_mins: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Tên Tiết Mục / Hạng Mục *</label>
                <input
                  type="text"
                  required
                  value={formData.segment_title}
                  onChange={e => setFormData({ ...formData, segment_title: e.target.value })}
                  placeholder="VD: Khai mạc & Giới thiệu đại biểu"
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, marginTop: 4, fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Kịch Bản MC / Lời Dẫn</label>
                <textarea
                  rows={3}
                  value={formData.mc_script}
                  onChange={e => setFormData({ ...formData, mc_script: e.target.value })}
                  placeholder="Nội dung MC phát biểu hoặc voiceover..."
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>🔊 Âm Thanh (Audio)</label>
                  <input
                    type="text"
                    value={formData.audio_cue}
                    onChange={e => setFormData({ ...formData, audio_cue: e.target.value })}
                    placeholder="VD: Mic MC 1-2 ON, Nhạc nhẹ"
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#b45309' }}>💡 Ánh Sáng (Lighting)</label>
                  <input
                    type="text"
                    value={formData.lighting_cue}
                    onChange={e => setFormData({ ...formData, lighting_cue: e.target.value })}
                    placeholder="VD: Spot MC, Hạ đèn khán phòng"
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#4338ca' }}>🖥️ Visual / Màn Hình LED</label>
                  <input
                    type="text"
                    value={formData.visual_cue}
                    onChange={e => setFormData({ ...formData, visual_cue: e.target.value })}
                    placeholder="VD: Slide Giới thiệu, Loop KV"
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>👤 Người Phụ Trách (PIC)</label>
                  <input
                    type="text"
                    value={formData.pic_name}
                    onChange={e => setFormData({ ...formData, pic_name: e.target.value })}
                    placeholder="VD: MC Quỳnh Nga / Sound Tuấn"
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>🎭 Sân Khấu & Đạo Cụ / Hậu Trường</label>
                <input
                  type="text"
                  value={formData.stage_notes}
                  onChange={e => setFormData({ ...formData, stage_notes: e.target.value })}
                  placeholder="VD: Lễ tân bê khay hoa, chuẩn bị micro dự phòng..."
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {editingCue ? 'Lưu thay đổi' : 'Thêm Cue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
