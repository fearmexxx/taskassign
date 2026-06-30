import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, KeyRound, Mail, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456'); // Mật khẩu mặc định
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(email, password);
    setIsSubmitting(false);
  };

  const handleSelectQuickAccount = (e: string) => {
    setEmail(e);
    setPassword('123456');
  };

  return (
    <div className="login-screen">
      <style>{`
        .login-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100vw;
          background: #f5f6f8;
          font-family: var(--font-family);
        }
        .login-card {
          width: 440px;
          padding: 40px;
          border-radius: 16px;
          border: 1px solid var(--border-color);
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
          text-align: center;
        }
        .logo-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan));
          margin-bottom: 20px;
        }
        .login-title {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--text-primary) 30%, #4f46e5);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
        }
        .login-subtitle {
          color: var(--text-secondary);
          font-size: 14px;
          margin-bottom: 30px;
        }
        .input-group {
          position: relative;
          margin-bottom: 20px;
          text-align: left;
        }
        .input-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .input-wrapper {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          width: 18px;
          height: 18px;
        }
        .login-input {
          width: 100%;
          padding: 12px 12px 12px 42px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 15px;
          transition: var(--transition-smooth);
        }
        .login-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 10px rgba(79, 70, 229, 0.1);
        }
        .login-btn {
          width: 100%;
          padding: 14px;
          margin-top: 10px;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .quick-accounts-title {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 30px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 6px;
        }
        .quick-accounts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .quick-acc-btn {
          background: #f8f9fa;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          transition: var(--transition-smooth);
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .quick-acc-btn:hover {
          background: rgba(79, 70, 229, 0.05);
          border-color: #4f46e5;
          color: #4f46e5;
        }
      `}</style>

      <div className="login-card glass-panel">
        <div className="logo-container">
          <Shield className="text-black" size={28} />
        </div>
        <h2 className="login-title">TaskAssign Pro</h2>
        <p className="login-subtitle">Hệ thống ERP & Quản lý Công việc</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Địa chỉ Email</label>
            <div className="input-wrapper">
              <Mail className="input-icon" />
              <input
                type="email"
                required
                className="login-input"
                placeholder="ten@agency.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Mật khẩu</label>
            <div className="input-wrapper">
              <KeyRound className="input-icon" />
              <input
                type="password"
                required
                className="login-input"
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-neon login-btn">
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Đăng nhập hệ thống'}
          </button>
        </form>

        <h4 className="quick-accounts-title">Chọn nhanh tài khoản Demo</h4>
        <div className="quick-accounts-grid">
          <button onClick={() => handleSelectQuickAccount('alice@agency.com')} className="quick-acc-btn">
            Alice (Quản trị viên)
          </button>
          <button onClick={() => handleSelectQuickAccount('bob@agency.com')} className="quick-acc-btn">
            Bob (Trưởng phòng Dev)
          </button>
          <button onClick={() => handleSelectQuickAccount('charlie@agency.com')} className="quick-acc-btn">
            Charlie (Nhân viên Dev)
          </button>
          <button onClick={() => handleSelectQuickAccount('diana@agency.com')} className="quick-acc-btn">
            Diana (Trưởng phòng Design)
          </button>
          <button onClick={() => handleSelectQuickAccount('fiona@agency.com')} className="quick-acc-btn">
            Fiona (Trưởng phòng Mktg)
          </button>
          <button onClick={() => handleSelectQuickAccount('george@agency.com')} className="quick-acc-btn">
            George (Nhân viên Mktg)
          </button>
        </div>
      </div>
    </div>
  );
};
