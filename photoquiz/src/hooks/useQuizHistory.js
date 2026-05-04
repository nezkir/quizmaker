import { useState, useCallback } from 'react';
import { loadHistory, addSession, clearHistory, computeStats } from '../utils/storage';

/**
 * useQuizHistory
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom hook that manages quiz history with localStorage persistence.
 *
 * Returns:
 *   history   — array of QuizSession objects (oldest first)
 *   stats     — aggregate stats object
 *   saveSession(sessionData) — appends a new session
 *   resetHistory()           — clears all history
 */
export function useQuizHistory() {
  const [history, setHistory] = useState(() => loadHistory());

  const saveSession = useCallback((sessionData) => {
    setHistory((prev) => addSession(prev, sessionData));
  }, []);

  const resetHistory = useCallback(() => {
    setHistory(clearHistory());
  }, []);

  const stats = computeStats(history);

  return { history, stats, saveSession, resetHistory };
}
