/*
 * Christmas Without Debt: the sums.
 * No words and no page code in here, just dates, paydays and money, so it
 * can be tested on its own (node christmas/tests/christmas.test.js).
 *
 * Dates are calendar days ({ y, m, d }), never clock times, so time zones
 * and the clocks going back can't move a payday.
 *
 *   Christmas        25 December this year, or next year's from Boxing Day
 *   Paydays          from the next payday, every week, 2 weeks, 4 weeks or
 *                    month, up to and including 20 December (CUTOFF_DAY), so
 *                    the money is there in time
 *   Available        already saved + (each payday × paydays left)
 *   Cost             gifts + everything else, after any "ways to close the gap"
 *   Need per payday  (cost − already saved) ÷ paydays left, rounded up to the pound
 *
 * The ways to close the gap are applied in this order. Each one can only
 * ever lower the cost, so switching one on never makes Christmas dearer:
 *   1. lower         someone's budget, typed in (only ever down)
 *   2. childrenOnly  the family grown-ups' presents go
 *   3. homemade      the people ticked get a homemade present or a gift of
 *                    time, costing what's set aside for materials
 *   4. cap           family grown-ups' presents capped at the agreed limit
 *   5. secretSanta   two or more family grown-ups become one present,
 *                    if that's cheaper
 *   6. cutBack       one "everything else" line, cut to a lower figure
 *
 * Money is added up in whole pence so the sums never drift. Figures come
 * back in pounds.
 */

(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIMChristmasLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FREQUENCIES = ['weekly', 'fortnightly', 'fourWeekly', 'monthly'];
  var PERIOD_DAYS = { weekly: 7, fortnightly: 14, fourWeekly: 28 };
  var CUTOFF_DAY = 20; // last day in December a payday still counts

  // Who someone is. Their words are in content.js.
  var RELATIONS = ['partner', 'child', 'parent', 'sibling', 'grandparent', 'family',
    'friend', 'teacher', 'santa', 'neighbour', 'other'];
  // The family ideas (Secret Santa, a cap, children only) are about these people.
  var FAMILY_GROWN_UPS = ['parent', 'sibling', 'grandparent', 'family'];
  // The "everything else" lines in Step 3, in order.
  var EXTRAS = ['food', 'hosting', 'travel', 'decorations', 'cards', 'wrapping',
    'outfits', 'kids', 'nights', 'daysout', 'giving'];
  // The ways to close the gap, in the order they're shown.
  var WAYS = ['lower', 'secretSanta', 'cap', 'childrenOnly', 'homemade', 'cutBack'];
  var TONES = ['light', 'honest', 'short'];
  var IDEAS = ['santa', 'cap'];
  var SCREENS = ['intro', '1', '2', '3', '4', '5'];
  var SANTA_ID = 'santa'; // the family Secret Santa present on the gift list

  var LIMITS = { people: 30, ownExtras: 8, paydays: 60 };
  var MAX = { money: 12, name: 40, idea: 80, label: 50, message: 1500 };
  // Pre-filled amounts. A blank Secret Santa or cap amount means these;
  // blank materials means £0 (a gift of time).
  var DEFAULTS = { santa: '20', cap: '20', materials: '5' };

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

  // A typed amount in pence, or the default when it's blank or £0.
  function amountOr(raw, fallback) {
    return toPence(raw) || toPence(fallback);
  }

  // £2,400 or £12.50. Unknown figures show as a dash.
  function formatMoney(pounds) {
    if (pounds === null || pounds === undefined || typeof pounds !== 'number' || !isFinite(pounds)) return '—';
    var pence = Math.round(Math.abs(pounds) * 100);
    var whole = String(Math.floor(pence / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var part = pence % 100;
    return (pounds < 0 && pence ? '−' : '') + '£' + whole + (part ? '.' + (part < 10 ? '0' : '') + part : '');
  }

  /* ---------------- Dates ---------------- */

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAY_MS = 86400000;

  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

  // '2026-12-25' -> { y: 2026, m: 12, d: 25 }, or null
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

  function dayNumber(date) { return Math.round(Date.UTC(date.y, date.m - 1, date.d) / DAY_MS); }

  function fromDayNumber(n) {
    var dt = new Date(n * DAY_MS);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }

  function addDays(date, n) { return fromDayNumber(dayNumber(date) + n); }

  function daysBetween(from, to) { return dayNumber(to) - dayNumber(from); }

  // Same day n months on; the 31st becomes the last day of a shorter month.
  function addMonths(date, n) {
    var total = date.y * 12 + (date.m - 1) + n;
    var y = Math.floor(total / 12);
    var m = total - y * 12 + 1;
    return { y: y, m: m, d: Math.min(date.d, daysInMonth(y, m)) };
  }

  function weekday(date) { return new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay(); }

  // 25 December 2026
  function formatDate(date) {
    if (typeof date === 'string') date = parseDate(date);
    if (!date) return '';
    return date.d + ' ' + MONTH_NAMES[date.m - 1] + ' ' + date.y;
  }

  // Friday 25 December 2026
  function formatLong(date) {
    if (typeof date === 'string') date = parseDate(date);
    if (!date) return '';
    return DAY_NAMES[weekday(date)] + ' ' + formatDate(date);
  }

  // 18 Dec
  function formatShort(date) {
    if (typeof date === 'string') date = parseDate(date);
    if (!date) return '';
    return date.d + ' ' + MONTH_NAMES[date.m - 1].slice(0, 3);
  }

  // 18 December
  function formatDayMonth(date) {
    if (typeof date === 'string') date = parseDate(date);
    if (!date) return '';
    return date.d + ' ' + MONTH_NAMES[date.m - 1];
  }

  /* ---------------- Christmas and paydays ---------------- */

  // This year's Christmas Day, or next year's once it has passed.
  function christmasFor(today) {
    var after = today.m === 12 && today.d > 25;
    return { y: today.y + (after ? 1 : 0), m: 12, d: 25 };
  }

  function cutoffFor(christmas) {
    return { y: christmas.y, m: 12, d: CUTOFF_DAY };
  }

  // { days, weeks, extraDays } from today to Christmas Day.
  function countdown(today) {
    var days = daysBetween(today, christmasFor(today));
    return { days: days, weeks: Math.floor(days / 7), extraDays: days % 7 };
  }

  /*
   * Every payday from the next one up to the cutoff.
   *   status        'none' (no frequency or date yet) or 'ok'
   *   dates         the paydays that count, oldest first
   *   first         the next payday on or after today
   *   rolled        the date given had gone, so we counted on from it
   *   far           the next payday is more than one pay period away
   *   lateDecember  a payday between the cutoff and New Year (not counted)
   */
  function paydays(frequency, next, today, cutoff) {
    var start = parseDate(next);
    var none = { status: 'none', dates: [], first: null, rolled: false, far: false, lateDecember: null };
    if (!start || FREQUENCIES.indexOf(frequency) === -1) return none;

    var monthly = frequency === 'monthly';
    var period = PERIOD_DAYS[frequency];
    function nth(k) { return monthly ? addMonths(start, k) : addDays(start, k * period); }

    // A date that has gone rolls forward to the next payday on or after today.
    var k = 0;
    if (compareDates(start, today) < 0) {
      k = monthly
        ? Math.max(0, (today.y - start.y) * 12 + (today.m - start.m) - 1)
        : Math.max(0, Math.floor(daysBetween(start, today) / period));
      while (compareDates(nth(k), today) < 0) k++;
    }
    var first = nth(k);
    var oneOn = monthly ? addMonths(today, 1) : addDays(today, period);

    var dates = [];
    var i = k;
    while (dates.length < LIMITS.paydays && compareDates(nth(i), cutoff) <= 0) {
      dates.push(nth(i));
      i++;
    }
    var after = nth(i);
    var lateDecember = after.y === cutoff.y && after.m === 12 ? after : null;

    return {
      status: 'ok',
      dates: dates,
      first: first,
      rolled: k > 0,
      far: compareDates(first, oneOn) > 0,
      lateDecember: lateDecember
    };
  }

  /* ---------------- The ways to close the gap ---------------- */

  function isGrownUp(p) { return FAMILY_GROWN_UPS.indexOf(p.relation) !== -1; }

  function extraLines(plan) {
    var extras = plan.extras || {};
    var lines = EXTRAS.map(function (id) {
      return { id: id, label: null, base: toPence(extras[id]) };
    });
    (plan.ownExtras || []).forEach(function (row) {
      lines.push({ id: row.id, label: row.label, base: toPence(row.amount) });
    });
    lines.forEach(function (l) { l.amount = l.base; l.cut = false; });
    return lines;
  }

  // Works out the gifts and costs with the ways that are switched on.
  // Amounts in pence. steps says what each way saved, in the order applied.
  function applyWays(plan, ways) {
    ways = ways || {};
    var steps = { lower: 0, childrenOnly: 0, homemade: 0, cap: 0, secretSanta: 0, cutBack: 0 };
    var santa = null;

    var people = (plan.people || []).map(function (p) {
      var base = toPence(p.budget);
      return {
        id: p.id, name: p.name, idea: p.idea, relation: p.relation,
        base: base, budget: base, removed: null, lowered: false, homemade: false, capped: false
      };
    });
    function grownUps() { return people.filter(function (p) { return !p.removed && isGrownUp(p); }); }

    // 1. Lower someone's budget (only ever down)
    if (ways.lower) {
      var lowered = ways.lowered || {};
      people.forEach(function (p) {
        if (!filled(lowered[p.id])) return;
        var to = toPence(lowered[p.id]);
        if (to < p.budget) { steps.lower += p.budget - to; p.budget = to; p.lowered = true; }
      });
    }

    // 2. Presents for the children only
    if (ways.childrenOnly) {
      grownUps().forEach(function (p) { steps.childrenOnly += p.budget; p.removed = 'childrenOnly'; });
    }

    // 3. Homemade presents or gifts of time
    if (ways.homemade) {
      var materials = toPence(ways.materials);
      var picked = ways.homemadeIds || [];
      people.forEach(function (p) {
        if (p.removed || picked.indexOf(p.id) === -1) return;
        p.homemade = true;
        if (p.budget > materials) { steps.homemade += p.budget - materials; p.budget = materials; }
      });
    }

    // 4. A family spending cap
    if (ways.cap) {
      var cap = amountOr(ways.capAmount, DEFAULTS.cap);
      grownUps().forEach(function (p) {
        if (p.budget > cap) { steps.cap += p.budget - cap; p.budget = cap; p.capped = true; }
      });
    }

    // 5. A family Secret Santa: one present instead of one each, when that's cheaper
    if (ways.secretSanta) {
      var group = grownUps();
      var sum = group.reduce(function (t, p) { return t + p.budget; }, 0);
      var one = amountOr(ways.santaAmount, DEFAULTS.santa);
      if (group.length >= 2 && sum > one) {
        group.forEach(function (p) { p.removed = 'secretSanta'; });
        santa = one;
        steps.secretSanta = sum - one;
      }
    }

    // 6. Cut back on one of the extras
    var lines = extraLines(plan);
    if (ways.cutBack && filled(ways.cutAmount)) {
      var to = toPence(ways.cutAmount);
      lines.forEach(function (l) {
        if (l.id === ways.cutLine && to < l.amount) { steps.cutBack = l.amount - to; l.amount = to; l.cut = true; }
      });
    }

    var gifts = people.reduce(function (t, p) { return t + (p.removed ? 0 : p.budget); }, 0) + (santa || 0);
    var extras = lines.reduce(function (t, l) { return t + l.amount; }, 0);
    return { people: people, santa: santa, lines: lines, gifts: gifts, extras: extras, cost: gifts + extras, steps: steps };
  }

  // Can this way do anything with what's on the list? null if so, or why not.
  function wayProblem(id, plan) {
    var people = plan.people || [];
    var grownUps = people.filter(isGrownUp).length;
    if (id === 'lower' || id === 'homemade') return people.length ? null : 'needPeople';
    if (id === 'secretSanta') return grownUps >= 2 ? null : 'needGrownUps';
    if (id === 'cap' || id === 'childrenOnly') return grownUps >= 1 ? null : 'needGrownUp';
    if (id === 'cutBack') return extraLines(plan).some(function (l) { return l.base > 0; }) ? null : 'needExtras';
    return null;
  }

  /* ---------------- The whole plan ---------------- */

  function pounds(p) { return p === null || p === undefined ? null : p / 100; }

  function compute(plan, today) {
    plan = plan || blank();
    var christmas = christmasFor(today);
    var cutoff = cutoffFor(christmas);
    var count = countdown(today);
    var pay = paydays(plan.pay && plan.pay.frequency, plan.pay && plan.pay.next, today, cutoff);
    var n = pay.dates.length;

    var saved = toPence(plan.saved);
    var per = toPence(plan.perPayday);
    var available = saved + per * n;

    var ways = plan.ways || {};
    var before = applyWays(plan, {});
    var now = applyWays(plan, ways);
    var cost = now.cost;

    // What each way saves now, or would save if it were switched on.
    var wayInfo = {};
    WAYS.forEach(function (id) {
      var on = !!ways[id];
      var could;
      if (on) {
        could = now.steps[id];
      } else {
        var trial = Object.assign({}, ways);
        trial[id] = true;
        could = cost - applyWays(plan, trial).cost;
      }
      var blockedBy = (id === 'secretSanta' || id === 'cap') && ways.childrenOnly ? 'childrenOnly' : null;
      wayInfo[id] = { on: on, saving: pounds(on ? now.steps[id] : 0), could: pounds(could), problem: wayProblem(id, plan), blockedBy: blockedBy };
    });

    // The headline and the payday tracker
    var head;
    if (before.cost === 0) head = { kind: 'empty' };
    else if (saved >= cost) head = { kind: 'already', amount: per };
    else if (pay.status === 'none') head = { kind: 'needPayday' };
    else if (n === 0) head = { kind: 'noPaydays' };
    else {
      var need = Math.ceil((cost - saved) / n / 100) * 100;
      var enough = per * n >= cost - saved;
      head = { kind: enough ? 'covered' : 'need', amount: enough ? per : need, need: need, more: Math.max(0, need - per) };
    }

    var tracker = [];
    if (n && head.amount > 0) {
      var running = saved;
      var coveredAt = -1;
      pay.dates.forEach(function (date, i) {
        running += head.amount;
        if (coveredAt === -1 && running >= cost) coveredAt = i;
        tracker.push({ date: date, key: dateString(date), amount: pounds(head.amount), running: pounds(running), covers: coveredAt === i });
      });
      if (coveredAt !== -1) head.date = pay.dates[coveredAt];
    }

    var gap = cost - available;
    return {
      christmas: christmas,
      cutoff: cutoff,
      days: count.days,
      weeks: count.weeks,
      extraDays: count.extraDays,
      pay: pay,
      paydays: n,
      saved: pounds(saved),
      perPayday: pounds(per),
      fromPaydays: pounds(per * n),
      available: pounds(available),
      giftsBefore: pounds(before.gifts),
      extrasBefore: pounds(before.extras),
      costBefore: pounds(before.cost),
      gifts: pounds(now.gifts),
      extras: pounds(now.extras),
      cost: pounds(cost),
      totalSaving: pounds(before.cost - cost),
      gap: pounds(gap),
      short: pounds(Math.max(0, gap)),
      spare: pounds(Math.max(0, -gap)),
      balanced: before.cost > 0 && available >= cost,
      people: now.people.map(function (p) {
        return Object.assign({}, p, { base: pounds(p.base), budget: pounds(p.budget) });
      }),
      santa: pounds(now.santa),
      lines: now.lines.map(function (l) { return Object.assign({}, l, { base: pounds(l.base), amount: pounds(l.amount) }); }),
      ways: wayInfo,
      headline: {
        kind: head.kind,
        amount: pounds(head.amount),
        need: pounds(head.need),
        more: pounds(head.more),
        date: head.date || null
      },
      tracker: tracker,
      worried: plan.worried === true
    };
  }

  /* ---------------- The family message ---------------- */

  // templates: content.js > message.templates. opts: { tone, idea, amount }
  function familyMessage(templates, opts) {
    opts = opts || {};
    var tone = TONES.indexOf(opts.tone) !== -1 ? opts.tone : 'light';
    var idea = IDEAS.indexOf(opts.idea) !== -1 ? opts.idea : 'santa';
    var amount = formatMoney(amountOr(opts.amount, DEFAULTS[idea]) / 100);
    return String(templates[tone][idea]).replace(/\{amount\}/g, amount);
  }

  /* ---------------- The saved plan ---------------- */

  function blank() {
    return {
      pay: { frequency: '', next: '' },
      saved: '',
      perPayday: '',
      people: [],
      extras: {},
      ownExtras: [],
      ways: {
        lower: false, secretSanta: false, cap: false, childrenOnly: false, homemade: false, cutBack: false,
        lowered: {},
        santaAmount: DEFAULTS.santa,
        capAmount: DEFAULTS.cap,
        homemadeIds: [],
        materials: DEFAULTS.materials,
        cutLine: '',
        cutAmount: ''
      },
      worried: false,
      bought: [],
      wrapped: [],
      putAside: [],
      message: { tone: 'light', idea: 'santa', text: '' },
      forYear: 0,
      screen: 'intro',
      nextId: 1
    };
  }

  function str(value, max) {
    return typeof value === 'string' ? value.slice(0, max) : (typeof value === 'number' && isFinite(value) ? String(value).slice(0, max) : '');
  }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function idNumber(id) { return +String(id).slice(1); }
  function validId(id, prefix) { return typeof id === 'string' && new RegExp('^' + prefix + '[1-9]\\d{0,5}$').test(id); }
  function pickIds(list, valid) {
    if (!Array.isArray(list)) return [];
    return valid.filter(function (id) { return list.indexOf(id) !== -1; });
  }
  function uniqueRows(list, prefix, limit) {
    var seen = {};
    return (Array.isArray(list) ? list : []).filter(function (r) {
      if (!isObj(r) || !validId(r.id, prefix) || seen[r.id]) return false;
      seen[r.id] = true;
      return true;
    }).slice(0, limit);
  }

  // Anything loaded from storage goes through here, so a damaged or
  // tampered-with save can't break the page.
  function sanitize(raw) {
    var plan = blank();
    if (!isObj(raw)) return plan;

    var pay = isObj(raw.pay) ? raw.pay : {};
    plan.pay = {
      frequency: FREQUENCIES.indexOf(pay.frequency) !== -1 ? pay.frequency : '',
      next: parseDate(pay.next) ? pay.next : ''
    };
    plan.saved = str(raw.saved, MAX.money);
    plan.perPayday = str(raw.perPayday, MAX.money);

    plan.people = uniqueRows(raw.people, 'p', LIMITS.people).map(function (p) {
      return {
        id: p.id,
        name: str(p.name, MAX.name),
        budget: str(p.budget, MAX.money),
        idea: str(p.idea, MAX.idea),
        relation: RELATIONS.indexOf(p.relation) !== -1 ? p.relation : 'other'
      };
    });
    var extras = isObj(raw.extras) ? raw.extras : {};
    EXTRAS.forEach(function (id) { if (extras[id] !== undefined) plan.extras[id] = str(extras[id], MAX.money); });
    plan.ownExtras = uniqueRows(raw.ownExtras, 'x', LIMITS.ownExtras).map(function (r) {
      return { id: r.id, label: str(r.label, MAX.label), amount: str(r.amount, MAX.money) };
    });

    var personIds = plan.people.map(function (p) { return p.id; });
    var lineIds = EXTRAS.concat(plan.ownExtras.map(function (r) { return r.id; }));
    var w = isObj(raw.ways) ? raw.ways : {};
    WAYS.forEach(function (id) { plan.ways[id] = w[id] === true; });
    var lowered = isObj(w.lowered) ? w.lowered : {};
    personIds.forEach(function (id) { if (lowered[id] !== undefined) plan.ways.lowered[id] = str(lowered[id], MAX.money); });
    ['santaAmount', 'capAmount', 'materials', 'cutAmount'].forEach(function (k) {
      if (w[k] !== undefined) plan.ways[k] = str(w[k], MAX.money);
    });
    plan.ways.homemadeIds = pickIds(w.homemadeIds, personIds);
    plan.ways.cutLine = lineIds.indexOf(w.cutLine) !== -1 ? w.cutLine : '';

    plan.worried = raw.worried === true;
    plan.bought = pickIds(raw.bought, personIds.concat(SANTA_ID));
    plan.wrapped = pickIds(raw.wrapped, personIds.concat(SANTA_ID));
    plan.putAside = (Array.isArray(raw.putAside) ? raw.putAside : []).filter(function (d, i, all) {
      return parseDate(d) && all.indexOf(d) === i;
    }).slice(0, LIMITS.paydays);

    var m = isObj(raw.message) ? raw.message : {};
    plan.message = {
      tone: TONES.indexOf(m.tone) !== -1 ? m.tone : 'light',
      idea: IDEAS.indexOf(m.idea) !== -1 ? m.idea : 'santa',
      text: str(m.text, MAX.message)
    };
    plan.forYear = typeof raw.forYear === 'number' && raw.forYear >= 2000 && raw.forYear <= 3000 ? Math.floor(raw.forYear) : 0;
    plan.screen = SCREENS.indexOf(raw.screen) !== -1 ? raw.screen : 'intro';

    var highest = plan.people.concat(plan.ownExtras).reduce(function (top, r) { return Math.max(top, idNumber(r.id)); }, 0);
    var next = typeof raw.nextId === 'number' && isFinite(raw.nextId) ? Math.floor(raw.nextId) : 1;
    plan.nextId = Math.min(999999, Math.max(next, highest + 1));
    return plan;
  }

  // Has anyone typed or ticked anything? (Where they were doesn't count.)
  function hasData(plan) {
    if (!isObj(plan)) return false;
    var pay = plan.pay || {};
    var extras = plan.extras || {};
    return [pay.frequency, pay.next, plan.saved, plan.perPayday].some(filled) ||
      (plan.people || []).length > 0 ||
      Object.keys(extras).some(function (k) { return filled(extras[k]); }) ||
      (plan.ownExtras || []).some(function (r) { return filled(r.label) || filled(r.amount); }) ||
      plan.worried === true ||
      ['bought', 'wrapped', 'putAside'].some(function (k) { return (plan[k] || []).length > 0; });
  }

  // A new id for a person ('p') or an "everything else" line ('x').
  function newId(plan, prefix) {
    var id = prefix + plan.nextId;
    plan.nextId += 1;
    return id;
  }

  // Takes someone off the list, and out of every tick and idea they were in.
  function removePerson(plan, id) {
    plan.people = plan.people.filter(function (p) { return p.id !== id; });
    delete plan.ways.lowered[id];
    ['bought', 'wrapped'].forEach(function (k) { plan[k] = plan[k].filter(function (x) { return x !== id; }); });
    plan.ways.homemadeIds = plan.ways.homemadeIds.filter(function (x) { return x !== id; });
  }

  function removeOwnExtra(plan, id) {
    plan.ownExtras = plan.ownExtras.filter(function (r) { return r.id !== id; });
    if (plan.ways.cutLine === id) { plan.ways.cutLine = ''; plan.ways.cutAmount = ''; }
  }

  // Last year's ticks don't belong on this year's list.
  function newYear(plan, year) {
    plan.bought = [];
    plan.wrapped = [];
    plan.putAside = [];
    plan.forYear = year;
  }

  return {
    FREQUENCIES: FREQUENCIES,
    PERIOD_DAYS: PERIOD_DAYS,
    CUTOFF_DAY: CUTOFF_DAY,
    RELATIONS: RELATIONS,
    FAMILY_GROWN_UPS: FAMILY_GROWN_UPS,
    EXTRAS: EXTRAS,
    WAYS: WAYS,
    TONES: TONES,
    IDEAS: IDEAS,
    SCREENS: SCREENS,
    SANTA_ID: SANTA_ID,
    LIMITS: LIMITS,
    MAX: MAX,
    DEFAULTS: DEFAULTS,
    toPence: toPence,
    moneyProblem: moneyProblem,
    formatMoney: formatMoney,
    parseDate: parseDate,
    dateString: dateString,
    compareDates: compareDates,
    addDays: addDays,
    addMonths: addMonths,
    daysBetween: daysBetween,
    formatDate: formatDate,
    formatLong: formatLong,
    formatShort: formatShort,
    formatDayMonth: formatDayMonth,
    christmasFor: christmasFor,
    cutoffFor: cutoffFor,
    countdown: countdown,
    paydays: paydays,
    applyWays: applyWays,
    compute: compute,
    familyMessage: familyMessage,
    blank: blank,
    sanitize: sanitize,
    hasData: hasData,
    newId: newId,
    removePerson: removePerson,
    removeOwnExtra: removeOwnExtra,
    newYear: newYear
  };
});
