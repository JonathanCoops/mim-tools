/*
 * Debt Snowball Planner: the maths.
 * No words and no page code in here, just the sums, so it can be tested
 * on its own (see debt-planner/snowball.test.js).
 *
 * Everything is worked out in whole pence, so the results can be checked
 * by hand and never drift by a fraction of a penny.
 *
 * Each month:
 *   1. Interest goes on every debt still owing: balance × APR ÷ 12
 *      (rounded to the penny; no rate given means no interest).
 *   2. Every debt gets its minimum (or what's left on it, if that's less).
 *   3. Everything else in the monthly pot (the extra, plus the minimums of
 *      debts already cleared) goes on the first debt still owing in snowball
 *      order. If that clears it, the rest rolls straight onto the next one.
 *
 * The monthly pot never changes: all the minimums plus the extra. That's the
 * snowball. Snowball order is smallest balance first, whatever the rate, and
 * it's fixed on the day you make the plan.
 */

(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIMSnowball = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_MONTHS = 600;      // 50 years: we stop counting there and say so
  var MAX_DEBTS = 12;        // keeps the printed plan on one A4 page
  var MAX_NAME = 40;
  var MAX_AMOUNT = 10000000; // £10 million
  var MAX_APR = 1000;
  var GIVE_UP_AT = 1e13;     // pence (£100 billion): the interest has won, stop counting
  var WARNING_SIGNS = ['minimums', 'notFalling', 'creditMonth', 'yearIncome'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  /* ---------------- Reading what people type ---------------- */

  // "£1,250.50" -> 1250.5. Blank -> null. Anything else odd -> NaN.
  function parseNumber(text) {
    if (typeof text === 'number') return isFinite(text) ? text : NaN;
    var cleaned = String(text === null || text === undefined ? '' : text)
      .replace(/[£,\s%]/g, '');
    if (cleaned === '') return null;
    if (!/^\d*\.?\d+$|^\d+\.$/.test(cleaned)) return NaN;
    return parseFloat(cleaned);
  }

  function toPence(pounds) {
    return Math.round(pounds * 100);
  }

  // Checks one debt as typed. Returns { debt } or { errors: { field: code } }.
  function checkDebt(raw) {
    raw = raw || {};
    var errors = {};
    var name = String(raw.name || '').trim().slice(0, MAX_NAME);
    var balance = parseNumber(raw.balance);
    var minimum = parseNumber(raw.minimum);
    var apr = parseNumber(raw.apr);

    if (!name) errors.name = 'required';
    if (balance === null) errors.balance = 'required';
    else if (isNaN(balance) || balance <= 0 || balance > MAX_AMOUNT) errors.balance = 'invalid';
    if (minimum === null) errors.minimum = 'required';
    else if (isNaN(minimum) || minimum < 0 || minimum > MAX_AMOUNT) errors.minimum = 'invalid';
    if (apr !== null && (isNaN(apr) || apr < 0 || apr > MAX_APR)) errors.apr = 'invalid';

    if (Object.keys(errors).length) return { errors: errors };
    return {
      debt: {
        name: name,
        balance: toPence(balance) / 100,
        minimum: toPence(minimum) / 100,
        apr: apr === null ? null : Math.round(apr * 100) / 100
      }
    };
  }

  // The extra each month. Blank counts as £0.
  function checkExtra(text) {
    var value = parseNumber(text);
    if (value === null) return { extra: 0 };
    if (isNaN(value) || value < 0 || value > MAX_AMOUNT) return { error: 'invalid' };
    return { extra: toPence(value) / 100 };
  }

  // Cleans up saved data from this device, which could be old or edited.
  function sanitize(raw) {
    var clean = { debts: [], extra: '', signs: [], name: '', shown: false, example: false };
    if (!raw || typeof raw !== 'object') return clean;
    if (Array.isArray(raw.debts)) {
      raw.debts.slice(0, MAX_DEBTS).forEach(function (d, i) {
        var checked = checkDebt(d);
        if (!checked.debt) return;
        var id = typeof d.id === 'string' && /^[\w-]{1,24}$/.test(d.id) ? d.id : 'd' + i;
        checked.debt.id = id;
        clean.debts.push(checked.debt);
      });
    }
    var ids = {};
    clean.debts.forEach(function (d, i) {
      if (ids[d.id]) d.id = d.id + '-' + i;
      ids[d.id] = true;
    });
    if (raw.extra !== undefined && raw.extra !== null && !checkExtra(raw.extra).error) {
      clean.extra = String(raw.extra).slice(0, 20);
    }
    if (Array.isArray(raw.signs)) {
      clean.signs = WARNING_SIGNS.filter(function (s) { return raw.signs.indexOf(s) !== -1; });
    }
    if (typeof raw.name === 'string') clean.name = raw.name.trim().slice(0, MAX_NAME);
    clean.shown = raw.shown === true && clean.debts.length > 0;
    clean.example = raw.example === true && clean.debts.length > 0;
    return clean;
  }

  /* ---------------- The snowball ---------------- */

  // Smallest balance first. Equal balances keep the order they were added in.
  function snowballOrder(debts) {
    return debts
      .map(function (d, i) { return { debt: d, i: i }; })
      .sort(function (a, b) { return (a.debt.balance - b.debt.balance) || (a.i - b.i); })
      .map(function (x) { return x.debt; });
  }

  function monthlyInterest(pence, apr) {
    if (!apr || pence <= 0) return 0;
    return Math.round(pence * apr / 100 / 12);
  }

  /*
   * simulate({ debts: [{ name, balance, minimum, apr }], extra })
   *
   * Returns, with money in pence:
   *   finished       true if everything clears within 50 years
   *   months         how many months of payments it takes (if it never finishes,
   *                  how far we counted before stopping)
   *   budget         the monthly pot: all the minimums plus the extra
   *   totalStart     what's owed today
   *   totalInterest  interest added along the way
   *   totalPaid      everything paid
   *   ratesGiven     'all', 'some' or 'none'
   *   timeline       total still owed at the end of each month (timeline[0] is today)
   *   payments       total paid each month (payments[0] is month 1)
   *   order          the debts in snowball order, each with:
   *       position, name, apr, startBalance, minimum, firstInterest,
   *       growing     true if the minimum doesn't cover the interest it adds
   *       clearMonth  the month it clears (1 = the first month), or null
   *       interest    interest added to this debt
   *       rollTo      when it clears, the debt that picks up its payment (index into order)
   *       rollAmount  what that debt then gets each month
   *       early       true if it cleared before a debt ahead of it in the order
   */
  function simulate(input) {
    input = input || {};
    var extra = toPence(Math.max(0, Number(input.extra) || 0));
    var maxMonths = input.maxMonths || MAX_MONTHS;
    var ordered = snowballOrder(input.debts || []);

    var debts = ordered.map(function (d, position) {
      var start = toPence(d.balance);
      var apr = d.apr === null || d.apr === undefined ? null : Number(d.apr);
      var minimum = toPence(d.minimum);
      var firstInterest = monthlyInterest(start, apr);
      return {
        id: d.id,
        position: position,
        name: d.name,
        apr: apr,
        startBalance: start,
        minimum: minimum,
        firstInterest: firstInterest,
        growing: firstInterest > 0 && minimum <= firstInterest,
        balance: start,
        clearMonth: null,
        interest: 0,
        rollTo: null,
        rollAmount: null,
        early: false
      };
    });

    var budget = extra + debts.reduce(function (sum, d) { return sum + d.minimum; }, 0);
    var totalStart = debts.reduce(function (sum, d) { return sum + d.startBalance; }, 0);
    var withRate = debts.filter(function (d) { return d.apr !== null; }).length;
    var timeline = [totalStart];
    var payments = [];
    var totalInterest = 0;
    var month = 0;

    function owing() { return debts.filter(function (d) { return d.balance > 0; }); }

    while (owing().length && month < maxMonths) {
      month += 1;
      var live = owing();

      // 1. Interest
      live.forEach(function (d) {
        var interest = monthlyInterest(d.balance, d.apr);
        d.balance += interest;
        d.interest += interest;
        totalInterest += interest;
      });

      // 2. Minimums on everything
      var pot = budget;
      live.forEach(function (d) {
        var pay = Math.min(d.minimum, d.balance, pot);
        d.balance -= pay;
        pot -= pay;
      });

      // 3. The rest goes down the list, smallest first
      for (var i = 0; i < debts.length && pot > 0; i++) {
        if (debts[i].balance <= 0) continue;
        var pay = Math.min(pot, debts[i].balance);
        debts[i].balance -= pay;
        pot -= pay;
      }
      payments.push(budget - pot);

      // Who cleared this month, and where their payment goes next
      var left = owing();
      var target = left[0] || null;
      var othersMinimums = left.slice(1).reduce(function (sum, d) { return sum + d.minimum; }, 0);
      live.forEach(function (d) {
        if (d.balance > 0) return;
        d.clearMonth = month;
        if (target) {
          d.rollTo = target.position;
          d.rollAmount = budget - othersMinimums;
        }
      });

      var stillOwed = debts.reduce(function (sum, d) { return sum + Math.max(0, d.balance); }, 0);
      timeline.push(stillOwed);
      if (stillOwed > GIVE_UP_AT) break;
    }

    // A debt that cleared before one ahead of it in the order did it on its own payments.
    var latest = 0;
    debts.forEach(function (d) {
      if (d.clearMonth !== null && d.clearMonth < latest) d.early = true;
      if (d.clearMonth === null) latest = Infinity;
      else latest = Math.max(latest, d.clearMonth);
    });

    var finished = owing().length === 0;
    return {
      finished: finished,
      months: month,
      budget: budget,
      extra: extra,
      totalStart: totalStart,
      totalInterest: totalInterest,
      totalPaid: payments.reduce(function (s, p) { return s + p; }, 0),
      ratesGiven: withRate === 0 ? 'none' : (withRate === debts.length ? 'all' : 'some'),
      timeline: timeline,
      payments: payments,
      order: debts.map(function (d) {
        return {
          id: d.id,
          position: d.position,
          name: d.name,
          apr: d.apr,
          startBalance: d.startBalance,
          minimum: d.minimum,
          firstInterest: d.firstInterest,
          growing: d.growing,
          clearMonth: d.clearMonth,
          interest: d.interest,
          rollTo: d.rollTo,
          rollAmount: d.rollAmount,
          early: d.early
        };
      })
    };
  }

  // How much sooner an extra amount each month gets you there.
  // monthsSaved is null unless both plans finish within 50 years.
  function whatIf(input, more) {
    var base = simulate(input);
    var alt = simulate({ debts: input.debts, extra: (Number(input.extra) || 0) + more, maxMonths: input.maxMonths });
    return {
      more: more,
      base: base,
      alt: alt,
      monthsSaved: base.finished && alt.finished ? base.months - alt.months : null,
      interestSaved: base.totalInterest - alt.totalInterest
    };
  }

  /* ---------------- Dates ---------------- */

  // The plan starts with next month's payments.
  function planStart(today) {
    today = today || new Date();
    var m = today.getMonth() + 1;
    return { year: today.getFullYear() + Math.floor(m / 12), month: m % 12 };
  }

  // Month n of the plan (1 = the first month). month is 0–11.
  function monthOfPlan(start, n) {
    var index = start.year * 12 + start.month + (n - 1);
    return { year: Math.floor(index / 12), month: index % 12 };
  }

  function monthName(ym) { return MONTHS[ym.month] + ' ' + ym.year; }
  function shortMonth(ym) { return MONTHS[ym.month].slice(0, 3) + ' ' + String(ym.year).slice(2); }

  // 29 -> { years: 2, months: 5 }
  function splitMonths(n) {
    return { years: Math.floor(n / 12), months: n % 12 };
  }

  /* ---------------- Money ---------------- */

  // 125050 -> "£1,250.50", 125000 -> "£1,250". wholePounds rounds to the pound.
  function money(pence, wholePounds) {
    var negative = pence < 0;
    var p = Math.abs(Math.round(pence));
    if (wholePounds) p = Math.round(p / 100) * 100;
    var pounds = Math.floor(p / 100);
    var rest = p % 100;
    var text = '£' + String(pounds).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (rest) text += '.' + (rest < 10 ? '0' : '') + rest;
    return (negative ? '-' : '') + text;
  }

  return {
    MAX_MONTHS: MAX_MONTHS,
    MAX_DEBTS: MAX_DEBTS,
    MAX_NAME: MAX_NAME,
    WARNING_SIGNS: WARNING_SIGNS,
    MONTHS: MONTHS,
    parseNumber: parseNumber,
    checkDebt: checkDebt,
    checkExtra: checkExtra,
    sanitize: sanitize,
    snowballOrder: snowballOrder,
    monthlyInterest: monthlyInterest,
    simulate: simulate,
    whatIf: whatIf,
    planStart: planStart,
    monthOfPlan: monthOfPlan,
    monthName: monthName,
    shortMonth: shortMonth,
    splitMonths: splitMonths,
    money: money
  };
});
