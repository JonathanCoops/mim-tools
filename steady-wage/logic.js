/*
 * Steady Wage Planner: the sums.
 * No words and no page code in here, just months and money, so it can be
 * tested on its own (node steady-wage/tests/wage.test.js).
 *
 * The method is Jonathan's, from the self-employed video series and the
 * "Pay yourself a wage" carousel (November 2026): everything you earn lands
 * in a holding account, tax and costs come out, and you pay yourself the
 * same wage on the same day every month.
 *
 *   Months        the 12 full months before this one, oldest first
 *   After tax     what landed, less the share set aside for tax and costs
 *   Wage          "a quiet month": the last 12 months, after tax and costs,
 *                 ÷ 15 (80% of an average month), rounded down to £10
 *   Leanest       the run of months that fell furthest behind the wage.
 *   stretch       Checked round the calendar, so a winter that runs
 *                 December to February counts as one stretch
 *   Full pot      the leanest stretch + 3 months of wages, rounded up to £50.
 *                 For steady work that's about 3 months of wages; for work
 *                 that comes in big lumps it's nearer 6, as the carousel says
 *   Low           2 months of wages. Under this at a pay review: take a cut
 *   Good-year     anything over the full pot + 3 more months of wages
 *   money
 *
 * The pay review (once a wage is set):
 *   Cut    the pot is under 2 months of wages. The new wage is 10% less, or
 *          what the last 12 months support if that's lower still.
 *   Rise   the last 12 months support at least 10% more AND the pot would
 *          still be full at the new wage. Never more than 10% at a time.
 *   Hold   anything else.
 * A review is due in January, April, July and October. Between reviews the
 * wage that was set just stands, so it can't be chipped away visit by visit.
 *
 * These rules were chosen by testing them on thousands of made-up years of
 * steady, seasonal and lumpy income (tests/simulate.js). The 10% cut on its
 * own was too slow when income really fell, and a flat "three or six months"
 * left seasonal work short, which is why both are worked out from the
 * person's own figures here.
 *
 * Money is added up in whole pence so the sums never drift. Figures come
 * back in pounds.
 */

(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIMWageLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WINDOW = 12;           // months of income asked for
  var MIN_MONTHS = 3;        // the fewest months a plan can be built on
  var DIVISOR = 15;          // 12 months ÷ 15 = a quiet month
  var LOW_MONTHS = 2;        // pot under this many wages: take a cut
  var CUSHION_MONTHS = 3;    // full pot = leanest stretch + this many wages
  var HEADROOM_MONTHS = 3;   // over full by this many wages: good-year money
  var STEP_PERCENT = 10;     // the smallest cut, and the biggest rise
  var WAGE_ROUND = 1000;     // wages round down to the nearest £10 (in pence)
  var POT_ROUND = 5000;      // pot lines round up to the nearest £50 (in pence)
  var MAX_SET_ASIDE = 90;    // % for tax and costs
  var FORECAST_MONTHS = 36;  // how far ahead "when will the pot be full" looks
  var REVIEW_MONTHS = [1, 4, 7, 10]; // January, April, July, October
  var KEEP_MONTHS = 36;      // saved months older than this are dropped
  var MAX = { money: 12, percent: 5, name: 40 };
  var TAX = ['after', 'before'];

  /* ---------------- Money ---------------- */

  function cleanMoney(raw) {
    return String(raw).replace(/[£,\s]/g, '');
  }

  // What someone typed, in whole pence. Blank or not a number counts as 0.
  function toPence(raw) {
    if (typeof raw === 'number') return isFinite(raw) && raw > 0 ? Math.round(raw * 100) : 0;
    if (typeof raw !== 'string') return 0;
    var s = cleanMoney(raw);
    if (s === '' || s === '.' || !/^\d*\.?\d*$/.test(s)) return 0;
    return Math.round(parseFloat(s) * 100);
  }

  // null if fine (or blank), 'negative' for a minus figure, 'invalid' otherwise.
  function moneyProblem(raw) {
    if (typeof raw !== 'string') return null;
    var s = cleanMoney(raw);
    if (s === '') return null;
    if (/^[-−–]/.test(s)) return 'negative';
    if (s === '.' || !/^\d*\.?\d*$/.test(s)) return 'invalid';
    return null;
  }

  function filled(v) { return typeof v === 'string' && v.trim() !== ''; }

  // A percentage as typed ("25", "25%", "27.5"), or null if it isn't one.
  function toPercent(raw) {
    if (typeof raw !== 'string') return null;
    var s = raw.replace(/[%\s]/g, '');
    if (s === '' || s === '.' || !/^\d*\.?\d*$/.test(s)) return null;
    var n = parseFloat(s);
    return isFinite(n) && n >= 0 && n <= MAX_SET_ASIDE ? n : null;
  }

  // £2,400 or £12.50. Unknown figures show as a dash.
  function formatMoney(pounds) {
    if (pounds === null || pounds === undefined || typeof pounds !== 'number' || !isFinite(pounds)) return '—';
    var pence = Math.round(Math.abs(pounds) * 100);
    var whole = String(Math.floor(pence / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var part = pence % 100;
    return (pounds < 0 && pence ? '−' : '') + '£' + whole + (part ? '.' + (part < 10 ? '0' : '') + part : '');
  }

  function roundDown(pence, step) { return Math.floor(pence / step) * step; }
  function roundUp(pence, step) { return Math.ceil(pence / step) * step; }
  function pounds(pence) { return pence / 100; }

  /* ---------------- Months ---------------- */

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  function monthKey(y, m) { return y + '-' + (m < 10 ? '0' : '') + m; }

  // { y, m } moved on by n months (n can be negative).
  function addMonths(month, n) {
    var index = month.y * 12 + (month.m - 1) + n;
    return { y: Math.floor(index / 12), m: (index % 12 + 12) % 12 + 1 };
  }

  // The 12 full months before today's month, oldest first.
  function monthsFor(today) {
    var list = [];
    for (var i = WINDOW; i >= 1; i--) {
      var mo = addMonths(today, -i);
      list.push({ y: mo.y, m: mo.m, key: monthKey(mo.y, mo.m) });
    }
    return list;
  }

  // '2026-11' -> { y: 2026, m: 11 }, or null
  function parseMonth(key) {
    var match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(typeof key === 'string' ? key : '');
    return match ? { y: +match[1], m: +match[2] } : null;
  }

  function compareMonths(a, b) { return (a.y - b.y) || (a.m - b.m); }

  function monthName(m) { return MONTH_NAMES[m - 1]; }
  function monthShort(m) { return MONTH_NAMES[m - 1].slice(0, 3); }
  function formatMonth(month) { return MONTH_NAMES[month.m - 1] + ' ' + month.y; }

  // The next pay review month after today: January, April, July or October.
  function nextReview(today) {
    for (var i = 1; i <= 12; i++) {
      var mo = addMonths(today, i);
      if (REVIEW_MONTHS.indexOf(mo.m) !== -1) return mo;
    }
    return addMonths(today, 3);
  }

  function todayParts(date) {
    var d = date || new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }

  /* ---------------- The method ---------------- */

  // A quiet month: the months counted, ÷ 15 for a full year (and in the same
  // proportion for fewer months), rounded down to £10. All in pence.
  function quietWage(totalPence, monthsCounted) {
    if (!monthsCounted) return 0;
    return roundDown(Math.floor(totalPence * WINDOW / (DIVISOR * monthsCounted)), WAGE_ROUND);
  }

  // The run of months that fell furthest behind the wage.
  // net: pence for each month counted. A full year is checked round the
  // calendar; a shorter run only as far as it goes.
  // Returns { shortfall (pence), from (index into net), length }.
  function leanestStretch(net, wagePence) {
    var n = net.length;
    var wrap = n === WINDOW;
    var best = { shortfall: 0, from: 0, length: 0 };
    for (var start = 0; start < n; start++) {
      var sum = 0;
      var longest = wrap ? n : n - start;
      for (var len = 1; len <= longest; len++) {
        sum += wagePence - net[(start + len - 1) % n];
        if (sum > best.shortfall) best = { shortfall: sum, from: start, length: len };
      }
    }
    return best;
  }

  // The three lines on the pot, for a wage and the months behind it. Pence.
  function potLines(net, wagePence) {
    var lean = leanestStretch(net, wagePence);
    var full = roundUp(lean.shortfall + CUSHION_MONTHS * wagePence, POT_ROUND);
    return {
      lean: lean,
      low: LOW_MONTHS * wagePence,
      full: full,
      top: full + HEADROOM_MONTHS * wagePence
    };
  }

  // The pay review. Everything in pence.
  // Returns { verdict: 'cut' | 'rise' | 'hold', wage }.
  function review(wagePence, potPence, quietPence, net) {
    if (potPence < LOW_MONTHS * wagePence) {
      var cut = Math.min(Math.floor(wagePence * (100 - STEP_PERCENT) / 100), quietPence);
      return { verdict: 'cut', wage: Math.max(roundDown(cut, WAGE_ROUND), WAGE_ROUND) };
    }
    if (quietPence * 100 >= wagePence * (100 + STEP_PERCENT)) {
      var rise = roundDown(Math.min(quietPence, Math.floor(wagePence * (100 + STEP_PERCENT) / 100)), WAGE_ROUND);
      // The pot has to be full at the new wage, so a rise never leaves it short.
      if (rise > wagePence && potPence >= potLines(net, rise).full) return { verdict: 'rise', wage: rise };
    }
    return { verdict: 'hold', wage: wagePence };
  }

  // Last year again, starting with a full pot: the wage goes out on the 1st,
  // then that month's money lands.
  function replay(net, wagePence, startPence) {
    var pot = startPence;
    var afterPayday = [];
    var end = [];
    var lowest = { value: null, index: 0 };
    for (var i = 0; i < net.length; i++) {
      pot -= wagePence;
      afterPayday.push(pot);
      if (lowest.value === null || pot < lowest.value) lowest = { value: pot, index: i };
      pot += net[i];
      end.push(pot);
    }
    return { start: startPence, afterPayday: afterPayday, end: end, lowest: lowest };
  }

  // From today's pot, on a year like the last one: when is the pot full, and
  // how many paydays in the next 12 months would come up short?
  // netByMonth: pence for calendar months 1 to 12 (index 0 unused), or null
  // when there isn't a full year to go on.
  function forecast(today, potPence, wagePence, fullPence, netByMonth, averagePence) {
    if (potPence >= fullPence) return { months: 0, month: null, short: 0 };
    if (!netByMonth) {
      // Not a full year yet, so go on the average month.
      var spare = averagePence - wagePence;
      if (spare <= 0) return { months: null, month: null, short: null };
      var m = Math.ceil((fullPence - potPence) / spare);
      return m > FORECAST_MONTHS ? { months: null, month: null, short: null }
        : { months: m, month: addMonths(today, m), short: null };
    }
    var pot = potPence;
    var short = 0;
    var fullIn = null;
    for (var k = 1; k <= FORECAST_MONTHS; k++) {
      var mo = addMonths(today, k);
      var pay = Math.min(wagePence, pot);
      if (pay < wagePence && k <= WINDOW) short++;
      pot -= pay;
      pot += netByMonth[mo.m];
      if (fullIn === null && pot >= fullPence) fullIn = k;
      if (fullIn !== null && k >= WINDOW) break;
    }
    return { months: fullIn, month: fullIn === null ? null : addMonths(today, fullIn), short: short };
  }

  /* ---------------- The plan ---------------- */

  // Everything the page shows, from what's been typed in.
  // plan: see blank(). today: { y, m, d }.
  function compute(plan, today) {
    var months = monthsFor(today);
    var errors = {};
    var typed = months.map(function (mo) {
      var raw = plan.months[mo.key];
      return filled(raw) ? raw : '';
    });

    // Which months count. Every month needs a figure (0 if nothing came in),
    // unless they started part-way through: then the blank months before
    // their first figure are left out.
    var first = 0;
    if (plan.partYear) {
      while (first < WINDOW && typed[first] === '') first++;
    }
    var missing = [];
    var invalid = [];
    typed.forEach(function (raw, i) {
      if (i < first) return;
      if (raw === '') missing.push(months[i].key);
      else if (moneyProblem(raw)) invalid.push(months[i].key);
    });
    var counted = WINDOW - first;
    var anyTyped = typed.some(function (raw) { return raw !== ''; });
    if (!anyTyped) errors.months = 'empty';
    else if (invalid.length) errors.months = 'invalid';
    else if (missing.length) errors.months = 'missing';
    else if (counted < MIN_MONTHS) errors.months = 'tooFew';

    var percent = 0;
    if (TAX.indexOf(plan.tax) === -1) errors.tax = 'required';
    else if (plan.tax === 'before') {
      if (!filled(plan.setAside)) errors.setAside = 'required';
      else if (toPercent(plan.setAside) === null) errors.setAside = 'invalid';
      else percent = toPercent(plan.setAside);
    }
    if (moneyProblem(plan.pot)) errors.pot = 'invalid';
    if (moneyProblem(plan.wage)) errors.wage = 'invalid';

    var result = {
      ok: false,
      errors: errors,
      missing: missing,
      invalid: invalid,
      months: months,
      first: first,
      counted: counted
    };
    if (Object.keys(errors).length) return result;

    // After tax and costs, month by month, in pence.
    var landed = typed.map(function (raw) { return toPence(raw); });
    var netAll = landed.map(function (p) { return Math.round(p * (100 - percent) / 100); });
    var net = netAll.slice(first);
    var total = net.reduce(function (a, b) { return a + b; }, 0);
    var quiet = quietWage(total, counted);
    if (quiet < WAGE_ROUND) {
      result.errors.months = 'tooLow';
      return result;
    }

    var pot = toPence(plan.pot);
    var setWage = toPence(plan.wage);
    var mode = setWage > 0 ? 'review' : 'start';
    var verdict = 'start';
    var wage = quiet;
    var reviewMonth = nextReview(today);
    if (mode === 'review') {
      // A wage set with the button isn't reviewed again until the next
      // review month comes round.
      var setIn = parseMonth(plan.wageSet);
      var firstReview = setIn ? nextReview(setIn) : null;
      if (firstReview && compareMonths(today, firstReview) < 0) {
        verdict = 'set';
        wage = setWage;
        reviewMonth = firstReview;
      } else {
        var r = review(setWage, pot, quiet, net);
        verdict = r.verdict;
        wage = r.wage;
      }
    }

    var lines = potLines(net, wage);
    var fullYear = counted === WINDOW;
    var byMonth = null;
    if (fullYear) {
      byMonth = [];
      months.forEach(function (mo, i) { byMonth[mo.m] = netAll[i]; });
    }
    var average = Math.round(total / counted);
    var ahead = forecast(today, pot, wage, lines.full, byMonth, average);
    var back = replay(net, wage, lines.full);

    var lean = null;
    if (lines.lean.shortfall > 0) {
      var from = first + lines.lean.from;
      lean = {
        shortfall: pounds(lines.lean.shortfall),
        from: months[from % WINDOW],
        to: months[(from + lines.lean.length - 1) % WINDOW],
        length: lines.lean.length,
        indexes: []
      };
      for (var j = 0; j < lines.lean.length; j++) lean.indexes.push((from + j) % WINDOW);
    }

    result.ok = true;
    result.mode = mode;
    result.verdict = verdict;
    result.wage = pounds(wage);
    result.previousWage = mode === 'review' ? pounds(setWage) : null;
    result.quietWage = pounds(quiet);
    result.fullYear = fullYear;
    result.percent = percent;
    result.total = pounds(total);
    result.average = pounds(average);
    result.rows = months.map(function (mo, i) {
      return {
        key: mo.key, y: mo.y, m: mo.m,
        counted: i >= first,
        landed: i >= first ? pounds(landed[i]) : null,
        net: i >= first ? pounds(netAll[i]) : null,
        short: i >= first && netAll[i] < wage,
        lean: !!lean && lean.indexes.indexOf(i) !== -1
      };
    });
    result.shortMonths = result.rows.filter(function (row) { return row.short; }).length;
    result.lean = lean;
    result.pot = pounds(pot);
    result.low = pounds(lines.low);
    result.full = pounds(lines.full);
    result.top = pounds(lines.top);
    result.fullMonths = Math.round(lines.full / wage * 10) / 10;
    result.stage = pot > lines.top ? 'over' : pot >= lines.full ? 'steady' : 'building';
    result.toFull = pounds(Math.max(0, lines.full - pot));
    result.goodYear = pounds(Math.max(0, pot - lines.top));
    result.forecast = {
      months: ahead.months,
      month: ahead.month,
      short: ahead.short
    };
    result.replay = {
      start: pounds(back.start),
      end: back.end.map(pounds),
      afterPayday: back.afterPayday.map(pounds),
      lowest: pounds(back.lowest.value),
      lowestMonth: months[first + back.lowest.index]
    };
    // Of every £1,000 that lands: this much to tax and costs, the rest stays.
    result.per1000 = { aside: Math.round(percent * 10), pot: 1000 - Math.round(percent * 10) };
    result.nextReview = reviewMonth;
    result.wageSet = mode === 'review' ? parseMonth(plan.wageSet) : null;
    return result;
  }

  /* ---------------- Saved plans ---------------- */

  function blank() {
    return {
      months: {},        // { '2026-10': '4200' }: what landed, as typed
      partYear: false,   // started part-way through: skip the blank months before the first figure
      tax: '',           // 'after' (tax already off) or 'before' (still to come out)
      setAside: '',      // % set aside for tax and costs, as typed
      pot: '',           // in the holding account today, as typed
      wage: '',          // the wage they've set, as typed. Blank until they set one
      wageSet: '',       // the month they set it, '2026-11'
      name: '',
      shown: false,
      example: false
    };
  }

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }

  // Whatever was saved, made safe to use. Months older than three years go.
  function sanitize(raw, today) {
    var plan = blank();
    if (!isObj(raw)) return plan;
    var now = today || todayParts();
    var oldest = addMonths(now, -KEEP_MONTHS);
    var oldestKey = monthKey(oldest.y, oldest.m);
    var newestKey = monthKey(now.y, now.m);
    if (isObj(raw.months)) {
      Object.keys(raw.months).forEach(function (key) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return;
        if (key < oldestKey || key > newestKey) return;
        var value = str(raw.months[key], MAX.money);
        if (value.trim() !== '') plan.months[key] = value;
      });
    }
    plan.partYear = raw.partYear === true;
    plan.tax = TAX.indexOf(raw.tax) !== -1 ? raw.tax : '';
    plan.setAside = str(raw.setAside, MAX.percent);
    plan.pot = str(raw.pot, MAX.money);
    plan.wage = str(raw.wage, MAX.money);
    plan.wageSet = parseMonth(raw.wageSet) ? raw.wageSet : '';
    plan.name = str(raw.name, MAX.name);
    plan.shown = raw.shown === true;
    plan.example = raw.example === true;
    return plan;
  }

  function hasData(plan) {
    return Object.keys(plan.months).length > 0 || !!plan.tax || filled(plan.setAside) ||
      filled(plan.pot) || filled(plan.wage);
  }

  return {
    WINDOW: WINDOW,
    MIN_MONTHS: MIN_MONTHS,
    DIVISOR: DIVISOR,
    LOW_MONTHS: LOW_MONTHS,
    CUSHION_MONTHS: CUSHION_MONTHS,
    HEADROOM_MONTHS: HEADROOM_MONTHS,
    STEP_PERCENT: STEP_PERCENT,
    WAGE_ROUND: WAGE_ROUND,
    POT_ROUND: POT_ROUND,
    MAX_SET_ASIDE: MAX_SET_ASIDE,
    FORECAST_MONTHS: FORECAST_MONTHS,
    REVIEW_MONTHS: REVIEW_MONTHS,
    MAX: MAX,
    TAX: TAX,
    toPence: toPence,
    toPercent: toPercent,
    moneyProblem: moneyProblem,
    formatMoney: formatMoney,
    monthKey: monthKey,
    addMonths: addMonths,
    monthsFor: monthsFor,
    parseMonth: parseMonth,
    compareMonths: compareMonths,
    monthName: monthName,
    monthShort: monthShort,
    formatMonth: formatMonth,
    nextReview: nextReview,
    todayParts: todayParts,
    quietWage: quietWage,
    leanestStretch: leanestStretch,
    potLines: potLines,
    review: review,
    replay: replay,
    forecast: forecast,
    compute: compute,
    blank: blank,
    sanitize: sanitize,
    hasData: hasData
  };
});
