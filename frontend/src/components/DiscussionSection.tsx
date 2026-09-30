import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Trash2, MessageSquare, AtSign, User } from 'lucide-react';

export interface CommentItem {
  id: number;
  content: string;
  user_id: number;
  user_name: string;
  user_email: string;
  user_role: string;
  department_name?: string;
  target_type: 'task' | 'project';
  target_id: number;
  created_at: string;
}

interface Props {
  targetType: 'task' | 'project';
  targetId: number;
  title?: string;
  teamMembers?: { id: number; name: string; email: string }[];
}

export const DiscussionSection: React.FC<Props> = ({
  targetType,
  targetId,
  title,
  teamMembers = []
}) => {
  const { user, fetchWithAuth } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newContent, setNewContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/comments?target_type=${targetType}&target_id=${targetId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (targetId) {
      loadComments();
    }
  }, [targetType, targetId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewContent(val);

    // Detect @ symbol for mention popup
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(textBeforeCursor[lastAt - 1]))) {
      const query = textBeforeCursor.slice(lastAt + 1);
      if (!query.includes(' ')) {
        setMentionFilter(query.toLowerCase());
        setShowMentionMenu(true);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  const insertMention = (member: { name: string; email: string }) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = newContent.slice(0, cursor);
    const textAfterCursor = newContent.slice(cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1) {
      const mentionTag = `@${member.name} `;
      const updated = textBeforeCursor.slice(0, lastAt) + mentionTag + textAfterCursor;
      setNewContent(updated);
      setShowMentionMenu(false);
      setTimeout(() => {
        if (textareaRef.current) {
          const nextPos = lastAt + mentionTag.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newContent.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetchWithAuth('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          content: newContent.trim()
        })
      });

      if (res.ok) {
        const created = await res.json();
        setComments(prev => [...prev, created]);
        setNewContent('');
        setShowMentionMenu(false);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gửi bình luận thất bại');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
      const res = await fetchWithAuth(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Format content with highlighted @mentions
  const renderFormattedContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9À-ỹ\s]+?)(?=\s|$|[.,!?])/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} style={{ color: '#4f46e5', fontWeight: 700, background: 'rgba(79, 70, 229, 0.08)', padding: '1px 4px', borderRadius: 4 }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const filteredMembers = teamMembers.filter(m => 
    m.name.toLowerCase().includes(mentionFilter) || 
    m.email.toLowerCase().includes(mentionFilter)
  );

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={16} style={{ color: '#4f46e5' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
            Thảo luận & Trao đổi {title ? `(${title})` : ''}
          </span>
          <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
            {comments.length}
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          Gõ <strong style={{ color: '#4f46e5' }}>@</strong> để tag nhân sự
        </span>
      </div>

      {/* Comment List */}
      <div style={{
        maxHeight: 280,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        paddingRight: 4
      }}>
        {comments.length > 0 ? (
          comments.map(c => {
            const isMe = user?.id === c.user_id;
            return (
              <div 
                key={c.id} 
                style={{
                  display: 'flex',
                  gap: 10,
                  background: isMe ? 'rgba(79, 70, 229, 0.03)' : '#f8fafc',
                  border: isMe ? '1px solid rgba(79, 70, 229, 0.15)' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 10
                }}
              >
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: isMe ? '#4f46e5' : '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {c.user_name ? c.user_name.charAt(0).toUpperCase() : 'U'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginRight: 6 }}>
                        {c.user_name}
                      </span>
                      {c.department_name && (
                        <span style={{ fontSize: 10, color: '#64748b', background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>
                          {c.department_name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>
                        {new Date(c.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(c.created_at).toLocaleDateString('vi-VN')}
                      </span>
                      {(user?.role === 'Admin' || isMe) && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                          title="Xóa bình luận"
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {renderFormattedContent(c.content)}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '18px 0', color: '#94a3b8', fontSize: 12 }}>
            Chưa có thảo luận nào. Hãy bắt đầu cuộc trò chuyện hoặc tag @đồng nghiệp!
          </div>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Input Box with @mention popup */}
      <div style={{ position: 'relative' }}>
        {showMentionMenu && filteredMembers.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
            maxHeight: 160,
            width: 240,
            overflowY: 'auto',
            zIndex: 10,
            padding: 4,
            marginBottom: 6
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', padding: '4px 8px', textTransform: 'uppercase' }}>
              Tag nhân sự vào thảo luận:
            </div>
            {filteredMembers.map(m => (
              <div
                key={m.id}
                onClick={() => insertMention(m)}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4f46e5', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.name.charAt(0)}
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{m.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            rows={2}
            placeholder="Nhập nội dung thảo luận (gõ @ để tag người nhận)..."
            value={newContent}
            onChange={handleTextChange}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={isSending || !newContent.trim()}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #00f2fe)',
              color: '#ffffff',
              cursor: (isSending || !newContent.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: (isSending || !newContent.trim()) ? 0.6 : 1
            }}
            title="Gửi (Enter)"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
