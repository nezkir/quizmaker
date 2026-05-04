const STORAGE_KEY = 'photoquiz_history_v1';

/**
 * @typedef {{
 *   id: string,
 *   date: string,       // ISO date string
 *   subject: string,
 *   correct: number,
 *   total: number,
 *   pct: number,
 *   missedNums: number[] // question numbers answered incorrectly
 * }} QuizSession
 */

/**
 * Loads all saved quiz sessions from localStorage.
 * @returns {QuizSession[]}
 */
export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Appends a new session and persists to localStorage.
 * @param {QuizSession[]} history - Current history array.
 * @param {Omit<QuizSession, 'id'>} session - New session to append.
 * @returns {QuizSession[]} Updated history.
 */
export function addSession(history, session) {
  const newSession = {
    ...session,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  const updated = [...history, newSession];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage full or unavailable — still return in-memory update
  }
  return updated;
}

/**
 * Clears all history from localStorage.
 * @returns {QuizSession[]} Empty array.
 */
export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return [];
}

/**
 * Calculates aggregate statistics from a history array.
 * @param {QuizSession[]} history
 */
export function computeStats(history) {
  if (history.length === 0) {
    return { count: 0, avgPct: 0, bestPct: 0, totalQuestions: 0, totalCorrect: 0 };
  }
  const count          = history.length;
  const avgPct         = Math.round(history.reduce((s, h) => s + h.pct, 0) / count);
  const bestPct        = Math.max(...history.map((h) => h.pct));
  const totalQuestions = history.reduce((s, h) => s + h.total, 0);
  const totalCorrect   = history.reduce((s, h) => s + h.correct, 0);
  return { count, avgPct, bestPct, totalQuestions, totalCorrect };
}
