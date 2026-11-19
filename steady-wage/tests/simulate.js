#!/usr/bin/env node
/*
 * Pay Yourself a Steady Wage: does the method hold up?
 *
 *   node steady-wage/tests/simulate.js
 *
 * This isn't one of the test suites. It's the evidence behind the rules in
 * logic.js. It makes up thousands of five-year stretches of income (steady,
 * seasonal, lumpy), runs the planner's own sums on each one with a pay review
 * every three months, and counts how often payday came up short and how often
 * the wage had to change. Made-up income is a guide, not proof.
 *
 * Income is in pounds a month, averaging about £2,500 after tax and costs.
 */

'use strict';

var path = require('node:path');
var L = require(path.join(__dirname, '..', 'logic.js'));

var seed = 20261119;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function gauss() { var u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// A random multiplier that averages 1, with the given spread.
function spread(cv) { var s2 = Math.log(1 + cv * cv); return Math.exp(gauss() * Math.sqrt(s2) - s2 / 2); }

var MEAN = 250000; // pence
var PROFILES = {
  // Work every month, a bit up and down: a trade with regular customers.
  'steady work, some variation': function () { return spread(0.3); },
  // Work every month, big swings: commission, zero-hours, a busy freelancer.
  'work every month, big swings': function () { return spread(0.6); },
  // Seasonal: busy summer, thin winter (gardening, building, weddings).
  'seasonal, thin winter': function (m) { return (1 + 0.7 * Math.cos(2 * Math.PI * ((m % 12) - 6) / 12)) * spread(0.25); },
  // Seven months on, five off.
  'seven months on, five off': function (m) { var k = m % 12; return (k >= 3 && k <= 9 ? 12 / 7 : 0) * spread(0.3); },
  // The work is steady but the money arrives late and in clumps.
  'steady work, paid in lumps': 'late',
  // A third of months nothing lands at all, and the rest vary a lot.
  'very lumpy, a third of months empty': function () { return rnd() < 0.35 ? 0 : spread(0.7) / 0.65; },
  // Three or four big payments a year and nothing in between.
  'a few big payments a year': function () { return rnd() < 0.3 ? spread(0.5) / 0.3 : 0; }
};

// Income for one run: 12 months of history, then the years that follow.
function makeIncome(profile, months, opts) {
  var out = [];
  var phase = Math.floor(rnd() * 12);
  var years = [];
  for (var y = 0; y <= months / 12 + 1; y++) years.push(opts.yearSpread ? spread(opts.yearSpread) : 1);
  var i;
  if (profile === 'late') {
    // Each month's work is paid 0 to 3 months later, in one go.
    var total = months + 6;
    var arrivals = [];
    for (i = 0; i < total; i++) arrivals.push(0);
    for (i = 0; i < total; i++) {
      var due = i + Math.floor(rnd() * 4);
      if (due < total) arrivals[due] += spread(0.3);
    }
    for (i = 0; i < months; i++) out.push(arrivals[i + 4]);
  } else {
    for (i = 0; i < months; i++) out.push(profile(i + phase));
  }
  return out.map(function (v, t) {
    var x = v * years[Math.floor(t / 12)];
    if (opts.change && t >= 12 + opts.change.at) x *= opts.change.factor;
    return Math.round(x * MEAN);
  });
}

function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

// One five-year run. Returns what happened.
function runOnce(profile, opts) {
  var YEARS = opts.years || 5;
  var income = makeIncome(profile, 12 + YEARS * 12, opts);
  var trailing = income.slice(0, 12);
  if (sum(trailing) < 15 * L.WAGE_ROUND) return null;
  var wage = L.quietWage(sum(trailing), 12);
  var firstWage = wage;
  var sizes = opts.sizes;   // left out, the planner's own pot sizes
  var lowMonths = sizes ? sizes.low : L.LOW_MONTHS;
  var lines = opts.flat ? flatLines(wage, opts.flat) : L.potLines(trailing, wage, sizes);
  var pot = opts.startEmpty ? income[11] : lines.full;
  var fullAt = opts.startEmpty ? null : 0;
  var r = { shortMonths: 0, changes: 0, cuts: 0, lowestWage: wage, fullMonths: lines.full / wage, fullAfter: null, withoutPlan: 0, months: YEARS * 12 };
  for (var t = 0; t < YEARS * 12; t++) {
    if (t > 0 && t % 3 === 0) {
      var quiet = Math.max(L.quietWage(sum(trailing), 12), L.WAGE_ROUND);
      var verdict;
      if (opts.rule === 'tenPercent') {
        // A flat 10% off when the pot is low, however far income has fallen.
        verdict = pot < lowMonths * wage ? { wage: Math.floor(wage * 0.9) } : L.review(wage, pot, quiet, trailing, sizes);
      } else {
        verdict = L.review(wage, pot, quiet, trailing, sizes);
      }
      if (verdict.wage !== wage) {
        r.changes++;
        if (verdict.wage < wage) r.cuts++;
        wage = verdict.wage;
        if (wage < r.lowestWage) r.lowestWage = wage;
      }
      lines = opts.flat ? flatLines(wage, opts.flat) : L.potLines(trailing, wage, sizes);
      if (pot > lines.top) pot = lines.top;   // good-year money comes out
    }
    var pay = Math.min(wage, pot);
    if (pay < wage) r.shortMonths++;
    pot -= pay;
    var landed = income[12 + t];
    if (landed < firstWage) r.withoutPlan++;
    pot += landed;
    trailing.shift(); trailing.push(landed);
    if (fullAt === null && pot >= lines.full) { fullAt = t + 1; r.fullAfter = fullAt; }
  }
  r.lowestWage = r.lowestWage / firstWage;
  return r;
}

// The same pot for everyone, whatever their year looked like: so many months
// of wages, with the planner's own low line and headroom.
function flatLines(wage, months) {
  return { low: L.LOW_MONTHS * wage, full: months * wage, top: (months + L.HEADROOM_MONTHS) * wage };
}

function run(name, opts) {
  var N = opts.runs || 3000;
  var all = [];
  while (all.length < N) { var one = runOnce(PROFILES[name], opts); if (one) all.push(one); }
  var avg = function (f) { return sum(all.map(f)) / all.length; };
  var pct = function (f) { return Math.round(100 * all.filter(f).length / all.length); };
  var row = {
    'income pattern': name,
    'full pot (months of wages)': avg(function (r) { return r.fullMonths; }).toFixed(1),
    'short paydays a year, no plan': avg(function (r) { return r.withoutPlan / (r.months / 12); }).toFixed(1),
    'short paydays a year, with plan': avg(function (r) { return r.shortMonths / (r.months / 12); }).toFixed(2),
    'runs with no short payday': pct(function (r) { return r.shortMonths === 0; }) + '%',
    'wage changes a year': avg(function (r) { return r.changes / (r.months / 12); }).toFixed(1),
    'cuts a year': avg(function (r) { return r.cuts / (r.months / 12); }).toFixed(2),
    'lowest wage vs first': Math.round(100 * avg(function (r) { return r.lowestWage; })) + '%'
  };
  if (opts.startEmpty) {
    var filled = all.filter(function (r) { return r.fullAfter !== null; });
    row['months to fill the pot'] = filled.length ? (sum(filled.map(function (r) { return r.fullAfter; })) / filled.length).toFixed(0) : '-';
    row['filled within 3 years'] = Math.round(100 * all.filter(function (r) { return r.fullAfter !== null && r.fullAfter <= 36; }).length / all.length) + '%';
  }
  return row;
}

function table(title, opts) {
  console.log('\n' + title);
  console.table(Object.keys(PROFILES).map(function (name) { return run(name, opts); }));
}

if (require.main === module) {
  var base = { yearSpread: 0.15 };
  table('1. The planner’s rules, starting with a full pot, five years, good and bad years mixed in', base);
  table('2. The same, but a flat pot for everyone: start on three months of wages', Object.assign({ flat: 3 }, base));
  table('3. The same, but with a flat 10% cut instead of the planner’s cut', Object.assign({ rule: 'tenPercent' }, base));
  table('4. Income drops by 40% six months in, and stays down', Object.assign({ change: { at: 6, factor: 0.6 } }, base));
  table('5. Income grows by 40% six months in', Object.assign({ change: { at: 6, factor: 1.4 } }, base));
  table('6. Starting with an empty pot', Object.assign({ startEmpty: true }, base));
  // How big a cushion? The planner holds the leanest stretch + 2 months of
  // wages, with the cut line at 1. These two are the alternatives either side.
  table('7. A bigger cushion: leanest stretch + 3 months, cut under 2 (the first build)',
    Object.assign({ sizes: { low: 2, cushion: 3, headroom: 3 } }, base));
  table('8. A smaller cushion: leanest stretch + 1 month, cut under 1',
    Object.assign({ sizes: { low: 1, cushion: 1, headroom: 3 } }, base));
}

module.exports = { run: run, runOnce: runOnce, PROFILES: PROFILES };
