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

const ROLE_COLORS = {
  prescriber: 'linear-gradient(135deg,#3b82f6,#6366f1)',
  nurse: 'linear-gradient(135deg,#10b981,#059669)',
  front_desk: 'linear-gradient(135deg,#f59e0b,#d97706)',
  admin: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
};

const CERTS = ['HIPAA', 'EPCS', 'ONC', '42 CFR Part 2'];

export default function LoginPage() {
  const { login, loginError } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  /* Derive selected role from username match */
  const matchedUser = users.find(u => u.username === username);

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
    setPassword('');
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setForgotSent(true);
  };

  const closeForgotModal = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotSent(false);
  };

  return (
    <div className="login-page">
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      {/* ── Sticky Top Nav ── */}
      <nav className="login-topnav">
        <div className="login-topnav-left">
          <span className="login-topnav-logo">🧠</span>
          <span className="login-topnav-wordmark">MindCare<span>EHR</span></span>
          <span className="login-version-pill">V14.2</span>
        </div>
        <div className="login-topnav-badges">
          {CERTS.map(c => (
            <span key={c} className="login-topnav-cert">{c}</span>
          ))}
        </div>
      </nav>

      {/* ── Two-Column Body ── */}
      <div className="login-two-col">

        {/* LEFT — Sign-In Card */}
        <div className="login-col login-col-form">
          <div className="glass-card glass-card-sign-in">
            <h2 className="glass-card-title">
              <span className="glass-card-lock">🔒</span> Secure Sign In
            </h2>

            {loginError && (
              <div className="login-error">⚠️ {loginError}</div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off">
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
                <div className="form-label-row">
                  <label className="form-label">Password</label>
                  <button type="button" className="forgot-password-link" onClick={() => setShowForgotPassword(true)}>
                    Forgot password?
                  </button>
                </div>
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

              {/* Selected-role preview chip */}
              {matchedUser && (
                <div className="login-role-chip">
                  <span className="login-role-chip-dot" style={{ background: ROLE_COLORS[matchedUser.role] || ROLE_COLORS.admin }} />
                  Signing in as <strong>{matchedUser.firstName} {matchedUser.lastName}</strong>
                  {matchedUser.credentials && <span className="login-role-chip-cred">{matchedUser.credentials}</span>}
                  <span className="login-role-chip-tag">{ROLE_LABELS[matchedUser.role] || matchedUser.role}</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
                {loading ? '⏳ Signing In…' : 'Sign In'}
              </button>
            </form>

            <p className="login-demo-hint">
              Demo password for all accounts: <code>password</code>
            </p>

            <div className="login-hipaa-footer">
              <span>🛡️</span>
              <span>Protected by 256-bit AES encryption · HIPAA compliant · All access monitored &amp; logged</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Demo Accounts */}
        <div className="login-col login-col-demo">
          <div className="glass-card glass-card-demo">
            <h2 className="glass-card-title">Quick Access — Demo Accounts</h2>
            <p className="glass-card-subtitle">Select an account to auto-fill credentials</p>

            <div className="login-demo-grid">
              {users.filter(u => u.role !== 'patient').map((u, idx) => (
                <div
                  key={u.id}
                  className={`login-demo-account${username === u.username ? ' active' : ''}`}
                  onClick={() => handleDemoLogin(u)}
                  style={{ animationDelay: `${0.15 + idx * 0.05}s` }}
                >
                  <span className="login-demo-avatar" style={{ background: ROLE_COLORS[u.role] || ROLE_COLORS.admin }}>
                    {ROLE_ICONS[u.role] || '👤'}
                  </span>
                  <span className="login-demo-info">
                    <span className="login-demo-name">
                      {u.firstName} {u.lastName}
                      {u.credentials && <span className="login-demo-cred">{u.credentials}</span>}
                    </span>
                    <span className="login-demo-role">
                      {u.role === 'prescriber' ? u.specialty : ROLE_LABELS[u.role] || u.role}
                    </span>
                  </span>
                  <span className="login-demo-arrow">→</span>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Portal CTA */}
          <div className="glass-card glass-card-patient-cta">
            <span>Are you a patient?</span>
            <a href="/patient-portal-login">Sign in to the Patient Portal →</a>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="login-footer">
        <span>© {new Date().getFullYear()} MindCare EHR. All rights reserved.</span>
        <span className="login-footer-sep">·</span>
        <button type="button" className="footer-privacy-link" onClick={() => setShowPrivacyPolicy(true)}>Privacy Policy</button>
        <span className="login-footer-sep">·</span>
        <span>v14.2</span>
      </footer>

      {/* ── Forgot Password Modal ── */}
      {showForgotPassword && (
        <div className="login-modal-overlay" onClick={closeForgotModal}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="login-modal-close" onClick={closeForgotModal}>✕</button>
            <h2>Reset Your Password</h2>
            {!forgotSent ? (
              <>
                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
                  Enter your work email and we'll send you a secure link to reset your password.
                </p>
                <form onSubmit={handleForgotSubmit}>
                  <div className="form-group">
                    <label className="form-label">Work Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@mindcare.org"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    Send Reset Link
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
                <p style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  Check your inbox
                </p>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                  If <strong style={{ color: '#60a5fa' }}>{forgotEmail}</strong> is associated with an account, you'll receive a password reset link within a few minutes.
                </p>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={closeForgotModal}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Privacy Policy Modal ── */}
      {showPrivacyPolicy && (
        <div className="login-modal-overlay" onClick={() => setShowPrivacyPolicy(false)}>
          <div className="login-modal login-modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="login-modal-close" onClick={() => setShowPrivacyPolicy(false)}>✕</button>
            <h2>Privacy Policy</h2>
            <div className="privacy-policy-content">
              <p className="privacy-updated">Last Updated: January 1, {new Date().getFullYear()}</p>

              <h3>1. Introduction</h3>
              <p>
                MindCare EHR ("we," "our," or "us") is committed to protecting the privacy and security of
                all personal and health information entrusted to us. This Privacy Policy describes how we
                collect, use, disclose, and safeguard your information in compliance with the Health Insurance
                Portability and Accountability Act (HIPAA), 42 CFR Part 2, and applicable state and federal laws.
              </p>

              <h3>2. Information We Collect</h3>
              <p>We may collect the following categories of information:</p>
              <ul>
                <li><strong>Protected Health Information (PHI):</strong> Diagnoses, treatment records, medications, lab results, clinical notes, insurance details, and billing information.</li>
                <li><strong>Personally Identifiable Information (PII):</strong> Name, date of birth, Social Security Number, contact information, and emergency contacts.</li>
                <li><strong>Technical Data:</strong> Login credentials, IP addresses, device identifiers, access timestamps, and audit log entries.</li>
                <li><strong>Substance Use Disorder Records:</strong> Records protected under 42 CFR Part 2, which receive additional confidentiality protections.</li>
              </ul>

              <h3>3. How We Use Your Information</h3>
              <p>PHI and PII are used solely for:</p>
              <ul>
                <li>Treatment — coordinating and managing patient care across authorized providers.</li>
                <li>Payment — processing claims, billing, and insurance verification.</li>
                <li>Healthcare Operations — quality assurance, auditing, staff training, and compliance activities.</li>
                <li>As required or permitted by law (e.g., public health reporting, court orders).</li>
              </ul>

              <h3>4. HIPAA Compliance</h3>
              <p>
                MindCare EHR maintains full compliance with HIPAA Privacy, Security, and Breach Notification Rules.
                We implement administrative, physical, and technical safeguards including:
              </p>
              <ul>
                <li>AES-256 encryption for data at rest and TLS 1.3 for data in transit.</li>
                <li>Role-based access controls (RBAC) with minimum necessary access.</li>
                <li>Multi-factor authentication for all system users.</li>
                <li>Comprehensive audit logging of all PHI access and modifications.</li>
                <li>Annual risk assessments and workforce security training.</li>
                <li>Business Associate Agreements (BAAs) with all third-party vendors.</li>
              </ul>

              <h3>5. 42 CFR Part 2 Protections</h3>
              <p>
                Substance use disorder (SUD) treatment records receive heightened protection under federal regulation
                42 CFR Part 2. These records may not be disclosed without explicit written patient consent, except
                in medical emergencies or as otherwise permitted by Part 2 regulations.
              </p>

              <h3>6. Breach Notification</h3>
              <p>In the event of a breach of unsecured PHI, MindCare EHR will:</p>
              <ul>
                <li>Notify affected individuals in writing within 60 days of discovery.</li>
                <li>Report the breach to the U.S. Department of Health and Human Services (HHS).</li>
                <li>Notify prominent media outlets if the breach affects 500+ individuals in a state or jurisdiction.</li>
                <li>Provide a description of the breach, types of information involved, steps taken, and recommended protective actions.</li>
              </ul>

              <h3>7. Patient Rights</h3>
              <p>Under HIPAA, patients have the right to:</p>
              <ul>
                <li><strong>Access</strong> — Request and obtain copies of their PHI.</li>
                <li><strong>Amendment</strong> — Request corrections to inaccurate or incomplete records.</li>
                <li><strong>Accounting of Disclosures</strong> — Receive a list of certain disclosures of their PHI.</li>
                <li><strong>Restriction Requests</strong> — Request limitations on how their PHI is used or disclosed.</li>
                <li><strong>Confidential Communications</strong> — Request communication through alternative means or locations.</li>
                <li><strong>Complaint</strong> — File a complaint with MindCare EHR or HHS if they believe their privacy rights have been violated.</li>
              </ul>

              <h3>8. Data Retention</h3>
              <p>
                Medical records are retained in accordance with applicable federal and state retention requirements
                (minimum 7 years for adults; until age 21 for minors). Audit logs are retained for a minimum of 6 years.
              </p>

              <h3>9. Contact Information</h3>
              <p>For privacy-related inquiries, requests, or complaints, contact:</p>
              <div className="privacy-contact">
                <p><strong>MindCare EHR Privacy Office</strong></p>
                <p>Email: privacy@mindcare-ehr.org</p>
                <p>Phone: (555) 400-PRIV (7748)</p>
                <p>Mail: 200 Wellness Blvd, Suite 400, Austin, TX 78701</p>
              </div>
              <p style={{ marginTop: 14, fontSize: 12, color: '#64748b' }}>
                You may also file a complaint with the Secretary of the U.S. Department of Health and Human Services
                at <em>www.hhs.gov/hipaa/filing-a-complaint</em>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
