import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

export default function Header() {
  const { currentUser } = useAuth();
  const { patients, selectPatient, selectedPatient, inboxMessages } = usePatient();
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const unreadCount = inboxMessages.filter(
    (m) => !m.read && (m.to === currentUser?.id || currentUser?.role === 'admin')
  ).length;

  const filteredPatients = search.length > 1
    ? patients.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
        );
      })
    : [];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectPatient = useCallback((patient) => {
    selectPatient(patient.id);
    setSearch('');
    setShowResults(false);
    navigate(`/chart/${patient.id}/summary`);
  }, [selectPatient, navigate]);

  // Page title from current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/schedule')) return 'Schedule';
    if (path.includes('/patients')) return 'Patient Search';
    if (path.includes('/chart/'))   return 'Patient Chart';
    if (path.includes('/inbox'))    return 'Clinical Inbox';
    if (path.includes('/prescribe')) return 'E-Prescribe';
    if (path.includes('/telehealth')) return 'Telehealth';
    if (path.includes('/smart-phrases')) return 'Smart Phrases';
    if (path.includes('/btg-audit')) return 'BTG Audit Log';
    if (path.includes('/admin-toolkit')) return 'Admin Toolkit';
    if (path.includes('/session/')) return 'Clinical Session';
    return 'MindCare';
  };

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header className="header">
      {/* Page context breadcrumb */}
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', marginRight: 8 }}>
        {getPageTitle()}
      </div>

      {/* Search */}
      <div className="header-search" ref={searchRef}>
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search patients — name or MRN..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
          onFocus={() => search.length > 1 && setShowResults(true)}
        />
        <span className="search-kbd">Ctrl+K</span>

        {showResults && filteredPatients.length > 0 && (
          <div className="search-results">
            {filteredPatients.map((p) => (
              <div key={p.id} className="search-result-item" onClick={() => handleSelectPatient(p)}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                  {p.firstName[0]}{p.lastName[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
                    {p.lastName}, {p.firstName}
                    {p.isBTG && <span className="badge badge-danger" style={{ fontSize: 10 }}>BTG</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    MRN {p.mrn} · DOB {p.dob} · {p.gender}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {showResults && search.length > 1 && filteredPatients.length === 0 && (
          <div className="search-results">
            <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No patients found for "{search}"
            </div>
          </div>
        )}
      </div>

      {/* Active patient chip */}
      {selectedPatient && (
        <>
          <div className="header-divider" />
          <div
            className="header-patient-chip"
            onClick={() => navigate(`/chart/${selectedPatient.id}/summary`)}
            title="Open chart"
          >
            <div className="header-chip-avatar">
              {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
            </div>
            <div>
              <div className="header-chip-name">
                {selectedPatient.lastName}, {selectedPatient.firstName}
              </div>
              <div className="header-chip-sub">MRN {selectedPatient.mrn}</div>
            </div>
          </div>
        </>
      )}

      {/* Right actions */}
      <div className="header-actions">
        <button className="header-btn" title="Notifications" onClick={() => navigate('/inbox')}>
          🔔
          {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
        </button>
        <div className="header-divider" />
        <div style={{ textAlign: 'right', userSelect: 'none' }}>
          <div className="header-clock-time">{timeStr}</div>
          <div className="header-clock-date">{dateStr}</div>
        </div>
      </div>
    </header>
  );
}

