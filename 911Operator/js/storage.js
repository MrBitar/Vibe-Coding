/* ============================================================
   storage.js — local persistence (localStorage leaderboard)
   ============================================================ */

const Storage911 = (() => {
  const KEY = 'ceds_highscores_v1';
  const MAX_ENTRIES = 10;

  function loadScores() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      return [];
    }
  }

  function saveScore(entry) {
    const scores = loadScores();
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    const trimmed = scores.slice(0, MAX_ENTRIES);
    try {
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch (e) {
      /* storage unavailable — ignore, run still shows in-session results */
    }
    return trimmed;
  }

  function clearScores() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) { /* ignore */ }
  }

  return { loadScores, saveScore, clearScores };
})();
