#!/usr/bin/env node
/**
 * Tests for the window math in index.html.
 *
 * The pure date/window logic lives in the <script id="window-math"> block of
 * index.html. These tests extract that exact block and run it, so the shipped
 * code is what gets tested — no duplication, no drift.
 *
 * Run: node --test test/window-math.test.mjs
 * (Node's built-in test runner; zero dependencies.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(here, '..', 'index.html'), 'utf8');

function extractWindowMath(source) {
  const m = /<script id="window-math">([\s\S]*?)<\/script>/.exec(source);
  assert.ok(m, 'index.html must contain a <script id="window-math"> block');
  return m[1];
}

const mod = { exports: {} };
vm.runInNewContext(extractWindowMath(html), { module: mod });
const wm = mod.exports;

function iso(s) {
  const d = wm.parseISO(s);
  assert.ok(d, 'test helper expected a valid ISO date, got ' + s);
  return d;
}

test('exports the full API', () => {
  for (const name of [
    'dateAt', 'startOfDay', 'parseISO', 'toISO', 'daysBetween', 'addDays',
    'lastDayOfMonth', 'fmtDate', 'crossesYear', 'windowForYear', 'isWithin',
    'nextWindowStart', 'windowStatus', 'sepWindow', 'formatCountdown',
    'coveredMonths', 'needsJanuaryReview', 'PLAN_WINDOWS', 'DEFAULT_CHECKLISTS'
  ]) {
    assert.ok(name in wm, 'missing export: ' + name);
  }
});

test('date helpers round-trip and reject bad input', () => {
  assert.equal(wm.toISO(wm.dateAt(2026, 3, 5)), '2026-03-05');
  assert.deepEqual(wm.toISO(iso('2026-11-01')), '2026-11-01');
  assert.equal(wm.parseISO('nope'), null);
  assert.equal(wm.parseISO('2026-13-01'), null);
  assert.equal(wm.parseISO('2026-02-30'), null);
  assert.equal(wm.parseISO('2026-2-01'), null); // strict format only
  assert.equal(wm.lastDayOfMonth(2026, 2), 28);
  assert.equal(wm.lastDayOfMonth(2024, 2), 29);
});

test('daysBetween and addDays', () => {
  assert.equal(wm.daysBetween(iso('2026-01-01'), iso('2026-01-01')), 0);
  assert.equal(wm.daysBetween(iso('2026-01-01'), iso('2026-01-02')), 1);
  assert.equal(wm.daysBetween(iso('2026-12-31'), iso('2027-01-01')), 1);
  assert.equal(wm.toISO(wm.addDays(iso('2026-01-01'), 60)), '2026-03-02');
  assert.equal(wm.toISO(wm.addDays(iso('2024-02-28'), 1)), '2024-02-29');
});

test('crossesYear detects year-spanning windows', () => {
  const marketplace = wm.PLAN_WINDOWS.find(w => w.id === 'marketplace');
  const medicare = wm.PLAN_WINDOWS.find(w => w.id === 'medicare-aep');
  assert.equal(wm.crossesYear(marketplace), true);
  assert.equal(wm.crossesYear(medicare), false);
});

test('windowForYear: marketplace spans Nov 1 -> Jan 15 of next year', () => {
  const marketplace = wm.PLAN_WINDOWS.find(w => w.id === 'marketplace');
  const w = wm.windowForYear(marketplace, 2026);
  assert.equal(wm.toISO(w.start), '2026-11-01');
  assert.equal(wm.toISO(w.end), '2027-01-15');
  const w2024 = wm.windowForYear(marketplace, 2024); // leap-year end year
  assert.equal(wm.toISO(w2024.end), '2025-01-15');
});

test('windowForYear: Medicare AEP stays inside one year', () => {
  const aep = wm.PLAN_WINDOWS.find(w => w.id === 'medicare-aep');
  const w = wm.windowForYear(aep, 2026);
  assert.equal(wm.toISO(w.start), '2026-10-15');
  assert.equal(wm.toISO(w.end), '2026-12-07');
});

test('isWithin is inclusive on both ends', () => {
  const marketplace = wm.PLAN_WINDOWS.find(w => w.id === 'marketplace');
  const w = wm.windowForYear(marketplace, 2026);
  assert.equal(wm.isWithin(iso('2026-11-01'), w.start, w.end), true);
  assert.equal(wm.isWithin(iso('2027-01-15'), w.start, w.end), true);
  assert.equal(wm.isWithin(iso('2026-10-31'), w.start, w.end), false);
  assert.equal(wm.isWithin(iso('2027-01-16'), w.start, w.end), false);
});

test('marketplace status: open mid-window with correct days remaining', () => {
  const marketplace = wm.PLAN_WINDOWS.find(w => w.id === 'marketplace');
  const st = wm.windowStatus(marketplace, iso('2026-12-20'));
  assert.equal(st.state, 'open');
  assert.equal(st.daysRemaining, 26); // Dec 20 -> Jan 15
  assert.equal(wm.toISO(st.start), '2026-11-01');
  assert.equal(wm.toISO(st.end), '2027-01-15');
});

test('marketplace status: last day reports zero days left', () => {
  const marketplace = wm.PLAN_WINDOWS.find(w => w.id === 'marketplace');
  const st = wm.windowStatus(marketplace, iso('2027-01-15'));
  assert.equal(st.state, 'open');
  assert.equal(st.daysRemaining, 0);
});

test('marketplace status: a January date belongs to the previous year window', () => {
  const marketplace = wm.PLAN_WINDOWS.find(w => w.id === 'marketplace');
  const st = wm.windowStatus(marketplace, iso('2027-01-05'));
  assert.equal(st.state, 'open');
  assert.equal(st.daysRemaining, 10);
});

test('marketplace status: after close, next window is Nov 1 the same calendar year', () => {
  const marketplace = wm.PLAN_WINDOWS.find(w => w.id === 'marketplace');
  const st = wm.windowStatus(marketplace, iso('2027-01-20'));
  assert.equal(st.state, 'upcoming');
  assert.equal(wm.toISO(st.nextStart), '2027-11-01');
  assert.equal(wm.toISO(st.nextEnd), '2028-01-15');
  assert.equal(st.daysUntilOpen, 285); // Jan 20 -> Nov 1, 2027 (non-leap)
});

test('marketplace status: day before open counts down to 1', () => {
  const marketplace = wm.PLAN_WINDOWS.find(w => w.id === 'marketplace');
  const st = wm.windowStatus(marketplace, iso('2026-10-31'));
  assert.equal(st.state, 'upcoming');
  assert.equal(st.daysUntilOpen, 1);
});

test('Medicare AEP: last day and day after', () => {
  const aep = wm.PLAN_WINDOWS.find(w => w.id === 'medicare-aep');
  const last = wm.windowStatus(aep, iso('2026-12-07'));
  assert.equal(last.state, 'open');
  assert.equal(last.daysRemaining, 0);
  const after = wm.windowStatus(aep, iso('2026-12-08'));
  assert.equal(after.state, 'upcoming');
  assert.equal(wm.toISO(after.nextStart), '2027-10-15');
  assert.equal(after.daysUntilOpen, 311);
});

test('Medicare Advantage OEP handles leap years', () => {
  const maoep = wm.PLAN_WINDOWS.find(w => w.id === 'medicare-maoep');
  const leap = wm.windowStatus(maoep, iso('2024-02-15'));
  assert.equal(leap.state, 'open');
  assert.equal(leap.daysRemaining, 45); // Feb 15 -> Mar 31 in a leap year
  const normal = wm.windowStatus(maoep, iso('2026-02-15'));
  assert.equal(normal.daysRemaining, 44);
});

test('year-round window (Medicaid/CHIP) is always open', () => {
  const medicaid = wm.PLAN_WINDOWS.find(w => w.id === 'medicaid');
  for (const d of ['2026-02-01', '2026-07-04', '2026-12-31', '2027-01-01']) {
    const st = wm.windowStatus(medicaid, iso(d));
    assert.equal(st.state, 'open');
    assert.equal(st.yearRound, true);
  }
});

test('custom (employer) window: unknown, open, upcoming, closed', () => {
  const employer = wm.PLAN_WINDOWS.find(w => w.id === 'employer');
  assert.equal(wm.windowStatus(employer, iso('2026-10-15')).state, 'unknown');
  const dates = { start: '2026-10-01', end: '2026-10-31' };
  assert.equal(wm.windowStatus(employer, iso('2026-10-15'), dates).state, 'open');
  assert.equal(wm.windowStatus(employer, iso('2026-10-15'), dates).daysRemaining, 16);
  const before = wm.windowStatus(employer, iso('2026-09-01'), dates);
  assert.equal(before.state, 'upcoming');
  assert.equal(before.daysUntilOpen, 30);
  assert.equal(wm.windowStatus(employer, iso('2026-11-01'), dates).state, 'closed');
  // invalid custom dates -> unknown, never a crash
  assert.equal(wm.windowStatus(employer, iso('2026-10-15'), { start: 'bad', end: 'worse' }).state, 'unknown');
  assert.equal(wm.windowStatus(employer, iso('2026-10-15'), { start: '2026-11-01', end: '2026-10-01' }).state, 'unknown');
});

test('sepWindow is a 60-day window starting on the event date', () => {
  const w = wm.sepWindow(iso('2026-01-01'));
  assert.equal(wm.toISO(w.start), '2026-01-01');
  assert.equal(wm.toISO(w.end), '2026-03-02'); // Jan 1 + 60 days (non-leap)
  const leap = wm.sepWindow(iso('2024-01-01'));
  assert.equal(wm.toISO(leap.end), '2024-03-01'); // Jan 1 + 60 days (leap)
});

test('SEP status flows through the custom-window path', () => {
  const pseudo = { custom: true }; // the app evaluates SEP windows as custom date ranges
  const win = wm.sepWindow(iso('2026-01-01'));
  const custom = { start: wm.toISO(win.start), end: wm.toISO(win.end) };
  assert.equal(wm.windowStatus(pseudo, iso('2026-02-01'), custom).state, 'open');
  assert.equal(wm.windowStatus(pseudo, iso('2026-02-01'), custom).daysRemaining, 29);
  assert.equal(wm.windowStatus(pseudo, iso('2026-03-02'), custom).daysRemaining, 0);
  assert.equal(wm.windowStatus(pseudo, iso('2025-12-15'), custom).state, 'upcoming');
  assert.equal(wm.windowStatus(pseudo, iso('2026-04-15'), custom).state, 'closed');
});

test('formatCountdown wording', () => {
  const marketplace = wm.PLAN_WINDOWS.find(w => w.id === 'marketplace');
  assert.equal(wm.formatCountdown(wm.windowStatus(marketplace, iso('2026-12-20'))), '26 days left');
  assert.equal(wm.formatCountdown(wm.windowStatus(marketplace, iso('2027-01-15'))), 'Last day — deadline is today');
  assert.equal(wm.formatCountdown(wm.windowStatus(marketplace, iso('2027-01-14'))), '1 day left');
  assert.equal(wm.formatCountdown(wm.windowStatus(marketplace, iso('2026-10-31'))), 'Opens tomorrow');
  // Nov 1 is the start date itself, so the window is already open:
  assert.equal(wm.formatCountdown(wm.windowStatus(marketplace, iso('2026-11-01'))), '75 days left');
  const employer = wm.PLAN_WINDOWS.find(w => w.id === 'employer');
  assert.equal(wm.formatCountdown(wm.windowStatus(employer, iso('2026-10-15'))), 'Set your dates to start tracking');
  const medicaid = wm.PLAN_WINDOWS.find(w => w.id === 'medicaid');
  assert.equal(wm.formatCountdown(wm.windowStatus(medicaid, iso('2026-06-01'))), 'Open year-round');
  assert.equal(wm.formatCountdown({ state: 'closed' }), 'Window closed');
});

test('coveredMonths: which months each window touches in a year', () => {
  const byId = id => wm.PLAN_WINDOWS.find(w => w.id === id);
  const eq = (actual, expected, msg) =>
    assert.deepEqual([...actual], expected, msg); // spread: arrays come from a vm realm
  eq(wm.coveredMonths(byId('marketplace'), 2026), [1, 11, 12]);
  eq(wm.coveredMonths(byId('medicare-aep'), 2026), [10, 11, 12]);
  eq(wm.coveredMonths(byId('medicare-maoep'), 2026), [1, 2, 3]);
  eq(wm.coveredMonths(byId('medicaid'), 2026), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  // employer window spanning Oct -> Nov touches both months
  eq(
    wm.coveredMonths(byId('employer'), 2026, { start: '2026-10-25', end: '2026-11-05' }),
    [10, 11]
  );
  eq(
    wm.coveredMonths(byId('employer'), 2026, { start: '2026-10-01', end: '2026-10-31' }),
    [10]
  );
});

test('needsJanuaryReview fires only in January before a review', () => {
  assert.equal(wm.needsJanuaryReview(iso('2027-01-05'), null), true);
  assert.equal(wm.needsJanuaryReview(iso('2027-01-05'), '2026-12-15'), true);
  assert.equal(wm.needsJanuaryReview(iso('2027-01-05'), '2027-01-03'), false);
  assert.equal(wm.needsJanuaryReview(iso('2027-01-05'), '2027-01-05'), false);
  assert.equal(wm.needsJanuaryReview(iso('2027-07-05'), null), false);
});

test('PLAN_WINDOWS data is complete and IDs are unique', () => {
  const ids = new Set();
  for (const w of wm.PLAN_WINDOWS) {
    assert.ok(w.id && w.name && w.note, 'window missing id/name/note: ' + JSON.stringify(w));
    assert.ok(!ids.has(w.id), 'duplicate id: ' + w.id);
    ids.add(w.id);
    if (!w.yearRound && !w.custom && !w.eventBased) {
      assert.ok(w.open && w.close, w.id + ' needs open/close');
      assert.ok(w.open.m >= 1 && w.open.m <= 12 && w.open.d >= 1 && w.open.d <= 31);
      assert.ok(w.close.m >= 1 && w.close.m <= 12 && w.close.d >= 1 && w.close.d <= 31);
    }
  }
  assert.equal(wm.PLAN_WINDOWS.length, 6);
});

test('every plan with a default has a non-empty starter checklist', () => {
  for (const w of wm.PLAN_WINDOWS) {
    assert.ok(
      Array.isArray(wm.DEFAULT_CHECKLISTS[w.id]) && wm.DEFAULT_CHECKLISTS[w.id].length > 0,
      'no default checklist for ' + w.id
    );
  }
});
