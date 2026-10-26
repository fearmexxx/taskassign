import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { VoiceCommsMessage, CommsChannel } from '../../types/eventSuite';
import { 
  Radio, 
  Mic, 
  MicOff, 
  AlertTriangle, 
  Send, 
  Volume2, 
  ChevronUp, 
  ChevronDown, 
  X,
  Play,
  RotateCcw
} from 'lucide-react';

interface VoiceCommsDrawerProps {
  projectId?: number | null;
  projectName?: string;
  embedded?: boolean;
}

export const VoiceCommsDrawer: React.FC<VoiceCommsDrawerProps> = ({ projectId, projectName, embedded = false }) => {
  const { fetchWithAuth, user } = useAuth();
  const [isOpen, setIsOpen] = useState(embedded ? true : false);
  const [channel, setChannel] = useState<CommsChannel>('ALL');
  const [messages, setMessages] = useState<VoiceCommsMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      const q = projectId ? `?project_id=${projectId}` : '';
      const res = await fetchWithAuth(`/api/comms/messages${q}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Ghi âm giọng nói (Push-to-Talk)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await sendMessage('voice', '', base64Audio, recordDuration);
        };
        // Stop audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration(prev => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Không thể truy cập Microphone:', err);
      alert('Vui lòng cấp quyền truy cập Microphone cho trình duyệt để dùng bộ đàm.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
  };

  const sendMessage = async (type: 'voice' | 'sos' | 'cue_call', text: string, audio?: string, duration?: number) => {
    try {
      const res = await fetchWithAuth('/api/comms/messages', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId || null,
          channel,
          message_type: type,
          text_message: text,
          audio_data: audio || null,
          duration_sec: duration || 0
        })
      });
      if (res.ok) {
        loadMessages();
        setTextInput('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSos = () => {
    const reason = window.prompt('Nhập nội dung cảnh báo sự cố khẩn cấp (SOS):', 'Cần hỗ trợ gấp tại hiện trường!');
    if (!reason || !reason.trim()) return;
    sendMessage('sos', reason.trim());
  };

  const filteredMessages = messages.filter(m => channel === 'ALL' || m.channel === channel);

  return (
    <div style={embedded ? {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      fontFamily: 'var(--font-family)'
    } : {
      position: 'fixed',
      bottom: 16,
      right: 20,
      zIndex: 9000,
      fontFamily: 'var(--font-family)'
    }}>
      {/* NÚT THU GỌN / MỞ BỘ ĐÀM (CHỈ DÀNH CHO DẠNG NỔI FLOATING) */}
      {!embedded && !isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #0f172a, #334155)',
            color: '#fff',
            border: '2px solid #38bdf8',
            borderRadius: 30,
            padding: '10px 18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 13
          }}
        >
          <Radio size={16} color="#38bdf8" className="animate-pulse" />
          <span>BỘ ĐÀM SỰ KIỆN {projectId ? `(#${projectId})` : ''}</span>
          <span style={{
            background: '#ef4444',
            color: '#fff',
            borderRadius: 10,
            padding: '1px 6px',
            fontSize: 10
          }}>
            {filteredMessages.length}
          </span>
        </button>
      ) : (
        /* HỘP BỘ ĐÀM MỞ RỘNG */
        <div style={{
          width: embedded ? '100%' : 360,
          height: embedded ? '100%' : 480,
          maxHeight: embedded ? '100%' : 480,
          flex: embedded ? 1 : undefined,
          background: '#0f172a',
          borderRadius: embedded ? 12 : 16,
          boxShadow: embedded ? 'none' : '0 20px 50px rgba(0,0,0,0.4)',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#fff'
        }}>
          {/* HEADER */}
          <div style={{
            padding: '12px 14px',
            background: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={16} color="#38bdf8" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>
                  Walkie-Talkie {projectName ? `• ${projectName}` : ''}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Kênh bộ đàm số nội bộ VBE</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleSos}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 10,
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3
                }}
                title="Bấm để phát tín hiệu khẩn cấp cho toàn ekip"
              >
                <AlertTriangle size={12} /> SOS
              </button>
              {!embedded && (
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* CHỌN KÊNH BỘ ĐÀM (CHANNELS) */}
          <div style={{
            display: 'flex',
            gap: 4,
            padding: '8px 10px',
            background: '#090d16',
            borderBottom: '1px solid #1e293b',
            overflowX: 'auto'
          }}>
            {[
              { id: 'ALL', name: 'TẤT CẢ' },
              { id: 'STAGE', name: 'SÂN KHẤU' },
              { id: 'TECH', name: 'AV/LED' },
              { id: 'FOH', name: 'SẢNH/FOH' },
              { id: 'LOGISTICS', name: 'HẬU CẦN' }
            ].map(ch => (
              <button
                key={ch.id}
                onClick={() => setChannel(ch.id as any)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  border: 'none',
                  background: channel === ch.id ? '#38bdf8' : '#1e293b',
                  color: channel === ch.id ? '#0f172a' : '#94a3b8',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {ch.name}
              </button>
            ))}
          </div>

          {/* FEED TIN NHẮN & VOICE CLIPS */}
          <div style={{
            flex: 1,
            padding: '12px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 12
          }}>
            {filteredMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', marginTop: 40, fontSize: 11 }}>
                Kênh chưa có đàm thoại nào. Nhấn giữ Mic để nói hoặc nhập tin.
              </div>
            ) : (
              filteredMessages.map(msg => {
                const isMe = msg.user_id === user?.id;
                const isSos = msg.message_type === 'sos';
                const isCue = msg.message_type === 'cue_call';

                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: isSos ? '#ef4444' : isCue ? '#0284c7' : isMe ? '#4f46e5' : '#1e293b',
                      color: '#fff',
                      borderRadius: 10,
                      padding: '8px 10px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                      <span>{msg.user_name} [{msg.channel}]</span>
                      <span>{msg.created_at ? msg.created_at.slice(11, 16) : ''}</span>
                    </div>

                    {isSos && (
                      <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <AlertTriangle size={12} /> CẢNH BÁO SỰ CỐ KHẨN CẤP
                      </div>
                    )}

                    {msg.text_message && <div>{msg.text_message}</div>}

                    {msg.audio_data && (
                      <div style={{ marginTop: 4 }}>
                        <audio controls src={msg.audio_data} style={{ width: '100%', height: 28 }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* CONTROL BAR: PUSH TO TALK & NHẬP TEXT */}
          <div style={{
            padding: '10px',
            background: '#1e293b',
            borderTop: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            {/* Nút Push-to-Talk lớn */}
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: 'none',
                background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                userSelect: 'none'
              }}
            >
              <Mic size={16} />
              {isRecording ? `Đang ghi âm... (${recordDuration}s / nhả để gửi)` : `GIỮ ĐỂ NÓI TRÊN KÊNH [${channel}]`}
            </button>

            {/* Nhập text nhanh */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (textInput.trim()) sendMessage('voice', textInput.trim());
              }}
              style={{ display: 'flex', gap: 6 }}
            >
              <input
                type="text"
                placeholder="Nhập tin nhắn đàm thoại..."
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                style={{
                  flex: 1,
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: '#fff',
                  fontSize: 12
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '0 10px',
                  cursor: 'pointer'
                }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
