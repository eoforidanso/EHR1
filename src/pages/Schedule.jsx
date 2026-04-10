import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { users as allUsers } from '../data/mockData';

const PROVIDERS = allUsers.filter(u => u.role === 'prescriber' || u.role === 'nurse');

/* ── helpers ── */
const TODAY = new Date();
const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const isSame = (a,b) => toKey(a) === toKey(b);
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WEEKDAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const HOURS = [7,8,9,10,11,12,13,14,15,16,17,18];
const fmtHour = (h) => { const s = h % 12 === 0 ? 12 : h % 12; return `${s} ${h < 12 ? 'AM' : 'PM'}`; };

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
  const { appointments, updateAppointmentStatus, selectPatient, blockedDays, addBlockedDay, removeBlockedDay } = usePatient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('All');
  const [view, setView] = useState('calendar');          // 'calendar' | 'day' | 'week' | 'list' | 'block'
  const [calendarBase, setCalendarBase] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayViewDate, setDayViewDate] = useState(() => new Date(TODAY));
  const [weekViewStart, setWeekViewStart] = useState(() => {
    const d = new Date(TODAY); d.setDate(d.getDate() - d.getDay()); return d;
  });

  // Block Days state
  const [blockProvider, setBlockProvider] = useState(currentUser?.id || PROVIDERS[0]?.id || '');
  const [blockDateFrom, setBlockDateFrom] = useState('');
  const [blockDateTo, setBlockDateTo] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockType, setBlockType] = useState('full');   // 'full' | 'am' | 'pm'
  const [blockSaved, setBlockSaved] = useState(false);

  /* build a lookup: dateKey -> array of blocked entries for quick calendar lookup */
  const blockedByDate = useMemo(() => {
    const map = {};
    blockedDays.forEach(b => {
      const from = new Date(b.dateFrom + 'T00:00:00');
      const to   = new Date(b.dateTo   + 'T00:00:00');
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const k = toKey(d);
        (map[k] = map[k] || []).push(b);
      }
    });
    return map;
  }, [blockedDays]);

  const handleAddBlock = () => {
    if (!blockDateFrom || !blockDateTo || !blockProvider) return;
    if (blockDateTo < blockDateFrom) return;
    const provider = PROVIDERS.find(p => p.id === blockProvider);
    addBlockedDay({
      providerId: blockProvider,
      providerName: provider ? `${provider.firstName} ${provider.lastName}`.trim() : blockProvider,
      dateFrom: blockDateFrom,
      dateTo:   blockDateTo,
      type: blockType,
      reason: blockReason.trim(),
    });
    setBlockDateFrom('');
    setBlockDateTo('');
    setBlockReason('');
    setBlockType('full');
    setBlockSaved(true);
    setTimeout(() => setBlockSaved(false), 3000);
  };

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
    setDayViewDate(new Date(TODAY));
    const d = new Date(TODAY); d.setDate(d.getDate() - d.getDay());
    setWeekViewStart(d);
  }, []);

  /* week view helpers */
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekViewStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekViewStart]);
  const shiftWeek = useCallback((delta) => {
    setWeekViewStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + delta * 7); return d; });
  }, []);
  const shiftDay = useCallback((delta) => {
    setDayViewDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + delta); return d; });
  }, []);

  /* parse appointment time to fractional hour, e.g. "9:30 AM" -> 9.5 */
  const parseTimeToHour = (timeStr) => {
    if (!timeStr) return null;
    const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (m[3]) {
      const ampm = m[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
    }
    return h + min / 60;
  };

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
          {[{ key: 'day', icon: '📅', label: 'Day' }, { key: 'week', icon: '🗓️', label: 'Week' }, { key: 'calendar', icon: '📆', label: 'Month' }, { key: 'list', icon: '📋', label: 'List' }, { key: 'block', icon: '⛔', label: 'Block Days' }].map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: view === v.key ? 700 : 500, cursor: 'pointer',
                border: 'none',
                background: view === v.key ? (v.key === 'block' ? '#c92b2b' : 'var(--primary)') : 'transparent',
                color: view === v.key ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Day View ── */}
      {view === 'day' && (() => {
        const dayKey = toKey(dayViewDate);
        const dayAppts = allAppts.filter(a => a.date === dayKey);
        const dayLabel = dayViewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const isToday = isSame(dayViewDate, TODAY);
        const dayBlocks = blockedByDate[dayKey] || [];
        const nowHour = TODAY.getHours() + TODAY.getMinutes() / 60;
        return (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <button onClick={() => shiftDay(-1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>◀</button>
              <button onClick={goToday} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Today</button>
              <button onClick={() => shiftDay(1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>▶</button>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginLeft: 6 }}>
                {dayLabel}
                {isToday && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 10px', borderRadius: 10, background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>Today</span>}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                {dayAppts.length} appointment{dayAppts.length !== 1 ? 's' : ''}
              </span>
            </div>
            {dayBlocks.length > 0 && (
              <div style={{ marginBottom: 12, padding: '8px 14px', background: 'rgba(201,43,43,0.08)', border: '1px solid rgba(201,43,43,0.2)', borderRadius: 8, fontSize: 12, color: '#c92b2b', fontWeight: 600 }}>
                ⛔ {dayBlocks.map(b => `${b.providerName}: ${b.type === 'full' ? 'Full Day Blocked' : b.type === 'am' ? 'AM Blocked' : 'PM Blocked'}${b.reason ? ` — ${b.reason}` : ''}`).join(' | ')}
              </div>
            )}
            <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              {HOURS.map((hour) => {
                const hourAppts = dayAppts.filter(a => {
                  const h = parseTimeToHour(a.time);
                  return h !== null && Math.floor(h) === hour;
                });
                const isNowHour = isToday && Math.floor(nowHour) === hour;
                return (
                  <div key={hour} style={{
                    display: 'flex', minHeight: 64, borderBottom: '1px solid var(--border-light, #f0f0f0)',
                    position: 'relative',
                  }}>
                    {/* now indicator */}
                    {isNowHour && (
                      <div style={{
                        position: 'absolute', left: 80, right: 0,
                        top: `${((nowHour - hour) / 1) * 100}%`,
                        height: 2, background: '#ef4444', zIndex: 2,
                        boxShadow: '0 0 4px rgba(239,68,68,0.5)',
                      }}>
                        <div style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                      </div>
                    )}
                    {/* time label */}
                    <div style={{
                      width: 80, flexShrink: 0, padding: '8px 12px', fontSize: 12, fontWeight: 600,
                      color: isNowHour ? '#ef4444' : 'var(--text-muted)', borderRight: '1px solid var(--border-light, #f0f0f0)',
                      textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                    }}>
                      {fmtHour(hour)}
                    </div>
                    {/* appointments in this hour */}
                    <div style={{ flex: 1, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {hourAppts.map(apt => {
                        const c = getTypeColor(apt);
                        return (
                          <div key={apt.id}
                            onClick={() => handleOpenChart(apt)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
                              background: c.bg, borderLeft: `4px solid ${c.border}`, borderRadius: 8,
                              cursor: 'pointer', transition: 'transform 0.1s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                          >
                            <div style={{ fontWeight: 700, fontSize: 13, minWidth: 55, color: c.text, fontVariantNumeric: 'tabular-nums' }}>{apt.time}</div>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: `linear-gradient(135deg, ${c.border}, ${c.dot})`, color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: 10, flexShrink: 0,
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
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* ── Week View ── */}
      {view === 'week' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button onClick={() => shiftWeek(-1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>◀</button>
            <button onClick={goToday} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Today</button>
            <button onClick={() => shiftWeek(1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>▶</button>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginLeft: 6 }}>
              {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {/* Day column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', borderBottom: '2px solid var(--border)' }}>
              <div style={{ padding: 8, borderRight: '1px solid var(--border-light, #f0f0f0)' }} />
              {weekDays.map((d, i) => {
                const isToday = isSame(d, TODAY);
                const dayKey = toKey(d);
                const dayBlocks = blockedByDate[dayKey] || [];
                const ct = (aptsByDate[dayKey] || []).length;
                return (
                  <div key={i} style={{
                    padding: '8px 6px', textAlign: 'center', borderRight: i < 6 ? '1px solid var(--border-light, #f0f0f0)' : 'none',
                    background: isToday ? '#eff6ff' : dayBlocks.length > 0 ? 'rgba(201,43,43,0.04)' : 'transparent',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: isToday ? '#3b82f6' : 'var(--text-muted)' }}>{WEEKDAYS[d.getDay()]}</div>
                    <div style={{
                      fontSize: 18, fontWeight: 800, lineHeight: 1.3,
                      color: isToday ? '#fff' : 'var(--text-primary)',
                      width: isToday ? 30 : 'auto', height: isToday ? 30 : 'auto',
                      borderRadius: '50%', display: isToday ? 'inline-flex' : 'inline-block',
                      alignItems: 'center', justifyContent: 'center',
                      background: isToday ? '#3b82f6' : 'transparent',
                    }}>
                      {d.getDate()}
                    </div>
                    {ct > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{ct} appt{ct !== 1 ? 's' : ''}</div>}
                    {dayBlocks.length > 0 && <div style={{ fontSize: 9, color: '#c92b2b', fontWeight: 700 }}>⛔ Blocked</div>}
                  </div>
                );
              })}
            </div>

            {/* Time rows */}
            {HOURS.map((hour) => {
              const isNowHour = isSame(TODAY, TODAY) && Math.floor(TODAY.getHours() + TODAY.getMinutes() / 60) === hour;
              return (
                <div key={hour} style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', borderBottom: '1px solid var(--border-light, #f0f0f0)', minHeight: 56 }}>
                  {/* time gutter */}
                  <div style={{
                    padding: '4px 8px', fontSize: 11, fontWeight: 600, textAlign: 'right',
                    color: isNowHour ? '#ef4444' : 'var(--text-muted)', borderRight: '1px solid var(--border-light, #f0f0f0)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {fmtHour(hour)}
                  </div>
                  {/* 7 day columns */}
                  {weekDays.map((d, di) => {
                    const dayKey = toKey(d);
                    const cellAppts = (aptsByDate[dayKey] || []).filter(a => {
                      const h = parseTimeToHour(a.time);
                      return h !== null && Math.floor(h) === hour;
                    });
                    const isToday = isSame(d, TODAY);
                    return (
                      <div key={di} style={{
                        padding: '2px 3px', borderRight: di < 6 ? '1px solid var(--border-light, #f0f0f0)' : 'none',
                        background: isToday && isNowHour ? 'rgba(239,68,68,0.04)' : isToday ? 'rgba(59,130,246,0.03)' : 'transparent',
                        position: 'relative',
                      }}>
                        {cellAppts.map(apt => {
                          const c = getTypeColor(apt);
                          return (
                            <div key={apt.id}
                              onClick={() => handleOpenChart(apt)}
                              title={`${apt.time} — ${apt.patientName}\n${apt.type} · ${apt.duration || 30} min · ${apt.visitType}\n${apt.status}`}
                              style={{
                                padding: '3px 5px', marginBottom: 2, borderRadius: 4,
                                background: c.bg, borderLeft: `3px solid ${c.border}`,
                                cursor: 'pointer', overflow: 'hidden', transition: 'transform 0.1s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                              <div style={{ fontSize: 10, fontWeight: 700, color: c.text, lineHeight: 1.3 }}>
                                {apt.time}
                              </div>
                              <div style={{ fontSize: 9.5, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.85 }}>
                                {apt.patientName?.split(' ')[0]}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, marginBottom: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
            {[{ label: 'Follow-Up', color: '#3b82f6' }, { label: 'New Patient', color: '#f59e0b' }, { label: 'Telehealth', color: '#8b5cf6' }, { label: 'Blocked Day', color: '#c92b2b' }].map(l => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, display: 'inline-block' }} />
                {l.label}
              </span>
            ))}
          </div>
        </>
      )}

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
                      const dayBlocks = blockedByDate[key] || [];
                      const isBlocked = dayBlocks.length > 0;
                      return (
                        <div key={di}
                          onClick={() => setSelectedDate(isSelected ? null : key)}
                          style={{
                            minHeight: 56, padding: '3px 4px', cursor: 'pointer', position: 'relative',
                            background: isBlocked ? 'repeating-linear-gradient(45deg,rgba(201,43,43,0.07) 0px,rgba(201,43,43,0.07) 4px,transparent 4px,transparent 10px)' : isSelected ? '#ede9fe' : isToday ? '#eff6ff' : isWeekend ? '#fafafa' : 'transparent',
                            borderLeft: isBlocked ? '3px solid #c92b2b' : isSelected ? '3px solid #7c3aed' : isToday ? '3px solid #3b82f6' : '3px solid transparent',
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
                          {isBlocked && (
                            <div style={{ fontSize: 8.5, color: '#c92b2b', fontWeight: 700, paddingLeft: 2, marginTop: 1, lineHeight: 1.2 }}>
                              ⛔ {dayBlocks.map(b => b.type === 'full' ? 'Blocked' : b.type === 'am' ? 'AM Off' : 'PM Off').join(', ')}
                            </div>
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
            {[{ label: 'Follow-Up', color: '#3b82f6' }, { label: 'New Patient', color: '#f59e0b' }, { label: 'Telehealth', color: '#8b5cf6' }, { label: 'Blocked Day', color: '#c92b2b' }].map(l => (
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

      {/* ── Block Days View ── */}
      {view === 'block' && (
        <div className="fade-in">
          {/* Add Block Form */}
          <div style={{ background: 'var(--bg-white)', border: '1.5px solid #c92b2b', borderRadius: 12, overflow: 'hidden', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 18px', background: 'linear-gradient(135deg,#c92b2b,#ef4444)', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>⛔</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Block Provider Days</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Mark dates as unavailable for scheduling — blocked days appear on the calendar.</div>
              </div>
            </div>
            <div style={{ padding: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {/* Provider */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Provider</label>
                <select className="form-input" value={blockProvider} onChange={e => setBlockProvider(e.target.value)}>
                  {PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.credentials ? `(${p.credentials})` : ''}</option>
                  ))}
                </select>
              </div>
              {/* Date From */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>From Date</label>
                <input type="date" className="form-input" value={blockDateFrom}
                  onChange={e => { setBlockDateFrom(e.target.value); if (!blockDateTo || e.target.value > blockDateTo) setBlockDateTo(e.target.value); }} />
              </div>
              {/* Date To */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>To Date</label>
                <input type="date" className="form-input" value={blockDateTo} min={blockDateFrom}
                  onChange={e => setBlockDateTo(e.target.value)} />
              </div>
              {/* Block Type */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Block Type</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ val: 'full', label: 'Full Day' }, { val: 'am', label: 'AM Only' }, { val: 'pm', label: 'PM Only' }].map(t => (
                    <button key={t.val} type="button" onClick={() => setBlockType(t.val)}
                      style={{
                        flex: 1, padding: '7px 4px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                        cursor: 'pointer', border: `1.5px solid ${blockType === t.val ? '#c92b2b' : 'var(--border)'}`,
                        background: blockType === t.val ? '#c92b2b' : '#fff',
                        color: blockType === t.val ? '#fff' : 'var(--text-secondary)',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Reason */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Reason (optional)</label>
                <input type="text" className="form-input" placeholder="e.g., PTO, Conference, Holiday, Sick Leave..."
                  value={blockReason} onChange={e => setBlockReason(e.target.value)} />
              </div>
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {blockSaved && <span style={{ fontSize: 12.5, color: '#166534', fontWeight: 600 }}>✅ Block saved successfully.</span>}
              {!blockSaved && <span />}
              <button className="btn btn-primary" onClick={handleAddBlock}
                disabled={!blockDateFrom || !blockDateTo || !blockProvider}
                style={{ background: '#c92b2b', borderColor: '#c92b2b', opacity: (!blockDateFrom || !blockDateTo || !blockProvider) ? 0.5 : 1 }}>
                ⛔ Add Block
              </button>
            </div>
          </div>

          {/* Existing Blocks List */}
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f7f9fc' }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>🗓️ Scheduled Blocks</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{blockedDays.length} block{blockedDays.length !== 1 ? 's' : ''}</span>
            </div>
            {blockedDays.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                No blocked days scheduled. Use the form above to add one.
              </div>
            ) : (
              <div>
                {[...blockedDays].sort((a,b) => a.dateFrom.localeCompare(b.dateFrom)).map((b, i) => {
                  const sameDay = b.dateFrom === b.dateTo;
                  const fromLabel = new Date(b.dateFrom + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
                  const toLabel   = new Date(b.dateTo   + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
                  return (
                    <div key={b.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
                      borderBottom: i < blockedDays.length - 1 ? '1px solid var(--border-light)' : 'none',
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(201,43,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⛔</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                          {b.providerName}
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10, background: b.type === 'full' ? 'rgba(201,43,43,0.12)' : 'rgba(251,146,60,0.15)', color: b.type === 'full' ? '#c92b2b' : '#c2410c' }}>
                            {b.type === 'full' ? 'Full Day' : b.type === 'am' ? 'AM Only' : 'PM Only'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {sameDay ? fromLabel : `${fromLabel} → ${toLabel}`}
                          {b.reason && <span style={{ marginLeft: 8, fontStyle: 'italic', color: 'var(--text-muted)' }}>— {b.reason}</span>}
                        </div>
                      </div>
                      <button onClick={() => removeBlockedDay(b.id)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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
