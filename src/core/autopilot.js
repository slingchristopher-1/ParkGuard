// Autopilot: the two-notification start/stop engine.
//
// SHARED CORE — changes here reach every brand and both platforms.
//
// The two defaults are deliberately opposite, so that ignoring your phone is
// never the expensive option:
//
//   START  prompt, prompt, then NOTHING.  You can't be charged by accident.
//   STOP   prompt, prompt, then KEEP RUNNING.  You can't be fined by accident.
//
// Everything is injected (timers, notifier, session actions) so the machine can
// be driven deterministically by a test or by the dev-tools speed slider.

export const DEFAULTS = {
  drivingSpeed: 8,      // km/h at or above which we treat it as driving
  dwellMinutes: 4,      // stationary this long before we consider you parked
  promptGapMs: 120000,  // 2 minutes between the two prompts
};

export const PHASE = {
  IDLE: 'idle',
  DWELLING: 'dwelling',   // stationary, counting towards the first start prompt
  START_1: 'start-1',
  START_2: 'start-2',
  START_DONE: 'start-done', // asked twice, no answer or cancelled — stays off
  STOP_1: 'stop-1',
  STOP_2: 'stop-2',
  STOP_DONE: 'stop-done',   // asked twice, no answer or declined — keeps running
};

export function createAutopilot(deps) {
  const cfg = { ...DEFAULTS, ...(deps.config || {}) };
  const notify = deps.notify;
  const startSession = deps.startSession;
  const stopSession = deps.stopSession;
  const setTimer = deps.setTimer || ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer || (id => clearTimeout(id));
  const onPhase = deps.onPhase || (() => {});

  let phase = PHASE.IDLE;
  let dwellSeconds = 0;
  let timer = null;
  let wasDriving = false;
  let enabled = { start: true, stop: true };

  function to(next) {
    phase = next;
    onPhase(phase, { dwellSeconds, dwellTarget: cfg.dwellMinutes * 60 });
  }

  function arm(ms, fn) {
    disarm();
    timer = setTimer(fn, ms);
  }

  function disarm() {
    if (timer !== null) { clearTimer(timer); timer = null; }
  }

  // ── start side ────────────────────────────────────────────────────────────
  function promptStart1() {
    to(PHASE.START_1);
    notify({
      id: 'start',
      stage: 1,
      title: 'Parking detected',
      body: 'Starting your session in 2 minutes.',
      actions: [
        { id: 'start-now', label: 'Start now', primary: true },
        { id: 'start-cancel', label: 'Cancel' },
      ],
    });
    arm(cfg.promptGapMs, promptStart2);
  }

  function promptStart2() {
    to(PHASE.START_2);
    notify({
      id: 'start',
      stage: 2,
      title: 'Last reminder',
      body: 'Tap to start. Do nothing and no session will be started.',
      actions: [
        { id: 'start-now', label: 'Start now', primary: true },
        { id: 'start-cancel', label: 'Not now' },
      ],
    });
    arm(cfg.promptGapMs, () => {
      // Asked twice, no answer. Deliberately do nothing: never charge by default.
      to(PHASE.START_DONE);
      notify({
        id: 'start',
        stage: 'resolved',
        title: 'No session started',
        body: 'You were not charged. Start one yourself if you need to.',
      });
    });
  }

  // ── stop side ─────────────────────────────────────────────────────────────
  function promptStop1() {
    to(PHASE.STOP_1);
    notify({
      id: 'stop',
      stage: 1,
      title: 'You drove off',
      body: 'Stop the parking session?',
      actions: [
        { id: 'stop-now', label: 'Stop now', primary: true },
        { id: 'stop-keep', label: 'Keep running' },
      ],
    });
    arm(cfg.promptGapMs, promptStop2);
  }

  function promptStop2() {
    to(PHASE.STOP_2);
    notify({
      id: 'stop',
      stage: 2,
      title: 'Last reminder',
      body: 'Tap to stop. Do nothing and the session keeps running.',
      actions: [
        { id: 'stop-now', label: 'Stop now', primary: true },
        { id: 'stop-keep', label: 'Keep running' },
      ],
    });
    arm(cfg.promptGapMs, () => {
      // Asked twice, no answer. Keep paying rather than risk a fine.
      to(PHASE.STOP_DONE);
      notify({
        id: 'stop',
        stage: 'resolved',
        title: 'Session still running',
        body: 'We left it on so you cannot be fined. Stop it yourself when you are done.',
      });
    });
  }

  return {
    get phase() { return phase; },
    get dwellSeconds() { return dwellSeconds; },

    setEnabled(next) { enabled = { ...enabled, ...next }; },
    setConfig(next) { Object.assign(cfg, next); },

    // One second of movement data. `speed` in km/h, `sessionActive` a boolean.
    tick({ speed, sessionActive }) {
      const driving = speed >= cfg.drivingSpeed;

      if (driving) {
        dwellSeconds = 0;
        // Leaving a parking spot clears anything the start side was doing.
        if (phase === PHASE.START_1 || phase === PHASE.START_2 ||
            phase === PHASE.START_DONE || phase === PHASE.DWELLING) {
          disarm();
          to(PHASE.IDLE);
        }
        if (sessionActive && enabled.stop && !wasDriving &&
            phase !== PHASE.STOP_1 && phase !== PHASE.STOP_2 && phase !== PHASE.STOP_DONE) {
          promptStop1();
        }
        wasDriving = true;
        return;
      }

      // Stationary.
      if (wasDriving) {
        wasDriving = false;
        // Pulling up again resets a resolved stop sequence.
        if (phase === PHASE.STOP_DONE) to(PHASE.IDLE);
      }

      if (sessionActive) return;
      if (!enabled.start) return;
      if (phase === PHASE.START_1 || phase === PHASE.START_2 || phase === PHASE.START_DONE) return;

      dwellSeconds += 1;
      if (phase !== PHASE.DWELLING) to(PHASE.DWELLING);
      if (dwellSeconds >= cfg.dwellMinutes * 60) promptStart1();
    },

    // A tap on one of the notification buttons.
    action(id) {
      switch (id) {
        case 'start-now':
          disarm();
          to(PHASE.IDLE);
          dwellSeconds = 0;
          startSession();
          break;
        case 'start-cancel':
          disarm();
          if (phase === PHASE.START_1) {
            // First cancel still earns one more reminder.
            arm(cfg.promptGapMs, promptStart2);
            notify({ id: 'start', stage: 'paused', title: 'Auto-start paused',
                     body: 'One more reminder in 2 minutes if you stay parked.' });
          } else {
            to(PHASE.START_DONE);
            notify({ id: 'start', stage: 'resolved', title: 'Auto-start off for this stop',
                     body: 'Start a session yourself if you need one.' });
          }
          break;
        case 'stop-now':
          disarm();
          to(PHASE.IDLE);
          stopSession();
          break;
        case 'stop-keep':
          disarm();
          if (phase === PHASE.STOP_1) {
            arm(cfg.promptGapMs, promptStop2);
            notify({ id: 'stop', stage: 'paused', title: 'Still running',
                     body: 'One more reminder in 2 minutes.' });
          } else {
            to(PHASE.STOP_DONE);
            notify({ id: 'stop', stage: 'resolved', title: 'Session kept running',
                     body: 'Stop it yourself when you are done.' });
          }
          break;
        default:
          break;
      }
    },

    // Session ended by any route — clear the stop sequence.
    sessionEnded() { disarm(); dwellSeconds = 0; to(PHASE.IDLE); },

    reset() { disarm(); dwellSeconds = 0; wasDriving = false; to(PHASE.IDLE); },
  };
}
