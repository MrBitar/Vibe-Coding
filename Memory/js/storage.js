/* =========================================================
   storage.js — local persistence (high scores + preferences)
   Concern: reading/writing localStorage only. No game logic,
   no DOM manipulation.
   ========================================================= */

const Storage = (() => {
  const SCORES_KEY = "precinctPairs.highScores.v1";
  const SOUND_KEY = "precinctPairs.soundOn.v1";
  const MAX_ENTRIES = 5;
  const DIFFICULTIES = ["easy", "medium", "hard"];

  function emptyScores() {
    return { easy: [], medium: [], hard: [] };
  }

  function getAllScores() {
    try {
      const raw = localStorage.getItem(SCORES_KEY);
      if (!raw) return emptyScores();
      const parsed = JSON.parse(raw);
      const result = emptyScores();
      DIFFICULTIES.forEach((d) => {
        if (Array.isArray(parsed[d])) result[d] = parsed[d];
      });
      return result;
    } catch (err) {
      console.warn("Precinct Pairs: could not read high scores, resetting.", err);
      return emptyScores();
    }
  }

  function getScores(difficulty) {
    return getAllScores()[difficulty] || [];
  }

  function saveAllScores(scores) {
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  }

  // Lower moves wins; time is the tiebreaker.
  function compare(a, b) {
    if (a.moves !== b.moves) return a.moves - b.moves;
    return a.time - b.time;
  }

  function qualifies(difficulty, moves, time) {
    const list = getScores(difficulty);
    if (list.length < MAX_ENTRIES) return true;
    const worst = list.slice().sort(compare)[list.length - 1];
    return compare({ moves, time }, worst) < 0;
  }

  function addScore(difficulty, entry) {
    const all = getAllScores();
    const list = all[difficulty] || [];
    list.push(entry);
    list.sort(compare);
    all[difficulty] = list.slice(0, MAX_ENTRIES);
    saveAllScores(all);
    return all[difficulty];
  }

  function getSoundOn() {
    const raw = localStorage.getItem(SOUND_KEY);
    return raw === null ? true : raw === "true";
  }

  function setSoundOn(on) {
    localStorage.setItem(SOUND_KEY, String(on));
  }

  return {
    getScores,
    addScore,
    qualifies,
    getSoundOn,
    setSoundOn,
    MAX_ENTRIES,
  };
})();
