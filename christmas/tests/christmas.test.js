#!/usr/bin/env node
/*
 * Tests for Christmas Without Debt.
 *
 *   node christmas/tests/christmas.test.js
 *
 * No installs needed, just Node. It checks:
 *   1. the dates: Christmas, the countdown, paydays for every pay frequency,
 *      the 20 December cutoff, rolling into next year, leap years, and
 *      thousands of random cases against a plain day-by-day count;
 *   2. the sums: zero savings, a gap, a surplus, the headline and tracker,
 *      including two cases worked out by hand;
 *   3. every "way to close the gap", on its own and together;
 *   3b. the ways to boost the pot (extra money coming in);
 *   4. the family message: the light-hearted and short ones never mention
 *      money troubles;
 *   5. saved plans are cleaned up safely;
 *   6. the words and settings: they match the logic, keep the brief's
 *      wording, and keep to the README house rules; nothing is sent anywhere.
 */

'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

var ROOT = path.join(__dirname, '..', '..');
var L = require(path.join(ROOT, 'christmas', 'logic.js'));

function loadBrowserFile(rel) {
  var sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  return JSON.parse(JSON.stringify(sandbox.window));
}
var CONTENT = loadBrowserFile('christmas/content.js').MIM_CHRISTMAS_CONTENT;
var CONFIG = loadBrowserFile('assets/config.js').MIM_CONFIG;

var passed = 0;
var failures = [];
function test(name, fn) {
  try { fn(); passed++; }
  catch (err) { failures.push(name + '\n    ' + err.message.split('\n').join('\n    ')); }
}

function day(y, m, d) { return { y: y, m: m, d: d }; }
function iso(date) { return L.dateString(date); }
function isoList(dates) { return dates.map(iso); }
var TODAY = day(2026, 10, 13); // a Tuesday
var CUTOFF_2026 = day(2026, 12, 20);

function plan(overrides) {
  var p = L.blank();
  Object.keys(overrides || {}).forEach(function (k) {
    if (k === 'ways') Object.assign(p.ways, overrides.ways);
    else p[k] = overrides[k];
  });
  return p;
}
function person(id, name, budget, relation, idea) {
  return { id: id, name: name, budget: String(budget), relation: relation, idea: idea || '' };
}

// The family used in hand-worked case 1.
function family() {
  return [
    person('p1', 'Sam', 100, 'partner'),
    person('p2', 'Ella', 80, 'child'),
    person('p3', 'Noah', 80, 'child'),
    person('p4', 'Mum', 40, 'parent'),
    person('p5', 'Dad', 40, 'parent')
  ];
}
function familyPlan(extra) {
  return plan(Object.assign({
    pay: { frequency: 'weekly', next: '2026-10-16' },
    saved: '150',
    perPayday: '40',
    people: family(),
    extras: { food: '180', decorations: '30', cards: '25', wrapping: '15' }
  }, extra || {}));
}

/* ------------------------------------------------------------------
 * 1. Dates
 * ------------------------------------------------------------------ */

test('Christmas is this year’s until Christmas Day, then next year’s', function () {
  assert.deepEqual(L.christmasFor(day(2026, 10, 13)), day(2026, 12, 25));
  assert.deepEqual(L.christmasFor(day(2026, 12, 24)), day(2026, 12, 25));
  assert.deepEqual(L.christmasFor(day(2026, 12, 25)), day(2026, 12, 25), 'on the day itself');
  assert.deepEqual(L.christmasFor(day(2026, 12, 26)), day(2027, 12, 25), 'from Boxing Day');
  assert.deepEqual(L.christmasFor(day(2026, 12, 31)), day(2027, 12, 25));
  assert.deepEqual(L.christmasFor(day(2027, 1, 1)), day(2027, 12, 25));
});

test('countdown (by hand): 13 October 2026 is 73 days, 10 weeks and 3 days', function () {
  // 18 days left of October + 30 in November + 25 in December = 73
  assert.deepEqual(L.countdown(TODAY), { days: 73, weeks: 10, extraDays: 3 });
});

test('countdown: Christmas Day, Christmas Eve and Boxing Day', function () {
  assert.deepEqual(L.countdown(day(2026, 12, 25)), { days: 0, weeks: 0, extraDays: 0 });
  assert.deepEqual(L.countdown(day(2026, 12, 24)), { days: 1, weeks: 0, extraDays: 1 });
  // 26 Dec 2026 to 25 Dec 2027: a whole non-leap year less one day
  assert.deepEqual(L.countdown(day(2026, 12, 26)), { days: 364, weeks: 52, extraDays: 0 });
});

test('countdown across a leap year', function () {
  // 1 Feb to 25 Dec: 28 or 29 days of February, 275 from March to November, 24 in December
  assert.equal(L.countdown(day(2027, 2, 1)).days, 28 + 275 + 24);
  assert.equal(L.countdown(day(2028, 2, 1)).days, 29 + 275 + 24);
  assert.deepEqual(L.countdown(day(2028, 2, 1)), { days: 328, weeks: 46, extraDays: 6 });
  // 31 Dec 2027 to Christmas 2028 (leap): 1 + 359
  assert.equal(L.countdown(day(2027, 12, 31)).days, 360);
});

test('dates read nicely', function () {
  assert.equal(L.formatLong(day(2026, 12, 25)), 'Friday 25 December 2026');
  assert.equal(L.formatLong(TODAY), 'Tuesday 13 October 2026');
  assert.equal(L.formatShort(day(2026, 12, 18)), '18 Dec');
  assert.equal(L.formatDayMonth(day(2026, 12, 20)), '20 December');
  assert.equal(L.parseDate('2027-02-29'), null, 'not a leap year');
  assert.deepEqual(L.parseDate('2028-02-29'), day(2028, 2, 29));
  assert.equal(L.parseDate('16/10/2026'), null);
});

/* Paydays, one frequency at a time (from Tuesday 13 October 2026, next payday Friday 16 October) */

test('paydays: weekly, 10 Fridays up to 18 December', function () {
  var p = L.paydays('weekly', '2026-10-16', TODAY, CUTOFF_2026);
  assert.deepEqual(isoList(p.dates), ['2026-10-16', '2026-10-23', '2026-10-30', '2026-11-06', '2026-11-13',
    '2026-11-20', '2026-11-27', '2026-12-04', '2026-12-11', '2026-12-18']);
  assert.equal(iso(p.lateDecember), '2026-12-25', 'Christmas Day pay is after the cutoff');
  assert.equal(p.rolled, false);
  assert.equal(p.far, false);
});

test('paydays: fortnightly, 5 up to 11 December', function () {
  var p = L.paydays('fortnightly', '2026-10-16', TODAY, CUTOFF_2026);
  assert.deepEqual(isoList(p.dates), ['2026-10-16', '2026-10-30', '2026-11-13', '2026-11-27', '2026-12-11']);
  assert.equal(iso(p.lateDecember), '2026-12-25');
});

test('paydays: four-weekly, 3 up to 11 December', function () {
  var p = L.paydays('fourWeekly', '2026-10-16', TODAY, CUTOFF_2026);
  assert.deepEqual(isoList(p.dates), ['2026-10-16', '2026-11-13', '2026-12-11']);
  assert.equal(p.lateDecember, null, 'the next one is 8 January');
});

test('paydays: monthly on the 28th, 2 (December’s is after the cutoff)', function () {
  var p = L.paydays('monthly', '2026-10-28', TODAY, CUTOFF_2026);
  assert.deepEqual(isoList(p.dates), ['2026-10-28', '2026-11-28']);
  assert.equal(iso(p.lateDecember), '2026-12-28');
});

test('paydays: monthly on the 31st keeps to the month end without drifting', function () {
  assert.deepEqual(isoList(L.paydays('monthly', '2026-10-31', TODAY, CUTOFF_2026).dates), ['2026-10-31', '2026-11-30']);
  var year = L.paydays('monthly', '2027-01-31', day(2027, 1, 5), day(2027, 12, 20));
  assert.deepEqual(isoList(year.dates).slice(0, 4), ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
  assert.equal(year.dates.length, 11, 'January to November');
});

test('paydays: 20 December counts, 21 December doesn’t', function () {
  assert.deepEqual(isoList(L.paydays('monthly', '2026-10-20', TODAY, CUTOFF_2026).dates), ['2026-10-20', '2026-11-20', '2026-12-20']);
  assert.deepEqual(isoList(L.paydays('monthly', '2026-10-21', TODAY, CUTOFF_2026).dates), ['2026-10-21', '2026-11-21']);
  assert.equal(L.paydays('weekly', '2026-12-20', day(2026, 12, 14), CUTOFF_2026).dates.length, 1);
  assert.equal(L.paydays('weekly', '2026-12-21', day(2026, 12, 14), CUTOFF_2026).dates.length, 0);
});

test('paydays: a payday today counts', function () {
  var p = L.paydays('weekly', '2026-10-13', TODAY, CUTOFF_2026);
  assert.equal(iso(p.dates[0]), '2026-10-13');
  assert.equal(p.dates.length, 10);
});

test('paydays: a next payday after 20 December means none before Christmas', function () {
  var p = L.paydays('monthly', '2026-12-28', day(2026, 12, 13), CUTOFF_2026);
  assert.equal(p.status, 'ok');
  assert.deepEqual(p.dates, []);
  assert.equal(iso(p.lateDecember), '2026-12-28');
  var r = L.compute(plan({ pay: { frequency: 'monthly', next: '2026-12-28' }, saved: '100', perPayday: '50', people: family() }), day(2026, 12, 13));
  assert.equal(r.paydays, 0);
  assert.equal(r.available, 100, 'only what’s already saved');
  assert.equal(r.headline.kind, 'noPaydays');
  assert.equal(r.short, 240);
  assert.deepEqual(r.tracker, []);
});

test('paydays: from 21 December there are none left, whatever the date given', function () {
  L.FREQUENCIES.forEach(function (f) {
    assert.equal(L.paydays(f, '2026-12-22', day(2026, 12, 21), CUTOFF_2026).dates.length, 0, f);
  });
});

test('paydays: a date that has gone rolls on to the next payday', function () {
  var weekly = L.paydays('weekly', '2026-10-09', TODAY, CUTOFF_2026);
  assert.equal(weekly.rolled, true);
  assert.equal(iso(weekly.first), '2026-10-16');
  assert.equal(weekly.dates.length, 10);
  var monthly = L.paydays('monthly', '2026-09-28', TODAY, CUTOFF_2026);
  assert.equal(iso(monthly.first), '2026-10-28');
  var old = L.paydays('fortnightly', '2020-01-03', TODAY, CUTOFF_2026);
  assert.equal(old.rolled, true);
  assert.ok(L.compareDates(old.first, TODAY) >= 0 && L.daysBetween(TODAY, old.first) < 14);
});

test('paydays: a next payday more than one pay period away is flagged', function () {
  assert.equal(L.paydays('weekly', '2026-10-20', TODAY, CUTOFF_2026).far, false, '7 days');
  assert.equal(L.paydays('weekly', '2026-10-21', TODAY, CUTOFF_2026).far, true, '8 days');
  assert.equal(L.paydays('monthly', '2026-11-13', TODAY, CUTOFF_2026).far, false);
  assert.equal(L.paydays('monthly', '2026-11-14', TODAY, CUTOFF_2026).far, true);
});

test('paydays: nothing to count without a frequency and a date', function () {
  assert.equal(L.paydays('', '2026-10-16', TODAY, CUTOFF_2026).status, 'none');
  assert.equal(L.paydays('weekly', '', TODAY, CUTOFF_2026).status, 'none');
  assert.equal(L.paydays('daily', '2026-10-16', TODAY, CUTOFF_2026).status, 'none');
  var r = L.compute(plan({ saved: '50', people: family() }), TODAY);
  assert.equal(r.headline.kind, 'needPayday');
  assert.equal(r.available, 50);
});

test('after Christmas: plans roll to next year, weekly from Friday 1 January 2027', function () {
  var t = day(2026, 12, 27);
  var r = L.compute(plan({ pay: { frequency: 'weekly', next: '2027-01-01' }, perPayday: '10', people: family() }), t);
  assert.deepEqual(r.christmas, day(2027, 12, 25));
  assert.deepEqual(r.cutoff, day(2027, 12, 20));
  assert.equal(r.days, 363);
  assert.equal(r.paydays, 51, '1 January to 17 December, every Friday');
  assert.equal(iso(r.pay.dates[50]), '2027-12-17');
  assert.equal(iso(r.pay.lateDecember), '2027-12-24');
});

test('after Christmas: the week between Christmas and New Year counts toward next year', function () {
  var r = L.compute(plan({ pay: { frequency: 'weekly', next: '2026-12-31' }, perPayday: '10' }), day(2026, 12, 26));
  assert.equal(iso(r.pay.dates[0]), '2026-12-31');
  assert.equal(r.paydays, 51, '31 Dec 2026 to 16 Dec 2027');
});

test('Christmas Day itself: nothing left to save from', function () {
  var r = L.compute(plan({ pay: { frequency: 'weekly', next: '2026-12-25' }, perPayday: '10', people: family() }), day(2026, 12, 25));
  assert.equal(r.days, 0);
  assert.equal(r.paydays, 0);
});

test('leap year: monthly from 29 February 2028 runs to 29 November', function () {
  var r = L.paydays('monthly', '2028-02-29', day(2028, 2, 1), day(2028, 12, 20));
  assert.equal(r.dates.length, 10);
  assert.deepEqual(isoList(r.dates).slice(0, 3), ['2028-02-29', '2028-03-29', '2028-04-29']);
  assert.equal(iso(r.dates[9]), '2028-11-29');
  assert.equal(iso(r.lateDecember), '2028-12-29');
});

test('leap year: the end of January lands on 29 February, then back to the 31st', function () {
  var r = L.paydays('monthly', '2028-01-31', day(2028, 1, 10), day(2028, 12, 20));
  assert.deepEqual(isoList(r.dates).slice(0, 3), ['2028-01-31', '2028-02-29', '2028-03-31']);
  var notLeap = L.paydays('monthly', '2027-01-31', day(2027, 1, 10), day(2027, 12, 20));
  assert.equal(iso(notLeap.dates[1]), '2027-02-28');
});

test('leap year: weekly steps over 29 February', function () {
  var r = L.paydays('weekly', '2028-02-26', day(2028, 2, 20), day(2028, 12, 20));
  assert.deepEqual(isoList(r.dates).slice(0, 3), ['2028-02-26', '2028-03-04', '2028-03-11']);
});

/* A plain day-by-day count, written separately from logic.js, checked against
   thousands of random todays, paydays and frequencies (2025 to 2030, so
   leap years and year ends are included). */

function referencePaydays(frequency, nextIso, t) {
  var period = { weekly: 7, fortnightly: 14, fourWeekly: 28 }[frequency];
  var start = new Date(nextIso + 'T00:00:00Z');
  var now = Date.UTC(t.y, t.m - 1, t.d);
  var christmasYear = t.m === 12 && t.d > 25 ? t.y + 1 : t.y;
  var cutoff = Date.UTC(christmasYear, 11, 20);
  var out = [];
  for (var ms = Math.max(now, start.getTime()); ms <= cutoff; ms += 86400000) {
    var d = new Date(ms);
    var hit;
    if (period) {
      hit = Math.round((ms - start.getTime()) / 86400000) % period === 0;
    } else {
      var lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      hit = d.getUTCDate() === Math.min(start.getUTCDate(), lastDay);
    }
    if (hit) out.push(d.toISOString().slice(0, 10));
  }
  // A payday in the past rolls forward too: count every occurrence on or after today.
  if (start.getTime() < now) {
    out = [];
    var k = 0;
    while (k < 2000) {
      var x;
      if (period) x = new Date(start.getTime() + k * period * 86400000);
      else {
        var y = start.getUTCFullYear() + Math.floor((start.getUTCMonth() + k) / 12);
        var m = (start.getUTCMonth() + k) % 12;
        var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        x = new Date(Date.UTC(y, m, Math.min(start.getUTCDate(), last)));
      }
      if (x.getTime() > cutoff) break;
      if (x.getTime() >= now) out.push(x.toISOString().slice(0, 10));
      k++;
    }
  }
  return out;
}

function rng(seed) {
  return function () {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
var random = rng(20261225);
function pick(list) { return list[Math.floor(random() * list.length)]; }
function randomDate(fromYear, years) {
  var ms = Date.UTC(fromYear, 0, 1) + Math.floor(random() * years * 365.25) * 86400000;
  var d = new Date(ms);
  return day(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

var RANDOM_PAYDAY_CASES = 6000;
test('paydays match a plain day-by-day count in ' + RANDOM_PAYDAY_CASES + ' random cases', function () {
  for (var i = 0; i < RANDOM_PAYDAY_CASES; i++) {
    var t = randomDate(2025, 5);
    var f = pick(L.FREQUENCIES);
    // Mostly the next payday soon after today, sometimes before it or months away.
    var offset = Math.floor(random() * 50) - 10;
    var next = iso(L.addDays(t, offset));
    var got = isoList(L.compute(plan({ pay: { frequency: f, next: next } }), t).pay.dates);
    var want = referencePaydays(f, next, t);
    assert.deepEqual(got, want, f + ' from ' + next + ' on ' + iso(t));
  }
});

/* ------------------------------------------------------------------
 * 2. The sums
 * ------------------------------------------------------------------ */

test('hand-worked case 1: a gap of £40, closed by a £20 family cap', function () {
  // Available: £150 saved + £40 × 10 weekly paydays = £550
  // Gifts: 100 + 80 + 80 + 40 + 40 = £340. Everything else: 180 + 30 + 25 + 15 = £250.
  // Cost £590, so £40 short. Per payday: (590 − 150) ÷ 10 = £44, which is £4 more.
  var r = L.compute(familyPlan(), TODAY);
  assert.equal(r.paydays, 10);
  assert.equal(r.available, 550);
  assert.equal(r.gifts, 340);
  assert.equal(r.extras, 250);
  assert.equal(r.cost, 590);
  assert.equal(r.gap, 40);
  assert.equal(r.short, 40);
  assert.equal(r.spare, 0);
  assert.equal(r.balanced, false);
  assert.equal(r.headline.kind, 'need');
  assert.equal(r.headline.amount, 44);
  assert.equal(r.headline.more, 4);
  assert.equal(iso(r.headline.date), '2026-12-18');

  // A £20 cap on presents for Mum and Dad saves £40 and it balances to the penny.
  var capped = L.compute(familyPlan({ ways: { cap: true } }), TODAY);
  assert.equal(capped.ways.cap.saving, 40);
  assert.equal(capped.cost, 550);
  assert.equal(capped.gap, 0);
  assert.equal(capped.balanced, true);
  assert.equal(capped.headline.kind, 'covered');
  assert.equal(capped.headline.amount, 40);
  assert.equal(iso(capped.headline.date), '2026-12-18', 'the 10th payday: 150 + 40 × 10 = 550');
});

test('hand-worked case 2: monthly on the 31st, nothing saved yet, £1,000 Christmas', function () {
  // Paydays 31 October and 30 November (31 December is after the cutoff).
  // £1,000 ÷ 2 = £500 each payday, paid for by 30 November.
  var r = L.compute(plan({
    pay: { frequency: 'monthly', next: '2026-10-31' },
    people: [person('p1', 'Everyone', 600, 'other')],
    extras: { food: '400' }
  }), TODAY);
  assert.equal(r.paydays, 2);
  assert.equal(r.cost, 1000);
  assert.equal(r.available, 0);
  assert.equal(r.headline.kind, 'need');
  assert.equal(r.headline.amount, 500);
  assert.equal(r.headline.more, 500);
  assert.equal(iso(r.headline.date), '2026-11-30');
  assert.deepEqual(r.tracker.map(function (t) { return [t.key, t.amount, t.running, t.covers]; }),
    [['2026-10-31', 500, 500, false], ['2026-11-30', 500, 1000, true]]);
});

test('zero savings: nothing saved and nothing a payday', function () {
  var r = L.compute(plan({ pay: { frequency: 'weekly', next: '2026-10-16' }, saved: '0', perPayday: '0', extras: { food: '300' } }), TODAY);
  assert.equal(r.available, 0);
  assert.equal(r.short, 300);
  assert.equal(r.headline.kind, 'need');
  assert.equal(r.headline.amount, 30, '£300 over 10 paydays');
  assert.equal(r.headline.more, 30);
  var blank = L.compute(plan({ pay: { frequency: 'weekly', next: '2026-10-16' } }), TODAY);
  assert.equal(blank.cost, 0);
  assert.equal(blank.headline.kind, 'empty');
  assert.equal(blank.balanced, false, 'nothing to celebrate yet');
});

test('the amount per payday rounds up to the pound, so it’s always enough', function () {
  var r = L.compute(plan({ pay: { frequency: 'fourWeekly', next: '2026-10-16' }, extras: { food: '1000' } }), TODAY);
  assert.equal(r.paydays, 3);
  assert.equal(r.headline.amount, 334, '£333.33 rounds up');
  assert.ok(r.headline.amount * 3 >= 1000);
  assert.equal(r.tracker[2].covers, true);
});

test('a surplus: saving more than enough is paid for early', function () {
  // £150 + £60 × 8 = £630 ≥ £590, so the 8th payday (4 December) covers it.
  var r = L.compute(familyPlan({ perPayday: '60' }), TODAY);
  assert.equal(r.available, 750);
  assert.equal(r.spare, 160);
  assert.equal(r.short, 0);
  assert.equal(r.balanced, true);
  assert.equal(r.headline.kind, 'covered');
  assert.equal(r.headline.amount, 60);
  assert.equal(iso(r.headline.date), '2026-12-04');
  assert.equal(r.tracker.filter(function (t) { return t.covers; }).length, 1);
  assert.equal(r.tracker[7].covers, true);
});

test('a gap versus a surplus, either side of the line', function () {
  var short = L.compute(familyPlan({ perPayday: '43.99' }), TODAY);
  assert.equal(short.short, 0.1);
  assert.equal(short.balanced, false);
  var even = L.compute(familyPlan({ perPayday: '44' }), TODAY);
  assert.equal(even.spare, 0);
  assert.equal(even.gap, 0);
  assert.equal(even.balanced, true);
  assert.equal(even.headline.kind, 'covered');
});

test('already saved enough: Christmas is already paid for', function () {
  var r = L.compute(familyPlan({ saved: '600', perPayday: '0' }), TODAY);
  assert.equal(r.headline.kind, 'already');
  assert.equal(r.balanced, true);
  assert.deepEqual(r.tracker, [], 'nothing to put aside');
});

test('pence never drift', function () {
  var r = L.compute(plan({ extras: { food: '0.10', cards: '0.20', wrapping: '1000.70' } }), TODAY);
  assert.equal(r.extras, 1001);
  assert.equal(L.formatMoney(r.extras), '£1,001');
});

test('typed amounts and how they show', function () {
  assert.equal(L.toPence('£1,250.50'), 125050);
  assert.equal(L.toPence(' 25 '), 2500);
  assert.equal(L.toPence(''), 0);
  assert.equal(L.toPence('abc'), 0);
  assert.equal(L.toPence('-50'), 0);
  assert.equal(L.moneyProblem('-50'), 'negative');
  assert.equal(L.moneyProblem('ten'), 'invalid');
  assert.equal(L.moneyProblem('£20'), null);
  assert.equal(L.formatMoney(44), '£44');
  assert.equal(L.formatMoney(12.5), '£12.50');
  assert.equal(L.formatMoney(null), '—');
});

test('the safety-net tick is carried through', function () {
  assert.equal(L.compute(plan({ worried: true }), TODAY).worried, true);
  assert.equal(L.compute(plan({}), TODAY).worried, false);
});

/* ------------------------------------------------------------------
 * 3. Ways to close the gap
 * ------------------------------------------------------------------ */

function costWith(ways, extra) { return L.compute(familyPlan(Object.assign({ ways: ways }, extra || {})), TODAY); }

test('way: lower someone’s budget (only ever down)', function () {
  var r = costWith({ lower: true, lowered: { p1: '70', p4: '25', p5: '' } });
  assert.equal(r.ways.lower.saving, 45, 'Sam 100 → 70, Mum 40 → 25, Dad left alone');
  assert.equal(r.cost, 545);
  var higher = costWith({ lower: true, lowered: { p4: '60' } });
  assert.equal(higher.ways.lower.saving, 0, 'a higher figure isn’t a saving');
  assert.equal(higher.cost, 590);
  var off = costWith({ lower: false, lowered: { p4: '25' } });
  assert.equal(off.cost, 590, 'switched off, the old budgets are back');
  assert.equal(off.ways.lower.could, 15);
});

test('way: a family Secret Santa replaces the grown-ups’ presents with one', function () {
  var r = costWith({ secretSanta: true, santaAmount: '20' });
  assert.equal(r.ways.secretSanta.saving, 60, 'Mum £40 + Dad £40 → one £20 present');
  assert.equal(r.santa, 20);
  assert.equal(r.people.filter(function (p) { return p.removed === 'secretSanta'; }).length, 2);
  assert.equal(r.people.filter(function (p) { return !p.removed; }).length, 3, 'partner and children untouched');
  assert.equal(costWith({ secretSanta: true, santaAmount: '' }).santa, 20, 'blank means the £20 default');
  var dear = costWith({ secretSanta: true, santaAmount: '100' });
  assert.equal(dear.ways.secretSanta.saving, 0, 'not if it costs more');
  assert.equal(dear.santa, null);
});

test('way: Secret Santa needs two or more family grown-ups', function () {
  var one = L.compute(plan({ people: [person('p1', 'Mum', 50, 'parent'), person('p2', 'Kid', 30, 'child')], ways: { secretSanta: true } }), TODAY);
  assert.equal(one.ways.secretSanta.problem, 'needGrownUps');
  assert.equal(one.ways.secretSanta.saving, 0);
  var cousins = L.compute(plan({ people: [person('p1', 'Aunt', 30, 'family'), person('p2', 'Gran', 30, 'grandparent'), person('p3', 'Bro', 30, 'sibling')], ways: { secretSanta: true } }), TODAY);
  assert.equal(cousins.ways.secretSanta.saving, 70, 'all grown-up family count');
});

test('way: a family spending cap only touches the grown-ups', function () {
  var r = costWith({ cap: true, capAmount: '25' });
  assert.equal(r.ways.cap.saving, 30, 'Mum and Dad £40 → £25');
  var sam = r.people.filter(function (p) { return p.id === 'p1'; })[0];
  assert.equal(sam.budget, 100, 'the partner keeps their budget');
  assert.equal(costWith({ cap: true, capAmount: '' }).ways.cap.saving, 40, 'blank means the £20 default');
  assert.equal(costWith({ cap: true, capAmount: '50' }).ways.cap.saving, 0, 'a cap above the budgets saves nothing');
});

test('way: presents for the children only', function () {
  var r = costWith({ childrenOnly: true });
  assert.equal(r.ways.childrenOnly.saving, 80);
  assert.equal(r.cost, 510);
  assert.equal(r.ways.secretSanta.blockedBy, 'childrenOnly');
  assert.equal(r.ways.cap.blockedBy, 'childrenOnly');
  var both = costWith({ childrenOnly: true, secretSanta: true, cap: true });
  assert.equal(both.cost, 510, 'Secret Santa and the cap have nothing left to do');
  assert.equal(both.ways.secretSanta.saving, 0);
  assert.equal(both.ways.cap.saving, 0);
});

test('way: homemade presents or gifts of time', function () {
  var r = costWith({ homemade: true, homemadeIds: ['p1', 'p4'], materials: '5' });
  assert.equal(r.ways.homemade.saving, 130, 'Sam 100 → 5 and Mum 40 → 5');
  assert.equal(r.people.filter(function (p) { return p.homemade; }).length, 2);
  assert.equal(costWith({ homemade: true, homemadeIds: ['p4'], materials: '' }).ways.homemade.saving, 40, 'blank materials is a gift of time');
  assert.equal(costWith({ homemade: true, homemadeIds: [] }).ways.homemade.saving, 0, 'nobody picked yet');
  var gone = costWith({ homemade: true, homemadeIds: ['p4'], childrenOnly: true });
  assert.equal(gone.ways.homemade.saving, 0, 'no present to make for someone not getting one');
});

test('way: cut back on one of the extras', function () {
  var r = costWith({ cutBack: true, cutLine: 'food', cutAmount: '120' });
  assert.equal(r.ways.cutBack.saving, 60);
  assert.equal(r.extras, 190);
  assert.equal(costWith({ cutBack: true, cutLine: 'food', cutAmount: '' }).ways.cutBack.saving, 0, 'no figure yet');
  assert.equal(costWith({ cutBack: true, cutLine: 'food', cutAmount: '200' }).ways.cutBack.saving, 0, 'not upwards');
  var own = L.compute(plan({ ownExtras: [{ id: 'x1', label: 'Pantomime', amount: '90' }], ways: { cutBack: true, cutLine: 'x1', cutAmount: '45' } }), TODAY);
  assert.equal(own.ways.cutBack.saving, 45, 'your own lines too');
  assert.equal(L.compute(plan({ ways: { cutBack: true } }), TODAY).ways.cutBack.problem, 'needExtras');
});

test('ways: every one on at once adds up', function () {
  var r = costWith({
    lower: true, lowered: { p1: '80' },
    homemade: true, homemadeIds: ['p2'], materials: '10',
    cap: true, capAmount: '30',
    secretSanta: true, santaAmount: '25',
    cutBack: true, cutLine: 'food', cutAmount: '150'
  });
  // lower 20, homemade 70, cap 20 (40 → 30 twice), Secret Santa 35 (60 → 25), cut back 30
  assert.equal(r.ways.lower.saving, 20);
  assert.equal(r.ways.homemade.saving, 70);
  assert.equal(r.ways.cap.saving, 20);
  assert.equal(r.ways.secretSanta.saving, 35);
  assert.equal(r.ways.cutBack.saving, 30);
  assert.equal(r.totalSaving, 175);
  assert.equal(r.cost, 590 - 175);
});

test('ways: “could save” is exactly what switching it on saves', function () {
  var base = familyPlan({ ways: { lowered: { p4: '30' }, homemadeIds: ['p1'], cutLine: 'food', cutAmount: '100' } });
  var r = L.compute(base, TODAY);
  L.WAYS.forEach(function (id) {
    var on = JSON.parse(JSON.stringify(base));
    on.ways[id] = true;
    assert.equal(r.ways[id].could, r.cost - L.compute(on, TODAY).cost, id);
  });
});

test('ways: switching any one on never makes Christmas dearer (2,000 random plans)', function () {
  var relations = L.RELATIONS;
  for (var i = 0; i < 2000; i++) {
    var people = [];
    var n = Math.floor(random() * 9);
    for (var j = 0; j < n; j++) people.push(person('p' + (j + 1), 'P' + j, Math.floor(random() * 120), pick(relations)));
    var p = plan({ people: people, extras: { food: String(Math.floor(random() * 200)), travel: String(Math.floor(random() * 80)) } });
    L.WAYS.forEach(function (id) { p.ways[id] = random() < 0.5; });
    p.ways.lowered = { p1: String(Math.floor(random() * 100)), p3: String(Math.floor(random() * 100)) };
    p.ways.homemadeIds = people.filter(function () { return random() < 0.3; }).map(function (x) { return x.id; });
    p.ways.materials = String(Math.floor(random() * 15));
    p.ways.capAmount = String(Math.floor(random() * 60));
    p.ways.santaAmount = String(Math.floor(random() * 60));
    p.ways.cutLine = pick(['food', 'travel', '']);
    p.ways.cutAmount = String(Math.floor(random() * 150));
    var r = L.compute(p, TODAY);
    var stepTotal = L.WAYS.reduce(function (t, id) { return t + Math.round(r.ways[id].saving * 100); }, 0);
    assert.equal(stepTotal, Math.round(r.totalSaving * 100), 'savings add up');
    assert.ok(r.cost <= r.costBefore, 'never dearer than with no ways');
    L.WAYS.forEach(function (id) {
      if (p.ways[id]) return;
      var on = JSON.parse(JSON.stringify(p));
      on.ways[id] = true;
      assert.ok(L.compute(on, TODAY).cost <= r.cost, id + ' made it dearer');
      assert.ok(r.ways[id].could >= 0, id + ' could save less than nothing');
    });
  }
});

test('ways: when a plan balances after the ideas, it’s covered', function () {
  var r = L.compute(plan({ people: [person('p1', 'Mum', 40, 'parent')], ways: { childrenOnly: true } }), TODAY);
  assert.equal(r.cost, 0);
  assert.equal(r.balanced, true);
  assert.equal(r.headline.kind, 'already');
});

test('ways: which ones can work with the list', function () {
  var empty = L.compute(L.blank(), TODAY).ways;
  assert.equal(empty.lower.problem, 'needPeople');
  assert.equal(empty.homemade.problem, 'needPeople');
  assert.equal(empty.secretSanta.problem, 'needGrownUps');
  assert.equal(empty.cap.problem, 'needGrownUp');
  assert.equal(empty.childrenOnly.problem, 'needGrownUp');
  assert.equal(empty.cutBack.problem, 'needExtras');
  var full = L.compute(familyPlan(), TODAY).ways;
  L.WAYS.forEach(function (id) { assert.equal(full[id].problem, null, id); });
});

/* ------------------------------------------------------------------
 * 3b. Ways to boost the pot (extra money coming in)
 * ------------------------------------------------------------------ */

function boost(id, label, amount) { return { id: id, label: label, amount: String(amount) }; }

test('boost: extra money closes the £40 gap in hand-worked case 1', function () {
  // £150 saved + £25 from Vinted + £15 from an extra shift + £40 × 10 paydays = £590, the whole cost.
  var r = L.compute(familyPlan({ boosts: [boost('b6', 'Sell on Vinted', 25), boost('b7', 'An extra shift', 15)] }), TODAY);
  assert.equal(r.extra, 40);
  assert.equal(r.available, 590);
  assert.equal(r.cost, 590, 'extra money never changes the cost');
  assert.equal(r.short, 0);
  assert.equal(r.balanced, true);
  assert.equal(r.gapWithoutExtra, 40);
  assert.equal(r.extraCovers, 40);
  assert.equal(r.headline.kind, 'covered');
  assert.equal(r.headline.amount, 40);
  assert.equal(r.tracker[0].running, 230, 'the tracker starts from saved + extra: 150 + 40 + 40');
  assert.deepEqual(r.boosts.map(function (b) { return [b.label, b.amount]; }), [['Sell on Vinted', 25], ['An extra shift', 15]]);
});

test('boost: a little extra chips away at the gap and lowers the payday amount', function () {
  // (590 − 150 − 25) ÷ 10 = £41.50, rounded up to £42: £2 more than now instead of £4.
  var r = L.compute(familyPlan({ boosts: [boost('b6', 'Overtime', 25)] }), TODAY);
  assert.equal(r.short, 15);
  assert.equal(r.extraCovers, 25);
  assert.equal(r.gapWithoutExtra, 40);
  assert.equal(r.headline.kind, 'need');
  assert.equal(r.headline.amount, 42);
  assert.equal(r.headline.more, 2);
});

test('boost: more than enough leaves some to spare, and can pay for Christmas outright', function () {
  var spare = L.compute(familyPlan({ boosts: [boost('b6', 'Christmas temp work', 100)] }), TODAY);
  assert.equal(spare.spare, 60);
  assert.equal(spare.extraCovers, 40, 'covers the gap, not more');
  var outright = L.compute(familyPlan({ perPayday: '0', boosts: [boost('b6', 'Christmas temp work', 440)] }), TODAY);
  assert.equal(outright.headline.kind, 'already', '150 saved + 440 extra = 590');
});

test('boost: with no paydays left, extra money is what closes the gap', function () {
  var r = L.compute(familyPlan({ pay: { frequency: 'weekly', next: '2026-12-25' }, boosts: [boost('b6', 'Sell on Facebook Marketplace or eBay', 200)] }), TODAY);
  assert.equal(r.paydays, 0);
  assert.equal(r.available, 350);
  assert.equal(r.short, 240);
  assert.equal(r.headline.kind, 'noPaydays');
});

test('boost: blank, minus or nonsense amounts add nothing, and adding one never shrinks the pot', function () {
  var r = L.compute(familyPlan({ boosts: [boost('b6', 'Overtime', ''), boost('b7', 'Odd jobs', '-50'), boost('b8', 'Babysitting', 'lots')] }), TODAY);
  assert.equal(r.extra, 0);
  assert.equal(r.available, 550);
  for (var i = 0; i < 500; i++) {
    var amounts = [0, 1, 2].map(function () { return String(Math.floor(Math.random() * 30000) / 100); });
    var before = L.compute(familyPlan({ boosts: amounts.slice(0, 2).map(function (a, j) { return boost('b' + (j + 6), 'x', a); }) }), TODAY);
    var after = L.compute(familyPlan({ boosts: amounts.map(function (a, j) { return boost('b' + (j + 6), 'x', a); }) }), TODAY);
    assert.ok(after.available >= before.available && after.short <= before.short, amounts.join(', '));
    assert.equal(after.cost, before.cost);
  }
});

test('boost: lines are cleaned up, removed and cleared for a new Christmas', function () {
  var messy = L.sanitize({
    boosts: [boost('b1', 'x'.repeat(200), 20), boost('b1', 'Duplicate', 5), boost('p2', 'Wrong prefix', 5), 'nonsense']
      .concat(new Array(20).fill(0).map(function (_, i) { return boost('b' + (i + 3), 'Extra', 1); })),
    nextId: 2
  });
  assert.equal(messy.boosts.length, L.LIMITS.boosts);
  assert.equal(messy.boosts[0].label.length, L.MAX.label);
  assert.ok(messy.boosts.every(function (b) { return /^b\d+$/.test(b.id); }));
  assert.equal(messy.nextId, 12, 'new ids never clash with kept lines (b1, b3 to b11)');

  var p = familyPlan({ boosts: [boost('b6', 'Overtime', 50), boost('b7', 'Sell on Vinted', 20)] });
  assert.equal(L.hasData(plan({ boosts: [boost('b1', 'Overtime', '')] })), false, 'an idea tapped but no amount');
  assert.equal(L.hasData(plan({ boosts: [boost('b1', 'Overtime', '50')] })), true);
  L.removeBoost(p, 'b6');
  assert.deepEqual(p.boosts.map(function (b) { return b.id; }), ['b7']);
  assert.equal(L.newId(L.sanitize(p), 'b'), 'b8');
  L.newYear(p, 2027);
  assert.deepEqual(p.boosts, [], 'last year’s extra money doesn’t carry over');
});

test('boost: the ideas list has the brief’s examples and ends with “Something else”', function () {
  var B = CONTENT.afford.boost;
  var labels = B.chips.map(function (c) { return c.label; });
  ['An extra shift', 'Overtime', 'Sell on Vinted', 'Sell on Facebook Marketplace or eBay', 'Something else'].forEach(function (l) {
    assert.ok(labels.indexOf(l) !== -1, 'missing: ' + l);
  });
  assert.deepEqual(B.chips.map(function (c) { return !!c.other; }), labels.map(function (_, i) { return i === labels.length - 1; }), 'only the last is “other”');
  assert.ok(labels.every(function (l) { return l.length <= L.MAX.label; }), 'every idea fits a line');
  assert.ok(B.chips.length <= L.LIMITS.boosts);
  assert.ok(/Universal Credit/.test(B.benefits));
  assert.ok(!/borrow|loan|credit card|bet|gambl|scratch/i.test(labels.join(' ')), 'no borrowing or gambling ideas');
});

/* ------------------------------------------------------------------
 * 4. The family message
 * ------------------------------------------------------------------ */

var MONEY_TROUBLE = /money|tight|afford|debt|skint|borrow|struggl|bills?\b|broke\b|cost of living|hard up|stretched|worr|budget|expensive|cheap|cash|savings?\b|overdraft|credit|tough year|difficult/i;

test('message: light-hearted and short never mention money troubles', function () {
  ['light', 'short'].forEach(function (tone) {
    L.IDEAS.forEach(function (idea) {
      var text = L.familyMessage(CONTENT.message.templates, { tone: tone, idea: idea, amount: '20' });
      assert.ok(!MONEY_TROUBLE.test(text), tone + '/' + idea + ': "' + (text.match(MONEY_TROUBLE) || [])[0] + '"');
    });
  });
});

test('message: only the honest one says money is tighter', function () {
  L.IDEAS.forEach(function (idea) {
    var text = L.familyMessage(CONTENT.message.templates, { tone: 'honest', idea: idea, amount: '20' });
    assert.ok(/money is tighter/i.test(text), idea);
  });
});

test('message: the amount goes in, with £20 if it’s blank', function () {
  var t = CONTENT.message.templates;
  assert.ok(L.familyMessage(t, { tone: 'short', idea: 'cap', amount: '15' }).indexOf('£15') !== -1);
  assert.ok(L.familyMessage(t, { tone: 'light', idea: 'santa', amount: '' }).indexOf('£20') !== -1);
  assert.ok(L.familyMessage(t, { tone: 'nonsense', idea: 'nonsense' }).indexOf('Secret Santa') !== -1, 'falls back to light-hearted Secret Santa');
  L.TONES.forEach(function (tone) {
    L.IDEAS.forEach(function (idea) {
      var text = L.familyMessage(t, { tone: tone, idea: idea, amount: '25' });
      assert.ok(text.indexOf('{') === -1 && text.indexOf('£25') !== -1, tone + '/' + idea);
      assert.ok(text.length <= L.MAX.message, 'fits the box');
      assert.ok(!/!!/.test(text) && (text.match(/!/g) || []).length === 0, 'no exclamation marks');
      assert.ok(idea === 'santa' ? /Secret Santa/.test(text) : /limit|keep presents|kept presents/.test(text), tone + '/' + idea + ' proposes the idea');
    });
  });
  assert.ok(L.familyMessage(t, { tone: 'short', idea: 'santa' }).length < L.familyMessage(t, { tone: 'light', idea: 'santa' }).length, 'short is shorter');
});

/* ------------------------------------------------------------------
 * 5. Saved plans
 * ------------------------------------------------------------------ */

test('saved plans are cleaned up safely', function () {
  assert.deepEqual(L.sanitize(null), L.blank());
  assert.deepEqual(L.sanitize('nonsense'), L.blank());
  assert.deepEqual(L.sanitize([1, 2]), L.blank());
  var messy = L.sanitize({
    pay: { frequency: 'hourly', next: '31/12/2026' },
    people: [
      { id: 'p1', name: 'x'.repeat(500), budget: '20', relation: 'boss' },
      { id: 'p1', name: 'Duplicate', budget: '5', relation: 'child' },
      { id: '<img>', name: 'Bad id', budget: '5', relation: 'child' },
      'not a person'
    ].concat(new Array(40).fill(0).map(function (_, i) { return { id: 'p' + (i + 2), name: 'P', budget: '1', relation: 'friend' }; })),
    extras: { food: '100', hacker: '<script>' },
    ownExtras: [{ id: 'x1', label: 'Panto', amount: '30' }, { id: 'p9', label: 'Wrong prefix', amount: '1' }],
    ways: { cap: 'yes', lower: true, lowered: { p1: '10', p999: '5' }, homemadeIds: ['p1', 'p999'], cutLine: 'x99', santaAmount: 25 },
    worried: 'true',
    bought: ['p1', 'santa', 'p999'],
    putAside: ['2026-10-16', '2026-10-16', 'yesterday'],
    message: { tone: 'shouty', idea: 'santa', text: 'Hi' },
    forYear: 'last year',
    screen: 'admin',
    nextId: -5
  });
  assert.equal(messy.pay.frequency, '');
  assert.equal(messy.pay.next, '');
  assert.equal(messy.people.length, L.LIMITS.people);
  assert.equal(messy.people[0].name.length, L.MAX.name);
  assert.equal(messy.people[0].relation, 'other');
  assert.ok(messy.people.every(function (p) { return /^p\d+$/.test(p.id); }));
  assert.deepEqual(Object.keys(messy.extras), ['food']);
  assert.deepEqual(messy.ownExtras.map(function (r) { return r.id; }), ['x1']);
  assert.equal(messy.ways.cap, false, 'only true counts');
  assert.equal(messy.ways.lower, true);
  assert.deepEqual(messy.ways.lowered, { p1: '10' });
  assert.deepEqual(messy.ways.homemadeIds, ['p1']);
  assert.equal(messy.ways.cutLine, '');
  assert.equal(messy.ways.santaAmount, '25');
  assert.equal(messy.worried, false);
  assert.deepEqual(messy.bought, ['p1', 'santa']);
  assert.deepEqual(messy.putAside, ['2026-10-16']);
  assert.equal(messy.message.tone, 'light');
  assert.equal(messy.message.text, 'Hi');
  assert.equal(messy.forYear, 0);
  assert.equal(messy.screen, 'intro');
  assert.equal(messy.nextId, 31, 'new ids never clash with old ones (p1 to p30 kept)');
});

test('a saved plan survives being stored and loaded', function () {
  var p = familyPlan({ ways: { cap: true, lowered: { p1: '90' } }, bought: ['p2'], putAside: ['2026-10-16'], screen: '5', forYear: 2026, nextId: 6 });
  p.ownExtras = [{ id: 'x6', label: 'Panto', amount: '45' }];
  p.boosts = [{ id: 'b7', label: 'Sell on Vinted', amount: '30' }];
  p.nextId = 8;
  assert.deepEqual(L.sanitize(JSON.parse(JSON.stringify(p))), p);
});

test('only real input counts as a saved plan', function () {
  assert.equal(L.hasData(L.blank()), false);
  assert.equal(L.hasData(plan({ screen: '3' })), false, 'just visiting a step');
  assert.equal(L.hasData(plan({ ownExtras: [{ id: 'x1', label: '', amount: '' }] })), false, 'an empty added line');
  assert.equal(L.hasData(plan({ saved: '0' })), true);
  assert.equal(L.hasData(plan({ people: [person('p1', 'Mum', '', 'parent')] })), true);
  assert.equal(L.hasData(plan({ worried: true })), true);
  assert.equal(L.hasData(plan({ putAside: ['2026-10-16'] })), true);
});

test('taking someone off the list takes them out of every tick and idea', function () {
  var p = familyPlan({ bought: ['p4', 'p5'], wrapped: ['p4'], ways: { lowered: { p4: '10' }, homemadeIds: ['p4', 'p1'] } });
  L.removePerson(p, 'p4');
  assert.equal(p.people.length, 4);
  assert.deepEqual(p.bought, ['p5']);
  assert.deepEqual(p.wrapped, []);
  assert.deepEqual(p.ways.lowered, {});
  assert.deepEqual(p.ways.homemadeIds, ['p1']);
  var q = plan({ ownExtras: [{ id: 'x1', label: 'Panto', amount: '30' }], ways: { cutLine: 'x1', cutAmount: '20' } });
  L.removeOwnExtra(q, 'x1');
  assert.deepEqual(q.ownExtras, []);
  assert.equal(q.ways.cutLine, '');
});

test('new ids are never reused', function () {
  var p = L.blank();
  assert.equal(L.newId(p, 'p'), 'p1');
  assert.equal(L.newId(p, 'x'), 'x2');
  assert.equal(p.nextId, 3);
});

test('a new Christmas clears last year’s ticks but keeps the list', function () {
  var p = familyPlan({ bought: ['p1'], wrapped: ['p1'], putAside: ['2026-10-16'], forYear: 2026 });
  L.newYear(p, 2027);
  assert.deepEqual([p.bought, p.wrapped, p.putAside], [[], [], []]);
  assert.equal(p.forYear, 2027);
  assert.equal(p.people.length, 5);
});

/* ------------------------------------------------------------------
 * 6. Words, settings and privacy
 * ------------------------------------------------------------------ */

test('content matches the logic', function () {
  assert.deepEqual(CONTENT.when.frequency.options.map(function (o) { return o.id; }), L.FREQUENCIES);
  assert.deepEqual(Object.keys(CONTENT.when.frequency.periods), L.FREQUENCIES);
  assert.deepEqual(CONTENT.extras.items.map(function (i) { return i.id; }), L.EXTRAS);
  assert.deepEqual(Object.keys(CONTENT.people.relations), L.RELATIONS);
  CONTENT.people.chips.forEach(function (chip) { assert.ok(L.RELATIONS.indexOf(chip.relation) !== -1, chip.label); });
  assert.deepEqual(Object.keys(CONTENT.afford.ways), L.WAYS);
  assert.deepEqual(Object.keys(CONTENT.message.tones), L.TONES);
  assert.deepEqual(Object.keys(CONTENT.message.ideas), L.IDEAS);
  L.TONES.forEach(function (tone) { assert.deepEqual(Object.keys(CONTENT.message.templates[tone]), L.IDEAS, tone); });
  assert.equal(CONTENT.stepNames.length, 5);
  assert.deepEqual(L.SCREENS, ['intro', '1', '2', '3', '4', '5']);
  ['needPeople', 'needGrownUps', 'needGrownUp', 'needExtras'].forEach(function (k) { assert.ok(CONTENT.afford.problems[k], k); });
});

test('the brief’s wording is there', function () {
  var all = JSON.stringify(CONTENT);
  [
    'Christmas Without Debt',
    'Suggest a cheaper Christmas to your family',
    'I’m already borrowing or behind on bills to get through normal months.',
    'Christmas doesn’t have to be paid for with debt',
    'CAP, StepChange and Citizens Advice give free, confidential help',
    'A local foodbank or church may be able to help with Christmas food or presents',
    'Asking is wisdom, not failure.',
    'Save {amount} each payday and Christmas is paid for by {date}.',
    'My Debt-Free Christmas Plan',
    'Christmas shopping list',
    'This Christmas, we’ll pay as we go, not borrow.',
    'Want a nudge each payday until Christmas?',
    'last December’s bank statement',
    'The best Christmas gifts were given freely, and none of them came on credit.'
  ].forEach(function (line) { assert.ok(all.indexOf(line) !== -1, 'missing: ' + line); });
  ['partner', 'child', 'parent', 'sibling', 'grandparent', 'friend', 'teacher', 'santa', 'neighbour'].forEach(function (rel) {
    assert.ok(CONTENT.people.chips.some(function (c) { return c.relation === rel; }), 'quick-add chip for ' + rel);
  });
  assert.deepEqual(Object.keys(CONTENT.message.tones).map(function (k) { return CONTENT.message.tones[k]; }), ['Light-hearted', 'Honest', 'Short']);
});

// Every word a visitor can read: the page, its scripts and this tool's settings.
var COPY_FILES = ['christmas/index.html', 'christmas/content.js', 'christmas/app.js', 'christmas/pdfs.js', 'index.html'];
function readableText(rel) {
  var raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (/\.html$/.test(rel)) {
    raw = raw.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
  } else {
    raw = raw.replace(/^\s*(\/\/|\/?\*).*$/gm, ' '); // comments aren't copy
    raw = (raw.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g) || []).join('\n');
  }
  return raw.replace(/[’‘]/g, "'").replace(/&amp;/g, '&');
}
function allCopy() {
  var own = CONFIG.christmas;
  return COPY_FILES.map(readableText).join('\n') + '\n' + own.consentText + '\n' + own.successMessage;
}

test('one statistic, quoted once, and no others', function () {
  var copy = allCopy();
  var stat = 'In a YouGov survey, about 1 in 5 UK adults borrowed to pay for Christmas 2025.';
  assert.equal(CONTENT.intro.stat, stat);
  assert.equal(copy.split(stat).length - 1, 1, 'quoted exactly once');
  assert.equal((copy.match(/YouGov/g) || []).length, 1);
  assert.ok(!/\d\s*%|per ?cent|\b\d+ in \d+\b(?![^\n]*YouGov)/i.test(copy.replace(stat, '')), 'no other statistics');
});

test('faith: at most two short lines, after the practical points, never a verse first', function () {
  var refs = [];
  (function walk(node) {
    if (node && typeof node === 'object') {
      if (typeof node.ref === 'string' && typeof node.text === 'string') refs.push(node.ref);
      Object.keys(node).forEach(function (k) { walk(node[k]); });
    }
  })(CONTENT);
  assert.deepEqual(refs, ['2 Corinthians 9:15'], 'one verse, from the brief');
  var faithy = /\bGod\b|Jesus|Lord|Bible|pray|Proverbs|Corinthians|verse/i;
  var lines = [];
  (function walk(node, where) {
    if (typeof node === 'string') { if (faithy.test(node)) lines.push(where); return; }
    if (node && typeof node === 'object') Object.keys(node).forEach(function (k) { walk(node[k], where + '.' + k); });
  })(CONTENT, 'content');
  assert.deepEqual(lines, ['content.plan.verse.text', 'content.plan.verse.ref']);
  assert.ok(!faithy.test(CONTENT.intro.lead + CONTENT.intro.stat + CONTENT.when.intro + CONTENT.afford.intro), 'nothing opens with faith');
});

test('the safety net and the quiet line are kind, with no resources list on the quiet one', function () {
  assert.ok(/foodbank or church/.test(CONTENT.afford.care.local));
  assert.ok(!/https?:|CAP|StepChange|Citizens/.test(CONTENT.plan.hardYear), 'just kindness');
  assert.equal(CONFIG.debtHelp.length, 3, 'the charities come from config.debtHelp');
});

test('config: the Christmas email settings, and nothing else changed', function () {
  var own = CONFIG.christmas;
  assert.equal(own.tag, 'christmas');
  assert.ok(!/confirm/.test(own.consentText) && !/confirm/.test(own.successMessage), 'single opt-in: no confirm link to promise');
  assert.ok(/a short payday nudge each month until Christmas/.test(own.consentText) && /payday nudges to follow/.test(own.successMessage), 'promises the payday nudges it sends');
  assert.ok(/Only your email, your first name if you give it, and the name of this tool are sent/.test(own.consentText));
  assert.ok(!/step number|Baby Step/.test(own.consentText));
  assert.equal(CONFIG.signup.toolField, 'tool');
  assert.equal(CONFIG.signup.stepField, 'baby_step');
  assert.equal(CONFIG.savingForMission.tag, 'saving-for-mission');
  assert.equal(CONFIG.signup.debtPlanner.toolValue, 'debt-planner');
});

test('the page loads the shared files and its own, and lists its saved data', function () {
  var html = fs.readFileSync(path.join(ROOT, 'christmas', 'index.html'), 'utf8');
  ['../assets/config.js', '../assets/site.js', '../assets/pdf.js', 'logic.js', 'content.js', 'pdfs.js', 'app.js'].forEach(function (src) {
    assert.ok(html.indexOf('src="' + src + '"') !== -1, src + ' is loaded');
  });
  assert.ok(/<body data-mim-storage="mim\.christmas\.v1">/.test(html));
  assert.ok(html.indexOf('href="../assets/styles.css"') !== -1 && html.indexOf('href="christmas.css"') !== -1);
  var appJs = fs.readFileSync(path.join(ROOT, 'christmas', 'app.js'), 'utf8');
  assert.ok(appJs.indexOf("STORAGE_KEY = 'mim.christmas.v1'") !== -1);
  assert.ok(appJs.indexOf("'../debt-planner/'") !== -1 && appJs.indexOf("'../quiz/'") !== -1, 'cross-links');
  var home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(/href="christmas\/"/.test(home), 'a card on the home page');
});

test('privacy: nothing in this tool sends anything anywhere', function () {
  ['christmas/logic.js', 'christmas/content.js', 'christmas/app.js', 'christmas/pdfs.js'].forEach(function (rel) {
    var code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'new Image', 'document.cookie', 'navigator.share'].forEach(function (api) {
      assert.ok(code.indexOf(api) === -1, rel + ' uses ' + api);
    });
    assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(code.replace(/^\s*(\/\/|\/?\*).*$/gm, '')), rel + ' has a hard-coded address');
  });
  var appJs = fs.readFileSync(path.join(ROOT, 'christmas', 'app.js'), 'utf8');
  assert.equal((appJs.match(/MIM\.emailForm\(/g) || []).length, 1, 'the one form that sends anything');
  assert.ok(/hidden\[signup\.toolField \|\| 'tool'\] = own\.tag \|\| 'christmas';/.test(appJs), 'its only hidden field is the tool');
  assert.ok(/localStorage/.test(fs.readFileSync(path.join(ROOT, 'assets', 'site.js'), 'utf8')) && !/localStorage/.test(appJs), 'storage only through MIM.storage (try/catch)');
});

var BANNED = [
  'journey', 'game-changer', 'game changer', 'life-changing', 'transformational', 'dive in',
  'unpack', "here's the thing", 'hustle', 'abundance mindset', 'scarcity mindset',
  "in today's world", 'honestly', "it's worth noting"
];
var US_SPELLINGS = /\b(organiz\w*|favor|favorite|color\w*|behavior\w*|center|realiz\w*|recogniz\w*|prioritiz\w*|analyz\w*|apologiz\w*|minimiz\w*|maximiz\w*|program|programs|traveling|traveled|canceled|canceling|enroll|gotten|fall\b|mom\b|vacation|holiday season)\b/i;

test('no banned words, piles of exclamation marks or US spellings', function () {
  var problems = [];
  var copy = allCopy();
  var lower = copy.toLowerCase();
  BANNED.forEach(function (word) { if (lower.indexOf(word) !== -1) problems.push('"' + word + '"'); });
  if (/!!/.test(copy)) problems.push('"!!"');
  var us = copy.match(US_SPELLINGS);
  if (us) problems.push('US spelling "' + us[0] + '"');
  assert.deepEqual(problems, []);
});

test('exclamation marks and em-dashes stay rare', function () {
  var text = readableText('christmas/content.js');
  assert.deepEqual(text.match(/!/g) || [], ['!'], 'just the one, in the verse');
  assert.equal((text.match(/—/g) || []).length, 0, 'no em-dashes');
});

/* ------------------------------------------------------------------ */

var total = passed + failures.length;
if (failures.length) {
  console.log('\n' + failures.length + ' of ' + total + ' checks FAILED:\n');
  failures.forEach(function (f) { console.log('  ✗ ' + f); });
  process.exit(1);
}
var hand = L.compute(familyPlan(), TODAY);
console.log('\nHand-worked case 1: costs ' + L.formatMoney(hand.cost) + ', you’ll have ' + L.formatMoney(hand.available) +
  ', short ' + L.formatMoney(hand.short) + ', so save ' + L.formatMoney(hand.headline.amount) + ' each payday.');
console.log('Random payday cases checked against a day-by-day count: ' + RANDOM_PAYDAY_CASES);
console.log('All ' + total + ' checks passed.');
