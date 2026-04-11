import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Theme Presets ──────────────────────────────────────── */
const THEMES = [
  {
    id: 'default',
    label: 'Clinical Blue',
    colors: {
      '--primary': '#0066cc', '--primary-dark': '#004999', '--primary-light': '#e8f2ff',
      '--primary-hover': '#005ab5', '--bg-sidebar': '#0f1729',
    },
  },
  {
    id: 'teal',
    label: 'Teal Calm',
    colors: {
      '--primary': '#0d9488', '--primary-dark': '#0f766e', '--primary-light': '#f0fdfa',
      '--primary-hover': '#0f766e', '--bg-sidebar': '#0c1a1a',
    },
  },
  {
    id: 'purple',
    label: 'Royal Purple',
    colors: {
      '--primary': '#7c3aed', '--primary-dark': '#6d28d9', '--primary-light': '#f5f3ff',
      '--primary-hover': '#6d28d9', '--bg-sidebar': '#1a1025',
    },
  },
  {
    id: 'forest',
    label: 'Forest Green',
    colors: {
      '--primary': '#15803d', '--primary-dark': '#166534', '--primary-light': '#f0fdf4',
      '--primary-hover': '#166534', '--bg-sidebar': '#0d1a12',
    },
  },
  {
    id: 'rose',
    label: 'Warm Rose',
    colors: {
      '--primary': '#be123c', '--primary-dark': '#9f1239', '--primary-light': '#fff1f2',
      '--primary-hover': '#9f1239', '--bg-sidebar': '#1a0f12',
    },
  },
  {
    id: 'slate',
    label: 'Dark Slate',
    colors: {
      '--primary': '#475569', '--primary-dark': '#334155', '--primary-light': '#f1f5f9',
      '--primary-hover': '#334155', '--bg-sidebar': '#111318',
    },
  },
  {
    id: 'amber',
    label: 'Amber Warm',
    colors: {
      '--primary': '#d97706', '--primary-dark': '#b45309', '--primary-light': '#fffbeb',
      '--primary-hover': '#b45309', '--bg-sidebar': '#1a1408',
    },
  },
  {
    id: 'ocean',
    label: 'Deep Ocean',
    colors: {
      '--primary': '#0284c7', '--primary-dark': '#0369a1', '--primary-light': '#f0f9ff',
      '--primary-hover': '#0369a1', '--bg-sidebar': '#0a1628',
    },
  },
];

const STORAGE_KEY_THEME = 'mindcare_theme';
const STORAGE_KEY_SIG   = 'mindcare_signature';

function getStoredTheme() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_THEME)) || null; } catch { return null; }
}

function getStoredSignature(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY_SIG)) || {};
    return all[userId] || null;
  } catch { return null; }
}

function saveSignature(userId, dataUrl) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY_SIG)) || {};
    if (dataUrl) { all[userId] = dataUrl; } else { delete all[userId]; }
    localStorage.setItem(STORAGE_KEY_SIG, JSON.stringify(all));
  } catch { /* noop */ }
}

export function applyTheme(themeId) {
  const preset = THEMES.find((t) => t.id === themeId);
  if (!preset) return;
  const root = document.documentElement;
  Object.entries(preset.colors).forEach(([k, v]) => root.style.setProperty(k, v));
  // derived tokens
  root.style.setProperty('--primary-mid', hexToMid(preset.colors['--primary'], 0.06));
  root.style.setProperty('--primary-ring', hexToMid(preset.colors['--primary'], 0.12));
  root.style.setProperty('--primary-glow', hexToMid(preset.colors['--primary'], 0.08));
  root.style.setProperty('--border-focus', preset.colors['--primary']);
  root.style.setProperty('--bg-sidebar-active', hexToMid(preset.colors['--primary'], 0.15));
  localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify({ id: themeId }));
}

function hexToMid(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ─── Component ──────────────────────────────────────────── */
export default function Settings() {
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState('theme');

  /* Theme state */
  const stored = getStoredTheme();
  const [selectedTheme, setSelectedTheme] = useState(stored?.id || 'default');

  /* Signature state */
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigMode, setSigMode] = useState('draw'); // draw | type
  const [typedSig, setTypedSig] = useState('');
  const [savedSig, setSavedSig] = useState(null);
  const lastPoint = useRef(null);

  useEffect(() => {
    if (currentUser?.id) {
      setSavedSig(getStoredSignature(currentUser.id));
    }
  }, [currentUser?.id]);

  /* ── Theme handlers ────────────────── */
  const handleThemeSelect = (id) => {
    setSelectedTheme(id);
    applyTheme(id);
  };

  /* ── Canvas drawing ────────────────── */
  const getCtx = useCallback(() => canvasRef.current?.getContext('2d'), []);

  const clearCanvas = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [getCtx]);

  const startDraw = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    setIsDrawing(true);
    lastPoint.current = { x, y };
  }, []);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPoint.current = { x, y };
  }, [isDrawing, getCtx]);

  const stopDraw = useCallback(() => { setIsDrawing(false); lastPoint.current = null; }, []);

  /* Save signature */
  const handleSaveSignature = () => {
    let dataUrl = null;
    if (sigMode === 'draw' && canvasRef.current) {
      dataUrl = canvasRef.current.toDataURL('image/png');
    } else if (sigMode === 'type' && typedSig.trim()) {
      // Render typed text to a hidden canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      ctx.clearRect(0, 0, 400, 120);
      ctx.font = '32px "Brush Script MT", "Segoe Script", cursive';
      ctx.fillStyle = '#1e293b';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSig.trim(), 16, 60);
      dataUrl = offscreen.toDataURL('image/png');
    }
    if (dataUrl) {
      saveSignature(currentUser.id, dataUrl);
      setSavedSig(dataUrl);
    }
  };

  const handleDeleteSignature = () => {
    saveSignature(currentUser.id, null);
    setSavedSig(null);
    clearCanvas();
    setTypedSig('');
  };

  /* ── Render helpers ────────────────── */
  const sections = [
    { id: 'theme', icon: '🎨', label: 'Color Theme' },
    { id: 'signature', icon: '✍️', label: 'Electronic Signature' },
  ];

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', overflow: 'hidden' }}>
      {/* Settings sidebar */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'var(--bg-white)', padding: '20px 0', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '0 20px 16px', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
          Settings
        </div>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              background: activeSection === s.id ? 'var(--primary-light)' : 'transparent',
              color: activeSection === s.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeSection === s.id ? 700 : 500,
              fontSize: 13, textAlign: 'left', width: '100%',
              borderRight: activeSection === s.id ? '3px solid var(--primary)' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Settings content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 32, background: 'var(--bg)' }}>
        {/* ─── Color Theme ─── */}
        {activeSection === 'theme' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
              Color Theme
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Choose a color scheme for the application. Changes apply immediately.
            </p>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}>
              {THEMES.map((t) => {
                const active = selectedTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleThemeSelect(t.id)}
                    style={{
                      border: active ? `2px solid ${t.colors['--primary']}` : '2px solid var(--border)',
                      borderRadius: 12, padding: 16, cursor: 'pointer',
                      background: active ? t.colors['--primary-light'] : 'var(--bg-white)',
                      textAlign: 'left', transition: 'all 0.15s',
                      boxShadow: active ? `0 0 0 3px ${hexToMid(t.colors['--primary'], 0.15)}` : 'var(--shadow-xs)',
                    }}
                  >
                    {/* Color preview strip */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: t.colors['--primary'],
                      }} />
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: t.colors['--primary-dark'],
                      }} />
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: t.colors['--bg-sidebar'],
                        border: '1px solid var(--border)',
                      }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                      {t.label}
                    </div>
                    {active && (
                      <div style={{
                        marginTop: 6, fontSize: 11, fontWeight: 600,
                        color: t.colors['--primary'], display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        ✓ Active
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Reset button */}
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => handleThemeSelect('default')}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-white)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', color: 'var(--text-secondary)',
                }}
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}

        {/* ─── Electronic Signature ─── */}
        {activeSection === 'signature' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
              Electronic Signature
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Create and manage your electronic signature for signing clinical documents.
            </p>

            {/* Current saved signature */}
            {savedSig && (
              <div style={{
                background: 'var(--bg-white)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 20, marginBottom: 24,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Current Signature
                </div>
                <div style={{
                  background: '#fafbfc', borderRadius: 8, padding: 16,
                  border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img src={savedSig} alt="Your signature" style={{ maxWidth: '100%', maxHeight: 100 }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  {currentUser?.firstName} {currentUser?.lastName}, {currentUser?.credentials}
                </div>
                <button
                  onClick={handleDeleteSignature}
                  style={{
                    marginTop: 12, padding: '6px 14px', borderRadius: 6,
                    border: '1px solid var(--danger)', background: 'var(--danger-light)',
                    color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Delete Signature
                </button>
              </div>
            )}

            {/* Signature creation */}
            <div style={{
              background: 'var(--bg-white)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 20,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {savedSig ? 'Update Signature' : 'Create Signature'}
              </div>

              {/* Mode toggle */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
                <button
                  onClick={() => setSigMode('draw')}
                  style={{
                    padding: '8px 20px', border: '1px solid var(--border)',
                    borderRadius: '8px 0 0 8px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: sigMode === 'draw' ? 'var(--primary)' : 'var(--bg-white)',
                    color: sigMode === 'draw' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  ✏️ Draw
                </button>
                <button
                  onClick={() => setSigMode('type')}
                  style={{
                    padding: '8px 20px', border: '1px solid var(--border)', borderLeft: 'none',
                    borderRadius: '0 8px 8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: sigMode === 'type' ? 'var(--primary)' : 'var(--bg-white)',
                    color: sigMode === 'type' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  ⌨️ Type
                </button>
              </div>

              {/* Draw mode */}
              {sigMode === 'draw' && (
                <div>
                  <div style={{
                    border: '2px dashed var(--border)', borderRadius: 10,
                    background: '#fff', overflow: 'hidden', position: 'relative',
                    touchAction: 'none',
                  }}>
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={150}
                      style={{ width: '100%', height: 150, cursor: 'crosshair', display: 'block' }}
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={stopDraw}
                    />
                    <div style={{
                      position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                      fontSize: 11, color: 'var(--text-muted)', pointerEvents: 'none',
                    }}>
                      Sign above
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={clearCanvas}
                      style={{
                        padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--bg-white)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSaveSignature}
                      style={{
                        padding: '7px 16px', borderRadius: 6, border: 'none',
                        background: 'var(--primary)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Save Signature
                    </button>
                  </div>
                </div>
              )}

              {/* Type mode */}
              {sigMode === 'type' && (
                <div>
                  <input
                    type="text"
                    value={typedSig}
                    onChange={(e) => setTypedSig(e.target.value)}
                    placeholder="Type your full name..."
                    maxLength={60}
                    style={{
                      width: '100%', padding: '14px 18px', fontSize: 14,
                      border: '2px solid var(--border)', borderRadius: 10,
                      fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                  {/* Preview */}
                  {typedSig.trim() && (
                    <div style={{
                      marginTop: 12, background: '#fafbfc', borderRadius: 10,
                      border: '1px dashed var(--border)', padding: '20px 24px', textAlign: 'center',
                    }}>
                      <div style={{
                        fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                        fontSize: 32, color: '#1e293b',
                      }}>
                        {typedSig}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Preview</div>
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={handleSaveSignature}
                      disabled={!typedSig.trim()}
                      style={{
                        padding: '7px 16px', borderRadius: 6, border: 'none',
                        background: typedSig.trim() ? 'var(--primary)' : 'var(--border)',
                        color: typedSig.trim() ? 'white' : 'var(--text-muted)',
                        fontSize: 12, fontWeight: 600, cursor: typedSig.trim() ? 'pointer' : 'default',
                      }}
                    >
                      Save Signature
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Signature usage info */}
            <div style={{
              marginTop: 20, padding: 16, background: 'var(--info-light)',
              borderRadius: 10, border: '1px solid #bae6fd',
              fontSize: 12, color: 'var(--info)', lineHeight: 1.6,
            }}>
              <strong>ℹ️ About Electronic Signatures</strong><br />
              Your electronic signature is stored locally on this device and will be used when
              signing clinical notes, orders, and prescriptions. It is associated with your
              user credential: <strong>{currentUser?.firstName} {currentUser?.lastName}, {currentUser?.credentials}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
