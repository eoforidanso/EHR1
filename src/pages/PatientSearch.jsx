import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';

export default function PatientSearch() {
  const { patients, selectPatient } = usePatient();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.dob && p.dob.includes(q))
    );
  });

  const handleSelect = (patient) => {
    selectPatient(patient.id);
    navigate(`/chart/${patient.id}/summary`);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>🔍 Patient Search</h1>
        <p>Search and select a patient to open their chart · {patients.length} patients in system</p>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              placeholder="Type a name, MRN, or date of birth..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 15, padding: '11px 16px 11px 42px' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}
              >✕</button>
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} {search ? 'found' : ''}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body no-pad">
          {search && filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <span className="icon">🔍</span>
              <h3>No patients found</h3>
              <p>Try adjusting your search terms</p>
            </div>
          ) : (
            <>
              {!search && filtered.length > 0 && (
                <div style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  Showing all {filtered.length} patients
                </div>
              )}
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>MRN</th>
                    <th>DOB</th>
                    <th>Gender</th>
                    <th>Insurance</th>
                    <th>Last Visit</th>
                    <th>Flags</th>
                    <th style={{ width: 100 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => handleSelect(p)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 11, flexShrink: 0,
                        }}>
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{p.lastName}, {p.firstName}</div>
                          <div className="text-xs text-muted">{p.phone || p.cellPhone || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.mrn}</td>
                    <td>{p.dob}</td>
                    <td>{p.gender}</td>
                    <td className="text-sm">{p.insurance?.primary?.name || '—'}</td>
                    <td className="text-sm">{p.lastVisit || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.isBTG && <span className="badge badge-danger" style={{ fontSize: 10 }}>🔒 BTG</span>}
                        {p.flags?.filter(f => f !== 'BTG Protected').map((f, i) => (
                          <span key={i} className={`badge ${f.includes('Suicide') || f.includes('Safety') ? 'badge-danger' : f.includes('Substance') ? 'badge-warning' : f === 'VIP' ? 'badge-purple' : 'badge-info'}`} style={{ fontSize: 10 }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); handleSelect(p); }}>
                        Open Chart
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
