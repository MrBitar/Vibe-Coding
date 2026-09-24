/* ============================================================
   audio.js — tiny synthesized sound engine (Web Audio API)
   No external audio assets; everything is generated at runtime.
   ============================================================ */

const Audio911 = (() => {
  let ctx = null;
  let muted = false;
  let ringOsc = null;
  let ringGain = null;
  let ringTimer = null;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, { type = 'square', gain = 0.08, delay = 0, glide = null } = {}) {
    if (muted) return;
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    if (glide !== null) {
      osc.frequency.linearRampToValueAtTime(glide, c.currentTime + delay + duration);
    }
    g.gain.setValueAtTime(0, c.currentTime + delay);
    g.gain.linearRampToValueAtTime(gain, c.currentTime + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.02);
  }

  function tick() {
    tone(1200, 0.02, { type: 'square', gain: 0.03 });
  }

  function chirp() {
    tone(660, 0.08, { type: 'square', gain: 0.07, glide: 880 });
    tone(880, 0.09, { type: 'square', gain: 0.06, delay: 0.09, glide: 1100 });
  }

  function choiceClick() {
    tone(500, 0.05, { type: 'square', gain: 0.05 });
  }

  function success() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { type: 'square', gain: 0.07, delay: i * 0.09 }));
  }

  function failure() {
    tone(180, 0.5, { type: 'sawtooth', gain: 0.08, glide: 90 });
    tone(140, 0.5, { type: 'sawtooth', gain: 0.05, delay: 0.08, glide: 70 });
  }

  function unitArrive() {
    tone(740, 0.1, { type: 'triangle', gain: 0.07 });
    tone(980, 0.12, { type: 'triangle', gain: 0.06, delay: 0.1 });
  }

  function boot() {
    tone(440, 0.05, { type: 'square', gain: 0.05 });
  }

  function startRing() {
    stopRing();
    if (muted) return;
    const c = getCtx();
    let on = true;
    ringTimer = setInterval(() => {
      if (on) {
        tone(1000, 0.35, { type: 'square', gain: 0.06, glide: 1000 });
        tone(1000, 0.35, { type: 'square', gain: 0.06, delay: 0.4, glide: 1000 });
      }
    }, 1000);
  }

  function stopRing() {
    if (ringTimer) {
      clearInterval(ringTimer);
      ringTimer = null;
    }
  }

  function setMuted(v) {
    muted = v;
    if (muted) stopRing();
  }

  function isMuted() {
    return muted;
  }

  return {
    tick, chirp, choiceClick, success, failure, unitArrive, boot,
    startRing, stopRing, setMuted, isMuted,
    unlock: getCtx,
  };
})();
