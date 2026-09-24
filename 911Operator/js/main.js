/* ============================================================
   main.js — boot sequence + wiring everything together
   ============================================================ */

(function () {
  const BOOT_LINES = [
    'C.E.D.S. — CITY EMERGENCY DISPATCH SYSTEM v1.0',
    'COPYRIGHT (C) MUNICIPAL DISPATCH AUTHORITY',
    '',
    'RUNNING POST... OK',
    'LOADING POLICE.SYS ......... OK',
    'LOADING FIRE.SYS ........... OK',
    'LOADING EMS.SYS ............ OK',
    'LOADING MAP.SYS ............ OK',
    'CALIBRATING UNIT TELEMETRY . OK',
    'ESTABLISHING CALLER UPLINK . OK',
    '',
    'ALL SYSTEMS NOMINAL.',
    'ONE OPERATOR TERMINAL DETECTED.',
    '',
    'STAND BY FOR SHIFT ASSIGNMENT.',
  ];

  function bootSequence(onDone) {
    const el = document.getElementById('boot-text');
    let i = 0;
    function nextLine() {
      if (i >= BOOT_LINES.length) {
        onDone();
        return;
      }
      const line = BOOT_LINES[i];
      el.textContent += (i === 0 ? '' : '\n') + line;
      if (line.trim()) Audio911.boot();
      i += 1;
      setTimeout(nextLine, line.trim() ? 90 + Math.random() * 60 : 40);
    }
    nextLine();
  }

  function updateClock() {
    const el = document.getElementById('taskbar-clock');
    if (!el) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    el.textContent = `${hh}:${mm}:${ss}`;
  }

  function wireTaskbarControls() {
    const muteBtn = document.getElementById('mute-btn');
    muteBtn.addEventListener('click', () => {
      const next = !Audio911.isMuted();
      Audio911.setMuted(next);
      muteBtn.classList.toggle('muted', next);
      muteBtn.textContent = next ? '♪̸' : '♪';
    });

    document.getElementById('highscores-btn').addEventListener('click', () => {
      Game911.showLeaderboard();
    });

    setInterval(updateClock, 1000);
    updateClock();
  }

  function init() {
    const startBtn = document.getElementById('start-shift-btn');
    const bootScoresBtn = document.getElementById('boot-highscores-btn');

    bootSequence(() => {
      startBtn.classList.remove('hidden');
      bootScoresBtn.classList.remove('hidden');
    });

    startBtn.addEventListener('click', () => {
      Audio911.unlock();
      document.getElementById('boot-screen').classList.add('hidden');
      const desktop = document.getElementById('desktop');
      desktop.classList.remove('hidden');

      WindowManager.init(['police', 'fire', 'ambulance', 'map']);
      wireTaskbarControls();

      document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') {
          // clicking outside the results/leaderboard card does nothing during
          // an active shift results flow — force explicit button choice.
        }
      });

      Game911.start();
    });

    bootScoresBtn.addEventListener('click', () => {
      Audio911.unlock();
      Game911.showLeaderboard();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
