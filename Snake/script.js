(() => {
  "use strict";

  // ---------- Grid / canvas setup ----------
  const COLS = 21;
  const ROWS = 12;
  const CELL = 24;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const highscoreEl = document.getElementById("highscore");
  const overlayEl = document.getElementById("overlay");
  const overlayContentEl = document.getElementById("overlay-content");
  const muteBtn = document.getElementById("mute-btn");

  const COLORS = {
    bg: "#c7d4a3",
    grid: "#bdcb94",
    snake: "#2f3a1c",
    snakeHead: "#232b14",
    food: "#2f3a1c",
  };

  const BASE_INTERVAL = 150; // ms per tick at start
  const MIN_INTERVAL = 70;
  const SPEEDUP_PER_FOOD = 3;

  const HIGHSCORE_KEY = "nokia-snake-highscores";
  const MUTE_KEY = "nokia-snake-muted";
  const MAX_SCORES = 5;

  // ---------- Persistence ----------
  function loadHighScores() {
    try {
      const raw = localStorage.getItem(HIGHSCORE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return [];
      return list.filter((n) => Number.isFinite(n)).slice(0, MAX_SCORES);
    } catch (e) {
      return [];
    }
  }

  function saveHighScores(list) {
    try {
      localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(list));
    } catch (e) {
      /* storage unavailable (private mode, quota, etc.) - fail silently */
    }
  }

  function addHighScore(score) {
    const list = loadHighScores();
    list.push(score);
    list.sort((a, b) => b - a);
    const trimmed = list.slice(0, MAX_SCORES);
    saveHighScores(trimmed);
    return {
      list: trimmed,
      isNewBest: trimmed[0] === score && score > 0,
      rank: trimmed.indexOf(score),
    };
  }

  function topScore() {
    const list = loadHighScores();
    return list.length ? list[0] : 0;
  }

  function loadMuted() {
    return localStorage.getItem(MUTE_KEY) === "1";
  }

  function saveMuted(muted) {
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
  }

  // ---------- Sound (classic Nokia-style beeps) ----------
  let audioCtx = null;
  let muted = loadMuted();

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function beep(freq, duration, delay = 0, type = "square", volume = 0.05) {
    if (muted || !audioCtx) return;
    const t0 = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  const sfx = {
    eat: () => beep(880, 0.08),
    start: () => {
      beep(523, 0.08, 0);
      beep(659, 0.08, 0.09);
      beep(784, 0.1, 0.18);
    },
    gameOver: () => {
      beep(392, 0.12, 0);
      beep(330, 0.12, 0.12);
      beep(262, 0.18, 0.24);
    },
  };

  function updateMuteButton() {
    muteBtn.textContent = muted ? "SOUND: OFF" : "SOUND: ON";
  }
  updateMuteButton();

  muteBtn.addEventListener("click", () => {
    muted = !muted;
    saveMuted(muted);
    updateMuteButton();
    ensureAudio();
  });

  // ---------- Game state ----------
  let snake, direction, nextDirection, food, score, tickInterval;
  let accumulator = 0;
  let lastTime = 0;
  let mode = "start"; // "start" | "playing" | "paused" | "gameover"
  let rafId = null;

  function resetState() {
    const startX = Math.floor(COLS / 2);
    const startY = Math.floor(ROWS / 2);
    snake = [
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
      { x: startX - 3, y: startY },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    tickInterval = BASE_INTERVAL;
    accumulator = 0;
    food = placeFood();
  }

  function placeFood() {
    const occupied = new Set(snake ? snake.map((s) => `${s.x},${s.y}`) : []);
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (occupied.has(`${pos.x},${pos.y}`));
    return pos;
  }

  function setDirection(dx, dy) {
    // ignore reversals into the snake's own neck
    if (direction.x === -dx && direction.y === -dy) return;
    nextDirection = { x: dx, y: dy };
  }

  // ---------- Update ----------
  function tick() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    const hitWall = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
    const hitSelf = snake.some((seg) => seg.x === head.x && seg.y === head.y);

    if (hitWall || hitSelf) {
      endGame();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 1;
      tickInterval = Math.max(MIN_INTERVAL, BASE_INTERVAL - score * SPEEDUP_PER_FOOD);
      food = placeFood();
      sfx.eat();
    } else {
      snake.pop();
    }

    scoreEl.textContent = "SCORE " + pad(score);
  }

  function pad(n) {
    return String(n).padStart(3, "0");
  }

  // ---------- Draw ----------
  function draw() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // faint grid dots for that LCD-matrix feel
    ctx.fillStyle = COLORS.grid;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);
      }
    }

    // food (blinking)
    if (Math.floor(performance.now() / 250) % 2 === 0 || mode !== "playing") {
      ctx.fillStyle = COLORS.food;
      const pad2 = 5;
      ctx.fillRect(food.x * CELL + pad2, food.y * CELL + pad2, CELL - pad2 * 2, CELL - pad2 * 2);
    }

    // snake
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? COLORS.snakeHead : COLORS.snake;
      const gap = 2;
      ctx.fillRect(seg.x * CELL + gap, seg.y * CELL + gap, CELL - gap * 2, CELL - gap * 2);
    });
  }

  // ---------- Loop ----------
  function loop(timestamp) {
    if (mode !== "playing") return;
    if (!lastTime) lastTime = timestamp;
    const delta = timestamp - lastTime;
    lastTime = timestamp;
    accumulator += delta;

    while (accumulator >= tickInterval) {
      tick();
      accumulator -= tickInterval;
      if (mode !== "playing") break;
    }

    draw();
    rafId = requestAnimationFrame(loop);
  }

  // ---------- Flow control ----------
  function startGame() {
    ensureAudio();
    resetState();
    mode = "playing";
    lastTime = 0;
    hideOverlay();
    highscoreEl.textContent = "HI " + pad(topScore());
    scoreEl.textContent = "SCORE " + pad(0);
    sfx.start();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function endGame() {
    mode = "gameover";
    cancelAnimationFrame(rafId);
    sfx.gameOver();
    const result =
      score > 0
        ? addHighScore(score)
        : { list: loadHighScores(), isNewBest: false, rank: -1 };
    highscoreEl.textContent = "HI " + pad(topScore());
    showGameOverOverlay(result);
  }

  function togglePause() {
    if (mode === "playing") {
      mode = "paused";
      cancelAnimationFrame(rafId);
      showPauseOverlay();
    } else if (mode === "paused") {
      mode = "playing";
      lastTime = 0;
      hideOverlay();
      rafId = requestAnimationFrame(loop);
    }
  }

  // ---------- Overlays ----------
  function hideOverlay() {
    overlayEl.classList.remove("visible");
  }

  function showOverlay(html) {
    overlayContentEl.innerHTML = html;
    overlayEl.classList.add("visible");
  }

  function renderScoreboard(list, highlightIndex) {
    if (!list.length) {
      return '<p style="opacity:.7">no scores yet</p>';
    }
    const items = list
      .map((s, i) => {
        const rank = i + 1;
        const cls = i === highlightIndex ? "new-score" : "";
        return `<li class="${cls}"><span>${rank}.</span><span>${pad(s)}</span></li>`;
      })
      .join("");
    return `<ol class="scoreboard">${items}</ol>`;
  }

  function showStartOverlay() {
    const list = loadHighScores();
    showOverlay(`
      <h1>SNAKE</h1>
      <p>Arrow keys / WASD to move.<br>Eat the squares. Don't hit the walls<br>or yourself.</p>
      ${renderScoreboard(list, -1)}
      <p class="hint">PRESS ANY KEY OR TAP ▲ TO START</p>
    `);
  }

  function showPauseOverlay() {
    showOverlay(`
      <h1>PAUSED</h1>
      <p class="hint">PRESS II OR SPACE TO RESUME</p>
    `);
  }

  function showGameOverOverlay(result) {
    showOverlay(`
      <h1>GAME OVER</h1>
      <p>SCORE: ${pad(score)}${result.isNewBest ? " — NEW BEST!" : ""}</p>
      ${renderScoreboard(result.list, result.rank)}
      <p class="hint">PRESS ANY KEY OR TAP ▲ TO RETRY</p>
    `);
  }

  // ---------- Input ----------
  const KEY_DIRS = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    w: [0, -1],
    s: [0, 1],
    a: [-1, 0],
    d: [1, 0],
    W: [0, -1],
    S: [0, 1],
    A: [-1, 0],
    D: [1, 0],
  };

  function handleActivation() {
    if (mode === "start" || mode === "gameover") {
      startGame();
    }
  }

  window.addEventListener("keydown", (e) => {
    if (mode === "start" || mode === "gameover") {
      if (e.key === " " || e.key === "Enter" || KEY_DIRS[e.key]) {
        e.preventDefault();
        handleActivation();
      }
      return;
    }

    if (e.key === " " || e.key === "p" || e.key === "P") {
      e.preventDefault();
      togglePause();
      return;
    }

    const dir = KEY_DIRS[e.key];
    if (dir) {
      e.preventDefault();
      if (mode === "playing") setDirection(dir[0], dir[1]);
    }
  });

  document.querySelectorAll(".dpad-btn").forEach((btn) => {
    const dir = btn.dataset.dir;
    btn.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        pressDpad(dir);
      },
      { passive: false }
    );
    btn.addEventListener("click", () => pressDpad(dir));
  });

  function pressDpad(dir) {
    if (mode === "start" || mode === "gameover") {
      handleActivation();
      return;
    }
    if (dir === "pause") {
      togglePause();
      return;
    }
    if (mode !== "playing") return;
    if (dir === "up") setDirection(0, -1);
    else if (dir === "down") setDirection(0, 1);
    else if (dir === "left") setDirection(-1, 0);
    else if (dir === "right") setDirection(1, 0);
  }

  // swipe controls directly on the screen
  let touchStart = null;
  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (mode === "start" || mode === "gameover") {
        handleActivation();
        return;
      }
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    },
    { passive: true }
  );

  canvas.addEventListener(
    "touchend",
    (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; // treat as tap, not swipe
      if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? 1 : -1, 0);
      } else {
        setDirection(0, dy > 0 ? 1 : -1);
      }
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && mode === "playing") togglePause();
  });

  // ---------- Boot ----------
  resetState();
  draw();
  highscoreEl.textContent = "HI " + pad(topScore());
  showStartOverlay();
})();
