#!/usr/bin/env node
/*
 * Tests for the Saving for Mission Builder.
 *
 *   node saving-for-mission/tests/mission.test.js
 *
 * No installs needed, just Node. It checks:
 *   1. the worked example comes out at A £2,400 ... G £560, whatever day
 *      someone opens it;
 *   2. the sums, rounding, dates and edge cases (no due date, money already
 *      in hand, a due date that's gone);
 *   3. saved plans are cleaned up safely;
 *   4. the words: they match the logic, use only the verses in the brief,
 *      and keep to the README house rules.
 */

'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

var ROOT = path.join(__dirname, '..', '..');
var L = require(path.join(ROOT, 'saving-for-mission', 'logic.js'));

function loadBrowserFile(rel) {
  var sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  return JSON.parse(JSON.stringify(sandbox.window));
}
var CONTENT = loadBrowserFile('saving-for-mission/content.js').MIM_MISSION_CONTENT;
var CONFIG = loadBrowserFile('assets/config.js').MIM_CONFIG;

var passed = 0;
var failures = [];
function test(name, fn) {
  try { fn(); passed++; }
  catch (err) { failures.push(name + '\n    ' + err.message.split('\n').join('\n    ')); }
}

function day(y, m, d) { return { y: y, m: m, d: d }; }
function plan(overrides) { return Object.assign(L.blank(), overrides); }
var TODAY = day(2026, 10, 13);
function due(months) { return L.dateString(L.addMonths(TODAY, months)); }

/* ------------------------------------------------------------------
 * 1. The worked example
 * ------------------------------------------------------------------ */

var EXPECTED = { A: 2400, B: 400, C: 2000, D: 250, E: 180, F: 1440, G: 560 };

test('worked example: A to G match the brief (opened on 13 October 2026)', function () {
  var r = L.compute(L.fromExample(CONTENT.example, TODAY), TODAY);
  L.LETTERS.forEach(function (l) { assert.equal(r[l], EXPECTED[l], l); });
  assert.equal(r.months, 8, 'months');
  assert.equal(r.margin, 120, 'margin today');
  assert.equal(r.freed, 60, 'freed up with the three Rs');
  assert.equal(r.extra, 0, 'extra income');
  assert.equal(r.funded, false);
  assert.equal(r.shortfall, 70, '£250 target less £180 a month');
});

test('worked example: shows as the brief writes it', function () {
  var r = L.compute(L.fromExample(CONTENT.example, TODAY), TODAY);
  var shown = L.LETTERS.map(function (l) { return l + ' ' + L.formatMoney(r[l]); }).join(', ');
  assert.equal(shown, 'A £2,400, B £400, C £2,000, D £250, E £180, F £1,440, G £560');
});

test('worked example: the same figures from every day of a normal year and a leap year', function () {
  [2026, 2028].forEach(function (year) {
    for (var m = 1; m <= 12; m++) {
      for (var d = 1; d <= new Date(Date.UTC(year, m, 0)).getUTCDate(); d++) {
        var t = day(year, m, d);
        var r = L.compute(L.fromExample(CONTENT.example, t), t);
        L.LETTERS.forEach(function (l) { assert.equal(r[l], EXPECTED[l], l + ' on ' + L.dateString(t)); });
        assert.equal(r.months, 8, 'months on ' + L.dateString(t));
      }
    }
  });
});

test('worked example: B is £150 saved plus £250 for the old phone', function () {
  var ex = L.fromExample(CONTENT.example, TODAY);
  assert.equal(L.toPence(ex.savings), 15000);
  assert.equal(ex.sell.filter(function (s) { return L.toPence(s.amount); }).length, 1);
  assert.equal(L.toPence(ex.sell[0].amount), 25000);
  assert.equal(ex.example, true);
});

test('worked example: leaves after the money is due, and comes home after leaving', function () {
  var ex = L.fromExample(CONTENT.example, TODAY);
  assert.ok(L.compareDates(L.parseDate(ex.mission.leave), L.parseDate(ex.mission.due)) > 0);
  assert.ok(L.compareDates(L.parseDate(ex.mission.back), L.parseDate(ex.mission.leave)) > 0);
});

/* ------------------------------------------------------------------
 * 2. The sums
 * ------------------------------------------------------------------ */

test('A adds every cost line, including your own extras', function () {
  var r = L.compute(plan({
    costs: { fee: '1000', flights: '450.50', wages: '£1,200' },
    extraCosts: [{ label: 'Jabs for a second country', amount: '75' }, { label: 'Blank', amount: '' }],
    mission: { where: '', leave: '', back: '', due: due(5) }
  }), TODAY);
  assert.equal(r.A, 2725.5);
});

test('B adds savings, up to three things to sell and promised gifts', function () {
  var r = L.compute(plan({
    savings: '300',
    sell: [{ label: 'Bike', amount: '120' }, { label: 'Guitar', amount: '80' }, { label: '', amount: '' }],
    promised: '50'
  }), TODAY);
  assert.equal(r.B, 550);
});

test('D rounds up to the next pound so the target is always enough', function () {
  var r = L.compute(plan({ costs: { fee: '2000' }, mission: { where: '', leave: '', back: '', due: due(7) } }), TODAY);
  assert.equal(r.months, 7);
  assert.equal(r.D, 286);
  assert.ok(r.D * 7 >= r.C);
  var exact = L.compute(plan({ costs: { fee: '2100' }, mission: { where: '', leave: '', back: '', due: due(7) } }), TODAY);
  assert.equal(exact.D, 300, 'whole numbers are left alone');
});

test('E adds margin, the three Rs and extra income; F is E × months', function () {
  var r = L.compute(plan({
    costs: { fee: '3000' },
    mission: { where: '', leave: '', back: '', due: due(6) },
    margin: '100',
    cuts: [{ r: 'remove', label: 'Gym', amount: '35' }, { r: 'replace', label: 'Phone', amount: '15.50' }],
    income: [{ label: 'Babysitting', amount: '60' }]
  }), TODAY);
  assert.equal(r.E, 210.5);
  assert.equal(r.F, 1263);
  assert.equal(r.G, 1737);
});

test('pence never drift (0.1 + 0.2 style sums)', function () {
  var r = L.compute(plan({ costs: { fee: '0.10', flights: '0.20', visa: '1000.70' } }), TODAY);
  assert.equal(r.A, 1001);
  assert.equal(L.formatMoney(r.A), '£1,001');
});

test('money already in hand covers it: C and G are £0 and it counts as funded', function () {
  var r = L.compute(plan({ costs: { fee: '500' }, savings: '800' }), TODAY);
  assert.equal(r.C, 0);
  assert.equal(r.G, 0);
  assert.equal(r.funded, true, 'funded even before a due date is added');
});

test('saving more than needed: G stops at £0 and counts as funded', function () {
  var r = L.compute(plan({ costs: { fee: '1000' }, margin: '300', mission: { where: '', leave: '', back: '', due: due(6) } }), TODAY);
  assert.equal(r.F, 1800);
  assert.equal(r.G, 0);
  assert.equal(r.funded, true);
  assert.equal(r.shortfall, 0);
});

test('nothing typed yet: no gap, no celebration', function () {
  var r = L.compute(L.blank(), TODAY);
  assert.equal(r.A, 0);
  assert.equal(r.G, null);
  assert.equal(r.funded, false);
  assert.equal(r.hasCosts, false);
  assert.equal(r.dueStatus, 'none');
});

test('costs but no due date: D, F and G wait for the date', function () {
  var r = L.compute(plan({ costs: { fee: '2000' }, margin: '100' }), TODAY);
  assert.equal(r.C, 2000);
  assert.equal(r.D, null);
  assert.equal(r.F, null);
  assert.equal(r.G, null);
  assert.equal(r.funded, false);
});

test('due in less than a month: no monthly target, and the whole amount is the gap', function () {
  var r = L.compute(plan({ costs: { fee: '900' }, margin: '100', mission: { where: '', leave: '', back: '', due: '2026-11-01' } }), TODAY);
  assert.equal(r.dueStatus, 'soon');
  assert.equal(r.months, 0);
  assert.equal(r.D, null);
  assert.equal(r.F, 0);
  assert.equal(r.G, 900);
});

test('a due date that has gone is flagged', function () {
  var r = L.compute(plan({ costs: { fee: '900' }, mission: { where: '', leave: '', back: '', due: '2026-01-01' } }), TODAY);
  assert.equal(r.dueStatus, 'past');
  assert.equal(r.G, 900);
});

test('debt check: any tick shows the "talk to someone" box', function () {
  L.DEBT_SIGNS.forEach(function (sign) {
    assert.equal(L.compute(plan({ debtSigns: [sign] }), TODAY).debtWorry, true, sign);
  });
  assert.equal(L.compute(plan({ debtSigns: [] }), TODAY).debtWorry, false);
});

/* Months and dates */

var monthCases = [
  [day(2026, 10, 13), day(2027, 6, 13), 8, 'same day eight months on'],
  [day(2026, 10, 13), day(2027, 6, 12), 7, 'a day short of eight'],
  [day(2026, 10, 13), day(2027, 6, 30), 8, 'later in the month'],
  [day(2026, 1, 31), day(2026, 9, 30), 8, 'month-end to a shorter month-end'],
  [day(2026, 1, 31), day(2026, 2, 28), 1, 'end of January to end of February'],
  [day(2028, 2, 29), day(2029, 2, 28), 12, 'leap day to a year later'],
  [day(2026, 10, 13), day(2026, 11, 12), 0, 'just under a month'],
  [day(2026, 10, 13), day(2026, 10, 13), 0, 'today'],
  [day(2026, 10, 13), day(2025, 10, 13), 0, 'in the past']
];
monthCases.forEach(function (c) {
  test('months: ' + c[3], function () { assert.equal(L.monthsBetween(c[0], c[1]), c[2]); });
});

test('due date statuses', function () {
  assert.deepEqual(L.dueInfo('', TODAY), { status: 'none', months: null });
  assert.deepEqual(L.dueInfo('2026-13-01', TODAY), { status: 'none', months: null });
  assert.deepEqual(L.dueInfo('2026-10-12', TODAY), { status: 'past', months: 0 });
  assert.deepEqual(L.dueInfo('2026-10-13', TODAY), { status: 'soon', months: 0 });
  assert.deepEqual(L.dueInfo('2026-11-13', TODAY), { status: 'ok', months: 1 });
});

test('dates read nicely', function () {
  assert.equal(L.formatDate('2027-06-13'), '13 June 2027');
  assert.equal(L.formatRange('2027-07-13', '2027-08-10'), '13 July to 10 August 2027');
  assert.equal(L.formatRange('2027-12-20', '2028-01-05'), '20 December 2027 to 5 January 2028');
  assert.equal(L.formatRange('2027-07-13', ''), '13 July 2027');
  assert.equal(L.formatRange('', ''), '');
  assert.equal(L.parseDate('2027-02-29'), null, 'not a leap year');
  assert.deepEqual(L.parseDate('2028-02-29'), day(2028, 2, 29));
});

/* Money in and out */

test('typed amounts', function () {
  assert.equal(L.toPence('£1,250.50'), 125050);
  assert.equal(L.toPence(' 1 200 '), 120000);
  assert.equal(L.toPence('250'), 25000);
  assert.equal(L.toPence('12.5'), 1250);
  assert.equal(L.toPence(''), 0);
  assert.equal(L.toPence('abc'), 0);
  assert.equal(L.toPence('-50'), 0);
  assert.equal(L.toPence(undefined), 0);
  assert.equal(L.moneyProblem(''), null);
  assert.equal(L.moneyProblem('£1,000'), null);
  assert.equal(L.moneyProblem('-50'), 'negative');
  assert.equal(L.moneyProblem('ten'), 'invalid');
  assert.equal(L.moneyProblem('1.2.3'), 'invalid');
});

test('amounts on screen', function () {
  assert.equal(L.formatMoney(2400), '£2,400');
  assert.equal(L.formatMoney(12.5), '£12.50');
  assert.equal(L.formatMoney(0.05), '£0.05');
  assert.equal(L.formatMoney(1234567.89), '£1,234,567.89');
  assert.equal(L.formatMoney(0), '£0');
  assert.equal(L.formatMoney(null), '—');
});

/* ------------------------------------------------------------------
 * 3. Saved plans
 * ------------------------------------------------------------------ */

test('saved plans are cleaned up safely', function () {
  assert.deepEqual(L.sanitize(null), L.blank());
  assert.deepEqual(L.sanitize('nonsense'), L.blank());
  var messy = L.sanitize({
    mission: { where: 'x'.repeat(500), due: '31/12/2027', leave: '2027-07-01' },
    costs: { fee: '100', hacker: '<script>' },
    extraCosts: new Array(30).fill({ label: 'a', amount: '1' }),
    sell: [{ label: 'Bike', amount: '50' }],
    cuts: [{ r: 'explode', label: 'Gym', amount: '20' }],
    debtSigns: ['minimums', 'bogus'],
    people: ['Ann'],
    done: ['pot', 'nope'],
    screen: 'admin'
  });
  assert.equal(messy.mission.where.length, L.MAX.where);
  assert.equal(messy.mission.due, '', 'only YYYY-MM-DD dates');
  assert.equal(messy.mission.leave, '2027-07-01');
  assert.deepEqual(Object.keys(messy.costs), ['fee']);
  assert.equal(messy.extraCosts.length, L.LIMITS.extraCosts);
  assert.equal(messy.sell.length, 3, 'always three things to sell');
  assert.equal(messy.cuts[0].r, 'reduce');
  assert.deepEqual(messy.debtSigns, ['minimums']);
  assert.equal(messy.people.length, 5, 'always five people');
  assert.deepEqual(messy.done, ['pot']);
  assert.equal(messy.screen, 'intro');
});

test('a saved plan survives being stored and loaded', function () {
  var ex = L.fromExample(CONTENT.example, TODAY);
  ex.screen = '4';
  ex.done = ['pot', 'friend'];
  assert.deepEqual(L.sanitize(JSON.parse(JSON.stringify(ex))), ex);
});

test('only real input counts as a saved plan', function () {
  assert.equal(L.hasData(L.blank()), false);
  assert.equal(L.hasData(plan({ screen: '3' })), false, 'just visiting a step');
  assert.equal(L.hasData(plan({ cuts: [{ r: 'reduce', label: '', amount: '' }] })), false, 'an empty added row');
  assert.equal(L.hasData(plan({ margin: '50' })), true);
  assert.equal(L.hasData(plan({ debtSigns: ['minimums'] })), true);
  assert.equal(L.hasData(plan({ done: ['pot'] })), true);
  assert.equal(L.hasData(L.fromExample(CONTENT.example, TODAY)), true);
});

/* ------------------------------------------------------------------
 * 4. The words
 * ------------------------------------------------------------------ */

test('content matches the logic', function () {
  assert.deepEqual(CONTENT.costs.items.map(function (i) { return i.id; }), L.COST_ITEMS);
  assert.deepEqual(CONTENT.hand.debt.signs.map(function (s) { return s.id; }), L.DEBT_SIGNS);
  assert.deepEqual(CONTENT.setup.items.map(function (s) { return s.id; }), L.CHECKLIST);
  assert.deepEqual(Object.keys(CONTENT.fund.rs), L.R_TYPES);
  assert.deepEqual(Object.keys(CONTENT.letters), L.LETTERS);
  assert.equal(CONTENT.stepNames.length, 6);
  CONTENT.fund.rsChips.forEach(function (chip) { assert.ok(L.R_TYPES.indexOf(chip.r) !== -1, chip.label); });
});

test('the brief’s wording is there', function () {
  var all = JSON.stringify(CONTENT);
  [
    'If God is calling you to go, provision is His responsibility before it’s yours.',
    'God meets us as we do what we can with what He’s given us.',
    'whatever gap is left becomes a prayer of faith',
    'The headline figure is rarely the real figure.',
    'Suppose one of you wants to build a tower. Won’t you first sit down and estimate the cost?',
    'Before God did a miracle for Moses, He asked what Moses already had.',
    'What is that in your hand?',
    'Not your emergency fund. This isn’t an emergency.',
    'Getting this sorted first is wisdom, not failure.',
    'Student loan? Leave it out. For most people it works more like a tax.',
    'Whoever gathers money little by little makes it grow.',
    'You’ve done your part, so pray over this number with confidence.',
    'Philippians 4:19 was written to a church that had just given to Paul’s mission.',
    'It’s an invitation to partner, not a request to be rescued.',
    'talk it through with your programme leader and pastor',
    'don’t put the trip on a credit card',
    'The mission doesn’t start when you get on the plane. It starts when you say yes to God.'
  ].forEach(function (line) { assert.ok(all.indexOf(line) !== -1, 'missing: ' + line); });
  ['Streaming', 'Takeaways', 'Phone or data plan', 'Gym', 'Subscriptions'].forEach(function (chip) {
    assert.ok(CONTENT.fund.rsChips.some(function (c) { return c.label === chip; }), chip);
  });
  assert.deepEqual(CONTENT.fund.incomeChips, ['An extra shift', 'Babysitting', 'Selling a skill']);
});

test('Bible verses: only the ones in the brief, with the right credit', function () {
  var allowed = ['Psalm 24:1', 'Deuteronomy 8:18', 'Matthew 6:33', 'Luke 14:28', 'Exodus 4:2',
    'Proverbs 13:11', 'Philippians 4:19', 'Hebrews 11:1 (NKJV)'];
  var refs = [];
  (function walk(node) {
    if (node && typeof node === 'object') {
      if (typeof node.ref === 'string' && typeof node.text === 'string') refs.push(node.ref);
      Object.keys(node).forEach(function (k) { walk(node[k]); });
    }
  })(CONTENT);
  refs.forEach(function (ref) { assert.ok(allowed.indexOf(ref) !== -1, 'unexpected verse ' + ref); });
  assert.ok(refs.indexOf('Hebrews 11:1 (NKJV)') !== -1, 'Hebrews credited as NKJV');
  assert.equal(refs.filter(function (r) { return /NIV/.test(r); }).length, 0, 'NIV needs no credit');
});

test('no step opens with a verse', function () {
  ['mission', 'costs', 'hand', 'fund'].forEach(function (key) {
    assert.ok(!/^\s*[“"]/.test(CONTENT[key].intro), key + ' intro opens with a quote');
  });
});

test('config: tool tag and MailerLite field', function () {
  assert.equal(CONFIG.signup.toolField, 'tool');
  assert.equal(CONFIG.savingForMission.tag, 'saving-for-mission');
  assert.equal(CONFIG.signup.stepField, 'baby_step', 'the quiz setting is untouched');
  assert.ok(!/step number/.test(CONFIG.savingForMission.consentText), 'this tool sends no step number');
  assert.ok(/^https:\/\//.test(CONFIG.links.moneyAndFaith));
});

test('the page links the Money & Faith course and the app', function () {
  var html = fs.readFileSync(path.join(ROOT, 'saving-for-mission', 'index.html'), 'utf8');
  assert.ok(/href="https:\/\/moneyinmotion\.org\/money-and-faith"[^>]*>The Money &amp; Faith course<\/a> takes you through budgeting, debt, saving and generosity over four weeks\./.test(html));
  assert.ok(/data-mim-link="appWeb"/.test(html));
  ['logic.js', 'content.js', 'pdfs.js', 'builder.js', '../assets/pdf.js', '../assets/site.js', '../assets/config.js'].forEach(function (src) {
    assert.ok(html.indexOf('src="' + src + '"') !== -1, src + ' is loaded');
  });
});

// The house rules from the README.
var BANNED = [
  'journey', 'game-changer', 'game changer', 'life-changing', 'transformational', 'dive in',
  'unpack', "here's the thing", 'hustle', 'abundance mindset', 'scarcity mindset',
  "in today's world", 'honestly', "it's worth noting"
];
var US_SPELLINGS = /\b(organiz\w*|favor|favorite|color|behavior|center|realiz\w*|recogniz\w*|prioritiz\w*|analyz\w*|apologiz\w*|minimiz\w*|maximiz\w*|program|programs|traveling|traveled|canceled|canceling|enroll)\b/i;
var COPY_FILES = [
  'saving-for-mission/index.html', 'saving-for-mission/content.js', 'saving-for-mission/builder.js',
  'saving-for-mission/pdfs.js', 'assets/config.js'
];

function readableText(rel) {
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
  COPY_FILES.forEach(function (rel) {
    var text = readableText(rel);
    var lower = text.toLowerCase();
    BANNED.forEach(function (word) { if (lower.indexOf(word) !== -1) problems.push(rel + ': "' + word + '"'); });
    if (/!!/.test(text)) problems.push(rel + ': "!!"');
    var us = text.match(US_SPELLINGS);
    if (us) problems.push(rel + ': US spelling "' + us[0] + '"');
  });
  assert.deepEqual(problems, []);
});

test('no em-dashes in the copy', function () {
  var count = (readableText('saving-for-mission/content.js').match(/—/g) || []).length;
  assert.equal(count, 0);
});

/* ------------------------------------------------------------------ */

var total = passed + failures.length;
if (failures.length) {
  console.log('\n' + failures.length + ' of ' + total + ' checks FAILED:\n');
  failures.forEach(function (f) { console.log('  ✗ ' + f); });
  process.exit(1);
}
var r = L.compute(L.fromExample(CONTENT.example, TODAY), TODAY);
console.log('\nWorked example: ' + L.LETTERS.map(function (l) { return l + ' ' + L.formatMoney(r[l]); }).join('  '));
console.log('All ' + total + ' checks passed.');
