#!/usr/bin/env node
/*
 * Tests for the "Which Baby Step am I on?" quiz.
 *
 *   node tests/quiz-logic.test.js
 *
 * No installs needed, just Node. It:
 *   1. walks every possible path through the quiz and checks the placement
 *      against a separate, deliberately simple copy of the rules;
 *   2. checks some hand-picked cases with the answer written out;
 *   3. checks the copy: every result has its words, three actions, a video
 *      setting, and none of the banned words from the README house rules.
 */

'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

var ROOT = path.join(__dirname, '..');
var L = require(path.join(ROOT, 'quiz', 'logic.js'));

function loadBrowserFile(rel) {
  var sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  // Plain data only, copied out of the sandbox so comparisons work normally.
  return JSON.parse(JSON.stringify(sandbox.window));
}
var CONTENT = loadBrowserFile('quiz/content.js').MIM_QUIZ_CONTENT;
var CONFIG = loadBrowserFile('assets/config.js').MIM_CONFIG;
var STEPS = loadBrowserFile('assets/baby-steps.js').MIM_BABY_STEPS;

var passed = 0;
var failures = [];
function test(name, fn) {
  try { fn(); passed++; }
  catch (err) { failures.push(name + '\n    ' + err.message.split('\n').join('\n    ')); }
}

/* ------------------------------------------------------------------
 * Reference rules, written out longhand from the brief:
 * the result is the FIRST unmet step in the order
 * 0, 1, 2, 3, 3b (only if Q5 yes), 4, 5 (only with children), 6 (only with
 * a mortgage), 7. "Sort of" on the budget counts as not done.
 * ------------------------------------------------------------------ */
function reference(a) {
  var ladder = [];
  ladder.push({ id: '0', met: a.budget === 'yes' });
  ladder.push({ id: '1', met: a.starter === 'yes' });
  ladder.push({ id: '2', met: a.debt === 'no' });
  ladder.push({ id: '3', met: a.fullFund === 'yes' });
  if (a.house === 'yes') ladder.push({ id: '3b', met: false });
  ladder.push({ id: '4', met: a.invest === 'yes' });
  if (a.children === 'yes' && a.launchFund !== 'launched') ladder.push({ id: '5', met: a.launchFund === 'yes' });
  if (a.mortgage === 'yes') ladder.push({ id: '6', met: false });
  ladder.push({ id: '7', met: false });

  var unmet = ladder.filter(function (s) { return !s.met; }).map(function (s) { return s.id; });
  return {
    step: unmet[0],
    headingFor: unmet[0] === '0' ? unmet[1] : null,
    needsDebtHelp: a.debt === 'yes' && a.debtSigns.length > 0,
    studentLoanNote: a.studentLoan === 'yes',
    giving: a.giving
  };
}

/* ------------------------------------------------------------------
 * Every path: answer each question that would be asked, with every
 * possible answer (and every combination of ticks on the debt question).
 * ------------------------------------------------------------------ */
function subsets(list) {
  var out = [[]];
  list.forEach(function (item) {
    out = out.concat(out.map(function (s) { return s.concat(item); }));
  });
  return out;
}

function allPaths() {
  var paths = [];
  (function walk(answers, asked) {
    var next = L.QUESTION_ORDER.filter(function (id) {
      return L.isAsked(id, answers) && !L.isAnswered(id, answers);
    })[0];
    if (!next) { paths.push({ answers: answers, asked: asked }); return; }
    var choices = L.MULTI[next] ? subsets(L.VALID[next]) : L.VALID[next];
    choices.forEach(function (value) {
      var copy = Object.assign({}, answers);
      copy[next] = value;
      walk(copy, asked.concat(next));
    });
  })({}, []);
  return paths;
}

var paths = allPaths();
var tally = {};
var headingTally = {};

test('there are lots of paths to walk', function () {
  // 3 budget x 2 x (1 + 16 debt) x 2 x 2 x 3 invest x (1 + 3 children) x 2 x 2 x 2
  assert.equal(paths.length, 3 * 2 * 17 * 2 * 2 * 3 * 4 * 2 * 2 * 2);
});

paths.forEach(function (p, index) {
  var a = p.answers;
  var label = 'path ' + index + ' ' + JSON.stringify(a);
  try {
    var got = L.evaluate(a);
    var want = reference(a);

    assert.equal(got.step, want.step, 'step');
    assert.equal(got.headingFor, want.headingFor, 'heading for');
    assert.equal(got.needsDebtHelp, want.needsDebtHelp, 'debt help box');
    assert.equal(got.studentLoanNote, want.studentLoanNote, 'student loan note');
    assert.equal(got.giving, want.giving, 'giving note');
    assert.equal(got.complete, true, 'complete');

    // The follow-up questions only appear when they should.
    assert.equal(p.asked.indexOf('debtSigns') !== -1, a.debt === 'yes', 'debt follow-up asked');
    assert.equal(p.asked.indexOf('launchFund') !== -1, a.children === 'yes', 'children follow-up asked');
    assert.deepEqual(L.sequence(a), p.asked, 'question sequence');
    assert.equal(L.firstUnanswered(a), null, 'nothing left unanswered');

    // Ladder: exactly one "you're here", in the right place, sensible states.
    var current = got.ladder.filter(function (s) { return s.state === 'current'; });
    assert.equal(current.length, 1, 'one current step');
    assert.equal(current[0].id, got.step, 'current step matches');
    var seenCurrent = false;
    got.ladder.forEach(function (s) {
      if (s.id === got.step) { seenCurrent = true; return; }
      if (s.id === '6b') { assert.equal(s.state, 'extra'); assert.equal(s.relevant, a.studentLoan === 'yes'); return; }
      if (!seenCurrent) assert.ok(s.state === 'done' || s.state === 'skipped', 'step ' + s.id + ' before current is ' + s.state);
      else assert.ok(s.state === 'upcoming' || s.state === 'skipped', 'step ' + s.id + ' after current is ' + s.state);
    });
    assert.deepEqual(got.ladder.map(function (s) { return s.id; }), L.LADDER_ORDER, 'ladder order');

    tally[got.step] = (tally[got.step] || 0) + 1;
    if (got.headingFor) headingTally[got.headingFor] = (headingTally[got.headingFor] || 0) + 1;
    passed++;
  } catch (err) {
    failures.push(label + '\n    ' + err.message.split('\n')[0]);
  }
});

test('every step from 0 to 7 (including 3b) is reachable', function () {
  assert.deepEqual(Object.keys(tally).sort(), L.PLACEMENT_ORDER.slice().sort());
});

test('from Step 0 you can be heading for any later step', function () {
  assert.deepEqual(Object.keys(headingTally).sort(), L.PLACEMENT_ORDER.slice(1).sort());
});

/* ------------------------------------------------------------------
 * Hand-picked cases
 * ------------------------------------------------------------------ */
function person(overrides) {
  return Object.assign({
    budget: 'yes', starter: 'yes', debt: 'no', fullFund: 'yes', house: 'no',
    invest: 'yes', children: 'no', mortgage: 'no', studentLoan: 'no', giving: 'yes'
  }, overrides);
}
function place(overrides) { return L.evaluate(person(overrides)); }

var cases = [
  ['everything done, no kids, no mortgage', {}, '7', null],
  ['no budget at all', { budget: 'no' }, '0', '7'],
  ['"sort of" budget counts as not done', { budget: 'sortof' }, '0', '7'],
  ['sort of budget, no starter fund', { budget: 'sortof', starter: 'no' }, '0', '1'],
  ['no budget, in debt, no starter fund', { budget: 'no', starter: 'no', debt: 'yes', debtSigns: [] }, '0', '1'],
  ['no budget, debt but has £500', { budget: 'no', debt: 'yes', debtSigns: [] }, '0', '2'],
  ['budget but no £500', { starter: 'no' }, '1', null],
  ['£500 but consumer debt', { debt: 'yes', debtSigns: [] }, '2', null],
  ['debt-free, no full fund', { fullFund: 'no' }, '3', null],
  ['full fund, buying a house', { house: 'yes' }, '3b', null],
  ['not buying a house skips 3b', { house: 'no', invest: 'less' }, '4', null],
  ['buying a house comes before investing', { house: 'yes', invest: 'less' }, '3b', null],
  ['"not sure" on investing counts as not done', { invest: 'unsure' }, '4', null],
  ['investing, kids, not saving for them', { children: 'yes', launchFund: 'notYet' }, '5', null],
  ['investing, kids, saving for them, mortgage', { children: 'yes', launchFund: 'yes', mortgage: 'yes' }, '6', null],
  ['kids already launched skips Step 5', { children: 'yes', launchFund: 'launched', mortgage: 'yes' }, '6', null],
  ['no kids, mortgage', { mortgage: 'yes' }, '6', null],
  ['kids saved for, no mortgage', { children: 'yes', launchFund: 'yes' }, '7', null],
  ['the first gap wins even if later steps are done', { starter: 'no', invest: 'yes', mortgage: 'no' }, '1', null],
  ['an early gap beats a mortgage', { fullFund: 'no', mortgage: 'yes' }, '3', null],
  ['no budget, everything else to do', { budget: 'no', starter: 'no', debt: 'yes', debtSigns: ['minimums'], fullFund: 'no', house: 'yes', invest: 'less', children: 'yes', launchFund: 'notYet', mortgage: 'yes' }, '0', '1']
];
cases.forEach(function (c) {
  test('case: ' + c[0], function () {
    var r = place(c[1]);
    assert.equal(r.step, c[2], 'step');
    assert.equal(r.headingFor, c[3], 'heading for');
  });
});

test('any ticked debt box shows the "talk to someone" box', function () {
  L.VALID.debtSigns.forEach(function (sign) {
    assert.equal(place({ debt: 'yes', debtSigns: [sign] }).needsDebtHelp, true, sign);
  });
  assert.equal(place({ debt: 'yes', debtSigns: [] }).needsDebtHelp, false, 'none ticked');
  assert.equal(place({ debt: 'no' }).needsDebtHelp, false, 'no debt');
});

test('old ticks are ignored if they change their debt answer to no', function () {
  var r = L.evaluate(person({ debt: 'no', debtSigns: ['minimums', 'yearIncome'] }));
  assert.equal(r.needsDebtHelp, false);
  assert.equal(r.step, '7');
  assert.equal(L.sanitize({ debt: 'no', debtSigns: ['minimums'] }).debtSigns, undefined);
});

test('an old launch-fund answer is ignored if they change to no children', function () {
  var r = L.evaluate(person({ children: 'no', launchFund: 'notYet' }));
  assert.equal(r.step, '7');
  assert.equal(L.sanitize({ children: 'no', launchFund: 'notYet' }).launchFund, undefined);
});

test('student loan and giving notes', function () {
  assert.equal(place({ studentLoan: 'yes' }).studentLoanNote, true);
  assert.equal(place({ studentLoan: 'no' }).studentLoanNote, false);
  assert.equal(place({ giving: 'no' }).giving, 'no');
  assert.equal(place({ giving: 'yes' }).giving, 'yes');
});

test('student loans never change the step', function () {
  paths.forEach(function (p) {
    var flipped = Object.assign({}, p.answers, { studentLoan: p.answers.studentLoan === 'yes' ? 'no' : 'yes' });
    assert.equal(L.evaluate(flipped).step, L.evaluate(p.answers).step);
  });
});

test('giving never changes the step', function () {
  paths.forEach(function (p) {
    var flipped = Object.assign({}, p.answers, { giving: p.answers.giving === 'yes' ? 'no' : 'yes' });
    assert.equal(L.evaluate(flipped).step, L.evaluate(p.answers).step);
  });
});

test('partly answered quizzes know what to ask next', function () {
  assert.equal(L.firstUnanswered({}), 'budget');
  assert.equal(L.firstUnanswered({ budget: 'yes', starter: 'yes', debt: 'yes' }), 'debtSigns');
  assert.equal(L.firstUnanswered({ budget: 'yes', starter: 'yes', debt: 'no' }), 'fullFund');
  assert.equal(L.firstUnanswered(person({ children: 'yes' })), 'launchFund');
  assert.equal(L.isComplete(person({ children: 'yes' })), false);
  assert.equal(L.isComplete(person({ debt: 'yes' })), false, 'debt yes needs the tick question (even if nothing is ticked)');
  assert.equal(L.isComplete(person({ debt: 'yes', debtSigns: [] })), true);
});

test('saved answers are cleaned up safely', function () {
  assert.deepEqual(L.sanitize(null), {});
  assert.deepEqual(L.sanitize('nonsense'), {});
  assert.deepEqual(L.sanitize({ budget: 'maybe', starter: 'yes', hacker: '<script>' }), { starter: 'yes' });
  assert.deepEqual(L.sanitize({ debt: 'yes', debtSigns: ['minimums', 'bogus'] }), { debt: 'yes', debtSigns: ['minimums'] });
});

test('question numbers run 1 to 10, with follow-ups sharing their parent number', function () {
  assert.equal(L.TOTAL_QUESTIONS, 10);
  assert.equal(L.QUESTION_NUMBER.debtSigns, L.QUESTION_NUMBER.debt);
  assert.equal(L.QUESTION_NUMBER.launchFund, L.QUESTION_NUMBER.children);
  var mains = L.QUESTION_ORDER.filter(function (id) { return id !== 'debtSigns' && id !== 'launchFund'; });
  assert.deepEqual(mains.map(function (id) { return L.QUESTION_NUMBER[id]; }), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

/* ------------------------------------------------------------------
 * Copy and settings
 * ------------------------------------------------------------------ */
test('every question has words, and its options match the logic', function () {
  L.QUESTION_ORDER.forEach(function (id) {
    var q = CONTENT.questions[id];
    assert.ok(q && q.text, id + ' has text');
    assert.deepEqual(q.options.map(function (o) { return o.value; }), L.VALID[id], id + ' option values');
    assert.equal(!!q.multi, !!L.MULTI[id], id + ' multi');
  });
});

test('every possible result has a meaning, three actions and a valid faith line', function () {
  L.PLACEMENT_ORDER.forEach(function (id) {
    var s = CONTENT.steps[id];
    assert.ok(s, 'content for step ' + id);
    var sentences = s.meaning.split(/[.?!](?:\s|$)/).filter(function (x) { return x.trim(); }).length;
    assert.ok(sentences >= 2 && sentences <= 3, 'step ' + id + ' meaning has ' + sentences + ' sentences (want 2–3)');
    assert.equal(s.actions.length, 3, 'step ' + id + ' has three actions');
    if (s.faith) {
      assert.ok(/(Luke 14:28|Proverbs 21:20|Proverbs 22:7|Matthew 25:14–30|2 Corinthians 9:6–8)/.test(s.faith), 'step ' + id + ' faith line uses an approved verse');
      assert.ok(!/^\s*(Luke|Proverbs|Matthew|2 Corinthians)/.test(s.meaning), 'step ' + id + ' does not open with a verse');
    }
  });
});

test('the framework ladder has every step, including the UK extras', function () {
  assert.deepEqual(STEPS.map(function (s) { return s.id; }), L.LADDER_ORDER);
  STEPS.forEach(function (s) { assert.ok(s.title && s.summary && s.short, 'step ' + s.id + ' complete'); });
});

test('config has a video setting for every step and https links', function () {
  L.LADDER_ORDER.forEach(function (id) { assert.ok(id in CONFIG.videos, 'video for step ' + id); });
  ['website', 'moneyAndFaith', 'appIos', 'appAndroid', 'appWeb'].forEach(function (k) {
    assert.ok(/^https:\/\//.test(CONFIG.links[k]), k + ' is an https link');
  });
  assert.equal(CONFIG.debtHelp.length, 3);
  CONFIG.debtHelp.forEach(function (org) { assert.ok(/^https:\/\//.test(org.url), org.name); });
  assert.equal(CONFIG.mailerlite.stepField, 'baby_step');
});

// The house rules from the README.
var BANNED = [
  'journey', 'game-changer', 'game changer', 'life-changing', 'transformational', 'dive in',
  'unpack', "here's the thing", 'hustle', 'abundance mindset', 'scarcity mindset',
  "in today's world", 'honestly', "it's worth noting"
];
var US_SPELLINGS = /\b(organiz\w*|favor|favorite|color|behavior|center|realiz\w*|recogniz\w*|prioritiz\w*|analyz\w*|apologiz\w*|minimiz\w*|maximiz\w*)\b/i;
var COPY_FILES = [
  'index.html', 'quiz/index.html', 'debt-planner/index.html', 'saving-for-mission/index.html',
  'quiz/content.js', 'assets/baby-steps.js', 'assets/config.js'
];

function readableText(rel) {
  var raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (/\.html$/.test(rel)) {
    raw = raw.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
  } else {
    // Only the words inside quotes, not code or comments.
    raw = (raw.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g) || []).join('\n');
  }
  return raw.replace(/[’‘]/g, "'").replace(/&amp;/g, '&');
}

test('no banned words, piles of exclamation marks or US spellings in the copy', function () {
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

test('em-dashes stay rare in the quiz copy', function () {
  var count = (readableText('quiz/content.js').match(/—/g) || []).length;
  assert.ok(count <= 3, count + ' em-dashes in quiz/content.js');
});

/* ------------------------------------------------------------------ */

var total = passed + failures.length;
console.log('\nQuiz paths walked: ' + paths.length);
console.log('Where people land:');
L.PLACEMENT_ORDER.forEach(function (id) {
  console.log('  Step ' + (id + ' ').slice(0, 3) + (tally[id] || 0) + ' paths' + (headingTally[id] ? '  (and heading for it from Step 0: ' + headingTally[id] + ')' : ''));
});

if (failures.length) {
  console.log('\n' + failures.length + ' of ' + total + ' checks FAILED:\n');
  failures.slice(0, 25).forEach(function (f) { console.log('  ✗ ' + f); });
  if (failures.length > 25) console.log('  …and ' + (failures.length - 25) + ' more');
  process.exit(1);
}
console.log('\nAll ' + total + ' checks passed.');
