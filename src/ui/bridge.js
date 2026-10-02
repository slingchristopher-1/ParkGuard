// Wires the shared autopilot engine to the prototype's UI.
//
// The prototype used to decide for itself when a session starts and stops.
// That logic now lives in src/core/autopilot.js; this file is the only place
// that knows how those decisions are drawn on screen, and it re-provides the
// handful of globals the inline on* handlers still call.
import { createAutopilot } from '../core/autopilot.js';
import { watchMovement, platform } from '../core/location.js';
import { zoneAt } from '../core/zones.js';
import { initNotifications, deliver } from '../core/notify.js';
import { S, renderHome, showBanner, dismissBanner, startSession, stopSession, updateDwellStatus } from './app.js';

const BANNER_CLASS = {
  1: 'b-start',
  2: 'b-countdown',
  paused: 'b-info',
  resolved: 'b-alert',
};

// Draws a prompt as a banner with its action buttons, matching the prototype's
// look. On a phone build this is where a real local notification goes instead.
function renderPrompt(note) {
  const area = document.getElementById('banner-area');
  if (!area) return;

  const old = document.getElementById('b-autopilot');
  if (old) old.remove();

  const el = document.createElement('div');
  el.className = 'banner ' + (BANNER_CLASS[note.stage] || 'b-info');
  el.id = 'b-autopilot';
  el.style.cssText = 'flex-direction:column;gap:8px;align-items:stretch;';

  const text = document.createElement('div');
  text.style.cssText = 'font-size:13px;font-weight:600;';
  text.textContent = note.title;
  el.appendChild(text);

  const body = document.createElement('div');
  body.style.cssText = 'font-size:12px;opacity:0.85;font-weight:500;';
  body.textContent = note.body;
  el.appendChild(body);

  if (note.actions) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;';
    note.actions.forEach(action => {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.style.cssText =
        'flex:1;padding:7px 10px;border-radius:9px;border:none;font-size:12px;' +
        'font-weight:700;font-family:var(--font);cursor:pointer;' +
        (action.primary
          ? 'background:rgba(109,255,154,0.2);color:#6dff9a;'
          : 'background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);');
      btn.addEventListener('click', () => {
        autopilot.action(action.id);
        renderHome();
      });
      row.appendChild(btn);
    });
    el.appendChild(row);
  } else {
    // A resolved notice clears itself; nothing is pending any more.
    setTimeout(() => { const n = document.getElementById('b-autopilot'); if (n) n.remove(); }, 6000);
  }

  area.prepend(el);
}

export const autopilot = createAutopilot({
  config: { dwellMinutes: S.dwellTime },
  notify: note => {
    // On a phone the prompt has to reach a locked screen; the banner is the
    // browser's stand-in and the in-app echo once you are looking at the app.
    deliver(note).catch(() => {});
    renderPrompt(note);
  },
  startSession: () => { startSession(); renderHome(); },
  stopSession: () => { stopSession(true); renderHome(); },
  onPhase: () => { updateDwellStatus(); },
});

// Exposed for the dev-tools panel and for driving the sequence in a test.
window.autopilot = autopilot;

// ── real movement ───────────────────────────────────────────────────────────
// The dev-tools speed slider stays usable; a real fix comes in on top of it and
// simply overwrites S.speed, so the same tick loop drives both.
let stopWatching = null;

export async function startTracking() {
  if (stopWatching) return;
  await initNotifications(id => { autopilot.action(id); renderHome(); });
  stopWatching = await watchMovement(
    sample => {
      S.speed = Math.round(sample.speedKmh);
      autopilot.setEnabled({ start: S.autoStartEnabled, stop: S.autoStopEnabled });
      autopilot.setConfig({ dwellMinutes: S.dwellTime });
      autopilot.tick({ speed: S.speed, sessionActive: S.sessionActive });
      S.dwellCounter = autopilot.dwellSeconds;
      updateDwellStatus();
      resolveZone(sample.lat, sample.lon);
    },
    () => showBanner('geo', 'Location unavailable — autopilot paused', 'b-alert')
  );
}

export function stopTracking() {
  if (stopWatching) { stopWatching(); stopWatching = null; }
}

// Prices the spot you are actually standing on, from the bundled RDW snapshot.
// Only re-resolves when the fix has moved enough to possibly leave the zone,
// because a point-in-polygon sweep every second would be wasted work.
let lastFix = null;

async function resolveZone(lat, lon) {
  if (lat == null || lon == null) return;
  if (lastFix && Math.abs(lat - lastFix.lat) < 1e-4 && Math.abs(lon - lastFix.lon) < 1e-4) return;
  lastFix = { lat, lon };

  const here = await zoneAt(lat, lon);
  S.liveZone = here;

  // An unknown tariff must never read as free: leave the rate null and let the
  // UI say so.
  if (here.status === 'paid' || here.status === 'free-now') {
    S.sessionRate = here.rate;
    S.sessionZone = here.municipality ? `${here.label} · ${here.municipality}` : here.label;
  } else if (here.status === 'unknown') {
    S.sessionZone = here.label;
  }
  renderHome();
}

window.startTracking = startTracking;
window.stopTracking = stopTracking;
window.autopilotPlatform = platform;
window.zoneAt = zoneAt;   // dev tools: price any coordinate from the RDW snapshot

// ── globals the prototype's inline handlers still call ──────────────────────
window.tickDwell = function () {
  autopilot.setEnabled({ start: S.autoStartEnabled, stop: S.autoStopEnabled });
  autopilot.setConfig({ dwellMinutes: S.dwellTime });
  autopilot.tick({ speed: S.speed, sessionActive: S.sessionActive });
  S.dwellCounter = autopilot.dwellSeconds;
};

window.resetDwell = function () {
  autopilot.reset();
  S.dwellCounter = 0;
  const el = document.getElementById('b-autopilot');
  if (el) el.remove();
  dismissBanner('dwell');
  dismissBanner('dwell2');
  dismissBanner('dwellblocked');
};

window.getDwellProgress = function () {
  if (S.sessionActive || S.speed >= 8) return 0;
  return Math.min(100, (autopilot.dwellSeconds / (S.dwellTime * 60)) * 100);
};

window.confirmDwellStart = function () { autopilot.action('start-now'); renderHome(); };
window.cancelDwellNotif = function () { autopilot.action('start-cancel'); renderHome(); };

// The old free-running stop countdown is gone — the autopilot asks twice instead.
window.startCountdown = function () {};
window.cancelCountdown = function () {};
window.updateCdBanner = function () {};

// Driving is sampled every second by the tick loop, but the dev-tools slider
// jumps the speed instantly; feed that straight in so a stop prompt appears at
// once rather than up to a second later.
const originalSetSpeed = window.setSpeed;
window.setSpeed = function (v) {
  originalSetSpeed(v);
  if (S.sessionActive) {
    autopilot.setEnabled({ start: S.autoStartEnabled, stop: S.autoStopEnabled });
    autopilot.tick({ speed: S.speed, sessionActive: true });
  }
};
