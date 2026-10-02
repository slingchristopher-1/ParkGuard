// node --test src/core/autopilot.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutopilot, PHASE } from './autopilot.js';

// Fake timers so two-minute waits take no time.
function harness(overrides = {}) {
  let queue = [];
  let seq = 0;
  const log = { notes: [], started: 0, stopped: 0 };

  const ap = createAutopilot({
    config: { dwellMinutes: 1, promptGapMs: 1000, ...overrides },
    notify: n => log.notes.push(n),
    startSession: () => { log.started += 1; },
    stopSession: () => { log.stopped += 1; },
    setTimer: (fn, ms) => { const id = ++seq; queue.push({ id, fn, ms }); return id; },
    clearTimer: id => { queue = queue.filter(t => t.id !== id); },
  });

  return {
    ap, log,
    // Run every pending timer once, as if the wait elapsed.
    elapse() {
      const due = queue;
      queue = [];
      due.forEach(t => t.fn());
    },
    park(seconds) { for (let i = 0; i < seconds; i++) ap.tick({ speed: 0, sessionActive: false }); },
    drive(seconds, sessionActive = true) { for (let i = 0; i < seconds; i++) ap.tick({ speed: 30, sessionActive }); },
  };
}

test('start: two prompts, then nothing happens', () => {
  const h = harness();
  h.park(60);
  assert.equal(h.ap.phase, PHASE.START_1);

  h.elapse();
  assert.equal(h.ap.phase, PHASE.START_2);

  h.elapse();
  assert.equal(h.ap.phase, PHASE.START_DONE);
  assert.equal(h.log.started, 0, 'must never start a session unasked');
});

test('start: tapping start now opens the session immediately', () => {
  const h = harness();
  h.park(60);
  h.ap.action('start-now');
  assert.equal(h.log.started, 1);
  assert.equal(h.ap.phase, PHASE.IDLE);
});

test('start: first cancel still earns a second reminder', () => {
  const h = harness();
  h.park(60);
  h.ap.action('start-cancel');
  assert.equal(h.log.started, 0);
  h.elapse();
  assert.equal(h.ap.phase, PHASE.START_2);

  h.ap.action('start-cancel');
  assert.equal(h.ap.phase, PHASE.START_DONE);
  h.elapse();
  assert.equal(h.log.started, 0, 'cancelled twice means off for this stop');
});

test('stop: two prompts, then the session keeps running', () => {
  const h = harness();
  h.drive(1);
  assert.equal(h.ap.phase, PHASE.STOP_1);

  h.elapse();
  assert.equal(h.ap.phase, PHASE.STOP_2);

  h.elapse();
  assert.equal(h.ap.phase, PHASE.STOP_DONE);
  assert.equal(h.log.stopped, 0, 'must never stop a session unasked');
});

test('stop: tapping stop now ends the session', () => {
  const h = harness();
  h.drive(1);
  h.ap.action('stop-now');
  assert.equal(h.log.stopped, 1);
});

test('a red light does not trigger anything', () => {
  const h = harness();
  h.drive(5);               // driving with a session — one stop prompt
  h.ap.action('stop-keep'); // "keep running"
  h.ap.action('stop-keep'); // and again on the reminder
  for (let i = 0; i < 20; i++) h.ap.tick({ speed: 0, sessionActive: true }); // waiting at the light
  h.drive(5);
  assert.equal(h.log.stopped, 0);
  assert.equal(h.log.started, 0);
});

test('driving away clears a pending start sequence', () => {
  const h = harness();
  h.park(60);
  assert.equal(h.ap.phase, PHASE.START_1);
  h.drive(1, false);
  assert.equal(h.ap.phase, PHASE.IDLE);
  h.elapse();
  assert.equal(h.log.started, 0);
});
