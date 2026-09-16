import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: number;
  reference_id: number | null;
  reference_type: string | null;
  created_at: string;
}

interface NotificationBellProps {
  onNavigate?: (tab: string) => void;
  placement?: 'left' | 'right' | 'center';
}

const POLL_INTERVAL_MS = 30_000;

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate, placement = 'center' }) => {
  const { fetchWithAuth } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch {
      // Silent fail
    }
  }, [fetchWithAuth]);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markRead = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await fetchWithAuth(`/api/notifications/${notification.id}/read`, { method: 'PUT' });
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: 1 } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        // Silent fail
      }
    }
    if (notification.reference_type === 'task' || notification.reference_type === 'project') {
      if (onNavigate) onNavigate('projects');
      setIsOpen(false);
    }
  };

  const markAllRead = async () => {
    try {
      await fetchWithAuth('/api/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {
      // Silent fail
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs} giờ trước`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return date.toLocaleDateString('vi-VN');
    } catch { return dateStr; }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task_assigned': return '📋';
      case 'project_added': return '📁';
      case 'task_updated': return '✏️';
      default: return '🔔';
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        title="Thông báo"
        style={{
          background: isOpen ? 'rgba(0, 242, 254, 0.06)' : 'transparent',
          border: isOpen ? '1px solid rgba(0, 242, 254, 0.15)' : '1px solid transparent',
          borderRadius: 8,
          padding: '8px',
          cursor: 'pointer',
          color: isOpen ? '#00f2fe' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.15s ease',
          width: 36,
          height: 36,
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            background: '#ef4444',
            color: '#fff',
            borderRadius: '50%',
            width: 16,
            height: 16,
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-sidebar)',
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          ...(placement === 'right' ? { right: 0 } : placement === 'left' ? { left: 0 } : { left: '50%', transform: 'translateX(-50%)' }),
          width: 'min(340px, calc(100vw - 32px))',
          maxHeight: 440,
          background: '#0f172a',
          border: '1px solid rgba(0, 242, 254, 0.15)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,242,254,0.05)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={14} color="#00f2fe" />
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Thông báo</span>
              {unreadCount > 0 && (
                <span style={{
                  background: 'rgba(239,68,68,0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#00f2fe',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 4,
                  opacity: 0.8,
                }}
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {isLoading ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Đang tải...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                <div>Chưa có thông báo nào</div>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    background: n.is_read ? 'transparent' : 'rgba(0, 242, 254, 0.03)',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseOut={e => (e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(0, 242, 254, 0.03)')}
                >
                  <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>
                    {getTypeIcon(n.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: n.is_read ? 500 : 700,
                      color: n.is_read ? 'var(--text-secondary)' : '#fff',
                      marginBottom: 3,
                      lineHeight: 1.4,
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                    }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, opacity: 0.7 }}>
                      {formatTime(n.created_at)}
                    </div>
                  </div>
                  {!n.is_read && (
                    <div style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#00f2fe',
                      flexShrink: 0,
                      marginTop: 5,
                      boxShadow: '0 0 6px rgba(0,242,254,0.5)',
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
