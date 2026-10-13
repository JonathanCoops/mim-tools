/*
 * "Which Baby Step am I on?" quiz logic.
 * No copy and no page code in here, just the rules, so it can be tested
 * on its own (see tests/quiz-logic.test.js).
 *
 * Answers object (every key optional until answered):
 *   budget      'yes' | 'sortof' | 'no'
 *   starter     'yes' | 'no'                 £500 starter fund
 *   debt        'yes' | 'no'                 any consumer debt
 *   debtSigns   array of 'minimums' | 'notFalling' | 'creditMonth' | 'yearIncome'
 *               (only asked when debt is 'yes')
 *   fullFund    'yes' | 'no'                 3–6 months saved
 *   house       'yes' | 'no'                 buying soon and still building the deposit
 *   invest      'yes' | 'less' | 'unsure'    around 15% into pensions/investments
 *   children    'yes' | 'no'
 *   launchFund  'yes' | 'notYet' | 'launched' (only asked when children is 'yes')
 *   mortgage    'yes' | 'no'
 *   studentLoan 'yes' | 'no'
 *   giving      'yes' | 'no'
 */

(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIMQuizLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Every possible question, in the order they're asked.
  var QUESTION_ORDER = [
    'budget', 'starter', 'debt', 'debtSigns', 'fullFund', 'house',
    'invest', 'children', 'launchFund', 'mortgage', 'studentLoan', 'giving'
  ];

  // Follow-up questions share their parent's number ("Question 3 of 10").
  var QUESTION_NUMBER = {
    budget: 1, starter: 2, debt: 3, debtSigns: 3, fullFund: 4, house: 5,
    invest: 6, children: 7, launchFund: 7, mortgage: 8, studentLoan: 9, giving: 10
  };
  var TOTAL_QUESTIONS = 10;

  var VALID = {
    budget: ['yes', 'sortof', 'no'],
    starter: ['yes', 'no'],
    debt: ['yes', 'no'],
    debtSigns: ['minimums', 'notFalling', 'creditMonth', 'yearIncome'],
    fullFund: ['yes', 'no'],
    house: ['yes', 'no'],
    invest: ['yes', 'less', 'unsure'],
    children: ['yes', 'no'],
    launchFund: ['yes', 'notYet', 'launched'],
    mortgage: ['yes', 'no'],
    studentLoan: ['yes', 'no'],
    giving: ['yes', 'no']
  };
  var MULTI = { debtSigns: true };

  // Placement order. 3b only counts if they're saving a deposit,
  // 5 only if they have children still to launch, 6 only with a mortgage.
  var PLACEMENT_ORDER = ['0', '1', '2', '3', '3b', '4', '5', '6', '7'];

  // The full ladder as shown to people (6b is a note, never a placement).
  var LADDER_ORDER = ['0', '1', '2', '3', '3b', '4', '5', '6', '6b', '7'];

  function isAsked(id, answers) {
    if (id === 'debtSigns') return answers.debt === 'yes';
    if (id === 'launchFund') return answers.children === 'yes';
    return true;
  }

  // The questions this person will be asked, given what they've said so far.
  function sequence(answers) {
    answers = answers || {};
    return QUESTION_ORDER.filter(function (id) { return isAsked(id, answers); });
  }

  function isAnswered(id, answers) {
    return MULTI[id] ? Array.isArray(answers[id]) : answers[id] !== undefined;
  }

  function firstUnanswered(answers) {
    var seq = sequence(answers);
    for (var i = 0; i < seq.length; i++) if (!isAnswered(seq[i], answers)) return seq[i];
    return null;
  }

  function isComplete(answers) {
    return firstUnanswered(answers || {}) === null;
  }

  // Keeps only known questions and valid values (e.g. from saved storage),
  // and drops follow-up answers whose parent answer no longer leads to them.
  function sanitize(raw) {
    var clean = {};
    if (!raw || typeof raw !== 'object') return clean;
    QUESTION_ORDER.forEach(function (id) {
      var value = raw[id];
      if (MULTI[id]) {
        if (Array.isArray(value)) {
          clean[id] = VALID[id].filter(function (v) { return value.indexOf(v) !== -1; });
        }
      } else if (VALID[id].indexOf(value) !== -1) {
        clean[id] = value;
      }
    });
    QUESTION_ORDER.forEach(function (id) {
      if (!isAsked(id, clean)) delete clean[id];
    });
    return clean;
  }

  // 'done' (met), 'todo' (not met yet) or 'skip' (doesn't apply to them).
  function stepStatus(stepId, a) {
    switch (stepId) {
      case '0': return a.budget === 'yes' ? 'done' : 'todo';      // "sort of" isn't done
      case '1': return a.starter === 'yes' ? 'done' : 'todo';
      case '2': return a.debt === 'no' ? 'done' : 'todo';
      case '3': return a.fullFund === 'yes' ? 'done' : 'todo';
      case '3b': return a.house === 'yes' ? 'todo' : 'skip';      // still building = not met
      case '4': return a.invest === 'yes' ? 'done' : 'todo';      // "not sure" isn't done
      case '5':
        if (a.children !== 'yes') return 'skip';
        if (a.launchFund === 'yes') return 'done';
        if (a.launchFund === 'launched') return 'skip';
        return 'todo';
      case '6': return a.mortgage === 'yes' ? 'todo' : 'skip';    // a mortgage = still paying it off
      case '6b': return 'skip';                                   // a note, not a step to place on
      case '7': return 'todo';                                    // the step you stay on
    }
    throw new Error('Unknown step ' + stepId);
  }

  function firstTodo(answers, fromIndex) {
    for (var i = fromIndex; i < PLACEMENT_ORDER.length; i++) {
      if (stepStatus(PLACEMENT_ORDER[i], answers) === 'todo') return PLACEMENT_ORDER[i];
    }
    return '7';
  }

  // The result: which step, plus the extra notes to show.
  function evaluate(rawAnswers) {
    var a = sanitize(rawAnswers);
    var step = firstTodo(a, 0);
    var currentIndex = LADDER_ORDER.indexOf(step);

    var ladder = LADDER_ORDER.map(function (id, index) {
      var status = stepStatus(id, a);
      var state;
      if (id === step) state = 'current';
      else if (id === '6b') state = 'extra';
      else if (status === 'skip') state = 'skipped';
      else if (index < currentIndex) state = 'done';
      else state = 'upcoming';
      var item = { id: id, state: state };
      if (id === '6b') item.relevant = a.studentLoan === 'yes';
      return item;
    });

    return {
      step: step,
      // On Step 0, where they'll head once the budget is in place.
      headingFor: step === '0' ? firstTodo(a, 1) : null,
      // Any "tick if true" box ticked: talk to a debt charity first.
      needsDebtHelp: a.debt === 'yes' && Array.isArray(a.debtSigns) && a.debtSigns.length > 0,
      studentLoanNote: a.studentLoan === 'yes',
      giving: a.giving === 'yes' ? 'yes' : (a.giving === 'no' ? 'no' : null),
      ladder: ladder,
      complete: isComplete(a)
    };
  }

  return {
    QUESTION_ORDER: QUESTION_ORDER,
    QUESTION_NUMBER: QUESTION_NUMBER,
    TOTAL_QUESTIONS: TOTAL_QUESTIONS,
    VALID: VALID,
    MULTI: MULTI,
    PLACEMENT_ORDER: PLACEMENT_ORDER,
    LADDER_ORDER: LADDER_ORDER,
    isAsked: isAsked,
    sequence: sequence,
    isAnswered: isAnswered,
    firstUnanswered: firstUnanswered,
    isComplete: isComplete,
    sanitize: sanitize,
    stepStatus: stepStatus,
    evaluate: evaluate
  };
});
