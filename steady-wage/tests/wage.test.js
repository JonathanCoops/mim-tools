#!/usr/bin/env node
/*
 * Tests for Pay Yourself a Steady Wage.
 *
 *   node steady-wage/tests/wage.test.js
 *
 * No installs needed, just Node. It checks:
 *   1. the months: the last 12 full months from any date, and the next
 *      pay review month;
 *   2. the wage: last year ÷ 15, the carousel's own example, part years,
 *      and tax and costs coming off first;
 *   3. the leanest stretch and the pot lines, including thousands of random
 *      years against a plain month-by-month count;
 *   4. the pay review: cut, rise, hold, and leaving a newly set wage alone
 *      until the next review month;
 *   5. what's typed: blanks, part years, wrong figures;
 *   6. filling the pot from where it is today;
 *   7. saved plans are cleaned up safely;
 *   8. the method itself, on made-up years of steady and seasonal income;
 *   9. the words and settings: they match the logic and keep to the README
 *      house rules; nothing is sent anywhere.
 */

'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

var ROOT = path.join(__dirname, '..', '..');
var L = require(path.join(ROOT, 'steady-wage', 'logic.js'));
var SIM = require(path.join(ROOT, 'steady-wage', 'tests', 'simulate.js'));

function loadBrowserFile(rel) {
  var sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  return JSON.parse(JSON.stringify(sandbox.window));
}
var CONTENT = loadBrowserFile('steady-wage/content.js').MIM_WAGE_CONTENT;
var CONFIG = loadBrowserFile('assets/config.js').MIM_CONFIG;

var passed = 0;
var failures = [];
function test(name, fn) {
  try { fn(); passed++; }
  catch (err) { failures.push(name + '\n    ' + err.message.split('\n').join('\n    ')); }
}

var TODAY = { y: 2026, m: 11, d: 19 };   // so the months run November 2025 to October 2026
var KEYS = L.monthsFor(TODAY).map(function (mo) { return mo.key; });

// A plan with these 12 figures (oldest first), tax already off unless told otherwise.
function plan(figures, overrides) {
  var p = L.blank();
  figures.forEach(function (value, i) { if (value !== null) p.months[KEYS[i]] = String(value); });
  p.tax = 'after';
  Object.keys(overrides || {}).forEach(function (k) { p[k] = overrides[k]; });
  return p;
}
function pence(list) { return list.map(function (v) { return v * 100; }); }
function flat(amount) { var out = []; for (var i = 0; i < 12; i++) out.push(amount); return out; }

// The example on the page: takings with a quarter set aside for tax and costs.
var EXAMPLE = CONTENT.example;
function examplePlan(overrides) {
  return plan(EXAMPLE.months, Object.assign({ tax: EXAMPLE.tax, setAside: EXAMPLE.setAside, pot: EXAMPLE.pot }, overrides || {}));
}

/* ---------------- 1. Months ---------------- */

test('the 12 full months before this one, oldest first', function () {
  assert.deepEqual(KEYS, ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04',
    '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
  assert.deepEqual(L.monthsFor({ y: 2027, m: 1, d: 1 }).map(function (mo) { return mo.key; }).slice(0, 2), ['2026-01', '2026-02']);
  assert.equal(L.monthsFor({ y: 2027, m: 1, d: 31 })[11].key, '2026-12');
  assert.equal(L.monthsFor({ y: 2028, m: 3, d: 1 })[11].key, '2028-02');
});

test('moving months on and back crosses years cleanly', function () {
  assert.deepEqual(L.addMonths({ y: 2026, m: 11 }, 2), { y: 2027, m: 1 });
  assert.deepEqual(L.addMonths({ y: 2026, m: 1 }, -1), { y: 2025, m: 12 });
  assert.deepEqual(L.addMonths({ y: 2026, m: 6 }, 36), { y: 2029, m: 6 });
  assert.deepEqual(L.addMonths({ y: 2026, m: 12 }, -24), { y: 2024, m: 12 });
});

test('pay reviews are in January, April, July and October, always in the future', function () {
  assert.deepEqual(L.nextReview({ y: 2026, m: 11 }), { y: 2027, m: 1 });
  assert.deepEqual(L.nextReview({ y: 2026, m: 12 }), { y: 2027, m: 1 });
  assert.deepEqual(L.nextReview({ y: 2027, m: 1 }), { y: 2027, m: 4 });
  assert.deepEqual(L.nextReview({ y: 2027, m: 5 }), { y: 2027, m: 7 });
  assert.deepEqual(L.nextReview({ y: 2027, m: 9 }), { y: 2027, m: 10 });
  assert.deepEqual(L.nextReview({ y: 2027, m: 10 }), { y: 2028, m: 1 });
});

/* ---------------- 2. The wage ---------------- */

test('the carousel example: £30,000 ÷ 15 is a £2,000 wage', function () {
  assert.equal(L.quietWage(3000000, 12), 200000);
  var r = L.compute(plan(flat(2500)), TODAY);
  assert.equal(r.ok, true);
  assert.equal(r.total, 30000);
  assert.equal(r.wage, 2000);
  assert.equal(r.verdict, 'start');
});

test('the wage is 80% of an average month, rounded down to £10', function () {
  assert.equal(L.DIVISOR, 15);
  assert.equal(L.quietWage(2850000, 12), 190000);       // £28,500 ÷ 15 = £1,900
  assert.equal(L.quietWage(2864900, 12), 190000);       // £1,909.93 rounds down
  assert.equal(L.quietWage(2865000, 12), 191000);
  assert.equal(L.quietWage(0, 12), 0);
});

test('a part year uses the same proportion of the months there are', function () {
  // Six months of £2,500 is still a £2,000 wage.
  assert.equal(L.quietWage(1500000, 6), 200000);
  var six = [null, null, null, null, null, null, 2500, 2500, 2500, 2500, 2500, 2500];
  var r = L.compute(plan(six, { partYear: true }), TODAY);
  assert.equal(r.ok, true);
  assert.equal(r.counted, 6);
  assert.equal(r.fullYear, false);
  assert.equal(r.wage, 2000);
  assert.equal(r.rows.filter(function (row) { return row.counted; }).length, 6);
});

test('tax and costs come off before the wage is worked out', function () {
  var r = L.compute(examplePlan(), TODAY);
  assert.equal(r.ok, true);
  assert.equal(r.percent, 25);
  assert.equal(r.total, 28500, '£38,000 of takings, less a quarter');
  assert.equal(r.wage, 1900);
  assert.deepEqual(r.per1000, { aside: 250, pot: 750 });
  assert.equal(r.rows[0].landed, 3200);
  assert.equal(r.rows[0].net, 2400);
  // With tax already off, the same figures give a bigger wage and nothing is set aside.
  var after = L.compute(examplePlan({ tax: 'after', setAside: '' }), TODAY);
  assert.equal(after.total, 38000);
  assert.equal(after.wage, 2530);
  assert.deepEqual(after.per1000, { aside: 0, pot: 1000 });
});

test('percentages are read as typed', function () {
  assert.equal(L.toPercent('25'), 25);
  assert.equal(L.toPercent(' 27.5% '), 27.5);
  assert.equal(L.toPercent('0'), 0);
  assert.equal(L.toPercent('90'), 90);
  assert.equal(L.toPercent('91'), null);
  assert.equal(L.toPercent('-5'), null);
  assert.equal(L.toPercent('a quarter'), null);
  assert.equal(L.toPercent(''), null);
});

/* ---------------- 3. The leanest stretch and the pot ---------------- */

test('the example: May and June are the leanest stretch, £3,200 short', function () {
  var r = L.compute(examplePlan(), TODAY);
  assert.equal(r.lean.shortfall, 3200);
  assert.equal(r.lean.length, 2);
  assert.deepEqual([r.lean.from.m, r.lean.to.m], [5, 6]);
  assert.equal(r.shortMonths, 5);
  assert.deepEqual(r.rows.filter(function (row) { return row.lean; }).map(function (row) { return row.key; }), ['2026-05', '2026-06']);
  // The pot lines that follow from it.
  assert.equal(r.low, 3800, 'two months of wages');
  assert.equal(r.full, 8900, '£3,200 + three months of wages');
  assert.equal(r.top, 14600, 'full + three more months of wages');
});

test('a stretch that runs over the new year counts as one', function () {
  // Thin from September to February, with the window starting in November.
  var net = pence([500, 500, 500, 500, 4000, 4000, 4000, 4000, 4000, 4000, 500, 500]);
  var lean = L.leanestStretch(net, 180000);
  assert.equal(lean.length, 6);
  assert.equal(lean.from, 10, 'starts in September, the 11th month of the window');
  assert.equal(lean.shortfall, 6 * 130000);
});

test('a part year is only checked as far as it goes', function () {
  var net = pence([500, 3000, 3000, 3000, 500]);
  var lean = L.leanestStretch(net, 180000);
  assert.equal(lean.length, 1, 'the first and last months are not joined up');
  assert.equal(lean.shortfall, 130000);
});

test('steady work needs three months of wages and no more', function () {
  var r = L.compute(plan(flat(2500)), TODAY);
  assert.equal(r.lean, null);
  assert.equal(r.shortMonths, 0);
  assert.equal(r.full, 6000);
  assert.equal(r.fullMonths, 3);
  assert.equal(r.low, 4000);
  assert.equal(r.top, 12000);
});

test('pot lines round up to £50, so the pot is never a few pounds short', function () {
  // One thin month, £1,500 short of a £2,000 wage: £1,500 + 3 × £2,000 = £7,500 exactly.
  var exact = L.potLines(pence([500, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]), 200000);
  assert.equal(exact.lean.shortfall, 150000);
  assert.equal(exact.full, 750000);
  assert.equal(exact.low, 400000);
  assert.equal(exact.top, 1350000);
  // £10 less short: £7,490 rounds up to £7,500.
  var odd = L.potLines(pence([510, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]), 200000);
  assert.equal(odd.lean.shortfall, 149000);
  assert.equal(odd.full, 750000);
  // £10 more short: £7,510 rounds up to £7,550.
  var over = L.potLines(pence([490, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]), 200000);
  assert.equal(over.full, 755000);
});

// A plain version of the leanest stretch, to check the real one against.
function leanBruteForce(net, wage) {
  var n = net.length;
  var best = 0;
  for (var start = 0; start < n; start++) {
    for (var len = 1; len <= n; len++) {
      var sum = 0;
      for (var k = 0; k < len; k++) sum += wage - net[(start + k) % n];
      if (sum > best) best = sum;
    }
  }
  return best;
}

var seed = 7;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
var RANDOM_YEARS = 3000;

test(RANDOM_YEARS + ' random years: the leanest stretch matches a plain count, and a full pot always carries it', function () {
  for (var i = 0; i < RANDOM_YEARS; i++) {
    var net = [];
    for (var m = 0; m < 12; m++) net.push(rnd() < 0.3 ? 0 : Math.round(rnd() * 600000));
    var total = net.reduce(function (a, b) { return a + b; }, 0);
    var wage = L.quietWage(total, 12);
    if (wage < L.WAGE_ROUND) continue;
    var lean = L.leanestStretch(net, wage);
    assert.equal(lean.shortfall, leanBruteForce(net, wage), 'year ' + i);
    var lines = L.potLines(net, wage);
    assert.ok(lines.full >= lean.shortfall + 3 * wage && lines.full < lean.shortfall + 3 * wage + L.POT_ROUND);
    assert.equal(lines.top, lines.full + 3 * wage);
    // Start any month of that year with a full pot, pay the wage on the 1st for
    // a year, and the pot never drops under the low line.
    for (var start = 0; start < 12; start++) {
      var pot = lines.full;
      for (var k = 0; k < 12; k++) {
        pot -= wage;
        assert.ok(pot >= lines.low, 'year ' + i + ', starting month ' + start + ': ' + pot + ' is under ' + lines.low);
        pot += net[(start + k) % 12];
      }
    }
  }
});

test('the replay starts full and pays the wage before the month lands', function () {
  var r = L.compute(examplePlan(), TODAY);
  assert.equal(r.replay.start, 8900);
  assert.equal(r.replay.afterPayday[0], 7000);
  assert.equal(r.replay.end[0], 9400);
  assert.equal(r.replay.afterPayday[11], r.replay.end[10] - 1900);
  assert.ok(Math.min.apply(null, r.replay.afterPayday) >= r.low);
  // Over a full year the pot gains three months of wages: 12 go out, 15 come in.
  assert.equal(r.replay.end[11], 8900 + 28500 - 12 * 1900);
});

/* ---------------- 4. The pay review ---------------- */

var STEADY = pence(flat(2500));   // supports a £2,000 wage; full pot £6,000

test('under two months of wages: a 10% cut', function () {
  assert.deepEqual(L.review(200000, 399900, 200000, STEADY), { verdict: 'cut', wage: 180000 });
  assert.deepEqual(L.review(200000, 400000, 200000, STEADY), { verdict: 'hold', wage: 200000 }, 'two months exactly is fine');
  assert.deepEqual(L.review(200000, 0, 200000, STEADY), { verdict: 'cut', wage: 180000 });
});

test('if the last 12 months support less than that, the cut goes there', function () {
  // Income has halved: the months now support £1,000, so 10% off £2,000 isn't enough.
  var thin = pence(flat(1250));
  assert.deepEqual(L.review(200000, 300000, 100000, thin), { verdict: 'cut', wage: 100000 });
  // But a cut is never a rise: a healthy year with a thin pot still drops 10%.
  assert.deepEqual(L.review(200000, 300000, 260000, pence(flat(3250))), { verdict: 'cut', wage: 180000 });
});

test('a rise needs 10% more supported and a pot that is still full afterwards', function () {
  var good = pence(flat(2750));   // supports £2,200
  assert.deepEqual(L.review(200000, 660000, 220000, good), { verdict: 'rise', wage: 220000 });
  assert.deepEqual(L.review(200000, 659900, 220000, good), { verdict: 'hold', wage: 200000 }, 'the pot would not be full at £2,200');
  assert.deepEqual(L.review(200000, 900000, 219000, pence(flat(2740))), { verdict: 'hold', wage: 200000 }, 'under 10% more');
});

test('a rise is never more than 10% at a time', function () {
  var great = pence(flat(5000));  // supports £4,000
  assert.deepEqual(L.review(200000, 2000000, 400000, great), { verdict: 'rise', wage: 220000 });
});

test('a good pot on its own changes nothing', function () {
  assert.deepEqual(L.review(200000, 5000000, 200000, STEADY), { verdict: 'hold', wage: 200000 });
});

test('with a wage typed in, the plan is a pay review', function () {
  var hold = L.compute(plan(flat(2500), { wage: '2000', pot: '5000' }), TODAY);
  assert.equal(hold.mode, 'review');
  assert.equal(hold.verdict, 'hold');
  assert.equal(hold.wage, 2000);
  assert.equal(hold.previousWage, 2000);

  var cut = L.compute(plan(flat(2500), { wage: '2000', pot: '3000' }), TODAY);
  assert.equal(cut.verdict, 'cut');
  assert.equal(cut.wage, 1800);
  assert.equal(cut.low, 3600, 'the lines move to the new wage');

  var rise = L.compute(plan(flat(2750), { wage: '2000', pot: '7000' }), TODAY);
  assert.equal(rise.verdict, 'rise');
  assert.equal(rise.wage, 2200);
  assert.equal(rise.stage, 'steady', 'still full after the rise');
});

test('a wage set with the button stands until the next review month', function () {
  // Set in November 2026 with an empty pot: no cut in November or December...
  var setNow = plan(flat(2500), { wage: '2000', wageSet: '2026-11', pot: '0' });
  var nov = L.compute(setNow, TODAY);
  assert.equal(nov.verdict, 'set');
  assert.equal(nov.wage, 2000);
  assert.deepEqual(nov.nextReview, { y: 2027, m: 1 });
  assert.deepEqual(nov.wageSet, { y: 2026, m: 11 });
  var decKeys = L.monthsFor({ y: 2026, m: 12, d: 5 });
  var dec = L.blank();
  decKeys.forEach(function (mo) { dec.months[mo.key] = '2500'; });
  dec.tax = 'after'; dec.wage = '2000'; dec.wageSet = '2026-11'; dec.pot = '0';
  assert.equal(L.compute(dec, { y: 2026, m: 12, d: 5 }).verdict, 'set');
  // ...but in January the review is due.
  var janKeys = L.monthsFor({ y: 2027, m: 1, d: 10 });
  var jan = L.blank();
  janKeys.forEach(function (mo) { jan.months[mo.key] = '2500'; });
  jan.tax = 'after'; jan.wage = '2000'; jan.wageSet = '2026-11'; jan.pot = '0';
  var due = L.compute(jan, { y: 2027, m: 1, d: 10 });
  assert.equal(due.verdict, 'cut');
  assert.equal(due.wage, 1800);
  assert.deepEqual(due.nextReview, { y: 2027, m: 4 });
});

/* ---------------- 5. What's typed ---------------- */

test('nothing typed, a blank month, a wrong figure', function () {
  var empty = L.compute(L.blank(), TODAY);
  assert.equal(empty.ok, false);
  assert.equal(empty.errors.months, 'empty');
  assert.equal(empty.errors.tax, 'required');

  var gap = flat(2500); gap[3] = null; gap[7] = null;
  var missing = L.compute(plan(gap), TODAY);
  assert.equal(missing.errors.months, 'missing');
  assert.deepEqual(missing.missing, ['2026-02', '2026-06']);

  var wrong = flat(2500); wrong[2] = 'lots'; wrong[5] = '-200';
  var invalid = L.compute(plan(wrong), TODAY);
  assert.equal(invalid.errors.months, 'invalid');
  assert.deepEqual(invalid.invalid, ['2026-01', '2026-04']);
});

test('a blank month is never quietly counted as £0', function () {
  // Blank months at the start: without the tick they must be filled in...
  var late = [null, null, null, null, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000];
  var strict = L.compute(plan(late), TODAY);
  assert.equal(strict.errors.months, 'missing');
  assert.equal(strict.missing.length, 4);
  // ...with it, they're left out, and the wage comes from the 8 months there are.
  var part = L.compute(plan(late, { partYear: true }), TODAY);
  assert.equal(part.ok, true);
  assert.equal(part.counted, 8);
  assert.equal(part.wage, 2400);
  // ...and typed as 0 (a seasonal winter), they pull the wage down as they should.
  var winter = L.compute(plan([0, 0, 0, 0, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]), TODAY);
  assert.equal(winter.counted, 12);
  assert.equal(winter.wage, 1600);
  assert.equal(winter.lean.length, 4);
  assert.equal(winter.full, 4 * 1600 + 3 * 1600);
});

test('a part year still needs every month after the first, and at least three', function () {
  var holes = [null, null, null, null, 3000, null, 3000, 3000, 3000, 3000, 3000, 3000];
  var r = L.compute(plan(holes, { partYear: true }), TODAY);
  assert.equal(r.errors.months, 'missing');
  assert.deepEqual(r.missing, ['2026-04']);
  var two = [null, null, null, null, null, null, null, null, null, null, 3000, 3000];
  assert.equal(L.compute(plan(two, { partYear: true }), TODAY).errors.months, 'tooFew');
  var three = [null, null, null, null, null, null, null, null, null, 3000, 3000, 3000];
  assert.equal(L.compute(plan(three, { partYear: true }), TODAY).ok, true);
});

test('tax needs an answer, and a share when it still has to come out', function () {
  assert.equal(L.compute(plan(flat(2500), { tax: '' }), TODAY).errors.tax, 'required');
  assert.equal(L.compute(plan(flat(2500), { tax: 'before' }), TODAY).errors.setAside, 'required');
  assert.equal(L.compute(plan(flat(2500), { tax: 'before', setAside: '120' }), TODAY).errors.setAside, 'invalid');
  assert.equal(L.compute(plan(flat(2500), { tax: 'before', setAside: '0' }), TODAY).wage, 2000);
  assert.equal(L.compute(plan(flat(2500), { tax: 'before', setAside: '20%' }), TODAY).wage, 1600);
});

test('the pot and the wage can be blank but not nonsense', function () {
  var r = L.compute(plan(flat(2500)), TODAY);
  assert.equal(r.pot, 0);
  assert.equal(r.mode, 'start');
  assert.equal(L.compute(plan(flat(2500), { pot: 'some' }), TODAY).errors.pot, 'invalid');
  assert.equal(L.compute(plan(flat(2500), { wage: '-1' }), TODAY).errors.wage, 'invalid');
  assert.equal(L.compute(plan(flat(2500), { pot: '£6,000.50' }), TODAY).pot, 6000.5);
});

test('all zeros, or next to nothing, is not enough to set a wage', function () {
  assert.equal(L.compute(plan(flat(0)), TODAY).errors.months, 'tooLow');
  assert.equal(L.compute(plan(flat(10)), TODAY).errors.months, 'tooLow');
});

/* ---------------- 6. Filling the pot ---------------- */

test('the example: £2,500 in the pot fills by December 2027, with no short paydays', function () {
  var r = L.compute(examplePlan(), TODAY);
  assert.equal(r.stage, 'building');
  assert.equal(r.toFull, 6400);
  assert.equal(r.forecast.months, 13);
  assert.deepEqual(r.forecast.month, { y: 2027, m: 12 });
  assert.equal(r.forecast.short, 0);
});

test('an empty pot comes up short on the way, and says so', function () {
  var r = L.compute(examplePlan({ pot: '0' }), TODAY);
  assert.equal(r.stage, 'building');
  // December's payday finds an empty pot. December's money covers January and
  // February, but nothing landed in January, so March's payday is £150 short.
  assert.equal(r.forecast.short, 2);
  assert.deepEqual(r.forecast.month, { y: 2027, m: 12 }, 'full after next December, a good month');
});

test('a full pot, and good-year money over the top line', function () {
  var full = L.compute(examplePlan({ pot: '8900' }), TODAY);
  assert.equal(full.stage, 'steady');
  assert.equal(full.toFull, 0);
  assert.equal(full.goodYear, 0);
  assert.equal(full.forecast.months, 0);
  var atTop = L.compute(examplePlan({ pot: '14600' }), TODAY);
  assert.equal(atTop.stage, 'steady');
  var over = L.compute(examplePlan({ pot: '16000' }), TODAY);
  assert.equal(over.stage, 'over');
  assert.equal(over.goodYear, 1400);
});

test('a part year goes on the average month', function () {
  var six = [null, null, null, null, null, null, 2500, 2500, 2500, 2500, 2500, 2500];
  var r = L.compute(plan(six, { partYear: true, pot: '1000' }), TODAY);
  // full £6,000, £5,000 to go, £500 spare in an average month: 10 months
  assert.equal(r.forecast.months, 10);
  assert.deepEqual(r.forecast.month, { y: 2027, m: 9 });
  assert.equal(r.forecast.short, null);
});

test('a wage the year cannot support never fills the pot', function () {
  var r = L.compute(plan(flat(2500), { wage: '2600', pot: '6000' }), TODAY);
  assert.equal(r.verdict, 'hold');
  assert.equal(r.stage, 'building');
  assert.equal(r.forecast.months, null);
});

/* ---------------- 7. Saved plans ---------------- */

test('rubbish in storage comes back as a blank plan', function () {
  [null, undefined, 'x', 42, [], { months: 'no' }, { months: [1, 2] }].forEach(function (raw) {
    var p = L.sanitize(raw, TODAY);
    assert.deepEqual(p.months, {});
    assert.equal(p.tax, '');
    assert.equal(p.shown, false);
  });
  assert.equal(L.hasData(L.blank()), false);
  assert.equal(L.hasData(plan(flat(1))), true);
});

test('saved plans are trimmed, and old months dropped', function () {
  var p = L.sanitize({
    months: { '2026-10': '4200', '2023-10': '900', '2099-01': '5', 'nonsense': '1', '2026-13': '2', '2026-09': '   ', '2026-08': '12345678901234567890' },
    partYear: 'yes', tax: 'sideways', setAside: '1234567', pot: {}, wage: '1800', wageSet: '2026-1', name: new Array(100).join('a'),
    shown: true, example: 1, extra: 'ignored'
  }, TODAY);
  assert.deepEqual(Object.keys(p.months).sort(), ['2026-08', '2026-10']);
  assert.equal(p.months['2026-08'].length, L.MAX.money);
  assert.equal(p.partYear, false);
  assert.equal(p.tax, '');
  assert.equal(p.setAside.length, L.MAX.percent);
  assert.equal(p.pot, '');
  assert.equal(p.wage, '1800');
  assert.equal(p.wageSet, '');
  assert.equal(p.name.length, L.MAX.name);
  assert.equal(p.shown, true);
  assert.equal(p.example, false);
  assert.equal(p.extra, undefined);
});

test('a saved plan rolls forward: next quarter asks for the new months', function () {
  var saved = L.sanitize(JSON.parse(JSON.stringify(plan(flat(2500), { wage: '2000', wageSet: '2026-11', pot: '5000' }))), TODAY);
  var feb = { y: 2027, m: 2, d: 3 };
  var later = L.compute(L.sanitize(saved, feb), feb);
  assert.equal(later.errors.months, 'missing');
  assert.deepEqual(later.missing, ['2026-11', '2026-12', '2027-01']);
});

/* ---------------- 8. Does the method hold up? ---------------- */

// A smaller run of tests/simulate.js: made-up five-year stretches, reviewed
// every three months with the planner's own sums.
test('on made-up steady and seasonal income, payday almost never comes up short', function () {
  var opts = { yearSpread: 0.15, runs: 400 };
  ['steady work, some variation', 'seasonal, thin winter', 'seven months on, five off', 'steady work, paid in lumps'].forEach(function (name) {
    var row = SIM.run(name, opts);
    assert.ok(parseFloat(row['runs with no short payday']) >= 90, name + ': ' + row['runs with no short payday'] + ' of runs had no short payday');
    assert.ok(parseFloat(row['short paydays a year, with plan']) <= 0.05, name);
    assert.ok(parseFloat(row['short paydays a year, no plan']) >= 3, name + ': without a plan it is short several times a year');
    assert.ok(parseFloat(row['wage changes a year']) <= 1, name + ': the wage changes at most about once a year');
  });
});

test('very lumpy income still comes up short far less often than with no plan', function () {
  var row = SIM.run('very lumpy, a third of months empty', { yearSpread: 0.15, runs: 400 });
  assert.ok(parseFloat(row['short paydays a year, with plan']) * 10 < parseFloat(row['short paydays a year, no plan']));
});

/* ---------------- 9. The words and settings ---------------- */

function fillAll(template) { return String(template).replace(/\{\w+\}/g, 'X'); }
function placeholders(template) { return (String(template).match(/\{(\w+)\}/g) || []).sort(); }

test('the example on the page builds the plan the docs describe', function () {
  assert.equal(EXAMPLE.months.length, 12);
  var r = L.compute(examplePlan(), TODAY);
  assert.equal(r.wage, 1900);
  assert.equal(r.full, 8900);
  assert.equal(r.stage, 'building');
});

test('every verdict the sums can give has words', function () {
  ['start', 'set', 'hold', 'rise', 'cut'].forEach(function (verdict) {
    var V = CONTENT.results[verdict];
    assert.ok(V && V.eyebrow && V.body, verdict);
    assert.deepEqual(placeholders(V.headline), ['{wage}'], verdict + ' headline');
  });
  var P = CONTENT.results.pot;
  assert.ok(P.building.body && P.building.when && P.building.whenAverage && P.building.never);
  assert.ok(P.steady && P.over);
  ['empty', 'missing', 'invalid', 'tooFew', 'tooLow'].forEach(function (key) { assert.ok(CONTENT.income.errors[key], key); });
});

test('the words quote the method the sums use', function () {
  var R = CONTENT.results;
  assert.ok(/divided by 15/.test(R.chart.caption));
  assert.ok(/four-fifths/.test(R.chart.captionPart));
  assert.ok(/two months of wages/.test(R.tips.rules[0]) && L.LOW_MONTHS === 2);
  assert.ok(/less than two months of wages/.test(R.cut.body));
  assert.ok(/still have two months of wages in hand/.test(R.pot.fullBody), 'a full pot never drops under the low line');
  assert.ok(/three months of wages/.test(R.pot.fullBodyFlat) && L.CUSHION_MONTHS === 3);
  assert.ok(/10% more/.test(R.tips.rules[1]) && L.STEP_PERCENT === 10);
  assert.ok(/January, April, July and October/.test(R.tips.items[4].body));
  assert.deepEqual(L.REVIEW_MONTHS, [1, 4, 7, 10]);
  assert.equal(R.tips.rules.length, 4);
  assert.equal(CONTENT.how.steps.length, 3);
});

test('the name, and what the number is for', function () {
  assert.equal(CONTENT.intro.title, 'Pay Yourself a Steady Wage');
  var page = fs.readFileSync(path.join(ROOT, 'steady-wage', 'index.html'), 'utf8');
  assert.ok(page.indexOf('<title>Pay Yourself a Steady Wage | Money in Motion</title>') !== -1);
  var home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(home.indexOf('<h2>Pay Yourself a Steady Wage</h2>') !== -1);
  // Jonathan's point, 19 November 2026: this is the regular income a budget is
  // built on, set so needs and obligations are met in the leanest month.
  var start = CONTENT.results.start;
  assert.equal(start.eyebrow, 'Your regular income');
  assert.ok(/build your budget on/.test(start.body));
  assert.ok(/meet your needs and obligations even in your leanest month/.test(start.body));
  assert.ok(/still up to you/.test(start.body));
  assert.deepEqual(placeholders(start.body), [], 'the headline card carries no sums, just what the number is for');
});

test('it is part of Step 0: the wage is the income to budget on, in the app', function () {
  var budget = CONTENT.results.plan.steps.budget;
  assert.deepEqual(placeholders(budget.title), ['{wage}']);
  assert.ok(/monthly income/.test(budget.body));
  assert.ok(/Step 0 of the Baby Steps: get a budget, and tell every pound where to go before the month starts/.test(budget.body));
  assert.equal(CONFIG.links.appPage, 'https://moneyinmotion.org/app');
  var steps = CONTENT.results.plan.steps;
  assert.deepEqual(Object.keys(steps), ['account', 'before', 'after', 'pay', 'budget']);
  assert.ok(/Until the pot is full/.test(steps.pay.building) && /standing order/.test(steps.pay.full));
});

test('the tips: a big payment, a lean month, and what to do with more', function () {
  var items = CONTENT.results.tips.items;
  assert.equal(items.length, 5);
  assert.ok(/isn't payday/.test(items[0].title.replace(/’/g, "'")));
  assert.ok(/isn't an emergency/.test(items[1].title.replace(/’/g, "'")));
  // More money, and it's regular: a rise, budgeted for in the app.
  assert.ok(/regular income/.test(items[2].body) && /rise/.test(items[2].body) && /budget for it in the app/.test(items[2].body));
  // More money, but not ready to count on it: keep the wage, spend on things that flex.
  assert.ok(/not ready to count on/.test(items[3].title));
  assert.ok(/Keep your wage where it is/.test(items[3].body));
  ['a nicer holiday', 'an extra present for the kids at Christmas', 'Junior ISA', 'pension'].forEach(function (idea) {
    assert.ok(items[3].body.indexOf(idea) !== -1, idea);
  });
  assert.deepEqual(placeholders(items[3].body), ['{top}'], 'it says when there is extra to use');
  // The rise itself gives both choices too.
  assert.ok(/Budget for it in the app/.test(CONTENT.results.rise.body) && /Not ready to count on it yet\?/.test(CONTENT.results.rise.body));
});

test('one faith line, from the approved verses, after the practical point', function () {
  var faithy = /\bGod\b|Jesus|Lord|Bible|pray|Proverbs|Corinthians|Luke|Matthew|verse|Joseph/i;
  var lines = [];
  (function walk(node, where) {
    if (typeof node === 'string') { if (faithy.test(node)) lines.push(where); return; }
    if (node && typeof node === 'object') Object.keys(node).forEach(function (k) { walk(node[k], where + '.' + k); });
  })(CONTENT, 'content');
  assert.deepEqual(lines, ['content.results.tips.faith', 'content.pdf.faith']);
  var verse = 'Proverbs 21:20 says the wise store up choice food and olive oil, but fools gulp theirs down.';
  assert.ok(CONTENT.results.tips.faith.indexOf(verse) === 0);
  assert.equal(CONTENT.pdf.faith, verse);
});

test('no tax rates or other UK figures are quoted', function () {
  var text = JSON.stringify(CONTENT).replace(JSON.stringify(CONTENT.example), '');
  // The only percentage in the words is the 10% pay-review step. The share for
  // tax and costs is always the person's own figure.
  assert.deepEqual(text.match(/\d+\s?%/g), ['10%', '10%']);  // the on-screen rule and the PDF's copy of it
  assert.ok(!/personal allowance|national insurance|basic rate|higher rate|£6,000|£16,000/i.test(text));
  assert.ok(/Use your own figure/.test(CONTENT.tax.setAsideHint));
  assert.equal(CONFIG.links.hmrcTaxEstimate, 'https://www.gov.uk/self-assessment-ready-reckoner');
});

test('people on benefits are told to check first', function () {
  assert.ok(/Universal Credit or other benefits/.test(CONTENT.results.tips.benefits));
  assert.ok(/Citizens Advice/.test(CONTENT.results.tips.benefits));
});

test('sign-up: the tool has its own tag, and promises only what is sent', function () {
  var own = CONFIG.steadyWage;
  assert.equal(own.tag, 'steady-wage');
  assert.ok(/welcome email, then the weekly Thursday email/.test(own.consentText));
  assert.ok(/Your figures stay on this device/.test(own.consentText));
  assert.ok(!/confirm/i.test(own.consentText + own.successMessage));
  // Jonathan, 19 November 2026: no pay-review emails for now.
  assert.ok(!/nudge|remind/i.test(own.consentText + CONTENT.results.email.intro + JSON.stringify(CONTENT.results.plan)), 'no reminders are promised');
  var script = fs.readFileSync(path.join(ROOT, 'apps-script', 'Code.gs'), 'utf8');
  assert.ok(/var TOOLS = \[[^\]]*'steady-wage'[^\]]*\]/.test(script), 'the front door accepts this tool');
});

test('the page loads what it needs, and nothing leaves the device', function () {
  var page = fs.readFileSync(path.join(ROOT, 'steady-wage', 'index.html'), 'utf8');
  ['../assets/config.js', '../assets/site.js', '../assets/pdf.js', 'logic.js', 'content.js', 'app.js'].forEach(function (src) {
    assert.ok(page.indexOf('<script src="' + src + '"></script>') !== -1, src);
  });
  assert.ok(page.indexOf('data-mim-storage="mim.wage.v1"') !== -1);
  assert.ok(page.indexOf('data-mim-footer') !== -1);
  assert.ok(!/https?:\/\/(?!moneyinmotion\.org)/.test(page.replace(/<meta[^>]*>/g, '')), 'no outside addresses in the page');
  var code = ['logic.js', 'app.js'].map(function (f) { return fs.readFileSync(path.join(ROOT, 'steady-wage', f), 'utf8'); }).join('\n');
  assert.ok(code.indexOf("STORAGE_KEY = 'mim.wage.v1'") !== -1);
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|document\.cookie|WebSocket/.test(code), 'the only request is the shared email form');
  assert.ok(!/localStorage/.test(code), 'saving goes through MIM.storage, which never throws');
  var home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(home.indexOf('href="steady-wage/"') !== -1, 'the home page links to it');
});

var COPY_FILES = ['steady-wage/content.js', 'steady-wage/index.html'];
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
  var own = CONFIG.steadyWage;
  return COPY_FILES.map(readableText).join('\n') + '\n' + own.consentText + '\n' + own.successMessage;
}

var BANNED = [
  'journey', 'game-changer', 'game changer', 'life-changing', 'transformational', 'dive in',
  'unpack', "here's the thing", 'hustle', 'abundance mindset', 'scarcity mindset',
  "in today's world", 'honestly', "it's worth noting", 'quietly', 'passive income', 'side gig'
];
var US_SPELLINGS = /\b(organiz\w*|favor|favorite|color\w*|behavior\w*|center|realiz\w*|recogniz\w*|prioritiz\w*|analyz\w*|apologiz\w*|minimiz\w*|maximiz\w*|program|programs|traveling|traveled|canceled|canceling|enroll|gotten|fall\b|mom\b|vacation|paycheck|check\s?book|401k)\b/i;

test('no banned words, piles of exclamation marks or US spellings', function () {
  var problems = [];
  var copy = allCopy();
  var lower = copy.toLowerCase();
  BANNED.forEach(function (word) { if (lower.indexOf(word) !== -1) problems.push('"' + word + '"'); });
  if (/!/.test(readableText('steady-wage/content.js'))) problems.push('an exclamation mark');
  var us = copy.match(US_SPELLINGS);
  if (us) problems.push('US spelling "' + us[0] + '"');
  assert.deepEqual(problems, []);
});

test('no em-dashes, and "not X but Y" stays rare', function () {
  var text = readableText('steady-wage/content.js');
  assert.equal((text.match(/—/g) || []).length, 0, 'no em-dashes');
  assert.ok((text.match(/\bisn't\b[^.]*\bit's\b|\bnot\b[^.]*\bbut\b/gi) || []).length <= 1);
});

test('the README house rules footer is on the page', function () {
  var page = fs.readFileSync(path.join(ROOT, 'steady-wage', 'index.html'), 'utf8');
  assert.ok(page.indexOf("Educational tools, not financial advice. Your numbers stay on your device. We don't store or see them.") !== -1);
});

/* ------------------------------------------------------------------ */

var total = passed + failures.length;
if (failures.length) {
  console.log('\n' + failures.length + ' of ' + total + ' checks FAILED:\n');
  failures.forEach(function (f) { console.log('  ✗ ' + f); });
  process.exit(1);
}
var example = L.compute(examplePlan(), TODAY);
console.log('\nThe example: ' + L.formatMoney(example.total) + ' landed after tax and costs, so a wage of ' + L.formatMoney(example.wage) +
  ' a month. Full pot ' + L.formatMoney(example.full) + ', low ' + L.formatMoney(example.low) + ', good-year money over ' + L.formatMoney(example.top) + '.');
console.log('Random years checked against a plain month-by-month count: ' + RANDOM_YEARS);
console.log('All ' + total + ' checks passed.');
