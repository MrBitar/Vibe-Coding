/* ============================================================
   map.js — city map rendering, unit fleet, and dispatch logic.
   Location markers stay hidden until a dialogue choice reveals
   them (see chat.js `reveal` effect handled by game.js).
   ============================================================ */

const MapModule = (() => {
  const SPEED = 8; // map-units per second of travel
  const MIN_TRAVEL = 10;
  const MAX_TRAVEL = 40;
  const SCENE_CLEAR_DELAY = 4000; // ms an on-scene unit stays before returning home

  let handlers = {};
  let units = [];
  let activeCase = null;
  let markerRevealed = false;
  let selectedUnitId = null;
  let svgEl = null;
  let markerEl = null;
  let raf = null;

  const TYPE_LABEL = { police: 'POLICE', fire: 'FIRE', ambulance: 'EMS' };

  function init(cbs) {
    handlers = cbs || {};
    units = UNITS.map(u => {
      const depot = MAP_CONFIG.depots[u.type];
      return { ...u, status: 'available', x: depot.x, y: depot.y, homeX: depot.x, homeY: depot.y };
    });
    render();
  }

  function render() {
    const body = document.getElementById('body-map');
    body.innerHTML = `
      <div class="map-svg-wrap">
        <svg viewBox="${MAP_CONFIG.viewBox}" preserveAspectRatio="xMidYMid meet"></svg>
      </div>
      <div class="map-sidebar" id="map-sidebar"></div>
    `;
    svgEl = body.querySelector('svg');
    buildStaticMap();
    renderSidebar();
  }

  function buildStaticMap() {
    const ns = 'http://www.w3.org/2000/svg';
    MAP_CONFIG.roads.forEach(([x1, y1, x2, y2]) => {
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('class', 'map-road');
      svgEl.appendChild(line);
    });
    Object.entries(MAP_CONFIG.depots).forEach(([type, d]) => {
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', d.x - 8); rect.setAttribute('y', d.y - 8);
      rect.setAttribute('width', 16); rect.setAttribute('height', 16);
      rect.setAttribute('class', 'map-depot-icon');
      svgEl.appendChild(rect);
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', d.x); label.setAttribute('y', d.y + 16);
      label.setAttribute('class', 'map-depot-label');
      label.textContent = d.label;
      svgEl.appendChild(label);
    });
    units.forEach(u => {
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('r', 4);
      dot.setAttribute('cx', u.x); dot.setAttribute('cy', u.y);
      dot.setAttribute('class', `map-unit-dot ${u.status}`);
      svgEl.appendChild(dot);
      u.dotEl = dot;
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', u.x); label.setAttribute('y', u.y - 7);
      label.setAttribute('class', 'map-unit-label');
      label.textContent = u.label;
      svgEl.appendChild(label);
      u.labelEl = label;
    });
  }

  function drawMarker() {
    if (markerEl) { markerEl.remove(); markerEl = null; }
    if (!activeCase) return;
    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', `map-marker ${markerRevealed ? '' : 'hidden-location'}`);
    const loc = activeCase.location;
    const pulse = document.createElementNS(ns, 'circle');
    pulse.setAttribute('cx', loc.x); pulse.setAttribute('cy', loc.y);
    pulse.setAttribute('r', 6);
    pulse.setAttribute('class', 'marker-pulse');
    const core = document.createElementNS(ns, 'circle');
    core.setAttribute('cx', loc.x); core.setAttribute('cy', loc.y);
    core.setAttribute('r', 4);
    core.setAttribute('class', 'marker-core');
    g.appendChild(pulse);
    g.appendChild(core);
    g.addEventListener('click', () => onMarkerClick());
    svgEl.appendChild(g);
    markerEl = g;
  }

  function onMarkerClick() {
    if (!markerRevealed) {
      setHint('Location not yet confirmed — keep talking to the caller.');
      return;
    }
    if (!selectedUnitId) {
      setHint('Select an available unit below, then click the marker to dispatch.');
      return;
    }
    dispatchSelected();
  }

  function startCase(caseObj) {
    activeCase = caseObj;
    markerRevealed = false;
    selectedUnitId = null;
    drawMarker();
    renderSidebar();
  }

  function revealLocation() {
    if (!activeCase || markerRevealed) return;
    markerRevealed = true;
    drawMarker();
    renderSidebar();
  }

  function endCase() {
    activeCase = null;
    markerRevealed = false;
    selectedUnitId = null;
    if (markerEl) { markerEl.remove(); markerEl = null; }
    renderSidebar();
  }

  function setHint(text) {
    const hintEl = document.getElementById('map-hint-text');
    if (hintEl) hintEl.textContent = text;
  }

  function renderSidebar() {
    const sidebar = document.getElementById('map-sidebar');
    if (!sidebar) return;

    let incidentHtml = '<div class="map-sidebar-section"><h4>Active Incident</h4>';
    if (!activeCase) {
      incidentHtml += '<div class="idle-sub">No active incident.</div>';
    } else {
      const locName = markerRevealed ? activeCase.location.name : 'LOCATION UNKNOWN';
      incidentHtml += `<div class="incident-card"><strong>${activeCase.title}</strong><br>${locName}<br>`;
      if (activeCase.requiredUnitTypes.length === 0) {
        incidentHtml += `<span class="idle-sub">No units required — resolve via dialogue.</span>`;
      } else {
        activeCase.requiredUnitTypes.forEach(t => {
          const fulfilled = (activeCase.fulfilled || []).includes(t);
          incidentHtml += `<span class="incident-need ${fulfilled ? 'fulfilled' : 'pending'}">${TYPE_LABEL[t]}</span>`;
        });
      }
      incidentHtml += '</div>';
    }
    incidentHtml += '</div>';

    let unitsHtml = '<div class="map-sidebar-section" style="flex:1; overflow-y:auto;"><h4>Fleet Status</h4>';
    units.forEach(u => {
      const selectable = u.status === 'available';
      const chosen = selectedUnitId === u.id;
      unitsHtml += `
        <div class="unit-row ${selectable ? 'selectable' : ''} ${chosen ? 'chosen' : ''}" data-unit="${u.id}" data-type="${u.type}">
          <span><span class="unit-glyph">${u.glyph}</span>${u.label}</span>
          <span class="unit-status ${u.status}">${u.status.toUpperCase()}</span>
        </div>`;
    });
    unitsHtml += `<button class="dispatch-btn" id="dispatch-btn" ${(!selectedUnitId || !markerRevealed) ? 'disabled' : ''}>DISPATCH TO INCIDENT</button>`;
    unitsHtml += '</div>';

    const hint = `<div class="map-hint" id="map-hint-text">Select a unit, then dispatch it to the confirmed incident marker.</div>`;

    sidebar.innerHTML = incidentHtml + unitsHtml + hint;

    sidebar.querySelectorAll('.unit-row.selectable').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.unit;
        selectedUnitId = (selectedUnitId === id) ? null : id;
        renderSidebar();
      });
    });
    const dispatchBtn = document.getElementById('dispatch-btn');
    if (dispatchBtn) dispatchBtn.addEventListener('click', dispatchSelected);
  }

  function dispatchSelected() {
    if (!selectedUnitId || !activeCase || !markerRevealed) return;
    const unit = units.find(u => u.id === selectedUnitId);
    if (!unit || unit.status !== 'available') return;

    const caseAtDispatch = activeCase;
    const loc = caseAtDispatch.location;
    const dist = Math.hypot(loc.x - unit.x, loc.y - unit.y);
    const travelSec = Math.min(MAX_TRAVEL, Math.max(MIN_TRAVEL, dist / SPEED));

    unit.status = 'enroute';
    selectedUnitId = null;
    Audio911.chirp();
    renderSidebar();

    animateUnit(unit, unit.x, unit.y, loc.x, loc.y, travelSec * 1000, () => {
      unit.status = 'onscene';
      Audio911.unitArrive();
      renderSidebar();
      if (handlers.onUnitArrive) handlers.onUnitArrive(caseAtDispatch.id, unit.type);

      setTimeout(() => {
        if (unit.status !== 'onscene') return;
        unit.status = 'returning';
        renderSidebar();
        animateUnit(unit, unit.x, unit.y, unit.homeX, unit.homeY, travelSec * 700, () => {
          unit.status = 'available';
          renderSidebar();
        });
      }, SCENE_CLEAR_DELAY);
    });
  }

  function animateUnit(unit, x1, y1, x2, y2, durationMs, onComplete) {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / durationMs);
      unit.x = x1 + (x2 - x1) * t;
      unit.y = y1 + (y2 - y1) * t;
      if (unit.dotEl) {
        unit.dotEl.setAttribute('cx', unit.x);
        unit.dotEl.setAttribute('cy', unit.y);
        unit.dotEl.setAttribute('class', `map-unit-dot ${unit.status}`);
      }
      if (unit.labelEl) {
        unit.labelEl.setAttribute('x', unit.x);
        unit.labelEl.setAttribute('y', unit.y - 7);
      }
      if (t < 1) {
        unit.animFrame = requestAnimationFrame(step);
      } else if (onComplete) {
        onComplete();
      }
    }
    if (unit.animFrame) cancelAnimationFrame(unit.animFrame);
    unit.animFrame = requestAnimationFrame(step);
  }

  function markFulfilled(caseId, type) {
    if (!activeCase || activeCase.id !== caseId) return;
    activeCase.fulfilled = activeCase.fulfilled || [];
    if (!activeCase.fulfilled.includes(type)) activeCase.fulfilled.push(type);
    renderSidebar();
  }

  function allUnitsAvailable() {
    return units.every(u => u.status === 'available');
  }

  return { init, startCase, revealLocation, endCase, markFulfilled, allUnitsAvailable };
})();
