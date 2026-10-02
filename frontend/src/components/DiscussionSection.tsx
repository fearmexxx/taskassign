import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Trash2, MessageSquare, Reply, CornerDownRight, X, ChevronDown, ChevronRight } from 'lucide-react';

export interface CommentItem {
  id: number;
  parent_id?: number | null;
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
  const [replyingTo, setReplyingTo] = useState<CommentItem | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [collapsedThreads, setCollapsedThreads] = useState<Record<number, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
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
  }, [comments.length]);

  const handleTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    isReplyInput = false
  ) => {
    const val = e.target.value;
    if (isReplyInput) {
      setReplyContent(val);
    } else {
      setNewContent(val);
    }

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

  const insertMention = (member: { name: string; email: string }, isReplyInput = false) => {
    const currentInput = isReplyInput ? replyContent : newContent;
    const currentRef = isReplyInput ? replyTextareaRef : textareaRef;

    if (!currentRef.current) return;
    const cursor = currentRef.current.selectionStart;
    const textBeforeCursor = currentInput.slice(0, cursor);
    const textAfterCursor = currentInput.slice(cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1) {
      const mentionTag = `@${member.name} `;
      const updated = textBeforeCursor.slice(0, lastAt) + mentionTag + textAfterCursor;
      if (isReplyInput) {
        setReplyContent(updated);
      } else {
        setNewContent(updated);
      }
      setShowMentionMenu(false);
      setTimeout(() => {
        if (currentRef.current) {
          const nextPos = lastAt + mentionTag.length;
          currentRef.current.focus();
          currentRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    }
  };

  // Gửi comment chính
  const handleSendMain = async (e?: React.FormEvent) => {
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
          content: newContent.trim(),
          parent_id: null
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

  // Gửi phản hồi theo thread (Reply)
  const handleSendReply = async (parentComment: CommentItem) => {
    if (!replyContent.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      const res = await fetchWithAuth('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          content: replyContent.trim(),
          parent_id: parentComment.id
        })
      });

      if (res.ok) {
        const created = await res.json();
        setComments(prev => [...prev, created]);
        setReplyContent('');
        setReplyingTo(null);
        setShowMentionMenu(false);
        // Tự động mở thread nếu đang đóng
        setCollapsedThreads(prev => ({ ...prev, [parentComment.id]: false }));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gửi phản hồi thất bại');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
      const res = await fetchWithAuth(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
        if (replyingTo?.id === commentId) {
          setReplyingTo(null);
          setReplyContent('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleThreadCollapse = (parentId: number) => {
    setCollapsedThreads(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  // Format content with highlighted @mentions
  const renderFormattedContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9À-ỹ\s]+?)(?=\s|$|[.,!?])/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} style={{ color: '#4f46e5', fontWeight: 700, background: 'rgba(79, 70, 229, 0.08)', padding: '1px 5px', borderRadius: 4 }}>
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

  // Nhóm comments thành cây: parent comments & child replies
  const parentComments = comments.filter(c => !c.parent_id);
  const repliesMap: Record<number, CommentItem[]> = {};
  comments.forEach(c => {
    if (c.parent_id) {
      if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
      repliesMap[c.parent_id].push(c);
    }
  });

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: 'rgba(79, 70, 229, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4f46e5'
          }}>
            <MessageSquare size={15} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
            Thảo luận & Trao đổi theo Thread {title ? `• ${title}` : ''}
          </span>
          <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '1px 8px', borderRadius: 12, fontWeight: 600 }}>
            {comments.length}
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          Gõ <strong style={{ color: '#4f46e5' }}>@</strong> để tag nhân sự
        </span>
      </div>

      {/* Comment List with Threaded Replies */}
      <div style={{
        maxHeight: 380,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        paddingRight: 4
      }}>
        {parentComments.length > 0 ? (
          parentComments.map(parent => {
            const isMe = user?.id === parent.user_id;
            const replies = repliesMap[parent.id] || [];
            const isCollapsed = !!collapsedThreads[parent.id];
            const isReplyingThis = replyingTo?.id === parent.id;

            return (
              <div 
                key={parent.id} 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                {/* Bình luận gốc (Parent) */}
                <div style={{ display: 'flex', gap: 10 }}>
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
                    {parent.user_name ? parent.user_name.charAt(0).toUpperCase() : 'U'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                          {parent.user_name}
                        </span>
                        {parent.department_name && (
                          <span style={{ fontSize: 10, color: '#475569', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>
                            {parent.department_name}
                          </span>
                        )}
                        <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
                          {new Date(parent.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(parent.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {(user?.role === 'Admin' || isMe) && (
                          <button
                            onClick={() => handleDelete(parent.id)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
                            title="Xóa bình luận"
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 6 }}>
                      {renderFormattedContent(parent.content)}
                    </div>

                    {/* Action Bar: Trả lời / Thu gọn replies */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isReplyingThis) {
                            setReplyingTo(null);
                            setReplyContent('');
                          } else {
                            setReplyingTo(parent);
                            setReplyContent(`@${parent.user_name} `);
                            setTimeout(() => replyTextareaRef.current?.focus(), 50);
                          }
                        }}
                        style={{
                          background: isReplyingThis ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                          border: 'none',
                          color: '#4f46e5',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        <Reply size={12} /> {isReplyingThis ? 'Hủy trả lời' : 'Trả lời'}
                      </button>

                      {replies.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleThreadCollapse(parent.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '2px 4px'
                          }}
                        >
                          {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                          {replies.length} phản hồi {isCollapsed ? '(Xem thêm)' : ''}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Danh sách Replies (Thread con) */}
                {replies.length > 0 && !isCollapsed && (
                  <div style={{
                    marginLeft: 20,
                    marginTop: 10,
                    paddingLeft: 12,
                    borderLeft: '2px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    {replies.map(reply => {
                      const isReplyMe = user?.id === reply.user_id;
                      return (
                        <div
                          key={reply.id}
                          style={{
                            display: 'flex',
                            gap: 8,
                            background: isReplyMe ? 'rgba(79, 70, 229, 0.03)' : '#f8fafc',
                            border: isReplyMe ? '1px solid rgba(79, 70, 229, 0.12)' : '1px solid #edf2f7',
                            borderRadius: 6,
                            padding: 8
                          }}
                        >
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: isReplyMe ? '#4f46e5' : '#0ea5e9',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {reply.user_name ? reply.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>
                                  {reply.user_name}
                                </span>
                                {reply.department_name && (
                                  <span style={{ fontSize: 9.5, color: '#475569', background: '#e2e8f0', padding: '0 4px', borderRadius: 3 }}>
                                    {reply.department_name}
                                  </span>
                                )}
                                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                  {new Date(reply.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(reply.created_at).toLocaleDateString('vi-VN')}
                                </span>
                              </div>

                              {(user?.role === 'Admin' || isReplyMe) && (
                                <button
                                  onClick={() => handleDelete(reply.id)}
                                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                                  title="Xóa phản hồi"
                                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>

                            <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                              {renderFormattedContent(reply.content)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline Reply Input Box cho Thread này */}
                {isReplyingThis && (
                  <div style={{
                    marginLeft: 20,
                    marginTop: 10,
                    paddingLeft: 12,
                    borderLeft: '2px solid #4f46e5',
                    position: 'relative'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                      fontSize: 11,
                      color: '#4f46e5',
                      fontWeight: 600
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CornerDownRight size={12} /> Đang trả lời {parent.user_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <textarea
                        ref={replyTextareaRef}
                        rows={2}
                        placeholder={`Trả lời @${parent.user_name}... (gõ @ để tag)`}
                        value={replyContent}
                        onChange={e => handleTextChange(e, true)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(parent);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          fontFamily: 'inherit',
                          resize: 'none',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSendReply(parent)}
                        disabled={isSendingReply || !replyContent.trim()}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#4f46e5',
                          color: '#ffffff',
                          cursor: (isSendingReply || !replyContent.trim()) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11.5,
                          fontWeight: 600,
                          opacity: (isSendingReply || !replyContent.trim()) ? 0.6 : 1
                        }}
                      >
                        <Send size={12} /> Gửi
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 12 }}>
            Chưa có thảo luận nào. Hãy bắt đầu bình luận hoặc tag @đồng nghiệp để trao đổi!
          </div>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Main Comment Input Box with @mention popup */}
      <div style={{ position: 'relative', marginTop: 4 }}>
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
            zIndex: 100,
            padding: 4,
            marginBottom: 6
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', padding: '4px 8px', textTransform: 'uppercase' }}>
              Tag nhân sự vào thảo luận:
            </div>
            {filteredMembers.map(m => (
              <div
                key={m.id}
                onClick={() => insertMention(m, !!replyingTo)}
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

        <form onSubmit={handleSendMain} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            rows={2}
            placeholder="Nhập nội dung thảo luận mới (gõ @ để tag người nhận, Enter để gửi)..."
            value={newContent}
            onChange={e => handleTextChange(e, false)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMain();
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
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              opacity: (isSending || !newContent.trim()) ? 0.6 : 1
            }}
            title="Gửi (Enter)"
          >
            <Send size={14} /> Gửi
          </button>
        </form>
      </div>
    </div>
  );
};
