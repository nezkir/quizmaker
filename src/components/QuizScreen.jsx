import React, { useState, useCallback } from 'react';
import ProgressBar from './ProgressBar';
import MathText from './MathText';

const OPTION_COLORS = {
  a: { base: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  b: { base: '#6ee7b7', bg: 'rgba(110,231,183,0.15)' },
  c: { base: '#fb923c', bg: 'rgba(251,146,60,0.15)'  },
  d: { base: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
};

const OPTION_LABELS = { a: 'A', b: 'B', c: 'C', d: 'D' };

export default function QuizScreen({ questions, answerKey, subject, onFinish }) {
  const [idx, setIdx]           = useState(0);
  const [answers, setAnswers]   = useState({});
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [animKey, setAnimKey]   = useState(0);

  const total = questions.length;
  const q     = questions[idx];
  const progressValue = ((idx + (revealed ? 1 : 0)) / total) * 100;

  const choose = useCallback((opt) => {
    if (revealed) return;
    setSelected(opt);
    setRevealed(true);
    setAnswers((prev) => ({ ...prev, [q.num]: opt }));
  }, [revealed, q]);

  const next = useCallback(() => {
    if (idx < total - 1) {
      setIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
      setAnimKey((k) => k + 1);
    } else {
      onFinish({ ...answers, [q.num]: selected });
    }
  }, [idx, total, answers, q, selected, onFinish]);

  const getOptionState = (opt) => {
    if (!revealed) return 'idle';
    const correct = answerKey[q.num];
    if (opt === correct)                     return 'correct';
    if (opt === selected && opt !== correct) return 'wrong';
    return 'idle';
  };

  const correctOpt = revealed ? answerKey[q.num] : null;
  const isCorrect  = revealed && selected === correctOpt;
  const opts       = ['a', 'b', 'c', 'd'].filter((o) => q.options[o]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(13,15,20,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: 'calc(var(--safe-top) + 14px) 20px 14px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{subject}</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
            {idx + 1} / {total}
          </span>
        </div>
        <ProgressBar value={progressValue} />
      </header>

      {/* ── Body ── */}
      <main style={{
        flex: 1, padding: '24px 20px',
        maxWidth: 580, margin: '0 auto', width: '100%',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Question box */}
        <div
          key={`q-${animKey}`}
          className="fade-up"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r)',
            padding: '22px 20px',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <span style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 11,
              fontFamily: 'var(--mono)',
              fontWeight: 700,
              color: 'var(--accent)',
              flexShrink: 0,
            }}>
              Q{q.num}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
              {idx + 1} of {total}
            </span>
          </div>

          <h2 style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.6, letterSpacing: '-0.2px' }}>
            <MathText text={q.text} />
          </h2>
        </div>

        {/* Options */}
        <div key={`opts-${animKey}`} style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {opts.map((opt, i) => {
            const state      = getOptionState(opt);
            const colors     = OPTION_COLORS[opt];
            const isSelected = selected === opt;

            let borderColor = 'var(--border)';
            let bgColor     = 'var(--surface)';
            let labelBg     = colors.bg;
            let labelColor  = colors.base;

            if (state === 'correct') {
              borderColor = 'var(--success)';
              bgColor     = 'rgba(74,222,128,0.08)';
              labelBg     = 'var(--success)';
              labelColor  = '#000';
            } else if (state === 'wrong') {
              borderColor = 'var(--danger)';
              bgColor     = 'rgba(248,113,113,0.08)';
              labelBg     = 'var(--danger)';
              labelColor  = '#fff';
            } else if (isSelected) {
              borderColor = colors.base;
              bgColor     = colors.bg;
            }

            return (
              <button
                key={opt}
                onClick={() => choose(opt)}
                className={`fade-up-d${i}`}
                aria-label={`Option ${OPTION_LABELS[opt]}`}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: 'var(--r)',
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  color: 'var(--text)',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transition: 'all 0.2s',
                  cursor: revealed ? 'default' : 'pointer',
                  minHeight: 54,
                }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: 8,
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: labelBg,
                  color: labelColor,
                  fontFamily: 'var(--mono)',
                  fontSize: 13, fontWeight: 700,
                  transition: 'all 0.2s',
                }}>
                  {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : OPTION_LABELS[opt]}
                </span>

                <span style={{ flex: 1, fontSize: 15, lineHeight: 1.5 }}>
                  <MathText text={q.options[opt]} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback + Next */}
        {revealed && (
          <div className="fade-up" style={{ marginTop: 20 }}>
            <div style={{
              padding: '12px 18px',
              borderRadius: 'var(--r-sm)',
              background: isCorrect ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${isCorrect ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
              color: isCorrect ? 'var(--success)' : 'var(--danger)',
              fontSize: 14, fontWeight: 600,
              marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {isCorrect
                ? '🎉 Correct!'
                : (
                  <span>
                    ❌ Incorrect — correct answer is{' '}
                    <strong>{correctOpt?.toUpperCase()}</strong>
                    {q.options[correctOpt] && (
                      <span style={{ fontWeight: 400, marginLeft: 6 }}>
                        (<MathText text={q.options[correctOpt]} />)
                      </span>
                    )}
                  </span>
                )
              }
            </div>

            <button
              onClick={next}
              style={{
                width: '100%', padding: 16,
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                border: 'none', borderRadius: 'var(--r)',
                color: '#000', fontWeight: 700, fontSize: 16,
                marginBottom: 'calc(var(--safe-bottom) + 4px)',
              }}
            >
              {idx < total - 1 ? 'Next Question →' : 'See My Results 🎉'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
