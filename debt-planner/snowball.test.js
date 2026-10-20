#!/usr/bin/env node
/*
 * Tests for the Debt Snowball Planner maths.
 *
 *   node debt-planner/snowball.test.js
 *
 * No installs needed, just Node. It:
 *   1. checks cases worked out by hand, month by month;
 *   2. runs thousands of random plans through snowball.js and through a
 *      separate, deliberately plain copy of the rules, and checks they agree;
 *   3. checks the things that must always be true (nothing goes missing,
 *      more money never makes it slower, the 50-year stop);
 *   4. checks the copy against the house rules in the README.
 */

'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

var HERE = __dirname;
var ROOT = path.join(HERE, '..');
var S = require(path.join(HERE, 'snowball.js'));

function loadBrowserFile(rel) {
  var sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  return JSON.parse(JSON.stringify(sandbox.window));
}
var CONTENT = loadBrowserFile('debt-planner/content.js').MIM_DEBT_CONTENT;
var QUIZ = loadBrowserFile('quiz/content.js').MIM_QUIZ_CONTENT;
var CONFIG = loadBrowserFile('assets/config.js').MIM_CONFIG;

var passed = 0;
var failures = [];
function test(name, fn) {
  try { fn(); passed++; }
  catch (err) { failures.push(name + '\n    ' + err.message.split('\n').join('\n    ')); }
}

function debt(name, balance, minimum, apr) {
  return { name: name, balance: balance, minimum: minimum, apr: apr === undefined ? null : apr };
}
function byName(plan, name) {
  return plan.order.filter(function (d) { return d.name === name; })[0];
}

/* ------------------------------------------------------------------
 * 1. Worked out by hand
 * ------------------------------------------------------------------ */

/*
 * Two debts and £20 extra, so £50 a month goes on debt in total.
 *   Sofa  £100, minimum £10, no interest
 *   Card  £300, minimum £20, 12% APR (1% a month), interest rounded to the penny
 *
 * Sofa is the smaller balance, so it goes first.
 *
 * Month  Card interest      Card after paying      Sofa after paying
 *   1    1% of 300.00 = 3.00   303.00 - 20 = 283.00   100 - 10 - 20 = 70
 *   2    1% of 283.00 = 2.83   285.83 - 20 = 265.83    70 - 30 = 40
 *   3    1% of 265.83 = 2.66   268.49 - 20 = 248.49    40 - 30 = 10
 *   4    1% of 248.49 = 2.48   250.97 - 20 = 230.97    10 - 10 = 0, cleared.
 *        The £20 extra is left over, so it rolls onto the card: 230.97 - 20 = 210.97
 *   5    1% of 210.97 = 2.11   213.08 - 50 = 163.08    (the card now gets the whole £50)
 *   6    1% of 163.08 = 1.63   164.71 - 50 = 114.71
 *   7    1% of 114.71 = 1.15   115.86 - 50 =  65.86
 *   8    1% of  65.86 = 0.66    66.52 - 50 =  16.52
 *   9    1% of  16.52 = 0.17    16.69 - 16.69 = 0, cleared. Debt-free.
 *
 * Interest: 3.00 + 2.83 + 2.66 + 2.48 + 2.11 + 1.63 + 1.15 + 0.66 + 0.17 = £16.69
 * Paid: 8 × £50 + £16.69 = £416.69, which is the £400 owed plus the interest.
 */
test('hand-checked: two debts, one with interest', function () {
  var plan = S.simulate({ debts: [debt('Card', 300, 20, 12), debt('Sofa', 100, 10)], extra: 20 });
  assert.deepEqual(plan.order.map(function (d) { return d.name; }), ['Sofa', 'Card'], 'smallest first');
  assert.equal(plan.budget, 5000, '£50 a month');
  assert.equal(plan.finished, true);
  assert.equal(plan.months, 9, 'debt-free after 9 months');
  assert.equal(byName(plan, 'Sofa').clearMonth, 4, 'sofa clears in month 4');
  assert.equal(byName(plan, 'Card').clearMonth, 9, 'card clears in month 9');
  assert.deepEqual(plan.timeline, [40000, 35300, 30583, 25849, 21097, 16308, 11471, 6586, 1652, 0], 'what is owed at the end of each month');
  assert.equal(plan.totalInterest, 1669, '£16.69 interest');
  assert.equal(byName(plan, 'Card').interest, 1669);
  assert.equal(byName(plan, 'Sofa').interest, 0);
  assert.equal(plan.totalPaid, 41669, '£416.69 paid');
  assert.deepEqual(plan.payments, [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 1669], 'payments each month');
  assert.equal(byName(plan, 'Sofa').rollTo, 1, 'sofa rolls onto the card');
  assert.equal(byName(plan, 'Sofa').rollAmount, 5000, 'the card then gets the full £50');
  assert.equal(plan.ratesGiven, 'some');
  assert.equal(byName(plan, 'Card').growing, false);
});

/*
 * The same debts with no interest: £400 at £50 a month is 8 months.
 * The sofa gets its £10 plus the £20 extra: 100 → 70 → 40 → 10, and its last
 * £10 in month 4. The card gets £20 a month: 280, 260, 240, and in month 4
 * also the £20 the sofa didn't need: 200. Then the full £50: 150, 100, 50, 0.
 */
test('hand-checked: no interest at all', function () {
  var plan = S.simulate({ debts: [debt('Card', 300, 20), debt('Sofa', 100, 10)], extra: 20 });
  assert.equal(plan.months, 8);
  assert.equal(byName(plan, 'Sofa').clearMonth, 4);
  assert.deepEqual(plan.timeline, [40000, 35000, 30000, 25000, 20000, 15000, 10000, 5000, 0]);
  assert.equal(plan.totalInterest, 0);
  assert.equal(plan.ratesGiven, 'none');
});

/*
 * A minimum bigger than what's left: the spare goes on the next debt.
 *   Phone £30, minimum £50.   Loan £500, minimum £20.   No extra, so £70 a month.
 * Month 1: phone takes £30 and clears. The other £40 goes on the loan: 460.
 * Then the loan gets £70 a month: 390, 320, 250, 180, 110, 40, then the last £40 in month 8.
 */
test('hand-checked: a minimum bigger than the balance rolls the spare on', function () {
  var plan = S.simulate({ debts: [debt('Loan', 500, 20), debt('Phone', 30, 50)], extra: 0 });
  assert.equal(byName(plan, 'Phone').clearMonth, 1);
  assert.deepEqual(plan.timeline, [53000, 46000, 39000, 32000, 25000, 18000, 11000, 4000, 0]);
  assert.equal(plan.months, 8);
  assert.equal(plan.payments[7], 4000, 'last payment is the £40 left');
});

test('order is smallest balance first, whatever the interest rate', function () {
  var plan = S.simulate({
    debts: [debt('Big and dear', 5000, 150, 39.9), debt('Small and free', 200, 20, 0), debt('Middle', 1200, 40, 18)],
    extra: 50
  });
  assert.deepEqual(plan.order.map(function (d) { return d.name; }), ['Small and free', 'Middle', 'Big and dear']);
});

test('equal balances keep the order they were added in', function () {
  var plan = S.simulate({ debts: [debt('First', 500, 20), debt('Second', 500, 20, 30), debt('Tiny', 50, 5)], extra: 0 });
  assert.deepEqual(plan.order.map(function (d) { return d.name; }), ['Tiny', 'First', 'Second']);
});

test('a debt whose own payments clear it before its turn is marked early', function () {
  // Card is smaller so it goes first, but the car's big minimum clears the car sooner.
  var plan = S.simulate({ debts: [debt('Card', 1000, 25), debt('Car', 1100, 400)], extra: 0 });
  assert.equal(byName(plan, 'Car').clearMonth, 3, 'car: 1100 → 700 → 300 → 0');
  assert.equal(byName(plan, 'Car').early, true);
  assert.equal(byName(plan, 'Card').early, false);
  assert.equal(byName(plan, 'Car').rollTo, 0, 'the car rolls onto the card');
  assert.equal(byName(plan, 'Car').rollAmount, 42500, 'card then gets £425 a month');
});

test('a minimum that does not cover the interest is flagged as growing', function () {
  // £1,000 at 24% APR adds £20 a month; a £15 minimum doesn't cover it.
  var plan = S.simulate({ debts: [debt('Store card', 1000, 15, 24), debt('Loan', 300, 30, 10)], extra: 100 });
  var card = byName(plan, 'Store card');
  assert.equal(card.firstInterest, 2000);
  assert.equal(card.growing, true);
  assert.equal(byName(plan, 'Loan').growing, false);
  assert.equal(plan.finished, true, 'the snowball still clears it');
  // A minimum exactly equal to the interest doesn't bring it down either.
  assert.equal(S.simulate({ debts: [debt('Even', 1000, 20, 24)], extra: 0 }).order[0].growing, true);
  // No rate, no interest, nothing growing.
  assert.equal(S.simulate({ debts: [debt('Mum', 1000, 0)], extra: 0 }).order[0].growing, false);
});

test('stops at 50 years and says so', function () {
  // £10,000 at 30% APR adds £250 a month; £100 a month never catches it.
  var plan = S.simulate({ debts: [debt('Payday loan', 10000, 100, 30)], extra: 0 });
  assert.equal(plan.finished, false);
  assert.equal(plan.months, 600);
  assert.equal(plan.order[0].clearMonth, null);
  assert.equal(plan.timeline.length, 601);
});

test('the 50-year line is exact: 600 months finishes, 601 does not', function () {
  var at600 = S.simulate({ debts: [debt('Mum', 600, 1)], extra: 0 });
  assert.equal(at600.finished, true);
  assert.equal(at600.months, 600);
  var at601 = S.simulate({ debts: [debt('Mum', 601, 1)], extra: 0 });
  assert.equal(at601.finished, false);
});

test('nothing to pay with means no finish', function () {
  var plan = S.simulate({ debts: [debt('Mum', 500, 0)], extra: 0 });
  assert.equal(plan.budget, 0);
  assert.equal(plan.finished, false);
});

test('runaway interest stops early instead of counting to silly numbers', function () {
  var plan = S.simulate({ debts: [debt('Loan shark', 5000, 0, 1000)], extra: 0 });
  assert.equal(plan.finished, false);
  assert.ok(plan.months < 600, 'stopped after ' + plan.months + ' months');
  assert.ok(isFinite(plan.timeline[plan.timeline.length - 1]));
});

test('what if: £50 more a month', function () {
  // The hand-checked plan again. With £70 extra (£100 a month) the sofa goes in
  // month 2 and everything is clear in month 5.
  var input = { debts: [debt('Card', 300, 20, 12), debt('Sofa', 100, 10)], extra: 20 };
  var w = S.whatIf(input, 50);
  assert.equal(w.base.months, 9);
  assert.equal(w.alt.months, 5);
  assert.equal(w.monthsSaved, 4);
  assert.ok(w.interestSaved > 0);
  var stuck = S.whatIf({ debts: [debt('Payday loan', 10000, 100, 30)], extra: 0 }, 25);
  assert.equal(stuck.monthsSaved, null, 'no months saved if neither finishes');
});

/* ------------------------------------------------------------------
 * 2. Against a plain copy of the rules, on thousands of random plans
 * ------------------------------------------------------------------ */

// Written out longhand from the brief, without looking at snowball.js:
// pay the minimum on every debt except the smallest one still owing, which
// gets everything else; anything it doesn't need goes on the next one.
function reference(debts, extra) {
  var list = debts.map(function (d, i) {
    return {
      i: i,
      start: Math.round(d.balance * 100),
      owed: Math.round(d.balance * 100),
      min: Math.round(d.minimum * 100),
      rate: d.apr || 0,
      cleared: null
    };
  });
  list.sort(function (a, b) { return a.start - b.start || a.i - b.i; });
  var budget = Math.round(extra * 100);
  list.forEach(function (d) { budget += d.min; });

  var month = 0;
  var interest = 0;
  function anyOwed() { return list.some(function (d) { return d.owed > 0; }); }
  while (anyOwed() && month < 600) {
    month++;
    list.forEach(function (d) {
      if (d.owed > 0) {
        var add = Math.round(d.owed * d.rate / 1200);
        d.owed += add;
        interest += add;
      }
    });
    var target = list.filter(function (d) { return d.owed > 0; })[0];
    var left = budget;
    list.forEach(function (d) {
      if (d !== target && d.owed > 0) {
        var pay = Math.min(d.min, d.owed);
        d.owed -= pay;
        left -= pay;
      }
    });
    list.forEach(function (d) {
      if (left > 0 && d.owed > 0) {
        var pay = Math.min(left, d.owed);
        d.owed -= pay;
        left -= pay;
      }
    });
    list.forEach(function (d) { if (d.owed === 0 && d.cleared === null) d.cleared = month; });
    var total = list.reduce(function (s, d) { return s + d.owed; }, 0);
    if (total > 1e13) break;
  }
  var clears = [];
  list.forEach(function (d) { clears[d.i] = d.cleared; });
  return { months: month, finished: !anyOwed(), interest: interest, clears: clears };
}

// A small seeded random number generator, so a failure can be repeated.
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var random = rng(20261013);
function pick(n) { return Math.floor(random() * n); }
function randomPlan() {
  var count = 1 + pick(8);
  var debts = [];
  for (var i = 0; i < count; i++) {
    var balance = random() < 0.3 ? pick(2000000) / 100 + 0.01 : 50 + pick(400) * 25;
    var minimum = random() < 0.1 ? 0 : (random() < 0.5 ? pick(60000) / 100 : 5 + pick(40) * 5);
    var r = random();
    var apr = r < 0.25 ? null : (r < 0.35 ? 0 : (r < 0.95 ? pick(4000) / 100 : pick(30000) / 100));
    debts.push(debt('Debt ' + (i + 1), balance, minimum, apr));
  }
  var extra = random() < 0.3 ? 0 : pick(50000) / 100;
  return { debts: debts, extra: extra };
}

var RANDOM_PLANS = 4000;
var tally = { finished: 0, unfinished: 0, longest: 0, growing: 0 };

for (var n = 0; n < RANDOM_PLANS; n++) {
  var input = randomPlan();
  var label = 'random plan ' + n + ' ' + JSON.stringify(input);
  try {
    var plan = S.simulate(input);
    var ref = reference(input.debts, input.extra);

    assert.equal(plan.finished, ref.finished, 'finished');
    assert.equal(plan.months, ref.months, 'months');
    assert.equal(plan.totalInterest, ref.interest, 'interest');
    plan.order.forEach(function (d) {
      var original = input.debts.map(function (x) { return x.name; }).indexOf(d.name);
      assert.equal(d.clearMonth, ref.clears[original], d.name + ' clear month');
    });

    // Always true:
    for (var i = 1; i < plan.order.length; i++) {
      assert.ok(plan.order[i - 1].startBalance <= plan.order[i].startBalance, 'smallest balance first');
    }
    plan.timeline.forEach(function (t) { assert.ok(t >= 0, 'never owes less than nothing'); });
    plan.payments.forEach(function (p, m) {
      assert.ok(p <= plan.budget, 'never pays more than the monthly pot');
      if (m < plan.payments.length - 1 && plan.finished) assert.equal(p, plan.budget, 'every month but the last uses the whole pot');
    });
    var owedAtEnd = plan.timeline[plan.timeline.length - 1];
    assert.equal(plan.totalPaid + owedAtEnd, plan.totalStart + plan.totalInterest, 'every penny is accounted for');
    if (plan.finished) {
      assert.equal(owedAtEnd, 0);
      plan.order.forEach(function (d) { assert.ok(d.clearMonth >= 1 && d.clearMonth <= plan.months, 'clears inside the plan'); });
      assert.equal(Math.max.apply(null, plan.order.map(function (d) { return d.clearMonth; })), plan.months, 'the last debt clears in the last month');
    }
    plan.order.forEach(function (d) {
      if (d.rollTo !== null) {
        assert.ok(d.rollAmount > 0 && d.rollAmount <= plan.budget, 'rolled amount fits the pot');
        assert.ok(plan.order[d.rollTo].clearMonth === null || plan.order[d.rollTo].clearMonth > d.clearMonth, 'rolls onto a debt still owing');
      }
    });

    // More money never makes it slower.
    if (plan.finished && plan.budget > 0) {
      var w = S.whatIf(input, [25, 50, 100][n % 3]);
      assert.equal(w.alt.finished, true, 'still finishes with more');
      assert.ok(w.alt.months <= plan.months, 'more money is never slower');
      assert.ok(w.monthsSaved >= 0);
      assert.ok(w.alt.totalInterest <= plan.totalInterest, 'more money never costs more interest');
    }

    if (plan.finished) tally.finished++; else tally.unfinished++;
    if (plan.finished) tally.longest = Math.max(tally.longest, plan.months);
    if (plan.order.some(function (d) { return d.growing; })) tally.growing++;
    passed++;
  } catch (err) {
    failures.push(label + '\n    ' + err.message.split('\n')[0]);
  }
}

test('the random plans cover finished, unfinished and growing debts', function () {
  assert.ok(tally.finished > 100, tally.finished + ' finished');
  assert.ok(tally.unfinished > 10, tally.unfinished + ' unfinished');
  assert.ok(tally.growing > 10, tally.growing + ' with a growing debt');
});

/* ------------------------------------------------------------------
 * 3. Reading input, dates and money
 * ------------------------------------------------------------------ */

test('reads amounts the way people type them', function () {
  assert.equal(S.parseNumber('1250'), 1250);
  assert.equal(S.parseNumber('£1,250.50'), 1250.5);
  assert.equal(S.parseNumber(' 22.9% '), 22.9);
  assert.equal(S.parseNumber('.5'), 0.5);
  assert.equal(S.parseNumber(''), null);
  assert.ok(isNaN(S.parseNumber('-5')));
  assert.ok(isNaN(S.parseNumber('12a')));
  assert.ok(isNaN(S.parseNumber('1.2.3')));
});

test('checks a debt before adding it', function () {
  assert.deepEqual(S.checkDebt({ name: ' Barclaycard ', balance: '£1,200', minimum: '36', apr: '' }).debt,
    { name: 'Barclaycard', balance: 1200, minimum: 36, apr: null });
  assert.deepEqual(S.checkDebt({ name: 'Mum', balance: '500', minimum: '0', apr: '0' }).debt,
    { name: 'Mum', balance: 500, minimum: 0, apr: 0 });
  assert.deepEqual(S.checkDebt({}).errors, { name: 'required', balance: 'required', minimum: 'required' });
  assert.deepEqual(S.checkDebt({ name: 'X', balance: '0', minimum: 'lots', apr: '2000' }).errors,
    { balance: 'invalid', minimum: 'invalid', apr: 'invalid' });
  assert.equal(S.checkDebt({ name: 'A really very long name that goes on and on and on', balance: '1', minimum: '1' }).debt.name.length, S.MAX_NAME);
});

test('the extra can be blank or £0, never negative', function () {
  assert.deepEqual(S.checkExtra(''), { extra: 0 });
  assert.deepEqual(S.checkExtra('0'), { extra: 0 });
  assert.deepEqual(S.checkExtra('£75.50'), { extra: 75.5 });
  assert.deepEqual(S.checkExtra('-10'), { error: 'invalid' });
});

test('saved data is cleaned up safely', function () {
  var empty = { debts: [], extra: '', signs: [], name: '', shown: false, example: false };
  assert.deepEqual(S.sanitize(null), empty);
  assert.deepEqual(S.sanitize('nonsense'), empty);
  var clean = S.sanitize({
    debts: [{ id: 'a1', name: 'Card', balance: 500, minimum: 20, apr: 19.9 }, { id: 'x', name: '', balance: -4 }, { id: 'a1', name: 'Loan', balance: 100, minimum: 10 }],
    extra: '50', signs: ['minimums', 'bogus'], name: 'Sam', shown: true, hacker: '<script>'
  });
  assert.equal(clean.debts.length, 2, 'drops the broken debt');
  assert.notEqual(clean.debts[0].id, clean.debts[1].id, 'ids are unique');
  assert.deepEqual(clean.signs, ['minimums']);
  assert.equal(clean.extra, '50');
  assert.equal(clean.shown, true);
  assert.equal(clean.hacker, undefined);
  assert.equal(S.sanitize({ debts: [], shown: true }).shown, false, 'nothing to show without debts');
  var many = [];
  for (var i = 0; i < 30; i++) many.push({ name: 'D' + i, balance: 100, minimum: 10 });
  assert.equal(S.sanitize({ debts: many }).debts.length, S.MAX_DEBTS);
});

test('the plan starts next month, and months roll over the year', function () {
  assert.deepEqual(S.planStart(new Date(2026, 9, 13)), { year: 2026, month: 10 }, '13 Oct 2026 starts November 2026');
  assert.deepEqual(S.planStart(new Date(2026, 11, 31)), { year: 2027, month: 0 }, 'December rolls to January');
  var start = { year: 2026, month: 10 };
  assert.equal(S.monthName(S.monthOfPlan(start, 1)), 'November 2026');
  assert.equal(S.monthName(S.monthOfPlan(start, 9)), 'July 2027', 'the hand-checked plan ends in July 2027');
  assert.equal(S.monthName(S.monthOfPlan(start, 14)), 'December 2027');
  assert.equal(S.shortMonth(S.monthOfPlan(start, 3)), 'Jan 27');
  assert.deepEqual(S.splitMonths(29), { years: 2, months: 5 });
});

test('money is shown the UK way', function () {
  assert.equal(S.money(125050), '£1,250.50');
  assert.equal(S.money(125000), '£1,250');
  assert.equal(S.money(5), '£0.05');
  assert.equal(S.money(144428, true), '£1,444');
  assert.equal(S.money(123456789), '£1,234,567.89');
});

/* ------------------------------------------------------------------
 * 4. Copy and settings (the house rules in the README)
 * ------------------------------------------------------------------ */

test('the example is four valid debts that finish', function () {
  var X = CONTENT.example;
  assert.equal(X.debts.length, 4);
  var debts = X.debts.map(function (raw) {
    var checked = S.checkDebt(raw);
    assert.ok(checked.debt, raw.name + ' is valid');
    return checked.debt;
  });
  var plan = S.simulate({ debts: debts, extra: S.checkExtra(X.extra).extra });
  assert.equal(plan.finished, true);
  assert.ok(plan.months >= 12 && plan.months <= 60, 'example takes ' + plan.months + ' months');
  assert.equal(plan.ratesGiven, 'all');
});

test('the warning-sign tick boxes are the same four as the quiz', function () {
  assert.deepEqual(CONTENT.signs.options, QUIZ.questions.debtSigns.options);
  assert.deepEqual(CONTENT.signs.options.map(function (o) { return o.value; }), S.WARNING_SIGNS);
});

test('faith: one approved line on the page and one on the PDF, never first', function () {
  var VERSE = /(Luke 14:28|Proverbs 21:20|Proverbs 22:7|Matthew 25:14–30|2 Corinthians 9:6–8)/;
  var BOOKS = /\b(Luke|Proverbs|Matthew|Corinthians|Jesus|God|Bible|scripture|pray)\b/;
  var found = [];
  (function walk(obj, where) {
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (typeof v === 'string' && BOOKS.test(v)) found.push(where + k);
      else if (v && typeof v === 'object') walk(v, where + k + '.');
    });
  })(CONTENT, '');
  assert.deepEqual(found.sort(), ['pdf.faith', 'results.faith']);
  assert.ok(VERSE.test(CONTENT.results.faith));
  assert.ok(VERSE.test(CONTENT.pdf.faith));
  assert.ok(!BOOKS.test(CONTENT.intro.lead), 'the page does not open with faith');
});

test('the brief\'s must-haves are in the copy', function () {
  assert.ok(/behaviour beats maths/.test(CONTENT.results.order.why));
  assert.ok(/whatever the interest rate/.test(CONTENT.results.order.why));
  assert.ok(/graduate tax/.test(CONTENT.counts.no));
  assert.equal(CONTENT.counts.pcp, undefined, 'car finance counts as debt, with no separate PCP line');
  assert.ok(/statement/.test(CONTENT.debts.aprHint));
  assert.equal(CONTENT.pdf.title, 'My Debt-Free Plan');
  assert.equal(CONTENT.results.email.heading, 'Stay in touch while you pay this off');
  assert.ok(/^Track it in the free Money in Motion app/.test(CONTENT.pdf.app));
  ['credit cards', 'loans', 'overdrafts', 'Buy Now Pay Later', 'car finance', 'family'].forEach(function (w) {
    assert.ok(CONTENT.counts.yes.indexOf(w) !== -1, 'counts mentions ' + w);
  });
});

test('config: chart library pinned with integrity, email tagged tool=debt-planner', function () {
  var lib = CONFIG.libraries.chartjs;
  assert.ok(/^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/Chart\.js\/\d+\.\d+\.\d+\//.test(lib.src), 'cdnjs, exact version');
  assert.ok(/^sha384-[A-Za-z0-9+/]{64}$/.test(lib.integrity), 'integrity hash');
  var own = CONFIG.signup.debtPlanner;
  assert.equal(own.toolField, 'tool');
  assert.equal(own.toolValue, 'debt-planner');
  assert.ok(/Your debts stay on this device/.test(own.consentText));
  assert.equal(CONFIG.debtHelp.length, 3);
  assert.deepEqual(CONFIG.debtHelp.map(function (o) { return o.name.split(' ')[0]; }), ['StepChange', 'CAP', 'Citizens']);
});

var BANNED = [
  'journey', 'game-changer', 'game changer', 'life-changing', 'transformational', 'dive in',
  'unpack', "here's the thing", 'hustle', 'abundance mindset', 'scarcity mindset',
  "in today's world", 'honestly', "it's worth noting"
];
var US_SPELLINGS = /\b(organiz\w*|favor|favorite|color\w*|behavior\w*|center|realiz\w*|recogniz\w*|prioritiz\w*|analyz\w*|apologiz\w*|minimiz\w*|maximiz\w*)\b/i;

function copyText(rel) {
  var raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (/\.html$/.test(rel)) {
    raw = raw.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
  } else {
    raw = (raw.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g) || []).join('\n');
  }
  return raw.replace(/[’‘]/g, "'").replace(/&amp;/g, '&');
}

test('no banned words, piles of exclamation marks or US spellings', function () {
  var problems = [];
  ['debt-planner/index.html', 'debt-planner/content.js'].forEach(function (rel) {
    var text = copyText(rel);
    var lower = text.toLowerCase();
    BANNED.forEach(function (word) { if (lower.indexOf(word) !== -1) problems.push(rel + ': "' + word + '"'); });
    if (/!!/.test(text)) problems.push(rel + ': "!!"');
    var us = text.match(US_SPELLINGS);
    if (us) problems.push(rel + ': US spelling "' + us[0] + '"');
  });
  var own = CONFIG.signup.debtPlanner;
  [own.consentText, own.successMessage].forEach(function (t) {
    BANNED.forEach(function (word) { if (t.toLowerCase().replace(/’/g, "'").indexOf(word) !== -1) problems.push('config: "' + word + '"'); });
  });
  assert.deepEqual(problems, []);
});

test('em-dashes and exclamation marks stay rare', function () {
  var text = copyText('debt-planner/content.js');
  assert.ok((text.match(/—/g) || []).length <= 2, 'em-dashes');
  assert.ok((text.match(/!/g) || []).length <= 1, 'exclamation marks');
});

/* ------------------------------------------------------------------ */

var total = passed + failures.length;
console.log('\nRandom plans checked against the plain copy of the rules: ' + RANDOM_PLANS);
console.log('  finished within 50 years: ' + tally.finished + ' (longest ' + tally.longest + ' months)');
console.log('  not within 50 years:      ' + tally.unfinished);
console.log('  with a growing debt:      ' + tally.growing);

if (failures.length) {
  console.log('\n' + failures.length + ' of ' + total + ' checks FAILED:\n');
  failures.slice(0, 25).forEach(function (f) { console.log('  ✗ ' + f); });
  if (failures.length > 25) console.log('  …and ' + (failures.length - 25) + ' more');
  process.exit(1);
}
console.log('\nAll ' + total + ' checks passed.');
