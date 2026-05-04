import React, { useState } from 'react';
import { parseRawAnswerKey, answerKeyToRaw } from '../utils/parser';

export default function EditScreen({ data, onConfirm, onBack }) {
  const [questions, setQuestions] = useState(data.questions);
  const [answerKey, setAnswerKey] = useState(data.answerKey);
  const [rawKey, setRawKey]       = useState(() => answerKeyToRaw(data.answerKey));

  const updateQText  = (i, val) =>
    setQuestions((qs) => qs.map((q, j) => j === i ? { ...q, text: val } : q));

  const updateOption = (i, opt, val) =>
    setQuestions((qs) =>
      qs.map((q, j) =>
        j === i ? { ...q, options: { ...q.options, [opt]: val } } : q
      )
    );

  const handleKeyChange = (val) => {
    setRawKey(val);
    setAnswerKey(parseRawAnswerKey(val));
  };

  const addQuestion = () => {
    const nextNum = questions.length > 0 ? Math.max(...questions.map((q) => q.num)) + 1 : 1;
    setQuestions((qs) => [
      ...qs,
      { num: nextNum, text: 'New question text here', options: { a: '', b: '', c: '', d: '' } },
    ]);
  };

  const removeQuestion = (i) =>
    setQuestions((qs) => qs.filter((_, j) => j !== i));

  const missingAnswers = questions.filter((q) => !answerKey[q.num]).length;
  const optionColors = { a: '#818cf8', b: '#6ee7b7', c: '#fb923c', d: '#f472b6' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Sticky Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(13,15,20,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: 'calc(var(--safe-top) + 12px) 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            aria-label="Go back"
            style={{
              width: 38, height: 38, borderRadius: 99,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ←
          </button>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15, lineHeight: 1 }}>Review & Edit</p>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
              {questions.length} question{questions.length !== 1 ? 's' : ''} detected
            </p>
          </div>
        </div>

        <button
          onClick={() => onConfirm({ questions, answerKey })}
          style={{
            padding: '10px 22px',
            background: 'var(--accent)',
            border: 'none', borderRadius: 99,
            color: '#000', fontWeight: 700, fontSize: 14,
          }}
        >
          Start Quiz →
        </button>
      </header>

      {/* ── Body ── */}
      <main style={{ padding: '20px', maxWidth: 560, margin: '0 auto', width: '100%' }}>

        {/* Warning banner */}
        {missingAnswers > 0 && (
          <div style={{
            background: 'rgba(251,146,60,0.1)',
            border: '1px solid rgba(251,146,60,0.4)',
            borderRadius: 'var(--r-sm)',
            padding: '12px 16px',
            marginBottom: 18,
            fontSize: 14,
            color: 'var(--accent3)',
          }}>
            ⚠️ {missingAnswers} question{missingAnswers > 1 ? 's are' : ' is'} missing an answer. Fix in the key below.
          </div>
        )}

        {/* ── Answer Key ── */}
        <section style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          padding: 20,
          marginBottom: 22,
        }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent)', marginBottom: 4 }}>🔑 Answer Key</p>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12 }}>
            Format: <code style={{ fontFamily: 'var(--mono)' }}>1.a 2.b 3.c</code> — edit to fix any OCR mistakes
          </p>
          <textarea
            value={rawKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text)',
              padding: '10px 14px',
              fontSize: 14,
              fontFamily: 'var(--mono)',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.7,
            }}
          />

          {/* Parsed key pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {Object.entries(answerKey)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([n, a]) => (
                <span
                  key={n}
                  style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border2)',
                    borderRadius: 6,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontFamily: 'var(--mono)',
                    color: 'var(--accent)',
                  }}
                >
                  {n}:{a.toUpperCase()}
                </span>
              ))}
          </div>
        </section>

        {/* ── Questions ── */}
        {questions.map((q, i) => (
          <div
            key={`${q.num}-${i}`}
            className="fade-up"
            style={{
              background: 'var(--surface)',
              border: `1px solid ${answerKey[q.num] ? 'var(--border)' : 'rgba(251,146,60,0.3)'}`,
              borderRadius: 'var(--r)',
              padding: 20,
              marginBottom: 14,
            }}
          >
            {/* Question header */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
              <span style={{
                background: answerKey[q.num] ? 'rgba(110,231,183,0.12)' : 'rgba(251,146,60,0.12)',
                border: `1px solid ${answerKey[q.num] ? 'var(--accent)' : 'var(--accent3)'}`,
                borderRadius: 6,
                padding: '2px 9px',
                fontSize: 12,
                fontFamily: 'var(--mono)',
                color: answerKey[q.num] ? 'var(--accent)' : 'var(--accent3)',
                flexShrink: 0,
                marginTop: 2,
              }}>
                Q{q.num}
              </span>

              <textarea
                value={q.text}
                onChange={(e) => updateQText(i, e.target.value)}
                rows={2}
                aria-label={`Question ${q.num} text`}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 500,
                  resize: 'none',
                  outline: 'none',
                  padding: 0,
                  lineHeight: 1.6,
                  fontFamily: 'var(--font)',
                }}
              />

              <button
                onClick={() => removeQuestion(i)}
                aria-label={`Remove question ${q.num}`}
                style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  color: 'var(--danger)', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* Options grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['a', 'b', 'c', 'd'].map((opt) => {
                const isCorrect = answerKey[q.num] === opt;
                return (
                  <div
                    key={opt}
                    style={{
                      display: 'flex', gap: 8, alignItems: 'center',
                      background: 'var(--surface2)',
                      borderRadius: 'var(--r-sm)',
                      padding: '9px 12px',
                      border: `1px solid ${isCorrect ? optionColors[opt] + '80' : 'var(--border)'}`,
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <span style={{
                      fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700,
                      color: isCorrect ? optionColors[opt] : 'var(--muted)',
                      flexShrink: 0, width: 14, textAlign: 'center',
                      transition: 'color 0.2s',
                    }}>
                      {opt.toUpperCase()}
                    </span>
                    <input
                      value={q.options[opt] || ''}
                      onChange={(e) => updateOption(i, opt, e.target.value)}
                      placeholder={`Option ${opt.toUpperCase()}`}
                      aria-label={`Question ${q.num} option ${opt.toUpperCase()}`}
                      style={{
                        flex: 1, background: 'transparent', border: 'none',
                        color: 'var(--text)', fontSize: 13, outline: 'none',
                        minWidth: 0, fontFamily: 'var(--font)',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {questions.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 20px',
            color: 'var(--muted)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🤔</div>
            <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
              No questions detected
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>
              OCR may have struggled with the image. Try a clearer photo,<br />
              or add questions manually using the button below.
            </p>
          </div>
        )}

        {/* Add question */}
        <button
          onClick={addQuestion}
          style={{
            width: '100%', padding: 14,
            background: 'transparent',
            border: '1px dashed var(--border2)',
            borderRadius: 'var(--r-sm)',
            color: 'var(--muted)', fontSize: 14,
            marginTop: 4, marginBottom: 16,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          + Add Question Manually
        </button>

        {/* Confirm CTA */}
        <button
          onClick={() => onConfirm({ questions, answerKey })}
          style={{
            width: '100%', padding: 17,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            border: 'none', borderRadius: 'var(--r)',
            color: '#000', fontWeight: 700, fontSize: 16,
            marginBottom: 'calc(var(--safe-bottom) + 20px)',
          }}
        >
          Begin Quiz →
        </button>
      </main>
    </div>
  );
}
