import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { EventRunOfShow } from './EventRunOfShow';
import { VoiceCommsDrawer } from './VoiceCommsDrawer';
import { 
  Radio, 
  MapPin, 
  ChevronRight, 
  ArrowLeft, 
  Layers, 
  Maximize2, 
  Volume2, 
  Calendar,
  Sparkles,
  ShieldAlert,
  SlidersHorizontal
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  venue_name?: string;
  venue_address?: string;
  owner_id?: number | null;
  sub_owner_id?: number | null;
  created_by?: number;
}

interface LiveEventControlProps {
  selectedProjectId?: number | null;
  onSelectProject?: (projectId: number) => void;
  onNavigateToProjects?: () => void;
}

export const LiveEventControl: React.FC<LiveEventControlProps> = ({
  selectedProjectId: initialProjectId,
  onSelectProject,
  onNavigateToProjects
}) => {
  const { fetchWithAuth, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(initialProjectId || null);
  const [loading, setLoading] = useState(true);
  const [showCommsPanel, setShowCommsPanel] = useState(true);

  // Load danh sách dự án
  const loadProjects = async () => {
    try {
      const res = await fetchWithAuth('/api/projects');
      if (res.ok) {
        const data = await res.json();
        const list: Project[] = Array.isArray(data) ? data : (data.projects || []);
        setProjects(list);

        // Nếu chưa chọn dự án nào, ưu tiên chọn dự án đang Active hoặc dự án đầu tiên
        if (!activeProjectId && list.length > 0) {
          const activeOne = list.find(p => p.status === 'Active') || list[0];
          setActiveProjectId(activeOne.id);
          if (onSelectProject) onSelectProject(activeOne.id);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách dự án cho Live Control:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (initialProjectId) {
      setActiveProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const handleProjectChange = (id: number) => {
    setActiveProjectId(id);
    if (onSelectProject) onSelectProject(id);
  };

  const activeProject = projects.find(p => p.id === activeProjectId);
  const canManage = user?.role === 'Admin' || 
    activeProject?.created_by === user?.id || 
    activeProject?.owner_id === user?.id || 
    activeProject?.sub_owner_id === user?.id;

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#64748b',
        fontSize: 14
      }}>
        Đang khởi động Trung Tâm Điều Hành Live Show...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: '#090d16',
      overflow: 'hidden',
      color: '#f8fafc',
      fontFamily: 'var(--font-family)'
    }}>
      {/* TOP COMMAND BAR */}
      <header style={{
        padding: '12px 20px',
        background: '#0d1526',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        zIndex: 20
      }}>
        {/* Left: Badge Live + Project Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            padding: '5px 12px',
            borderRadius: 20
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 10px #ef4444'
            }} className="animate-pulse" />
            <span style={{ fontSize: 11, fontWeight: 900, color: '#f87171', letterSpacing: 1 }}>
              LIVE CONTROL ROOM
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Sự kiện:</span>
            <select
              value={activeProjectId || ''}
              onChange={(e) => handleProjectChange(Number(e.target.value))}
              style={{
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                minWidth: 220
              }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>

          {activeProject?.venue_name && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(14, 165, 233, 0.1)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              color: '#38bdf8'
            }}>
              <MapPin size={13} />
              <span>{activeProject.venue_name}</span>
            </div>
          )}
        </div>

        {/* Right: Quick Controls & Back to Projects */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowCommsPanel(!showCommsPanel)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: showCommsPanel ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
              color: showCommsPanel ? '#38bdf8' : '#94a3b8',
              border: showCommsPanel ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid #334155',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Bật/Tắt hiển thị cột bộ đàm nội bộ"
          >
            <Radio size={14} />
            <span>{showCommsPanel ? 'Ẩn Bộ Đàm' : 'Hiện Bộ Đàm'}</span>
          </button>

          {onNavigateToProjects && (
            <button
              onClick={onNavigateToProjects}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} />
              <span>Quay lại Dự án & Tasks</span>
            </button>
          )}
        </div>
      </header>

      {/* WORKSPACE AREA */}
      {!activeProject ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          textAlign: 'center'
        }}>
          <Radio size={48} color="#64748b" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
            Chưa chọn sự kiện để điều hành
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 450, marginBottom: 20 }}>
            Vui lòng chọn một dự án từ danh sách phía trên hoặc vào phần Quản lý Dự án để khởi tạo kịch bản Run of Show.
          </p>
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* CỘT CHÍNH: RUN OF SHOW CUE SHEET */}
          <div style={{
            flex: 1,
            height: '100%',
            overflowY: 'auto',
            padding: '16px 20px',
            background: '#090d16'
          }}>
            <EventRunOfShow
              projectId={activeProject.id}
              projectName={activeProject.name}
              canManage={!!canManage}
            />
          </div>

          {/* CỘT PHẢI: BỘ ĐÀM WALKIE-TALKIE NỘI BỘ (EMBEDDED) */}
          {showCommsPanel && (
            <div style={{
              width: 360,
              minWidth: 320,
              maxWidth: 390,
              height: '100%',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#0d1526',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              padding: '12px'
            }}>
              <VoiceCommsDrawer
                projectId={activeProject.id}
                projectName={activeProject.name}
                embedded={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};