/* ============================================================
   chat.js — branching dialogue engine for a department window.
   Each department (police / fire / ambulance) gets an
   independent transcript + choice tree driven by cases.js data.
   ============================================================ */

const ChatWindows = (() => {
  const IDLE_COPY = {
    police:    { glyph: '★', text: 'No active calls. Standing by for dispatch.' },
    fire:      { glyph: '▲', text: 'No active calls. Standing by for dispatch.' },
    ambulance: { glyph: '✚', text: 'No active calls. Standing by for dispatch.' },
  };

  const states = {}; // dept -> state
  let handlers = {}; // { onEffect(dept, caseObj, effects), onAnswered(dept), onEnd(dept) }

  function bodyEl(dept) {
    return document.getElementById(`body-${dept}`);
  }

  function renderIdle(dept) {
    const el = bodyEl(dept);
    const copy = IDLE_COPY[dept] || { glyph: '•', text: 'Standing by.' };
    el.innerHTML = `
      <div class="dept-idle">
        <div class="idle-glyph">${copy.glyph}</div>
        <div>NO ACTIVE CALL</div>
        <div class="idle-sub">${copy.text}</div>
      </div>`;
  }

  function init(depts, cbs) {
    handlers = cbs || {};
    depts.forEach(renderIdle);
  }

  function startCall(dept, caseObj) {
    const tree = caseObj.dialogue[dept];
    const el = bodyEl(dept);
    states[dept] = {
      caseObj, tree,
      currentNodeId: tree.start,
      answered: false,
      typingTimer: null,
      ended: false,
    };

    el.innerHTML = `
      <div class="call-header">
        <span class="caller-name">CALLER: ${tree.callerName}</span>
        <span class="call-timer" id="timer-${dept}">--</span>
      </div>
      <div class="transcript" id="transcript-${dept}"></div>
      <div class="answer-bar" id="answerbar-${dept}">
        <button class="answer-btn" id="answerbtn-${dept}">&#9742; ANSWER CALL</button>
      </div>`;

    document.getElementById(`answerbtn-${dept}`).addEventListener('click', () => answer(dept));
  }

  function answer(dept) {
    const st = states[dept];
    if (!st || st.answered) return;
    st.answered = true;
    document.getElementById(`answerbar-${dept}`).remove();
    bodyEl(dept).insertAdjacentHTML('beforeend', `<div class="choices" id="choices-${dept}"></div>`);
    Audio911.chirp();
    if (handlers.onAnswered) handlers.onAnswered(dept);
    playNode(dept, st.currentNodeId);
  }

  function playNode(dept, nodeId) {
    const st = states[dept];
    if (!st || st.ended) return;
    const node = st.tree.nodes[nodeId];
    if (!node) return;
    st.currentNodeId = nodeId;

    typeLine(dept, node.speaker, node.text, () => {
      if (node.choices && node.choices.length) {
        renderChoices(dept, node.choices);
      } else if (node.next) {
        renderContinue(dept, node.next);
      } else {
        clearChoices(dept);
      }
    });
  }

  function typeLine(dept, speaker, text, onDone) {
    const transcript = document.getElementById(`transcript-${dept}`);
    if (!transcript) return;
    const line = document.createElement('div');
    line.className = `line ${speaker}`;
    const tag = speaker === 'caller' ? 'CALLER' : speaker === 'dispatcher' ? 'YOU (DISPATCH)' : 'SYSTEM';
    line.innerHTML = `<span class="speaker-tag">${tag}</span><span class="line-text"></span><span class="typing-caret"></span>`;
    transcript.appendChild(line);
    transcript.scrollTop = transcript.scrollHeight;

    const textEl = line.querySelector('.line-text');
    const caret = line.querySelector('.typing-caret');
    let i = 0;
    const speed = 16;

    const st = states[dept];
    if (st) st.typingTimer = setInterval(step, speed);

    function step() {
      i += 1;
      textEl.textContent = text.slice(0, i);
      if (i % 3 === 0) Audio911.tick();
      transcript.scrollTop = transcript.scrollHeight;
      if (i >= text.length) {
        clearInterval(st.typingTimer);
        caret.remove();
        if (onDone) onDone();
      }
    }
  }

  function renderChoices(dept, choices) {
    const box = document.getElementById(`choices-${dept}`);
    if (!box) return;
    box.innerHTML = '';
    choices.forEach((choice) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `${choice.label}`;
      btn.addEventListener('click', () => selectChoice(dept, choice, box));
      box.appendChild(btn);
    });
  }

  function renderContinue(dept, nextId) {
    const box = document.getElementById(`choices-${dept}`);
    if (!box) return;
    box.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = '> Continue';
    btn.addEventListener('click', () => {
      Audio911.choiceClick();
      box.innerHTML = '';
      playNode(dept, nextId);
    });
    box.appendChild(btn);
  }

  function clearChoices(dept) {
    const box = document.getElementById(`choices-${dept}`);
    if (box) box.innerHTML = '';
  }

  function selectChoice(dept, choice, box) {
    Audio911.choiceClick();
    const st = states[dept];
    box.querySelectorAll('button').forEach(b => b.disabled = true);
    box.innerHTML = '';

    typeLine(dept, 'dispatcher', choice.label, () => {
      const effects = choice.effects || {};
      if (effects.note) {
        appendSystemNote(dept, effects.note);
      }
      if (handlers.onEffect) handlers.onEffect(dept, st.caseObj, effects);
      if (choice.next) playNode(dept, choice.next);
    });
  }

  function appendSystemNote(dept, text) {
    const transcript = document.getElementById(`transcript-${dept}`);
    if (!transcript) return;
    const line = document.createElement('div');
    line.className = 'line system';
    line.textContent = text;
    transcript.appendChild(line);
    transcript.scrollTop = transcript.scrollHeight;
  }

  function updateTimer(dept, secondsLeft, totalSeconds) {
    const el = document.getElementById(`timer-${dept}`);
    if (!el) return;
    const m = Math.floor(Math.max(0, secondsLeft) / 60);
    const s = Math.max(0, Math.ceil(secondsLeft)) % 60;
    el.textContent = `${m}:${String(s).padStart(2, '0')}`;
    el.classList.remove('warn', 'critical');
    if (secondsLeft <= totalSeconds * 0.2) el.classList.add('critical');
    else if (secondsLeft <= totalSeconds * 0.5) el.classList.add('warn');
  }

  function appendOutcome(dept, text, isGood) {
    const st = states[dept];
    const transcript = document.getElementById(`transcript-${dept}`);
    if (!transcript) return;
    if (st) {
      st.ended = true;
      if (st.typingTimer) clearInterval(st.typingTimer);
    }
    clearChoices(dept);
    const answerbar = document.getElementById(`answerbar-${dept}`);
    if (answerbar) answerbar.remove();
    const line = document.createElement('div');
    line.className = `line ${isGood ? 'outcome-good' : 'outcome-bad'}`;
    line.textContent = text;
    transcript.appendChild(line);
    transcript.scrollTop = transcript.scrollHeight;
    const timer = document.getElementById(`timer-${dept}`);
    if (timer) timer.textContent = isGood ? 'CLEAR' : 'FAILED';
  }

  function endCall(dept) {
    const st = states[dept];
    if (st && st.typingTimer) clearInterval(st.typingTimer);
    delete states[dept];
  }

  function isAnswered(dept) {
    return !!(states[dept] && states[dept].answered);
  }

  function reset(dept) {
    endCall(dept);
    renderIdle(dept);
  }

  return { init, startCall, updateTimer, appendOutcome, endCall, isAnswered, reset };
})();
