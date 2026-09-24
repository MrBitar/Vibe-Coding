/* =========================================================
   audio.js — synthesized sound effects (Web Audio API)
   Concern: sound only. No game logic, no DOM, no storage
   beyond reading/writing the sound-on preference via Storage.
   ========================================================= */

const Audio2 = (() => {
  let ctx = null;
  let soundOn = Storage.getSoundOn();

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone({ freq, duration, type = "sine", delay = 0, gain = 0.18, glideTo = null }) {
    if (!soundOn) return;
    const c = ensureCtx();
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    const startAt = c.currentTime + delay;
    osc.frequency.setValueAtTime(freq, startAt);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, startAt + duration);
    amp.gain.setValueAtTime(0.0001, startAt);
    amp.gain.exponentialRampToValueAtTime(gain, startAt + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(amp).connect(c.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }

  function flip() {
    tone({ freq: 520, duration: 0.09, type: "triangle", gain: 0.14 });
  }

  function match() {
    tone({ freq: 660, duration: 0.14, type: "sine", gain: 0.2 });
    tone({ freq: 880, duration: 0.18, type: "sine", gain: 0.2, delay: 0.09 });
    tone({ freq: 1100, duration: 0.22, type: "sine", gain: 0.18, delay: 0.18 });
  }

  function mismatch() {
    tone({ freq: 260, duration: 0.16, type: "sawtooth", gain: 0.12, glideTo: 160 });
  }

  function win() {
    // Ascending "case closed" fanfare, blue/white siren-inspired sparkle at the end.
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone({ freq: f, duration: 0.28, type: "triangle", gain: 0.2, delay: i * 0.13 }));
    tone({ freq: 1400, duration: 0.5, type: "sine", gain: 0.1, delay: notes.length * 0.13 });
    tone({ freq: 1050, duration: 0.5, type: "sine", gain: 0.1, delay: notes.length * 0.13 + 0.18 });
  }

  function click() {
    tone({ freq: 400, duration: 0.06, type: "square", gain: 0.08 });
  }

  function setSoundOn(on) {
    soundOn = on;
    Storage.setSoundOn(on);
    if (on) ensureCtx();
  }

  function isSoundOn() {
    return soundOn;
  }

  return { flip, match, mismatch, win, click, setSoundOn, isSoundOn };
})();
