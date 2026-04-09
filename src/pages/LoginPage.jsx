import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { users } from '../data/mockData';

const ROLE_ICONS = {
  prescriber: '🩺',
  front_desk: '🏥',
  nurse: '💉',
  admin: '🔑',
};

const ROLE_LABELS = {
  prescriber: 'Provider',
  front_desk: 'Front Desk',
  nurse: 'Nurse / MA',
  admin: 'Administrator',
};

export default function LoginPage() {
  const { login, loginError } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const success = login(username, password);
      if (success) navigate('/dashboard');
      setLoading(false);
    }, 300);
  };

  const handleDemoLogin = (u) => {
    setUsername(u.username);
    setPassword(u.password);
    setLoading(true);
    setTimeout(() => {
      const success = login(u.username, u.password);
      if (success) navigate('/dashboard');
      setLoading(false);
    }, 300);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-icon">🧠</div>
          <h1>MindCare EHR</h1>
          <p>Outpatient Behavioral Health Platform</p>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 16 }}>
            <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>
              HIPAA Compliant
            </span>
            <span style={{ fontSize: 10, color: '#334155' }}>•</span>
            <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>
              EPCS Certified
            </span>
            <span style={{ fontSize: 10, color: '#334155' }}>•</span>
            <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>
              ONC Certified
            </span>
          </div>
        </div>

        <div className="login-card">
          {loginError && (
            <div className="login-error">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="login-demo">
            <h3>Quick Access — Demo Accounts</h3>
            {users.map((u) => (
              <div
                key={u.id}
                className="login-demo-account"
                onClick={() => handleDemoLogin(u)}
              >
                <span>
                  {ROLE_ICONS[u.role] || '👤'}{' '}
                  <span style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</span>
                  {u.credentials && <span style={{ marginLeft: 4, opacity: 0.6, fontSize: 11 }}>{u.credentials}</span>}
                </span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  {u.role === 'prescriber' ? u.specialty : ROLE_LABELS[u.role] || u.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ color: '#334155', fontSize: 11 }}>
            © {new Date().getFullYear()} MindCare Health System — Academic Medical Center
          </p>
          <p style={{ color: '#1e293b', fontSize: 10, marginTop: 4, opacity: 0.5 }}>
            Authorized use only. All access is monitored and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
