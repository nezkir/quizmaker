import React, { useState } from 'react';

function scoreColor(pct) {
  if (pct >= 80) return 'var(--success)';
  if (pct >= 60) return 'var(--accent3)';
  return 'var(--danger)';
}

function MiniBarChart({ history }) {
  const recent = history.slice(-16);
  const maxH   = 80;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      padding: '18px 20px',
      marginBottom: 24,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 18,
      }}>
        Performance trend (last {recent.length})
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: maxH, marginBottom: 8 }}>
        {recent.map((h, i) => (
          <div
            key={h.id || i}
            title={`${h.subject}: ${h.pct}%`}
            style={{
              flex: 1, minWidth: 0,
              borderRadius: '4px 4px 0 0',
              background: scoreColor(h.pct),
              opacity: 0.85,
              height: `${Math.max(6, h.pct)}%`,
              transition: 'height 0.5s ease',
              cursor: 'default',
            }}
          />
        ))}
      </div>

      {/* Axis labels */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Oldest</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Latest</span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
        {[
          { label: '≥80%',  color: 'var(--success)' },
          { label: '60–79%', color: 'var(--accent3)' },
          { label: '<60%',  color: 'var(--danger)'  },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, opacity: 0.85 }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HistoryTab({ history, stats, onClear }) {
  const [confirmClear, setConfirmClear] = useState(false);

  if (history.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 40px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 52, marginBottom: 18 }}>📊</div>
        <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
          No history yet
        </p>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 260 }}>
          Complete your first quiz to see your performance trends and session history here.
        </p>
      </div>
    );
  }

  return (
    <main style={{ flex: 1, padding: '20px', maxWidth: 560, margin: '0 auto', width: '100%' }}>

      {/* ── Stats Row ── */}
      <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Quizzes',       val: stats.count                                },
          { label: 'Avg Score',     val: `${stats.avgPct}%`,   color: scoreColor(stats.avgPct) },
          { label: 'Best Score',    val: `${stats.bestPct}%`,  color: scoreColor(stats.bestPct) },
        ].map((s) => (
          <div key={s.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            padding: '14px 10px', textAlign: 'center',
          }}>
            <p style={{
              fontSize: 24, fontWeight: 700, lineHeight: 1,
              color: s.color || 'var(--accent)',
            }}>
              {s.val}
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Bar Chart ── */}
      <div className="fade-up-d1">
        <MiniBarChart history={history} />
      </div>

      {/* ── Session List ── */}
      <div className="fade-up-d2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Recent Sessions
          </p>
          {onClear && (
            confirmClear ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { onClear(); setConfirmClear(false); }}
                  style={{
                    fontSize: 12, padding: '4px 10px',
                    background: 'rgba(248,113,113,0.15)',
                    border: '1px solid rgba(248,113,113,0.4)',
                    borderRadius: 6, color: 'var(--danger)', cursor: 'pointer',
                  }}
                >
                  Yes, clear
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  style={{
                    fontSize: 12, padding: '4px 10px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 6, color: 'var(--muted)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                style={{
                  fontSize: 12, padding: '4px 10px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 6, color: 'var(--muted)', cursor: 'pointer',
                }}
              >
                Clear all
              </button>
            )
          )}
        </div>

        {[...history].reverse().map((h, i) => {
          const color = scoreColor(h.pct);
          return (
            <div
              key={h.id || i}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                padding: '14px 16px',
                marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              {/* Color dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: color, flexShrink: 0, opacity: 0.9,
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontWeight: 600, fontSize: 14,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {h.subject}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                  {new Date(h.date).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                  {'  ·  '}
                  {h.correct}/{h.total} correct
                </p>
              </div>

              <p style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1, flexShrink: 0 }}>
                {h.pct}%
              </p>
            </div>
          );
        })}
      </div>

      <div style={{ height: 'calc(var(--safe-bottom) + 20px)' }} />
    </main>
  );
}
