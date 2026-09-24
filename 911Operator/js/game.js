/* ============================================================
   game.js — shift state machine: case lifecycle, timers,
   scoring, and end-of-shift results / leaderboard.
   ============================================================ */

const Game911 = (() => {
  let shiftIndex = 0;
  let score = 0;
  let saved = 0;
  let failed = 0;
  let activeCase = null;
  let tickHandle = null;

  const GRADE_THRESHOLDS = [
    { grade: 'S', min: 1400 },
    { grade: 'A', min: 1100 },
    { grade: 'B', min: 800 },
    { grade: 'C', min: 500 },
    { grade: 'D', min: 0 },
  ];

  function cloneCase(id) {
    const c = JSON.parse(JSON.stringify(CASES[id]));
    c.remainingTime = c.urgencyTime;
    c.fulfilled = [];
    c.goodChoiceCount = 0;
    c.resolved = false;
    return c;
  }

  function updateHud() {
    document.getElementById('hud-case-index').textContent = Math.min(shiftIndex + 1, SHIFT_ORDER.length);
    document.getElementById('hud-case-total').textContent = SHIFT_ORDER.length;
    document.getElementById('hud-score').textContent = score;
    document.getElementById('hud-saved').textContent = saved;
    document.getElementById('hud-failed').textContent = failed;
  }

  function start() {
    shiftIndex = 0;
    score = 0;
    saved = 0;
    failed = 0;
    updateHud();
    ChatWindows.init(['police', 'fire', 'ambulance'], {
      onEffect: handleEffect,
      onAnswered: handleAnswered,
    });
    MapModule.init({ onUnitArrive: handleUnitArrive });
    startNextCase();
  }

  function startNextCase() {
    if (shiftIndex >= SHIFT_ORDER.length) {
      endShift();
      return;
    }
    const caseId = SHIFT_ORDER[shiftIndex];
    activeCase = cloneCase(caseId);
    updateHud();

    MapModule.startCase(activeCase);

    activeCase.department.forEach((dept) => {
      ChatWindows.startCall(dept, activeCase);
      WindowManager.open(dept);
      WindowManager.setRinging(dept, true);
    });
    WindowManager.open('map');
    Audio911.startRing();

    tickHandle = setInterval(tick, 200);
  }

  function tick() {
    if (!activeCase || activeCase.resolved) return;
    activeCase.remainingTime -= 0.2;
    activeCase.department.forEach((dept) => {
      ChatWindows.updateTimer(dept, activeCase.remainingTime, activeCase.urgencyTime);
    });
    if (activeCase.remainingTime <= 0) {
      resolveCase(false);
    }
  }

  function handleAnswered(dept) {
    WindowManager.setRinging(dept, false);
    if (!activeCase) return;
    const allAnswered = activeCase.department.every(d => ChatWindows.isAnswered(d));
    if (allAnswered) Audio911.stopRing();
  }

  function handleEffect(dept, caseObj, effects) {
    if (!activeCase || activeCase.id !== caseObj.id) return;
    if (typeof effects.urgencyDelta === 'number') {
      activeCase.remainingTime += effects.urgencyDelta;
    }
    if (effects.goodChoice) {
      activeCase.goodChoiceCount += 1;
    }
    if (effects.reveal) {
      MapModule.revealLocation();
    }
    if (effects.resolveFalseAlarm) {
      resolveCase(true);
    }
  }

  function handleUnitArrive(caseId, unitType) {
    if (!activeCase || activeCase.id !== caseId || activeCase.resolved) return;
    if (activeCase.requiredUnitTypes.includes(unitType) && !activeCase.fulfilled.includes(unitType)) {
      activeCase.fulfilled.push(unitType);
      MapModule.markFulfilled(caseId, unitType);
      if (activeCase.requiredUnitTypes.every(t => activeCase.fulfilled.includes(t))) {
        resolveCase(true);
      }
    } else {
      score = Math.max(0, score - 10);
      updateHud();
    }
  }

  function resolveCase(success) {
    if (!activeCase || activeCase.resolved) return;
    activeCase.resolved = true;
    clearInterval(tickHandle);
    Audio911.stopRing();

    if (success) {
      const base = 100;
      const timeBonus = Math.round(Math.max(0, activeCase.remainingTime) * 2);
      const choiceBonus = activeCase.goodChoiceCount * 20;
      score += base + timeBonus + choiceBonus;
      saved += 1;
      Audio911.success();
    } else {
      score = Math.max(0, score - 50);
      failed += 1;
      Audio911.failure();
    }
    updateHud();

    activeCase.department.forEach((dept) => {
      const text = success ? activeCase.outcomeGood[dept] : activeCase.outcomeBad[dept];
      ChatWindows.appendOutcome(dept, text, success);
      WindowManager.setRinging(dept, false);
    });
    MapModule.endCase();

    const finishedCase = activeCase;
    setTimeout(() => {
      finishedCase.department.forEach(dept => ChatWindows.reset(dept));
      shiftIndex += 1;
      startNextCase();
    }, 3400);
  }

  function computeGrade(finalScore) {
    for (const g of GRADE_THRESHOLDS) {
      if (finalScore >= g.min) return g.grade;
    }
    return 'D';
  }

  function endShift() {
    activeCase = null;
    updateHud();
    const grade = computeGrade(score);
    showResultsScreen(grade);
  }

  function showResultsScreen(grade) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    overlay.classList.remove('hidden');
    content.innerHTML = `
      <div class="results-header">
        <div class="grade-badge">${grade}</div>
        <div>
          <h2>END OF SHIFT REPORT</h2>
          <div class="idle-sub">City Emergency Dispatch — Shift Complete</div>
        </div>
      </div>
      <div class="results-stats">
        <div><span class="stat-label">Cases Handled:</span> ${SHIFT_ORDER.length}</div>
        <div><span class="stat-label">Score:</span> ${score}</div>
        <div><span class="stat-label">Saved:</span> ${saved}</div>
        <div><span class="stat-label">Failed:</span> ${failed}</div>
      </div>
      <div>
        <label class="idle-sub">Enter your operator callsign:</label><br><br>
        <input type="text" id="name-input" maxlength="16" placeholder="OPERATOR" value="OPERATOR">
      </div>
      <div class="modal-actions">
        <button class="modal-btn primary" id="save-score-btn">SAVE TO LEADERBOARD</button>
        <button class="modal-btn" id="skip-save-btn">SKIP</button>
      </div>
    `;
    document.getElementById('save-score-btn').addEventListener('click', () => {
      const name = (document.getElementById('name-input').value || 'OPERATOR').trim().toUpperCase().slice(0, 16) || 'OPERATOR';
      Storage911.saveScore({ name, score, saved, failed, grade, date: new Date().toLocaleDateString() });
      showLeaderboard(true);
    });
    document.getElementById('skip-save-btn').addEventListener('click', () => showLeaderboard(false));
  }

  function showLeaderboard(fromResults) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    overlay.classList.remove('hidden');
    const scores = Storage911.loadScores();
    let rows = scores.map((s, i) => `
      <tr>
        <td>${i + 1}</td><td>${s.name}</td><td>${s.grade}</td>
        <td>${s.score}</td><td>${s.saved}/${s.saved + s.failed}</td><td>${s.date || ''}</td>
      </tr>`).join('');
    if (!rows) rows = `<tr><td colspan="6" class="idle-sub">No scores yet — be the first operator on the board.</td></tr>`;

    content.innerHTML = `
      <h2>HIGH SCORES</h2>
      <table>
        <thead><tr><th>#</th><th>Callsign</th><th>Grade</th><th>Score</th><th>Saved</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="modal-actions">
        <button class="modal-btn primary" id="play-again-btn">${fromResults === undefined ? 'CLOSE' : 'PLAY AGAIN'}</button>
      </div>
    `;
    document.getElementById('play-again-btn').addEventListener('click', () => {
      if (fromResults === undefined) {
        overlay.classList.add('hidden');
      } else {
        location.reload();
      }
    });
  }

  return { start, showLeaderboard };
})();
