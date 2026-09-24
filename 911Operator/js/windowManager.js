/* ============================================================
   windowManager.js — drag / resize / focus / minimize / maximize
   for the 4 retro terminal windows + taskbar + desktop icons.
   ============================================================ */

const WindowManager = (() => {
  let topZ = 20;
  const wins = {}; // id -> { el, taskbarBtn, minimized, maximized, ringing, prevRect }

  function computeLayout(desktop) {
    const W = desktop.clientWidth;
    const H = desktop.clientHeight;
    const topMargin = 64;
    const leftMargin = 110;
    const gap = 14;
    const usableH = H - 56;

    const leftColWidth = Math.min(460, Math.max(340, Math.floor(W * 0.32)));
    const rightColLeft = leftMargin + leftColWidth + gap;
    const rightColWidth = Math.max(380, W - rightColLeft - 24);
    const smallH = Math.max(200, Math.floor((usableH - topMargin - gap * 2) / 3));

    return {
      police:    { top: topMargin, left: leftMargin, width: leftColWidth, height: smallH },
      fire:      { top: topMargin + smallH + gap, left: leftMargin, width: leftColWidth, height: smallH },
      ambulance: { top: topMargin + (smallH + gap) * 2, left: leftMargin, width: leftColWidth, height: smallH },
      map:       { top: topMargin, left: rightColLeft, width: rightColWidth, height: usableH - topMargin },
    };
  }

  function clampToDesktop(el) {
    const desktop = document.getElementById('desktop');
    const maxLeft = Math.max(0, desktop.clientWidth - 100);
    const maxTop = Math.max(0, desktop.clientHeight - 80);
    let top = parseInt(el.style.top, 10) || 0;
    let left = parseInt(el.style.left, 10) || 0;
    top = Math.min(Math.max(0, top), maxTop);
    left = Math.min(Math.max(0, left), maxLeft);
    el.style.top = top + 'px';
    el.style.left = left + 'px';
  }

  function focus(id) {
    const w = wins[id];
    if (!w) return;
    topZ += 1;
    w.el.style.zIndex = topZ;
    Object.values(wins).forEach(o => o.el.classList.remove('focused'));
    w.el.classList.add('focused');
    updateTaskbar();
  }

  function open(id) {
    const w = wins[id];
    if (!w) return;
    w.el.classList.remove('hidden-win');
    w.minimized = false;
    requestAnimationFrame(() => w.el.classList.add('open'));
    clampToDesktop(w.el);
    focus(id);
    updateTaskbar();
  }

  function close(id) {
    const w = wins[id];
    if (!w) return;
    w.el.classList.remove('open');
    w.el.classList.add('hidden-win');
    updateTaskbar();
  }

  function minimize(id) {
    const w = wins[id];
    if (!w) return;
    w.minimized = true;
    w.el.classList.add('hidden-win');
    updateTaskbar();
  }

  function restore(id) {
    const w = wins[id];
    if (!w) return;
    if (w.minimized || w.el.classList.contains('hidden-win')) {
      open(id);
    } else {
      focus(id);
    }
  }

  function toggleFromTaskbar(id) {
    const w = wins[id];
    if (!w) return;
    const isVisible = !w.el.classList.contains('hidden-win');
    const isFocused = w.el.classList.contains('focused');
    if (isVisible && isFocused) {
      minimize(id);
    } else {
      restore(id);
    }
  }

  function toggleMaximize(id) {
    const w = wins[id];
    if (!w) return;
    if (w.maximized) {
      w.el.classList.remove('maximized');
      if (w.prevRect) {
        Object.assign(w.el.style, w.prevRect);
      }
      w.maximized = false;
    } else {
      w.prevRect = {
        top: w.el.style.top, left: w.el.style.left,
        width: w.el.style.width, height: w.el.style.height,
      };
      w.el.classList.add('maximized');
      w.maximized = true;
    }
    focus(id);
  }

  function setRinging(id, isRinging) {
    const w = wins[id];
    if (!w) return;
    w.ringing = isRinging;
    w.el.classList.toggle('ringing', isRinging);
    const icon = document.querySelector(`.desktop-icon[data-open="${id}"]`);
    if (icon) icon.classList.toggle('attention', isRinging);
    updateTaskbar();
  }

  function updateTaskbar() {
    Object.entries(wins).forEach(([id, w]) => {
      if (!w.taskbarBtn) return;
      const visible = !w.el.classList.contains('hidden-win');
      w.taskbarBtn.classList.toggle('active', visible && w.el.classList.contains('focused'));
      w.taskbarBtn.classList.toggle('ringing', !!w.ringing);
    });
  }

  function makeDraggable(win, handle) {
    let startX, startY, startTop, startLeft, dragging = false;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.win-controls')) return;
      dragging = true;
      focus(win.dataset.winId);
      startX = e.clientX;
      startY = e.clientY;
      startTop = parseInt(win.style.top, 10) || 0;
      startLeft = parseInt(win.style.left, 10) || 0;
      document.body.style.userSelect = 'none';
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      win.style.top = Math.max(0, startTop + dy) + 'px';
      win.style.left = Math.max(0, startLeft + dx) + 'px';
    });
    window.addEventListener('mouseup', () => {
      if (dragging) clampToDesktop(win);
      dragging = false;
      document.body.style.userSelect = '';
    });
  }

  function makeResizable(win, handle) {
    let startX, startY, startW, startH, resizing = false;
    handle.addEventListener('mousedown', (e) => {
      resizing = true;
      focus(win.dataset.winId);
      startX = e.clientX;
      startY = e.clientY;
      startW = win.offsetWidth;
      startH = win.offsetHeight;
      e.stopPropagation();
      document.body.style.userSelect = 'none';
    });
    window.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const dw = e.clientX - startX;
      const dh = e.clientY - startY;
      win.style.width = Math.max(320, startW + dw) + 'px';
      win.style.height = Math.max(220, startH + dh) + 'px';
    });
    window.addEventListener('mouseup', () => {
      resizing = false;
      document.body.style.userSelect = '';
    });
  }

  function init(ids) {
    const taskbarContainer = document.getElementById('taskbar-buttons');
    const desktop = document.getElementById('desktop');
    const layouts = computeLayout(desktop);

    ids.forEach((id) => {
      const el = document.getElementById(`win-${id}`);
      if (!el) return;
      el.dataset.winId = id;
      const layout = layouts[id] || { top: 80, left: 80, width: 420, height: 380 };
      el.style.top = layout.top + 'px';
      el.style.left = layout.left + 'px';
      el.style.width = layout.width + 'px';
      el.style.height = layout.height + 'px';
      el.classList.add('hidden-win');

      const titlebar = el.querySelector('.win-titlebar');
      const resizeHandle = el.querySelector('.win-resize-handle');
      makeDraggable(el, titlebar);
      if (resizeHandle) makeResizable(el, resizeHandle);

      el.addEventListener('mousedown', () => focus(id));

      el.querySelector('[data-action="minimize"]').addEventListener('click', (e) => {
        e.stopPropagation();
        minimize(id);
      });
      el.querySelector('[data-action="maximize"]').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMaximize(id);
      });
      el.querySelector('[data-action="close"]').addEventListener('click', (e) => {
        e.stopPropagation();
        close(id);
      });

      const taskbarBtn = document.createElement('button');
      taskbarBtn.className = 'taskbar-btn';
      taskbarBtn.textContent = el.querySelector('.win-title').textContent.split('—')[0].trim();
      taskbarBtn.addEventListener('click', () => toggleFromTaskbar(id));
      taskbarContainer.appendChild(taskbarBtn);

      wins[id] = { el, taskbarBtn, minimized: false, maximized: false, ringing: false, prevRect: null };
    });

    document.querySelectorAll('.desktop-icon').forEach((icon) => {
      icon.addEventListener('click', () => restore(icon.dataset.open));
    });

    window.addEventListener('resize', () => {
      Object.values(wins).forEach(w => clampToDesktop(w.el));
    });
  }

  return { init, open, close, minimize, restore, focus, toggleMaximize, setRinging };
})();
