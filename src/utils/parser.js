/**
 * parser.js — converts raw OCR text into structured quiz data.
 * Handles two separate text sources: question sheet + answer key sheet.
 *
 * Key fixes vs original:
 *  - Option regex no longer requires a space after the delimiter (a. b) a) A.)
 *  - All question text and option text are passed through normalizeMath()
 *    so fractions (1/2), square roots, powers etc. display properly.
 */

import { normalizeMath } from './mathNormalize';

/**
 * @typedef {{ num: number, text: string, options: Record<string,string> }} Question
 */

export function parseQuestions(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const questions = [];
  let currentQ = null;

  for (const line of lines) {
    // ── Question line: starts with a number ──────────────────────────────────
    // Space after delimiter is OPTIONAL — OCR sometimes omits it.
    const qMatch = line.match(/^(\d{1,3})\s*[.):\-–]\s*(.+)/);
    if (qMatch) {
      const num  = parseInt(qMatch[1], 10);
      const text = qMatch[2].trim();
      // If text starts with an option label, it's not a question heading
      if (/^[a-dA-D]\s*[.)]\s*/i.test(text)) {
        // fall through to option parse below
      } else {
        currentQ = { num, text: normalizeMath(text), options: {} };
        questions.push(currentQ);
        continue;
      }
    }

    // ── Option line: a/b/c/d with any delimiter (space optional after it) ────
    const optMatch = line.match(/^([a-dA-D])\s*[.):\-–]\s*(.+)/i);
    if (optMatch && currentQ) {
      const key = optMatch[1].toLowerCase();
      const val = optMatch[2].trim();
      currentQ.options[key] = normalizeMath(val);
      continue;
    }

    // ── Option without any delimiter: "A Some text" ──────────────────────────
    // OCR artefact — letter then space then 3+ chars
    const optNoDel = line.match(/^([a-dA-D])\s+(.{3,})/i);
    if (optNoDel && currentQ && Object.keys(currentQ.options).length < 4) {
      const key = optNoDel[1].toLowerCase();
      if (!currentQ.options[key]) {
        currentQ.options[key] = normalizeMath(optNoDel[2].trim());
        continue;
      }
    }

    // ── Continuation of question text (before any options appear) ────────────
    if (currentQ && Object.keys(currentQ.options).length === 0) {
      currentQ.text += ' ' + normalizeMath(line);
    }
  }

  // Fallback: questions with no options get placeholders
  for (const q of questions) {
    if (Object.keys(q.options).length === 0) {
      q.options = { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' };
    }
  }

  return questions;
}

export function parseAnswerKey(raw) {
  const key = {};

  const cleaned = raw
    .replace(/[|│┃\[\](){}]/g, ' ')
    .replace(/●|■|□|○|◉|◯/g, ' ')
    .replace(/\s+/g, ' ');

  const pattern = /\b(\d{1,3})\s*[.):\-–]?\s*([a-dA-D])\b/g;
  let m;
  while ((m = pattern.exec(cleaned)) !== null) {
    const num = parseInt(m[1], 10);
    const letter = m[2].toLowerCase();
    if (num >= 1 && num <= 200 && !key[num]) {
      key[num] = letter;
    }
  }

  return key;
}

export function mergeQuizData(questions, answerKey) {
  return { questions, answerKey };
}

export function parseOCRText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  const answerKeyIdx = lines.findIndex(l =>
    /^\s*(answer\s*key|answers?|key)\s*[:\-]?\s*$/i.test(l) ||
    /answer\s*key/i.test(l)
  );

  const questionLines = answerKeyIdx >= 0 ? lines.slice(0, answerKeyIdx) : lines;
  const keyLines      = answerKeyIdx >= 0 ? lines.slice(answerKeyIdx)    : [];

  const answerKey = parseAnswerKey(keyLines.join('\n'));
  const questions = parseQuestions(questionLines.join('\n'));

  return { questions, answerKey };
}

export function parseRawAnswerKey(raw) {
  return parseAnswerKey(raw);
}

export function answerKeyToRaw(answerKey) {
  return Object.entries(answerKey)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([n, v]) => `${n}.${v}`)
    .join('  ');
}
