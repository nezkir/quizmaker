import React from 'react';
import ProgressBar from './ProgressBar';
import MathText from './MathText';

function getGrade(pct) {
  if (pct >= 90) return { letter: 'A', color: 'var(--success)',  emoji: '🏆' };
  if (pct >= 80) return { letter: 'B', color: '#60a5fa',         emoji: '🎉' };
  if (pct >= 70) return { letter: 'C', color: 'var(--accent)',   emoji: '👍' };
  if (pct >= 60) return { letter: 'D', color: 'var(--accent3)',  emoji: '📚' };
  return               { letter: 'F', color: 'var(--danger)',    emoji: '💪' };
}

export default function ResultsScreen({ questions, answers, answerKey, subject, onRetake, onHome }) {
  const correct = questions.filter((q) => answers[q.num] === answerKey[q.num]).length;
  const total   = questions.length;
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0;
  const grade   = getGrade(pct);
  const missed  = questions.filter((q) => answers[q.num] !== answerKey[q.num]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, padding: '24px 20px', maxWidth: 580, margin: '0 auto', width: '100%' }}>

        {/* ── Score Hero ── */}
        <div className="fade-up" style={{ textAlign: 'center', padding: '32px 20px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>{grade.emoji}</div>
          <div style={{
            width: 110, height: 110, borderRadius: '50%',
            background: `${grade.color}18`,
            border: `3px solid ${grade.color}`,
            margin: '0 auto 16px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            animation: 'scoreReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            <span style={{ fontSize: 38, fontWeight: 700, color: grade.color, lineHeight: 1 }}>
              {grade.letter}
            </span>
          </div>
          <p style={{ fontSize: 46, fontWeight: 700, letterSpacing: '-2px', color: grade.color, lineHeight: 1 }}>
            {pct}%
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 15, marginTop: 6 }}>
            {correct} out of {total} correct
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{subject}</p>
        </div>

        {/* ── Stats Row ── */}
        <div className="fade-up-d1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Correct', val: correct,         color: 'var(--success)' },
            { label: 'Wrong',   val: total - correct, color: 'var(--danger)'  },
            { label: 'Total',   val: total,            color: 'var(--muted)'   },
          ].map((s) => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', padding: '14px 10px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Score bar ── */}
        <div className="fade-up-d2" style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)', padding: '16px 18px', marginBottom: 22,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Score</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--mono)', color: grade.color }}>{pct}%</span>
          </div>
          <ProgressBar value={pct} color={grade.color} height={8} />
        </div>

        {/* ── Missed Questions ── */}
        {missed.length > 0 && (
          <div className="fade-up-d3" style={{ marginBottom: 24 }}>
            <p style={{
              fontWeight: 600, fontSize: 14, color: 'var(--danger)',
              marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ❌ Missed Questions ({missed.length})
            </p>

            {missed.map((q) => (
              <div key={q.num} style={{
                background: 'var(--surface)',
                border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: 'var(--r-sm)',
                padding: '14px 16px',
                marginBottom: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                    Q{q.num}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{
                      fontSize: 12, background: 'rgba(248,113,113,0.1)',
                      color: 'var(--danger)', padding: '2px 9px', borderRadius: 4, fontFamily: 'var(--mono)',
                    }}>
                      You: {(answers[q.num] || '—').toUpperCase()}
                    </span>
                    <span style={{
                      fontSize: 12, background: 'rgba(74,222,128,0.1)',
                      color: 'var(--success)', padding: '2px 9px', borderRadius: 4, fontFamily: 'var(--mono)',
                    }}>
                      ✓ {answerKey[q.num]?.toUpperCase() || '?'}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>
                  <MathText text={q.text} />
                </p>

                {answerKey[q.num] && q.options[answerKey[q.num]] && (
                  <div style={{
                    background: 'rgba(74,222,128,0.06)',
                    border: '1px solid rgba(74,222,128,0.2)',
                    borderRadius: 6, padding: '8px 12px',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700 }}>
                      {answerKey[q.num].toUpperCase()}.
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--success)', lineHeight: 1.5 }}>
                      <MathText text={q.options[answerKey[q.num]]} />
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Perfect score ── */}
        {missed.length === 0 && (
          <div className="fade-up-d3" style={{
            textAlign: 'center', padding: '28px 20px',
            background: 'rgba(74,222,128,0.06)',
            border: '1px solid rgba(74,222,128,0.2)',
            borderRadius: 'var(--r)', marginBottom: 24,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎯</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--success)', marginBottom: 4 }}>Perfect Score!</p>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>You answered every question correctly.</p>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="fade-up-d4" style={{
          display: 'flex', gap: 12,
          marginBottom: 'calc(var(--safe-bottom) + 20px)',
        }}>
          <button
            onClick={onRetake}
            style={{
              flex: 1, padding: 16,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', color: 'var(--text)',
              fontWeight: 600, fontSize: 15,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border2)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            ↺ Retake
          </button>
          <button
            onClick={onHome}
            style={{
              flex: 1, padding: 16,
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              border: 'none', borderRadius: 'var(--r-sm)',
              color: '#000', fontWeight: 700, fontSize: 15,
            }}
          >
            New Quiz →
          </button>
        </div>
      </main>
    </div>
  );
}
