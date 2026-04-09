import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

/* ── helpers ── */
const TODAY = new Date();
const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const isSame = (a,b) => toKey(a) === toKey(b);
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getCalendarWeeks(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const total = getDaysInMonth(year, month);
  const weeks = [];
  let week = new Array(startDay).fill(null);
  for (let d = 1; d <= total; d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }
  return weeks;
}

const TYPE_COLORS = {
  'Follow-Up':  { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', dot: '#3b82f6' },
  'New Patient': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', dot: '#f59e0b' },
  'Telehealth':  { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6', dot: '#8b5cf6' },
  default:       { bg: '#f0fdf4', border: '#22c55e', text: '#166534', dot: '#22c55e' },
};
const getTypeColor = (apt) => {
  if (apt.visitType === 'Telehealth') return TYPE_COLORS['Telehealth'];
  return TYPE_COLORS[apt.type] || TYPE_COLORS.default;
};

export default function Schedule() {
  const { currentUser } = useAuth();
  const { appointments, updateAppointmentStatus, selectPatient } = usePatient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('All');
  const [view, setView] = useState('calendar');          // 'calendar' | 'list'
  const [calendarBase, setCalendarBase] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null); // date key or null

  /* all appointments visible to current user */
  const allAppts = useMemo(() => appointments.filter(
    (a) => a.provider === currentUser?.id || currentUser?.role === 'front_desk' || currentUser?.role === 'admin'
  ), [appointments, currentUser]);

  /* today only */
  const todayKey = toKey(TODAY);
  const todayAppts = useMemo(() => allAppts.filter(a => a.date === todayKey), [allAppts, todayKey]);

  /* filtered for list */
  const filteredAppts = useMemo(() => {
    const base = selectedDate ? allAppts.filter(a => a.date === selectedDate) : todayAppts;
    if (statusFilter === 'All') return base;
    return base.filter(a => a.status === statusFilter);
  }, [allAppts, todayAppts, selectedDate, statusFilter]);

  /* group by date for calendar */
  const aptsByDate = useMemo(() => {
    const map = {};
    allAppts.forEach(a => { (map[a.date] = map[a.date] || []).push(a); });
    return map;
  }, [allAppts]);

  const counts = useMemo(() => {
    const base = selectedDate ? allAppts.filter(a => a.date === selectedDate) : todayAppts;
    return {
      total: base.length,
      scheduled: base.filter(a => a.status === 'Scheduled' || a.status === 'Confirmed').length,
      checkedIn: base.filter(a => a.status === 'Checked In').length,
      inProgress: base.filter(a => a.status === 'In Progress').length,
      completed: base.filter(a => a.status === 'Completed').length,
    };
  }, [allAppts, todayAppts, selectedDate]);

  /* 3 months starting from calendarBase */
  const threeMonths = useMemo(() => {
    const m = [];
    for (let i = 0; i < 3; i++) {
      const y = calendarBase.getFullYear();
      const mo = calendarBase.getMonth() + i;
      const date = new Date(y, mo, 1);
      m.push({ year: date.getFullYear(), month: date.getMonth(), weeks: getCalendarWeeks(date.getFullYear(), date.getMonth()) });
    }
    return m;
  }, [calendarBase]);

  /* navigate months */
  const shiftMonths = useCallback((delta) => {
    setCalendarBase(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }, []);
  const goToday = useCallback(() => {
    setCalendarBase(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
    setSelectedDate(null);
  }, []);

  /* actions */
  const handleOpenChart = (apt) => { if (apt.patientId) { selectPatient(apt.patientId); navigate(`/chart/${apt.patientId}/summary`); } };
  const handleCheckIn = (apt) => { updateAppointmentStatus(apt.id, 'Checked In'); if (apt.patientId) selectPatient(apt.patientId); navigate(`/session/${apt.id}`); };
  const handleStart = (aptId) => updateAppointmentStatus(aptId, 'In Progress');
  const handleComplete = (aptId) => updateAppointmentStatus(aptId, 'Completed');
  const handleGoToSession = (apt) => { if (apt.patientId) selectPatient(apt.patientId); navigate(`/session/${apt.id}`); };

  /* selected date label */
  const selectedLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>📅 Schedule</h1>
          <p>
            {selectedLabel}
            <span style={{ marginLeft: 8, color: 'var(--primary)', fontWeight: 600 }}>
              · {counts.total} appointment{counts.total !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', borderRadius: 10, padding: 3 }}>
          {[{ key: 'calendar', icon: '📆', label: 'Calendar' }, { key: 'list', icon: '📋', label: 'List' }].map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: view === v.key ? 700 : 500, cursor: 'pointer',
                border: 'none',
                background: view === v.key ? 'var(--primary)' : 'transparent',
                color: view === v.key ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar View ── */}
      {view === 'calendar' && (
        <>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button onClick={() => shiftMonths(-3)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>◀</button>
            <button onClick={goToday} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Today</button>
            <button onClick={() => shiftMonths(3)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>▶</button>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginLeft: 6 }}>
              {MONTH_NAMES[threeMonths[0].month]} – {MONTH_NAMES[threeMonths[2].month]} {threeMonths[2].year}
            </span>
          </div>

          {/* 3 month grids */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            {threeMonths.map(({ year, month, weeks }) => (
              <div key={`${year}-${month}`} style={{
                background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12,
                overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
              }}>
                {/* month title */}
                <div style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: 0.5 }}>
                  {MONTH_NAMES[month]} {year}
                </div>
                {/* weekday headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border)' }}>
                  {WEEKDAYS.map(d => (
                    <div key={d} style={{ textAlign: 'center', padding: '6px 0', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{d}</div>
                  ))}
                </div>
                {/* day cells */}
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: wi < weeks.length -1 ? '1px solid var(--border-light, #f0f0f0)' : 'none' }}>
                    {week.map((day, di) => {
                      if (!day) return <div key={di} style={{ minHeight: 56, background: '#fafafa' }} />;
                      const key = toKey(day);
                      const dayAppts = aptsByDate[key] || [];
                      const isToday = isSame(day, TODAY);
                      const isSelected = selectedDate === key;
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div key={di}
                          onClick={() => setSelectedDate(isSelected ? null : key)}
                          style={{
                            minHeight: 56, padding: '3px 4px', cursor: 'pointer', position: 'relative',
                            background: isSelected ? '#ede9fe' : isToday ? '#eff6ff' : isWeekend ? '#fafafa' : 'transparent',
                            borderLeft: isSelected ? '3px solid #7c3aed' : isToday ? '3px solid #3b82f6' : '3px solid transparent',
                            transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => { if (!isSelected && !isToday) e.currentTarget.style.background = '#f5f3ff'; }}
                          onMouseLeave={e => { if (!isSelected && !isToday) e.currentTarget.style.background = isWeekend ? '#fafafa' : 'transparent'; }}
                        >
                          {/* date number */}
                          <div style={{
                            fontSize: 11, fontWeight: isToday ? 800 : 600,
                            color: isToday ? '#fff' : isSelected ? '#7c3aed' : 'var(--text-primary)',
                            width: isToday ? 22 : 'auto', height: isToday ? 22 : 'auto',
                            borderRadius: '50%', display: isToday ? 'flex' : 'block',
                            alignItems: 'center', justifyContent: 'center',
                            background: isToday ? '#3b82f6' : 'transparent',
                            marginBottom: 2,
                          }}>
                            {day.getDate()}
                          </div>
                          {/* appointment dots / mini blocks */}
                          {dayAppts.slice(0, 3).map((apt, ai) => {
                            const c = getTypeColor(apt);
                            return (
                              <div key={ai} style={{
                                fontSize: 9, lineHeight: '14px', fontWeight: 600,
                                padding: '0 4px', marginBottom: 1, borderRadius: 3,
                                background: c.bg, color: c.text, borderLeft: `2px solid ${c.border}`,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {apt.time} {apt.patientName?.split(' ')[0]}
                              </div>
                            );
                          })}
                          {dayAppts.length > 3 && (
                            <div style={{ fontSize: 9, color: 'var(--primary)', fontWeight: 700, paddingLeft: 4 }}>+{dayAppts.length - 3} more</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
            {[{ label: 'Follow-Up', color: '#3b82f6' }, { label: 'New Patient', color: '#f59e0b' }, { label: 'Telehealth', color: '#8b5cf6' }].map(l => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, display: 'inline-block' }} />
                {l.label}
              </span>
            ))}
          </div>

          {/* Day detail panel (when a date is clicked) */}
          {selectedDate && (
            <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                    {(aptsByDate[selectedDate] || []).length} appointment{(aptsByDate[selectedDate] || []).length !== 1 ? 's' : ''}
                  </span>
                </h3>
                <button onClick={() => setSelectedDate(null)}
                  style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 700 }}>✕</button>
              </div>
              {(aptsByDate[selectedDate] || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No appointments scheduled</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(aptsByDate[selectedDate] || []).sort((a,b) => a.time.localeCompare(b.time)).map(apt => {
                    const c = getTypeColor(apt);
                    return (
                      <div key={apt.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                        background: c.bg, borderLeft: `4px solid ${c.border}`, borderRadius: 8,
                        cursor: 'pointer', transition: 'transform 0.1s',
                      }}
                        onClick={() => handleOpenChart(apt)}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                      >
                        <div style={{ fontWeight: 700, fontSize: 14, minWidth: 50, fontVariantNumeric: 'tabular-nums', color: c.text }}>{apt.time}</div>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${c.border}, ${c.dot})`, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 11, flexShrink: 0,
                        }}>
                          {apt.patientName?.split(' ').map(n => n[0]).join('').slice(0,2)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: c.text }}>{apt.patientName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {apt.type} · {apt.duration || 30} min · {apt.visitType === 'Telehealth' ? '📹 ' : '🏥 '}{apt.visitType}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 10, fontWeight: 600, background: apt.status === 'Checked In' ? '#dcfce7' : apt.status === 'Completed' ? '#e5e7eb' : '#dbeafe', color: apt.status === 'Checked In' ? '#166534' : apt.status === 'Completed' ? '#6b7280' : '#1e40af' }}>
                          {apt.status}
                        </span>
                        {/* quick actions for today */}
                        {apt.date === todayKey && (
                          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                            {(apt.status === 'Scheduled' || apt.status === 'Confirmed') && (
                              <button className="btn btn-sm btn-success" onClick={() => handleCheckIn(apt)} style={{ fontSize: 11, padding: '3px 10px' }}>Check In</button>
                            )}
                            {(apt.status === 'Checked In' || apt.status === 'In Progress') && (
                              <button className="btn btn-sm btn-success" onClick={() => handleGoToSession(apt)} style={{ fontSize: 11, padding: '3px 10px' }}>🩺 Session</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── List View (original table) ── */}
      {view === 'list' && (
        <>
          {/* Status summary pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {[
              { label: 'All', count: counts.total, filter: 'All' },
              { label: 'Waiting', count: counts.scheduled, filter: 'Confirmed' },
              { label: 'Checked In', count: counts.checkedIn, filter: 'Checked In' },
              { label: 'In Session', count: counts.inProgress, filter: 'In Progress' },
              { label: 'Completed', count: counts.completed, filter: 'Completed' },
            ].map(f => (
              <button
                key={f.filter}
                className={`btn btn-sm ${statusFilter === f.filter ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(f.filter)}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          <div className="card">
            <div className="card-body no-pad">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>Time</th>
                    <th>Patient</th>
                    <th>Provider</th>
                    <th>Visit Type</th>
                    <th>Reason</th>
                    <th>Room</th>
                    <th>Status</th>
                    <th style={{ width: 240 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppts.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state" style={{ padding: 32 }}>
                          <span className="icon">📅</span>
                          <h3>No appointments match this filter</h3>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAppts.map((apt) => (
                      <tr key={apt.id} style={{ opacity: apt.status === 'Completed' ? 0.55 : 1, cursor: 'pointer' }} onClick={() => handleOpenChart(apt)}>
                        <td style={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{apt.time}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: 10, flexShrink: 0,
                            }}>
                              {apt.patientName ? apt.patientName.split(' ').map(n => n[0]).join('').slice(0,2) : '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{apt.patientName}</div>
                              <div className="text-xs text-muted">{apt.type} · {apt.duration || 30} min</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-sm">{apt.providerName}</td>
                        <td>
                          <span className={`badge ${apt.visitType === 'Telehealth' ? 'badge-purple' : 'badge-info'}`}>
                            {apt.visitType === 'Telehealth' ? '📹 ' : '🏥 '}{apt.visitType}
                          </span>
                        </td>
                        <td className="text-sm" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.reason}</td>
                        <td>{apt.room || '—'}</td>
                        <td>
                          <span className={`badge ${
                            apt.status === 'Checked In' ? 'badge-success' :
                            apt.status === 'In Progress' ? 'badge-warning' :
                            apt.status === 'Completed' ? 'badge-gray' :
                            apt.status === 'Confirmed' ? 'badge-info' :
                            'badge-gray'
                          }`}>{apt.status}</span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {(apt.status === 'Scheduled' || apt.status === 'Confirmed') && (
                              <button className="btn btn-sm btn-success" onClick={() => handleCheckIn(apt)}>
                                Check In
                              </button>
                            )}
                            {apt.status === 'Checked In' && (
                              <button className="btn btn-sm btn-success" onClick={() => handleGoToSession(apt)}>
                                🩺 Session
                              </button>
                            )}
                            {apt.status === 'In Progress' && (
                              <>
                                <button className="btn btn-sm btn-success" onClick={() => handleGoToSession(apt)}>
                                  🩺 Session
                                </button>
                                <button className="btn btn-sm btn-secondary" onClick={() => handleComplete(apt.id)}>
                                  Complete
                                </button>
                              </>
                            )}
                            {apt.patientId && apt.status !== 'Completed' && (
                              <button className="btn btn-sm btn-ghost" onClick={() => handleOpenChart(apt)}>
                                📋 Chart
                              </button>
                            )}
                            {apt.visitType === 'Telehealth' && apt.status !== 'Completed' && (
                              <button className="btn btn-sm" style={{ background: '#7c3aed', color: 'white' }} onClick={() => navigate('/telehealth')}>
                                📹 Join
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
