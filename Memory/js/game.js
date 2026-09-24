/* =========================================================
   game.js — rendering + game logic
   Concern: DOM rendering and game state/rules. Delegates
   persistence to Storage and sound to Audio2.
   ========================================================= */

(() => {
  "use strict";

  // ---- Theme content: police-inspired icon set (18 max, hard mode uses all) ----
  const ICONS = [
    "👮", "🚓", "🚨", "🛡️", "🔍", "📻", "⛓️", "🐕‍🦺", "🔦", "🚧", "⚖️", "🗝️",
    "🚔", "🕵️", "📋", "🔒", "🚦", "🧤",
  ];

  const DIFFICULTY = {
    easy: { size: 2, label: "Easy" },
    medium: { size: 4, label: "Medium" },
    hard: { size: 6, label: "Hard" },
  };

  const BADGE_SVG = `
    <svg viewBox="0 0 200 200">
      <polygon points="100,6 122,40 163,34 158,76 195,95 158,114 163,156 122,150 100,184 78,150 37,156 42,114 5,95 42,76 37,34 78,40"/>
      <circle cx="100" cy="95" r="52" class="badge-inner"/>
      <text x="100" y="112" class="badge-star" text-anchor="middle">&#9733;</text>
    </svg>`;

  // ---- DOM refs ----
  const screens = {
    menu: document.getElementById("screen-menu"),
    game: document.getElementById("screen-game"),
    scores: document.getElementById("screen-scores"),
  };
  const diffButtons = Array.from(document.querySelectorAll(".diff-btn"));
  const btnPlay = document.getElementById("btn-play");
  const btnScores = document.getElementById("btn-scores");
  const btnScoresBack = document.getElementById("btn-scores-back");
  const btnSound = document.getElementById("btn-sound");
  const btnBack = document.getElementById("btn-back");
  const btnRestart = document.getElementById("btn-restart");
  const miniLeaderboard = document.getElementById("mini-leaderboard");

  const board = document.getElementById("board");
  const hudDiff = document.getElementById("hud-diff");
  const hudMoves = document.getElementById("hud-moves");
  const hudTime = document.getElementById("hud-time");
  const hudPairsFound = document.getElementById("hud-pairs-found");
  const hudPairsTotal = document.getElementById("hud-pairs-total");

  const scoreTabs = Array.from(document.querySelectorAll(".score-tab"));
  const scorePanels = document.getElementById("score-panels");

  const overlayWin = document.getElementById("overlay-win");
  const winMoves = document.getElementById("win-moves");
  const winTime = document.getElementById("win-time");
  const winNewscore = document.getElementById("win-newscore");
  const winNameInput = document.getElementById("win-name");
  const btnSaveScore = document.getElementById("btn-save-score");
  const btnPlayAgain = document.getElementById("btn-play-again");
  const btnWinMenu = document.getElementById("btn-win-menu");

  // ---- State ----
  let selectedDifficulty = null;
  let state = null; // active game state, see resetGame()

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => el.classList.toggle("active", key === name));
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function computeLayout(size) {
    const total = size * size;
    const hasCenter = size % 2 === 1;
    const centerIndex = hasCenter ? Math.floor(total / 2) : -1;
    const playable = hasCenter ? total - 1 : total;
    const pairs = playable / 2;
    return { total, hasCenter, centerIndex, pairs };
  }

  // ---- Menu: difficulty selection ----
  diffButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      Audio2.click();
      selectedDifficulty = btn.dataset.diff;
      diffButtons.forEach((b) => {
        const isSel = b === btn;
        b.classList.toggle("selected", isSel);
        b.setAttribute("aria-checked", String(isSel));
      });
      btnPlay.disabled = false;
    });
  });

  btnPlay.addEventListener("click", () => {
    if (!selectedDifficulty) return;
    Audio2.click();
    startGame(selectedDifficulty);
  });

  btnScores.addEventListener("click", () => {
    Audio2.click();
    renderScoresScreen(scoreTabs.find((t) => t.classList.contains("active")).dataset.tab);
    showScreen("scores");
  });

  btnScoresBack.addEventListener("click", () => {
    Audio2.click();
    showScreen("menu");
  });

  scoreTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      Audio2.click();
      renderScoresScreen(tab.dataset.tab);
    });
  });

  btnSound.addEventListener("click", () => {
    const next = !Audio2.isSoundOn();
    Audio2.setSoundOn(next);
    btnSound.textContent = next ? "🔊" : "🔇";
    btnSound.setAttribute("aria-pressed", String(!next));
    if (next) Audio2.click();
  });

  btnBack.addEventListener("click", () => {
    Audio2.click();
    endGameLoop();
    showScreen("menu");
    renderMiniLeaderboard();
  });

  btnRestart.addEventListener("click", () => {
    Audio2.click();
    startGame(state.difficulty);
  });

  btnPlayAgain.addEventListener("click", () => {
    Audio2.click();
    hideWinOverlay();
    startGame(state.difficulty);
  });

  btnWinMenu.addEventListener("click", () => {
    Audio2.click();
    hideWinOverlay();
    showScreen("menu");
    renderMiniLeaderboard();
  });

  btnSaveScore.addEventListener("click", saveHighScore);
  winNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveHighScore();
  });

  // ---- Init sound button state ----
  (function initSound() {
    const on = Audio2.isSoundOn();
    btnSound.textContent = on ? "🔊" : "🔇";
    btnSound.setAttribute("aria-pressed", String(!on));
  })();

  // ---- Game lifecycle ----
  function startGame(difficulty) {
    endGameLoop();

    const size = DIFFICULTY[difficulty].size;
    const layout = computeLayout(size);
    const icons = ICONS.slice(0, layout.pairs);
    const deck = shuffle(icons.flatMap((icon, i) => [{ icon, id: i }, { icon, id: i }]));

    state = {
      difficulty,
      size,
      layout,
      moves: 0,
      pairsFound: 0,
      locked: false,
      firstCard: null,
      secondCard: null,
      startTime: null,
      timerId: null,
      elapsed: 0,
      over: false,
      timeouts: [],
    };

    hudDiff.textContent = DIFFICULTY[difficulty].label;
    hudMoves.textContent = "0";
    hudTime.textContent = "00:00";
    hudPairsFound.textContent = "0";
    hudPairsTotal.textContent = String(layout.pairs);

    renderBoard(deck);
    showScreen("game");
  }

  function endGameLoop() {
    if (state && state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    if (state) {
      state.timeouts.forEach(clearTimeout);
      state.timeouts = [];
    }
  }

  function startTimerIfNeeded() {
    if (state.startTime) return;
    state.startTime = Date.now();
    state.timerId = setInterval(() => {
      state.elapsed = (Date.now() - state.startTime) / 1000;
      hudTime.textContent = formatTime(state.elapsed);
    }, 250);
  }

  function renderBoard(deck) {
    board.innerHTML = "";
    const { total, hasCenter, centerIndex } = state.layout;
    board.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;

    let deckPos = 0;
    for (let i = 0; i < total; i++) {
      if (hasCenter && i === centerIndex) {
        board.appendChild(buildDecorativeTile());
        continue;
      }
      const { icon, id } = deck[deckPos++];
      board.appendChild(buildCard(icon, id));
    }
  }

  function buildDecorativeTile() {
    const el = document.createElement("div");
    el.className = "card decorative";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<div class="card-inner"><div class="card-face">${BADGE_SVG}</div></div>`;
    return el;
  }

  function buildCard(icon, pairId) {
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.pairId = String(pairId);
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Face-down case file card");

    el.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back">${BADGE_SVG}</div>
        <div class="card-face card-front">${icon}</div>
      </div>`;

    el.addEventListener("click", () => onCardClick(el));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onCardClick(el);
      }
    });
    return el;
  }

  function onCardClick(card) {
    if (state.over || state.locked) return;
    if (card.classList.contains("matched") || card.classList.contains("flipped")) return;
    if (card === state.firstCard) return;

    startTimerIfNeeded();
    flipUp(card);
    Audio2.flip();

    if (!state.firstCard) {
      state.firstCard = card;
      return;
    }

    state.secondCard = card;
    state.moves++;
    hudMoves.textContent = String(state.moves);
    state.locked = true;

    const isMatch = state.firstCard.dataset.pairId === state.secondCard.dataset.pairId;
    const first = state.firstCard;
    const second = state.secondCard;

    if (isMatch) {
      queueTimeout(() => {
        first.classList.add("matched");
        second.classList.add("matched");
        first.setAttribute("aria-label", "Matched case file card");
        second.setAttribute("aria-label", "Matched case file card");
        Audio2.match();
        state.pairsFound++;
        hudPairsFound.textContent = String(state.pairsFound);
        state.locked = false;
        state.firstCard = null;
        state.secondCard = null;
        if (state.pairsFound === state.layout.pairs) {
          winGame();
        }
      }, 350);
    } else {
      queueTimeout(() => {
        Audio2.mismatch();
        first.classList.add("mismatch");
        second.classList.add("mismatch");
      }, 550);
      queueTimeout(() => {
        first.classList.remove("flipped", "mismatch");
        second.classList.remove("flipped", "mismatch");
        first.setAttribute("aria-label", "Face-down case file card");
        second.setAttribute("aria-label", "Face-down case file card");
        state.locked = false;
        state.firstCard = null;
        state.secondCard = null;
      }, 550 + 700);
    }
  }

  function flipUp(card) {
    card.classList.add("flipped");
    card.setAttribute("aria-label", "Face-up case file card");
  }

  function queueTimeout(fn, delay) {
    const id = setTimeout(fn, delay);
    state.timeouts.push(id);
    return id;
  }

  function winGame() {
    state.over = true;
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    const finalTime = state.elapsed;
    Audio2.win();

    winMoves.textContent = String(state.moves);
    winTime.textContent = formatTime(finalTime);

    const qualifies = Storage.qualifies(state.difficulty, state.moves, finalTime);
    winNewscore.classList.toggle("hidden", !qualifies);
    winNameInput.value = "";

    queueTimeout(() => {
      overlayWin.classList.add("active");
      if (qualifies) winNameInput.focus();
    }, 300);
  }

  function saveHighScore() {
    const name = (winNameInput.value || "Officer").trim().slice(0, 16) || "Officer";
    Storage.addScore(state.difficulty, {
      name,
      moves: state.moves,
      time: state.elapsed,
      date: new Date().toISOString(),
    });
    winNewscore.classList.add("hidden");
    btnSaveScore.disabled = true;
    btnSaveScore.textContent = "Saved ✓";
  }

  function hideWinOverlay() {
    overlayWin.classList.remove("active");
    btnSaveScore.disabled = false;
    btnSaveScore.textContent = "Save";
  }

  // ---- High score rendering ----
  function medal(rank) {
    return rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "";
  }

  function renderScoresScreen(activeTab) {
    scoreTabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === activeTab));

    scorePanels.innerHTML = "";
    Object.keys(DIFFICULTY).forEach((diff) => {
      const panel = document.createElement("div");
      panel.className = "score-panel" + (diff === activeTab ? " active" : "");
      panel.dataset.panel = diff;

      const list = Storage.getScores(diff);
      if (!list.length) {
        panel.innerHTML = `<div class="score-empty">No scores yet — be the first to close a case on ${DIFFICULTY[diff].label}!</div>`;
      } else {
        const rows = list
          .map(
            (entry, i) => `
              <tr>
                <td>${medal(i)}${i + 1}</td>
                <td>${escapeHtml(entry.name)}</td>
                <td>${entry.moves}</td>
                <td>${formatTime(entry.time)}</td>
              </tr>`
          )
          .join("");
        panel.innerHTML = `
          <table class="score-table">
            <thead><tr><th>#</th><th>Officer</th><th>Moves</th><th>Time</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`;
      }
      scorePanels.appendChild(panel);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderMiniLeaderboard() {
    const parts = Object.keys(DIFFICULTY).map((diff) => {
      const best = Storage.getScores(diff)[0];
      if (!best) return `${DIFFICULTY[diff].label}: —`;
      return `${DIFFICULTY[diff].label}: <b>${best.moves} moves</b> · ${formatTime(best.time)}`;
    });
    miniLeaderboard.innerHTML = parts.join(" &nbsp;|&nbsp; ");
  }

  // ---- Boot ----
  renderMiniLeaderboard();
  renderScoresScreen("easy");
  showScreen("menu");
})();
