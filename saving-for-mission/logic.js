/*
 * Saving for Mission Builder: the sums.
 * No words and no page code in here, just the maths and the shape of a
 * saved plan, so it can be tested on its own
 * (node saving-for-mission/tests/mission.test.js).
 *
 *   A  Total cost              every cost line added up
 *   B  Total in hand           savings + things to sell + gifts promised
 *   C  Still to find           A − B (never below £0)
 *   D  Monthly target          C ÷ months until it's due, rounded up to the pound
 *   E  New monthly margin      margin today + three Rs + extra income
 *   F  Saved by the due date   E × months until it's due
 *   G  The gap                 C − F (never below £0)
 *
 * Money is added up in whole pence so the sums never drift. Figures come
 * back in pounds, or null when there isn't enough to work them out yet.
 */

(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIMMissionLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // The cost lines in Step 2, in order. Their words are in content.js.
  var COST_ITEMS = [
    'fee', 'flights', 'visa', 'health', 'insurance', 'kit',
    'incountry', 'phone', 'spending', 'gifts', 'airport', 'wages'
  ];
  var DEBT_SIGNS = ['minimums', 'notFalling', 'creditMonth', 'yearIncome'];
  var R_TYPES = ['remove', 'reduce', 'replace'];
  var CHECKLIST = ['pot', 'standing', 'app', 'pray', 'friend'];
  var SCREENS = ['intro', '1', '2', '3', '4', '5', '6'];
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  var LIMITS = {
    extraCosts: 10, // "anything else" cost lines
    sell: 3,        // things I could sell
    cuts: 10,       // three Rs
    income: 6,      // extra income
    people: 5       // people I could invite
  };
  var MAX = { money: 12, label: 60, where: 120, person: 60, name: 40, note: 800 };

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

  // £2,400 or £12.50. Unknown figures show as a dash.
  function formatMoney(pounds) {
    if (pounds === null || pounds === undefined || typeof pounds !== 'number' || !isFinite(pounds)) return '—';
    var pence = Math.round(Math.abs(pounds) * 100);
    var whole = String(Math.floor(pence / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var part = pence % 100;
    return (pounds < 0 && pence ? '−' : '') + '£' + whole + (part ? '.' + (part < 10 ? '0' : '') + part : '');
  }

  /* ---------------- Dates (calendar days, no time zones) ---------------- */

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

  // '2027-06-13' -> { y: 2027, m: 6, d: 13 }, or null
  function parseDate(s) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s : '');
    if (!match) return null;
    var y = +match[1], m = +match[2], d = +match[3];
    if (y < 1900 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
    return { y: y, m: m, d: d };
  }

  function dateString(date) {
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return date.y + '-' + pad(date.m) + '-' + pad(date.d);
  }

  function compareDates(a, b) { return (a.y - b.y) || (a.m - b.m) || (a.d - b.d); }

  // Same day n months on; the 31st becomes the last day of a shorter month.
  function addMonths(date, n) {
    var total = date.y * 12 + (date.m - 1) + n;
    var y = Math.floor(total / 12);
    var m = total - y * 12 + 1;
    return { y: y, m: m, d: Math.min(date.d, daysInMonth(y, m)) };
  }

  // Whole months from one date to another (13 Oct to 13 Jun is 8; to 12 Jun is 7).
  function monthsBetween(from, to) {
    if (compareDates(to, from) <= 0) return 0;
    var n = (to.y - from.y) * 12 + (to.m - from.m);
    while (n > 0 && compareDates(addMonths(from, n), to) > 0) n--;
    return n;
  }

  // 13 June 2027
  function formatDate(date) {
    if (typeof date === 'string') date = parseDate(date);
    if (!date) return '';
    return date.d + ' ' + MONTH_NAMES[date.m - 1] + ' ' + date.y;
  }

  // "13 July to 10 August 2027", or one date if that's all there is.
  function formatRange(from, to) {
    var a = parseDate(from), b = parseDate(to);
    if (a && b && compareDates(b, a) > 0) {
      var left = a.y === b.y ? a.d + ' ' + MONTH_NAMES[a.m - 1] : formatDate(a);
      return left + ' to ' + formatDate(b);
    }
    return formatDate(a || b);
  }

  /*
   * When the money is due, as seen from today.
   *   status  'none'  no due date yet
   *           'past'  the date has gone
   *           'soon'  today, or less than a month away
   *           'ok'    a month or more away
   *   months  whole months to save (0 for past/soon, null with no date)
   */
  function dueInfo(due, today) {
    var date = parseDate(due);
    if (!date) return { status: 'none', months: null };
    if (compareDates(date, today) < 0) return { status: 'past', months: 0 };
    var months = monthsBetween(today, date);
    return { status: months < 1 ? 'soon' : 'ok', months: months };
  }

  /* ---------------- The sums ---------------- */

  function sumRows(rows) {
    return (rows || []).reduce(function (total, row) { return total + toPence(row && row.amount); }, 0);
  }

  function costLines(plan) {
    var costs = plan.costs || {};
    var lines = COST_ITEMS.map(function (id) {
      return { id: id, label: null, pence: toPence(costs[id]) };
    });
    (plan.extraCosts || []).forEach(function (row) {
      lines.push({ id: 'other', label: row.label, pence: toPence(row.amount) });
    });
    return lines;
  }

  function compute(plan, today) {
    plan = plan || {};
    var due = dueInfo(plan.mission && plan.mission.due, today);
    var months = due.months;

    var A = costLines(plan).reduce(function (t, l) { return t + l.pence; }, 0);
    var B = toPence(plan.savings) + sumRows(plan.sell) + toPence(plan.promised);
    var Cp = Math.max(0, A - B);
    var D = months >= 1 ? Math.ceil(Cp / (months * 100)) * 100 : null;
    var margin = toPence(plan.margin);
    var freed = sumRows(plan.cuts);
    var extra = sumRows(plan.income);
    var E = margin + freed + extra;
    var F = months === null ? null : E * months;

    var G = null;
    if (A > 0 && Cp === 0) G = 0;                 // what's in hand covers it
    else if (A > 0 && F !== null) G = Math.max(0, Cp - F);

    function pounds(p) { return p === null ? null : p / 100; }
    return {
      A: pounds(A),
      B: pounds(B),
      C: pounds(Cp),
      D: pounds(D),
      E: pounds(E),
      F: pounds(F),
      G: pounds(G),
      months: months,
      dueStatus: due.status,
      margin: pounds(margin),
      freed: pounds(freed),
      extra: pounds(extra),
      shortfall: D === null ? null : pounds(Math.max(0, D - E)),
      hasCosts: A > 0,
      funded: G === 0,
      debtWorry: (plan.debtSigns || []).length > 0
    };
  }

  /* ---------------- The saved plan ---------------- */

  function blankRows(n, make) {
    var rows = [];
    for (var i = 0; i < n; i++) rows.push(make());
    return rows;
  }

  function blank() {
    return {
      mission: { where: '', leave: '', back: '', due: '' },
      costs: {},
      extraCosts: [],
      savings: '',
      sell: blankRows(LIMITS.sell, function () { return { label: '', amount: '' }; }),
      promised: '',
      debtSigns: [],
      margin: '',
      cuts: [],
      income: [],
      people: blankRows(LIMITS.people, function () { return ''; }),
      name: '',
      note: '',
      done: [],
      example: false,
      screen: 'intro'
    };
  }

  function str(value, max) {
    return typeof value === 'string' ? value.slice(0, max) : (typeof value === 'number' && isFinite(value) ? String(value).slice(0, max) : '');
  }
  function dateStr(value) { return parseDate(value) ? value : ''; }
  function pick(list, valid) {
    if (!Array.isArray(list)) return [];
    return valid.filter(function (v) { return list.indexOf(v) !== -1; });
  }
  function rows(list, limit, clean) {
    return (Array.isArray(list) ? list : []).slice(0, limit).filter(function (r) {
      return r && typeof r === 'object';
    }).map(clean);
  }
  function moneyRow(r) { return { label: str(r.label, MAX.label), amount: str(r.amount, MAX.money) }; }

  // Anything loaded from storage goes through here, so a damaged or
  // tampered-with save can't break the page.
  function sanitize(raw) {
    var plan = blank();
    if (!raw || typeof raw !== 'object') return plan;
    var m = raw.mission || {};
    plan.mission = { where: str(m.where, MAX.where), leave: dateStr(m.leave), back: dateStr(m.back), due: dateStr(m.due) };
    var costs = raw.costs && typeof raw.costs === 'object' ? raw.costs : {};
    COST_ITEMS.forEach(function (id) { if (costs[id] !== undefined) plan.costs[id] = str(costs[id], MAX.money); });
    plan.extraCosts = rows(raw.extraCosts, LIMITS.extraCosts, moneyRow);
    plan.savings = str(raw.savings, MAX.money);
    var sell = rows(raw.sell, LIMITS.sell, moneyRow);
    plan.sell = sell.concat(blank().sell).slice(0, LIMITS.sell);
    plan.promised = str(raw.promised, MAX.money);
    plan.debtSigns = pick(raw.debtSigns, DEBT_SIGNS);
    plan.margin = str(raw.margin, MAX.money);
    plan.cuts = rows(raw.cuts, LIMITS.cuts, function (r) {
      var row = moneyRow(r);
      row.r = R_TYPES.indexOf(r.r) !== -1 ? r.r : 'reduce';
      return row;
    });
    plan.income = rows(raw.income, LIMITS.income, moneyRow);
    var people = Array.isArray(raw.people) ? raw.people.slice(0, LIMITS.people).map(function (p) { return str(p, MAX.person); }) : [];
    plan.people = people.concat(blank().people).slice(0, LIMITS.people);
    plan.name = str(raw.name, MAX.name);
    plan.note = str(raw.note, MAX.note);
    plan.done = pick(raw.done, CHECKLIST);
    plan.example = raw.example === true;
    plan.screen = SCREENS.indexOf(raw.screen) !== -1 ? raw.screen : 'intro';
    return plan;
  }

  // Has anyone typed or ticked anything? (Where they were doesn't count.)
  function hasData(plan) {
    if (!plan || typeof plan !== 'object') return false;
    function filled(v) { return typeof v === 'string' && v.trim() !== ''; }
    function rowFilled(r) { return r && (filled(r.label) || filled(r.amount)); }
    var m = plan.mission || {};
    var costs = plan.costs || {};
    return [m.where, m.leave, m.back, m.due, plan.savings, plan.promised, plan.margin, plan.name, plan.note].some(filled) ||
      Object.keys(costs).some(function (k) { return filled(costs[k]); }) ||
      [plan.extraCosts, plan.sell, plan.cuts, plan.income].some(function (list) { return (list || []).some(rowFilled); }) ||
      (plan.people || []).some(filled) ||
      (plan.debtSigns || []).length > 0 ||
      (plan.done || []).length > 0;
  }

  // Builds a plan from the worked example in content.js, dated from today.
  function fromExample(ex, today) {
    var plan = sanitize({
      mission: {
        where: ex.where,
        leave: dateString(addMonths(today, ex.leaveInMonths)),
        back: dateString(addMonths(today, ex.backInMonths)),
        due: dateString(addMonths(today, ex.dueInMonths))
      },
      costs: ex.costs,
      extraCosts: ex.extraCosts,
      savings: ex.savings,
      sell: ex.sell,
      promised: ex.promised,
      margin: ex.margin,
      cuts: ex.cuts,
      income: ex.income,
      people: ex.people,
      name: ex.name,
      note: ex.note
    });
    plan.example = true;
    return plan;
  }

  return {
    COST_ITEMS: COST_ITEMS,
    DEBT_SIGNS: DEBT_SIGNS,
    R_TYPES: R_TYPES,
    CHECKLIST: CHECKLIST,
    SCREENS: SCREENS,
    LETTERS: LETTERS,
    LIMITS: LIMITS,
    MAX: MAX,
    toPence: toPence,
    moneyProblem: moneyProblem,
    formatMoney: formatMoney,
    parseDate: parseDate,
    dateString: dateString,
    compareDates: compareDates,
    addMonths: addMonths,
    monthsBetween: monthsBetween,
    formatDate: formatDate,
    formatRange: formatRange,
    dueInfo: dueInfo,
    costLines: costLines,
    compute: compute,
    blank: blank,
    sanitize: sanitize,
    hasData: hasData,
    fromExample: fromExample
  };
});
