/**
 * parseOCRText
 * ─────────────────────────────────────────────────────────────────────────────
 * Parses raw OCR output into structured question objects and an answer key map.
 *
 * Supported formats
 * ─────────────────
 * Questions:
 *   1. What is ...        1) What is ...
 *   A. Option text        a) Option text     A: Option text
 *
 * Answer key block (detected by heading keywords):
 *   Answer Key:           Answers:           Key:
 *   1.a  2.b  3.c ...     1) A  2) B         1 - a
 *
 * Inline fallback (no heading detected):
 *   Scans every line for patterns like "3.c" or "3) c".
 *
 * @param {string} raw - Raw text (typed or pasted by the user).
 * @returns {{ questions: Question[], answerKey: AnswerKey }}
 *
 * @typedef {{ num: number, text: string, options: Record<string, string> }} Question
 * @typedef {Record<number, string>} AnswerKey  — e.g. { 1: 'b', 2: 'a' }
 */
export function parseOCRText(raw) {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // ── Locate the answer-key block ──────────────────────────────────────────
  const answerKeyIdx = lines.findIndex((l) =>
    /^\s*(answer\s*key|answers?|key)\s*[:-]?\s*$/i.test(l) ||
    /answer\s*key/i.test(l)
  );

  const questionLines = answerKeyIdx >= 0 ? lines.slice(0, answerKeyIdx) : lines;
  const keyLines      = answerKeyIdx >= 0 ? lines.slice(answerKeyIdx)    : lines;

  // ── Parse answer key ─────────────────────────────────────────────────────
  const answerKey = {};

  for (const line of keyLines) {
    // Pattern: "1.a"  "1)a"  "1: a"  "1 - a"  "1 a" (when isolated)
    const matches = [
      ...line.matchAll(/(\d{1,3})\s*[.):–-]\s*([a-dA-D])\b/g),
      ...line.matchAll(/\b(\d{1,3})\s+([a-dA-D])\b/g),
    ];
    for (const m of matches) {
      const num = parseInt(m[1], 10);
      if (!answerKey[num]) answerKey[num] = m[2].toLowerCase();
    }
  }

  // ── Parse questions ───────────────────────────────────────────────────────
  const questions = [];
  let currentQ = null;

  for (const line of questionLines) {
    // Question number line: "1." / "1)" / "1:" followed by text
    const qMatch = line.match(/^(\d{1,3})\s*[.):–-]\s+(.+)/);
    if (qMatch) {
      const num  = parseInt(qMatch[1], 10);
      const text = qMatch[2].trim();

      // Could be an option masquerading as a numbered item? e.g. "1. A"
      const looksLikeOption = /^[a-dA-D]\s*[.)]\s*/i.test(text);

      if (!looksLikeOption) {
        currentQ = { num, text, options: {} };
        questions.push(currentQ);
        continue;
      }
    }

    // Option line: "A." / "a)" / "A:" followed by text
    const optMatch = line.match(/^([a-dA-D])\s*[.):–-]\s+(.+)/i);
    if (optMatch && currentQ) {
      const key = optMatch[1].toLowerCase();
      currentQ.options[key] = optMatch[2].trim();
      continue;
    }

    // Continuation of last question text (no leading number or option marker)
    if (currentQ && Object.keys(currentQ.options).length === 0) {
      currentQ.text += ' ' + line;
    }
  }

  // ── Fill missing options with placeholders ────────────────────────────────
  for (const q of questions) {
    const hasOptions = Object.keys(q.options).length > 0;
    if (!hasOptions) {
      q.options = {
        a: 'Option A',
        b: 'Option B',
        c: 'Option C',
        d: 'Option D',
      };
    }
  }

  return { questions, answerKey };
}

/**
 * parseRawAnswerKey
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight parser used in the Edit screen's answer-key textarea.
 * Accepts any mix of: "1.a 2.b" / "1) A" / "1: b" / "1 - a"
 *
 * @param {string} raw
 * @returns {AnswerKey}
 */
export function parseRawAnswerKey(raw) {
  const key = {};
  const matches = [
    ...raw.matchAll(/(\d{1,3})\s*[.):–-]\s*([a-dA-D])\b/gi),
    ...raw.matchAll(/\b(\d{1,3})\s+([a-dA-D])\b/gi),
  ];
  for (const m of matches) {
    const num = parseInt(m[1], 10);
    if (!key[num]) key[num] = m[2].toLowerCase();
  }
  return key;
}

/**
 * answerKeyToRaw
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts an AnswerKey map back to a human-readable string for the textarea.
 *
 * @param {AnswerKey} answerKey
 * @returns {string}  e.g. "1.a  2.b  3.c"
 */
export function answerKeyToRaw(answerKey) {
  return Object.entries(answerKey)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([n, v]) => `${n}.${v}`)
    .join('  ');
}
