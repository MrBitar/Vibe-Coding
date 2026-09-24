// RADAR — live ADS-B aircraft feed rendered as a 90s CRT radar scope.
// Data source: OpenSky Network public REST API (anonymous, rate-limited).

// Routed through server.py's same-origin proxy — OpenSky's CORS headers
// only allow requests from opensky-network.org itself, so the browser can't
// call the upstream API directly from this page.
const OPENSKY_STATES_URL = "/proxy/states";
const OPENSKY_FLIGHTS_URL = "/proxy/flights";
const HISTORY_LENGTH = 40; // number of past positions kept per aircraft for the trail

const canvas = document.getElementById("scope");
const ctx = canvas.getContext("2d");

const el = {
  status: document.getElementById("status"),
  trackCount: document.getElementById("trackCount"),
  clock: document.getElementById("clock"),
  log: document.getElementById("log"),
  centerLat: document.getElementById("centerLat"),
  centerLon: document.getElementById("centerLon"),
  rangeKm: document.getElementById("rangeKm"),
  pollSec: document.getElementById("pollSec"),
  locateBtn: document.getElementById("locateBtn"),
  applyBtn: document.getElementById("applyBtn"),
  noSelection: document.getElementById("noSelection"),
  details: document.getElementById("details"),
  deselectBtn: document.getElementById("deselectBtn"),
  detailWindow: document.getElementById("detailWindow"),
  detailWindowClose: document.getElementById("detailWindowClose"),
  detailWindowTitlebar: document.querySelector("#detailWindow .window-titlebar"),
};

const state = {
  center: { lat: parseFloat(el.centerLat.value), lon: parseFloat(el.centerLon.value) },
  rangeKm: parseFloat(el.rangeKm.value),
  pollMs: parseFloat(el.pollSec.value) * 1000,
  aircraft: new Map(), // icao24 -> { lat, lon, heading, velocity, altitude, callsign, country, history: [{lat,lon}] }
  selected: null, // icao24
  sweepAngle: 0,
  pollTimer: null,
};

// ---- Leaflet chart view (real coastlines/borders alongside the radar scope) ----
let leafletMap = null;
let mapMarkers = new Map(); // icao24 -> L.CircleMarker
let mapTrajectoryLine = null;

function rangeToZoom(rangeKm) {
  const worldWidthKm = 40075;
  const containerPx = 520;
  const metersPerPxAtZoom0 = (worldWidthKm * 1000) / 256;
  const desiredMetersPerPx = (rangeKm * 2 * 1000) / containerPx;
  const zoom = Math.log2(metersPerPxAtZoom0 / desiredMetersPerPx);
  return Math.max(2, Math.min(13, Math.round(zoom)));
}

function initMap() {
  leafletMap = L.map("leafletMap", { zoomControl: true, attributionControl: true });
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(leafletMap);
  leafletMap.setView([state.center.lat, state.center.lon], rangeToZoom(state.rangeKm));
}

function recenterMap() {
  if (!leafletMap) return;
  leafletMap.setView([state.center.lat, state.center.lon], rangeToZoom(state.rangeKm));
}

function updateMapMarkers() {
  if (!leafletMap) return;
  const seen = new Set(state.aircraft.keys());

  for (const [icao24, marker] of mapMarkers.entries()) {
    if (!seen.has(icao24)) {
      leafletMap.removeLayer(marker);
      mapMarkers.delete(icao24);
    }
  }

  for (const [icao24, ac] of state.aircraft.entries()) {
    const isSelected = icao24 === state.selected;
    const color = isSelected ? "#ffb000" : "#00ff41";
    let marker = mapMarkers.get(icao24);
    if (!marker) {
      marker = L.circleMarker([ac.lat, ac.lon], {
        radius: 5,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 1,
      });
      marker.on("click", () => selectAircraft(icao24));
      marker.bindPopup("", { className: "aircraft-popup" });
      marker.addTo(leafletMap);
      mapMarkers.set(icao24, marker);
    } else {
      marker.setLatLng([ac.lat, ac.lon]);
      marker.setStyle({ color, fillColor: color, radius: isSelected ? 7 : 5 });
    }
    marker.setPopupContent(`<b>${ac.callsign || icao24}</b><br>${Math.round(ac.altitude || 0)} m`);
  }
}

function updateMapTrajectory() {
  if (!leafletMap) return;
  if (mapTrajectoryLine) {
    leafletMap.removeLayer(mapTrajectoryLine);
    mapTrajectoryLine = null;
  }
  const ac = state.selected && state.aircraft.get(state.selected);
  if (!ac || ac.history.length < 2) return;
  const latlngs = ac.history.map((p) => [p.lat, p.lon]);
  mapTrajectoryLine = L.polyline(latlngs, { color: "#ffb000", weight: 2, opacity: 0.85 }).addTo(leafletMap);
}

function log(msg) {
  const line = document.createElement("div");
  const t = new Date().toISOString().substr(11, 8);
  line.textContent = `[${t}] ${msg}`;
  el.log.appendChild(line);
  while (el.log.childNodes.length > 50) el.log.removeChild(el.log.firstChild);
}

function updateClock() {
  el.clock.textContent = new Date().toISOString().substr(11, 8) + "Z";
}
setInterval(updateClock, 1000);
updateClock();

// ---- Geo projection: simple equirectangular approximation around center ----
function kmPerDegLon(lat) {
  return 111.32 * Math.cos((lat * Math.PI) / 180);
}
const KM_PER_DEG_LAT = 111.32;

function project(lat, lon) {
  const dLat = lat - state.center.lat;
  const dLon = lon - state.center.lon;
  const y = -dLat * KM_PER_DEG_LAT;
  const x = dLon * kmPerDegLon(state.center.lat);
  const distKm = Math.sqrt(x * x + y * y);
  const scale = (canvas.width / 2 - 20) / state.rangeKm;
  return {
    x: canvas.width / 2 + x * scale,
    y: canvas.height / 2 + y * scale,
    distKm,
  };
}

function bbox() {
  const latDelta = state.rangeKm / KM_PER_DEG_LAT;
  const lonDelta = state.rangeKm / kmPerDegLon(state.center.lat);
  return {
    lamin: state.center.lat - latDelta,
    lamax: state.center.lat + latDelta,
    lomin: state.center.lon - lonDelta,
    lomax: state.center.lon + lonDelta,
  };
}

// ---- Data fetch ----
async function fetchStates() {
  const b = bbox();
  const url = `${OPENSKY_STATES_URL}?lamin=${b.lamin}&lomin=${b.lomin}&lamax=${b.lamax}&lomax=${b.lomax}`;
  el.status.textContent = "SCANNING...";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const seen = new Set();
    for (const s of data.states || []) {
      const [
        icao24, callsign, country, timePosition, lastContact,
        lon, lat, baroAltitude, onGround, velocity, heading, vertRate,
        , geoAltitude, squawk, , positionSource,
      ] = s;
      if (lat == null || lon == null) continue;
      seen.add(icao24);
      const existing = state.aircraft.get(icao24) || { history: [] };
      existing.callsign = (callsign || "").trim() || icao24;
      existing.country = country;
      existing.lat = lat;
      existing.lon = lon;
      existing.velocity = velocity;
      existing.heading = heading;
      existing.altitude = geoAltitude;
      existing.baroAltitude = baroAltitude;
      existing.vertRate = vertRate;
      existing.squawk = squawk;
      existing.positionSource = positionSource;
      existing.timePosition = timePosition;
      existing.lastContact = lastContact;
      existing.onGround = onGround;
      existing.history.push({ lat, lon });
      if (existing.history.length > HISTORY_LENGTH) existing.history.shift();
      state.aircraft.set(icao24, existing);
    }
    // drop aircraft that left the bbox / stopped reporting
    for (const key of Array.from(state.aircraft.keys())) {
      if (!seen.has(key)) state.aircraft.delete(key);
    }
    el.status.textContent = "LIVE";
    el.trackCount.textContent = `TRACKS: ${state.aircraft.size}`;
    log(`updated ${state.aircraft.size} tracks`);
    updateMapMarkers();
    updateMapTrajectory();
  } catch (err) {
    el.status.textContent = "LINK FAIL";
    log(`fetch error: ${err.message}`);
  }
}

// best-effort: recent flight record gives departure/arrival airport ICAO codes
async function fetchRoute(icao24) {
  const now = Math.floor(Date.now() / 1000);
  const begin = now - 6 * 3600; // last 6 hours
  const url = `${OPENSKY_FLIGHTS_URL}?icao24=${icao24}&begin=${begin}&end=${now}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const flights = await res.json();
    if (!Array.isArray(flights) || flights.length === 0) return null;
    const last = flights[flights.length - 1];
    return {
      origin: last.estDepartureAirport || "UNKNOWN",
      dest: last.estArrivalAirport || "UNKNOWN",
    };
  } catch (err) {
    log(`route lookup failed for ${icao24}: ${err.message}`);
    return null;
  }
}

// ---- Rendering ----
function drawScope() {
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  const r = w / 2 - 20;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#010a02";
  ctx.fillRect(0, 0, w, h);

  // range rings
  ctx.strokeStyle = "rgba(0,255,65,0.35)";
  ctx.lineWidth = 1;
  const rings = 4;
  for (let i = 1; i <= rings; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (r * i) / rings, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,255,65,0.5)";
    ctx.font = "10px monospace";
    ctx.fillText(`${Math.round((state.rangeKm * i) / rings)}km`, cx + 4, cy - (r * i) / rings + 12);
  }

  // degree ticks + crosshair
  ctx.strokeStyle = "rgba(0,255,65,0.25)";
  for (let deg = 0; deg < 360; deg += 10) {
    const rad = (deg * Math.PI) / 180;
    const inner = deg % 30 === 0 ? r - 14 : r - 6;
    const x1 = cx + Math.sin(rad) * inner, y1 = cy - Math.cos(rad) * inner;
    const x2 = cx + Math.sin(rad) * r, y2 = cy - Math.cos(rad) * r;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();

  // sweep beam
  const sweepGradient = ctx.createConicGradient
    ? ctx.createConicGradient(state.sweepAngle - Math.PI / 2, cx, cy)
    : null;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const sweepLen = 0.55; // fraction of full circle that fades behind the beam
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, "rgba(0,255,65,0.35)");
  grad.addColorStop(1, "rgba(0,255,65,0)");
  ctx.translate(cx, cy);
  ctx.rotate(state.sweepAngle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, -sweepLen, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // beam leading edge line
  ctx.save();
  ctx.strokeStyle = "rgba(125,255,160,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(state.sweepAngle) * r, cy - Math.cos(state.sweepAngle) * r);
  ctx.stroke();
  ctx.restore();

  // aircraft blips
  for (const [icao24, ac] of state.aircraft.entries()) {
    const p = project(ac.lat, ac.lon);
    if (p.distKm > state.rangeKm) continue;
    const isSelected = icao24 === state.selected;

    if (isSelected && ac.history.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,176,0,0.85)";
      ctx.lineWidth = 2;
      ac.history.forEach((pt, i) => {
        const hp = project(pt.lat, pt.lon);
        if (i === 0) ctx.moveTo(hp.x, hp.y);
        else ctx.lineTo(hp.x, hp.y);
      });
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.fillStyle = isSelected ? "#ffb000" : "#00ff41";
    ctx.shadowColor = isSelected ? "#ffb000" : "#00ff41";
    ctx.shadowBlur = isSelected ? 14 : 8;
    ctx.arc(p.x, p.y, isSelected ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (typeof ac.heading === "number") {
      const rad = (ac.heading * Math.PI) / 180;
      ctx.beginPath();
      ctx.strokeStyle = isSelected ? "#ffb000" : "rgba(0,255,65,0.8)";
      ctx.lineWidth = 1.5;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.sin(rad) * 10, p.y - Math.cos(rad) * 10);
      ctx.stroke();
    }

    ctx.fillStyle = isSelected ? "#ffb000" : "rgba(0,255,65,0.85)";
    ctx.font = "10px monospace";
    ctx.fillText(ac.callsign || icao24, p.x + 7, p.y - 7);

    ac._screenX = p.x;
    ac._screenY = p.y;
  }
}

function tick() {
  state.sweepAngle += 0.012;
  if (state.sweepAngle > Math.PI * 2) state.sweepAngle -= Math.PI * 2;
  drawScope();
  requestAnimationFrame(tick);
}

// ---- Interaction ----
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  let closest = null;
  let closestDist = 14; // px hit-test radius
  for (const [icao24, ac] of state.aircraft.entries()) {
    if (ac._screenX == null) continue;
    const d = Math.hypot(ac._screenX - mx, ac._screenY - my);
    if (d < closestDist) {
      closestDist = d;
      closest = icao24;
    }
  }
  if (closest) selectAircraft(closest);
});

const POSITION_SOURCE_LABELS = { 0: "ADS-B", 1: "ASTERIX", 2: "MLAT", 3: "FLARM" };

function formatVerticalRate(vr) {
  if (vr == null) return "--";
  const arrow = vr > 0.5 ? "↑ CLIMBING" : vr < -0.5 ? "↓ DESCENDING" : "→ LEVEL";
  return `${vr.toFixed(1)} m/s ${arrow}`;
}

function formatAgo(unixSeconds) {
  if (unixSeconds == null) return "--";
  const secs = Math.max(0, Math.round(Date.now() / 1000 - unixSeconds));
  return `${secs}s ago`;
}

function selectAircraft(icao24) {
  state.selected = icao24;
  const ac = state.aircraft.get(icao24);
  if (!ac) return;

  updateMapMarkers();
  updateMapTrajectory();

  el.noSelection.classList.add("hidden");
  el.details.classList.remove("hidden");
  el.detailWindow.classList.remove("hidden");

  document.getElementById("d-callsign").textContent = ac.callsign || "--";
  document.getElementById("d-icao").textContent = icao24;
  document.getElementById("d-origin").textContent = "LOOKING UP...";
  document.getElementById("d-dest").textContent = "LOOKING UP...";
  document.getElementById("d-alt").textContent = ac.altitude != null ? `${Math.round(ac.altitude)} m` : "--";
  document.getElementById("d-speed").textContent = ac.velocity != null ? `${Math.round(ac.velocity * 3.6)} km/h` : "--";
  document.getElementById("d-heading").textContent = ac.heading != null ? `${Math.round(ac.heading)}°` : "--";
  document.getElementById("d-country").textContent = ac.country || "--";

  const p = project(ac.lat, ac.lon);
  document.getElementById("w-callsign").textContent = ac.callsign || "--";
  document.getElementById("w-icao").textContent = icao24;
  document.getElementById("w-country").textContent = ac.country || "--";
  document.getElementById("w-origin").textContent = "LOOKING UP...";
  document.getElementById("w-dest").textContent = "LOOKING UP...";
  document.getElementById("w-ground").textContent = ac.onGround ? "YES" : "NO";
  document.getElementById("w-position").textContent = `${ac.lat.toFixed(4)}, ${ac.lon.toFixed(4)}`;
  document.getElementById("w-dist").textContent = `${Math.round(p.distKm)} km`;
  document.getElementById("w-galt").textContent = ac.altitude != null ? `${Math.round(ac.altitude)} m` : "--";
  document.getElementById("w-balt").textContent = ac.baroAltitude != null ? `${Math.round(ac.baroAltitude)} m` : "--";
  document.getElementById("w-speed").textContent = ac.velocity != null ? `${Math.round(ac.velocity * 3.6)} km/h` : "--";
  document.getElementById("w-heading").textContent = ac.heading != null ? `${Math.round(ac.heading)}°` : "--";
  document.getElementById("w-vrate").textContent = formatVerticalRate(ac.vertRate);
  document.getElementById("w-squawk").textContent = ac.squawk || "--";
  document.getElementById("w-src").textContent = POSITION_SOURCE_LABELS[ac.positionSource] ?? "--";
  document.getElementById("w-contact").textContent = formatAgo(ac.lastContact);

  fetchRoute(icao24).then((route) => {
    if (state.selected !== icao24) return; // selection changed while awaiting
    document.getElementById("d-origin").textContent = route?.origin || "UNKNOWN";
    document.getElementById("d-dest").textContent = route?.dest || "UNKNOWN";
    document.getElementById("w-origin").textContent = route?.origin || "UNKNOWN";
    document.getElementById("w-dest").textContent = route?.dest || "UNKNOWN";
  });
}

function deselectAircraft() {
  state.selected = null;
  el.details.classList.add("hidden");
  el.noSelection.classList.remove("hidden");
  el.detailWindow.classList.add("hidden");
  updateMapMarkers();
  updateMapTrajectory();
}

el.deselectBtn.addEventListener("click", deselectAircraft);
el.detailWindowClose.addEventListener("click", deselectAircraft);

// ---- Drag the detail window by its titlebar ----
let dragOffset = null;

el.detailWindowTitlebar.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".win-close")) return;
  const rect = el.detailWindow.getBoundingClientRect();
  dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  el.detailWindowTitlebar.setPointerCapture(e.pointerId);
});

el.detailWindowTitlebar.addEventListener("pointermove", (e) => {
  if (!dragOffset) return;
  const w = el.detailWindow.offsetWidth;
  const h = el.detailWindow.offsetHeight;
  const x = Math.max(0, Math.min(window.innerWidth - w, e.clientX - dragOffset.x));
  const y = Math.max(0, Math.min(window.innerHeight - h, e.clientY - dragOffset.y));
  el.detailWindow.style.left = `${x}px`;
  el.detailWindow.style.top = `${y}px`;
});

el.detailWindowTitlebar.addEventListener("pointerup", (e) => {
  dragOffset = null;
  el.detailWindowTitlebar.releasePointerCapture(e.pointerId);
});

el.locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    log("geolocation not supported by this browser");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      el.centerLat.value = pos.coords.latitude.toFixed(4);
      el.centerLon.value = pos.coords.longitude.toFixed(4);
      applySettings();
    },
    (err) => log(`geolocation error: ${err.message}`)
  );
});

el.applyBtn.addEventListener("click", applySettings);

function applySettings() {
  state.center = { lat: parseFloat(el.centerLat.value), lon: parseFloat(el.centerLon.value) };
  state.rangeKm = parseFloat(el.rangeKm.value) || 150;
  state.pollMs = (parseFloat(el.pollSec.value) || 15) * 1000;
  state.aircraft.clear();
  state.selected = null;
  el.details.classList.add("hidden");
  el.noSelection.classList.remove("hidden");
  el.detailWindow.classList.add("hidden");
  for (const marker of mapMarkers.values()) leafletMap && leafletMap.removeLayer(marker);
  mapMarkers.clear();
  recenterMap();
  restartPolling();
  log(`scope re-centered: ${state.center.lat}, ${state.center.lon} @ ${state.rangeKm}km`);
}

function restartPolling() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  fetchStates();
  state.pollTimer = setInterval(fetchStates, state.pollMs);
}

// ---- Boot ----
initMap();
restartPolling();
requestAnimationFrame(tick);
log("scope initialized");
