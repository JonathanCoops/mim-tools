/*
 * Christmas Without Debt: the page.
 * Dates and sums are in logic.js, words are in content.js, the two PDFs are
 * in pdfs.js, links and settings are in /assets/config.js. This file puts
 * them on screen.
 */

(function () {
  'use strict';

  var L = window.MIMChristmasLogic;
  var C = window.MIM_CHRISTMAS_CONTENT;
  var PDFS = window.MIMChristmasPdfs;
  var MIM = window.MIM;
  var app = document.getElementById('christmas-app');
  if (!app || !L || !C || !MIM || !PDFS) return;

  var h = MIM.h;
  var links = MIM.links;
  var config = MIM.config;
  var STORAGE_KEY = 'mim.christmas.v1';
  var STEPS = 5;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = L.sanitize(MIM.storage.get(STORAGE_KEY));
  var screen = 'intro';
  var updaters = []; // run after every keystroke to refresh the figures on screen
  // Mirror of our browser-history entries, so Back can use the browser's
  // history when it matches and the phone's back gesture works too.
  var trail = ['intro'];
  var depth = 0;
  var flash = '';      // a one-off message for the next screen
  var stepFlash = '';  // "Added Grandma" and the like, on the people step
  var editingId = null;
  var draft = blankDraft();
  var messageOpen = false;
  var celebrated = false;

  // A plan saved for last Christmas becomes this year's once they carry on.
  var staleYear = L.hasData(state) && state.forYear && state.forYear !== thisChristmas() ? state.forYear : 0;

  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (match, key) {
      return values[key] !== undefined ? values[key] : match;
    });
  }
  function money(pounds) { return L.formatMoney(pounds); }
  function count(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function paydaysText(n) { return count(n, C.ui.payday, C.ui.paydays); }
  function today() {
    var d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }
  function thisChristmas() { return L.christmasFor(today()).y; }
  function figures() { return L.compute(state, today()); }
  function cutoffText(r) { return L.formatDayMonth(r.cutoff); }
  function blankDraft() { return { name: '', relation: 'other', budget: '', idea: '' }; }

  /* ---------------- Saving ---------------- */

  // Only kept while there's something worth keeping.
  function save() {
    if (L.hasData(state)) {
      state.forYear = thisChristmas();
      MIM.storage.set(STORAGE_KEY, state);
    } else {
      MIM.storage.remove(STORAGE_KEY);
    }
  }

  // Called whenever someone types or ticks something.
  function edited() {
    save();
    update();
  }

  function update() {
    var r = figures();
    updaters.forEach(function (fn) { fn(r); });
    if (!r.balanced) celebrated = false;
    else if (screen === '4' && !celebrated) {
      celebrated = true;
      celebrate();
    }
  }

  function startFresh() {
    state = L.blank();
    draft = blankDraft();
    editingId = null;
    staleYear = 0;
    save();
    show('1', 'push');
  }

  function clearAll(alreadyCleared) {
    if (!alreadyCleared) MIM.storage.remove(STORAGE_KEY);
    state = L.blank();
    draft = blankDraft();
    editingId = null;
    staleYear = 0;
    messageOpen = false;
    flash = C.ui.cleared;
    show('intro', 'replace');
  }

  // The footer's "Clear my answers" button
  document.addEventListener('mim:cleared', function () { clearAll(true); });

  /* ---------------- Moving between screens ---------------- */

  function validScreen(s) { return L.SCREENS.indexOf(s) !== -1 ? s : 'intro'; }

  // mode: 'push' (new history entry), 'replace' or 'none'
  function show(next, mode) {
    screen = validScreen(next);
    if (screen !== 'intro') { state.screen = screen; save(); }
    stepFlash = '';
    try {
      if (mode === 'push') {
        trail.length = depth + 1;
        trail.push(screen);
        depth += 1;
        history.pushState({ mimChristmas: true, screen: screen, depth: depth }, '');
      } else if (mode === 'replace') {
        trail[depth] = screen;
        history.replaceState({ mimChristmas: true, screen: screen, depth: depth }, '');
      }
    } catch (e) { /* history not available: the planner still works */ }
    render(true);
  }

  function goBack() {
    var i = L.SCREENS.indexOf(screen);
    var prev = i > 0 ? L.SCREENS[i - 1] : 'intro';
    if (depth > 0 && trail[depth - 1] === prev) history.back();
    else show(prev, 'push');
  }

  window.addEventListener('popstate', function (event) {
    var entry = event.state;
    if (!entry || !entry.mimChristmas) return;
    depth = entry.depth || 0;
    screen = validScreen(entry.screen);
    if (screen !== 'intro') { state.screen = screen; save(); }
    stepFlash = '';
    render(true);
  });

  /* ---------------- Rendering ---------------- */

  function render(moveFocus) {
    updaters = [];
    var nodes = screen === 'intro' ? renderIntro() : renderStep(screen);
    app.textContent = '';
    MIM.append(app, nodes);
    update();

    document.title = (screen === 'intro' ? '' : C.stepNames[+screen - 1] + ' | ') + C.intro.title + ' | Money in Motion';
    if (moveFocus) {
      window.scrollTo(0, 0);
      var heading = app.querySelector('h1');
      if (heading) heading.focus({ preventScroll: true });
    }
  }

  // Redraws the current step after something is added, removed or switched,
  // keeping the scroll position and putting the cursor where it's needed.
  function rerender(focusId, select) {
    var y = window.pageYOffset;
    render(false);
    window.scrollTo(0, y);
    var el = focusId && document.getElementById(focusId);
    if (el) {
      el.focus({ preventScroll: true });
      if (select && el.select) el.select();
    }
  }

  /* ---------------- Small building blocks ---------------- */

  function title(text) { return h('h1', { id: 'step-title', className: 'xm-title', tabindex: '-1' }, text); }

  function goToButton(n) {
    return h('button', { type: 'button', className: 'link-button', onClick: function () { show(String(n), 'push'); } },
      fill(C.ui.goTo, { n: n }));
  }

  // An "Are you sure?" box for anything that wipes what someone has typed.
  function makeConfirm() {
    var text = h('p', { className: 'xm-confirm-text', tabindex: '-1' });
    var yes = h('button', { type: 'button', className: 'btn btn-primary' });
    var no = h('button', { type: 'button', className: 'btn btn-secondary' });
    var box = h('div', { className: 'xm-confirm', hidden: true }, text, h('div', { className: 'button-row' }, yes, no));
    var action = null;
    var from = null;
    yes.addEventListener('click', function () { if (action) action(); });
    no.addEventListener('click', function () { box.hidden = true; if (from) from.focus(); });
    box.ask = function (question, yesLabel, noLabel, onYes, trigger) {
      text.textContent = question;
      yes.textContent = yesLabel;
      no.textContent = noLabel;
      action = onYes;
      from = trigger;
      box.hidden = false;
      text.focus();
    };
    return box;
  }

  // A £ box. get/set read and write the plan.
  function moneyBox(id, get, set, opts) {
    opts = opts || {};
    var problem = h('span', { className: 'xm-problem', id: id + '-problem' });
    var input = h('input', {
      id: id, type: 'text', inputmode: 'decimal', autocomplete: 'off', maxlength: String(L.MAX.money),
      placeholder: opts.placeholder || null,
      'aria-label': opts.ariaLabel || null,
      'aria-describedby': [opts.describedBy, id + '-problem'].filter(Boolean).join(' ')
    });
    input.value = get() || '';
    function check() {
      var p = L.moneyProblem(input.value);
      var message = p === 'negative' ? C.ui.noMinus : p === 'invalid' ? C.ui.notANumber : '';
      problem.textContent = message;
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
    input.addEventListener('input', function () { set(input.value); check(); edited(); });
    check();
    // Another box can edit the same setting (the family message and step 4 share
    // the Secret Santa and cap amounts), so follow it when this one isn't in use.
    updaters.push(function () {
      if (document.activeElement !== input && input.value !== (get() || '')) { input.value = get() || ''; check(); }
    });
    return h('span', { className: 'xm-money' + (opts.className ? ' ' + opts.className : '') },
      h('span', { className: 'xm-pound', 'aria-hidden': 'true' }, '£'), input, problem);
  }

  // Label (and hint) on the left, £ box on the right.
  function moneyLine(id, label, hint, get, set, opts) {
    opts = opts || {};
    return h('div', { className: 'xm-line' + (opts.stacked ? ' xm-line-stacked' : '') },
      h('label', { for: id }, label, hint ? h('span', { className: 'xm-hint', id: id + '-hint' }, hint) : null),
      moneyBox(id, get, set, { describedBy: hint ? id + '-hint' : null, placeholder: opts.placeholder }));
  }

  // A highlighted total, refreshed as people type.
  function totalBox(label, value, note) {
    var out = h('output', { className: 'xm-total-value', 'aria-live': 'polite' });
    var small = note ? h('p', { className: 'xm-total-note' }) : null;
    updaters.push(function (r) {
      out.textContent = value(r);
      if (small) { small.textContent = note(r); small.hidden = !small.textContent; }
    });
    return h('div', { className: 'xm-total' },
      h('div', { className: 'xm-total-row' }, h('span', { className: 'xm-total-label' }, label), out),
      small);
  }

  function careBox(id) {
    var K = C.afford.care;
    return h('section', { className: 'care-box xm-care', 'aria-labelledby': id },
      h('h2', { className: 'h3', id: id }, K.heading),
      h('p', null, K.body),
      h('ul', { className: 'help-list', role: 'list' }, (config.debtHelp || []).map(function (org) {
        return h('li', null, MIM.extLink(org.url, org.name), h('p', null, org.description));
      })),
      h('p', null, K.local));
  }

  // A small star, drawn rather than typed so it looks the same everywhere.
  function star(className) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', className || 'xm-star');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M12 1.5l2.6 7.3 7.7.3-6.1 4.8 2.2 7.5L12 17l-6.4 4.4 2.2-7.5L1.7 9.1l7.7-.3z');
    svg.appendChild(path);
    return svg;
  }

  /* ---------------- Intro ---------------- */

  function renderIntro() {
    var I = C.intro;
    var nodes = [
      h('div', { className: 'xm-hero' },
        h('p', { className: 'eyebrow' }, star('xm-star xm-star-small'), ' ', I.eyebrow),
        h('h1', { tabindex: '-1' }, I.title),
        h('p', { className: 'lead' }, I.lead),
        h('p', { className: 'xm-stat' }, I.stat),
        h('p', null, I.statAfter),
        h('ul', { className: 'intro-points' }, I.points.map(function (p) { return h('li', null, p); })))
    ];

    if (flash) {
      nodes.push(h('p', { className: 'form-status', role: 'status' }, flash));
      flash = '';
    }

    if (L.hasData(state)) {
      var confirm = makeConfirm();
      var resume = state.screen !== 'intro' ? state.screen : '1';
      var againBtn = h('button', { type: 'button', className: 'link-button' }, I.startAgain);
      againBtn.addEventListener('click', function () {
        confirm.ask(I.startAgainConfirm, C.ui.clearYes, C.ui.clearNo, startFresh, againBtn);
      });
      nodes.push(h('div', { className: 'card welcome-back' },
        h('p', null, I.welcomeBack),
        staleYear ? h('p', { className: 'xm-note' }, fill(I.newYear, { old: staleYear, year: thisChristmas() })) : null,
        h('div', { className: 'button-row' },
          h('button', {
            type: 'button', className: 'btn btn-primary', onClick: function () {
              if (staleYear) { L.newYear(state, thisChristmas()); staleYear = 0; save(); }
              show(resume, 'push');
            }
          }, I.carryOn)),
        h('p', { className: 'xm-again' }, againBtn),
        confirm));
      nodes.push(savedLine());
    } else {
      nodes.push(h('div', { className: 'button-row xm-intro-buttons' },
        h('button', { type: 'button', className: 'btn btn-primary', onClick: startFresh }, I.start)));
    }
    return nodes;
  }

  /* ---------------- The five steps ---------------- */

  function renderStep(id) {
    var n = +id;
    var builders = { '1': stepWhen, '2': stepPeople, '3': stepExtras, '4': stepAfford, '5': stepPlan };
    return h('div', { className: 'xm-screen' },
      topBar(n),
      summaryBar(),
      h('section', { className: 'card xm-step', 'aria-labelledby': 'step-title' }, builders[id]()),
      n === 5 ? planExtras() : null,
      stepButtons(n),
      savedLine());
  }

  function topBar(n) {
    var countText = fill(C.ui.stepCount, { n: n });
    return h('div', { className: 'xm-top' },
      h('div', { className: 'quiz-top' },
        h('button', { type: 'button', className: 'back-button', onClick: goBack },
          h('span', { 'aria-hidden': 'true' }, '←'), ' ' + C.ui.back),
        h('span', { className: 'quiz-count' }, countText)),
      h('div', {
        className: 'progress xm-progress', role: 'progressbar', 'aria-label': C.intro.title,
        'aria-valuemin': '0', 'aria-valuemax': String(STEPS), 'aria-valuenow': String(n), 'aria-valuetext': countText + ': ' + C.stepNames[n - 1]
      }, h('div', { className: 'progress-fill', style: 'width:' + Math.round(n / STEPS * 100) + '%' })));
  }

  // The running total, on every step.
  function summaryBar() {
    var S = C.summary;
    var cost = h('dd');
    var have = h('dd');
    var gapLabel = h('span');
    var gap = h('dd');
    var gapTile = h('div', { className: 'xm-tile xm-tile-gap' }, h('dt', null, gapLabel), gap);
    updaters.push(function (r) {
      cost.textContent = money(r.cost);
      have.textContent = money(r.available);
      var kind = r.cost === 0 ? 'none' : r.short > 0 ? 'short' : r.spare > 0 ? 'spare' : 'even';
      gapLabel.textContent = kind === 'none' ? S.gap : S[kind];
      gap.textContent = kind === 'none' ? '—' : kind === 'short' ? money(r.short) : kind === 'spare' ? money(r.spare) : money(0);
      gapTile.className = 'xm-tile xm-tile-gap is-' + kind;
    });
    return h('section', { className: 'xm-summary', 'aria-label': S.label },
      h('dl', { className: 'xm-summary-grid' },
        h('div', { className: 'xm-tile' }, h('dt', null, S.cost), cost),
        h('div', { className: 'xm-tile' }, h('dt', null, S.have), have),
        gapTile));
  }

  function stepButtons(n) {
    // Next comes first so it's on top on a phone; CSS puts Back on the left on wider screens.
    return h('div', { className: 'button-row xm-nav' },
      n < STEPS ? h('button', { type: 'button', className: 'btn btn-primary', onClick: function () { show(String(n + 1), 'push'); } },
        fill(C.ui.next, { title: C.stepNames[n] })) : null,
      h('button', { type: 'button', className: 'btn btn-secondary', onClick: goBack }, n === 1 ? C.ui.toStart : C.ui.back));
  }

  function savedLine() {
    var confirm = makeConfirm();
    var btn = h('button', { type: 'button', className: 'link-button' }, C.ui.clear);
    btn.addEventListener('click', function () { confirm.ask(C.ui.clearConfirm, C.ui.clearYes, C.ui.clearNo, function () { clearAll(false); }, btn); });
    return h('div', { className: 'xm-saved' }, h('p', { className: 'small muted' }, C.ui.saved + ' ', btn), confirm);
  }

  /* Step 1: When and how you'll save */

  function payStatus(r) {
    var W = C.when.status;
    var pay = r.pay;
    if (pay.status === 'none') return [W.none];
    var lines = [];
    var cutoff = cutoffText(r);
    if (pay.rolled) lines.push(fill(W.rolled, { date: L.formatDayMonth(pay.first) }));
    else if (pay.far) lines.push(fill(W.far, { period: C.when.frequency.periods[state.pay.frequency] }));
    if (!r.paydays) {
      lines.push(fill(W.zero, { cutoff: cutoff }));
    } else {
      var dates = pay.dates.length <= 6
        ? pay.dates.map(L.formatShort).join(', ')
        : L.formatShort(pay.dates[0]) + ' to ' + L.formatShort(pay.dates[pay.dates.length - 1]);
      lines.push(fill(r.paydays === 1 ? W.one : W.ok, { count: paydaysText(r.paydays), dates: dates }));
      lines.push(fill(W.cutoff, { cutoff: cutoff }));
    }
    if (pay.lateDecember) lines.push(fill(W.lateDecember, { date: L.formatDayMonth(pay.lateDecember) }));
    return lines;
  }

  function stepWhen() {
    var W = C.when;
    var t = today();
    var r = figures();

    var countdown;
    if (r.days === 0) {
      countdown = h('p', { className: 'xm-countdown-note' }, W.christmasDay);
    } else {
      var weeks = r.weeks ? count(r.weeks, C.ui.week, C.ui.weeks) : '';
      var days = r.extraDays ? count(r.extraDays, C.ui.day, C.ui.days) : '';
      countdown = h('p', { className: 'xm-countdown' },
        h('span', { className: 'xm-countdown-value' }, weeks && days ? fill(W.countdown, { weeks: weeks, days: days }) : weeks || days),
        h('span', { className: 'xm-countdown-label' }, ' ' + W.countdownLabel));
    }

    var freq = h('fieldset', { className: 'checks xm-radios', 'aria-describedby': 'freq-hint' },
      h('legend', { className: 'xm-legend' }, W.frequency.legend),
      h('p', { className: 'xm-hint', id: 'freq-hint' }, W.frequency.hint),
      h('div', { className: 'xm-radio-grid' }, W.frequency.options.map(function (opt) {
        var input = h('input', { type: 'radio', name: 'freq', value: opt.id });
        input.checked = state.pay.frequency === opt.id;
        input.addEventListener('change', function () { if (input.checked) { state.pay.frequency = opt.id; edited(); } });
        return h('label', { className: 'check xm-radio' }, input, h('span', null, opt.label));
      })));

    var next = h('input', { id: 'next-payday', type: 'date', min: L.dateString(t), 'aria-describedby': 'pay-status' });
    next.value = state.pay.next || '';
    function nextChanged() {
      var v = L.parseDate(next.value) ? next.value : '';
      if (v === state.pay.next) return;
      state.pay.next = v;
      edited();
    }
    next.addEventListener('input', nextChanged);
    next.addEventListener('change', nextChanged);

    var status = h('div', { className: 'xm-pay-status', id: 'pay-status', 'aria-live': 'polite' });
    updaters.push(function (x) {
      status.textContent = '';
      payStatus(x).forEach(function (line, i) { status.appendChild(h('p', { className: i ? 'xm-hint' : null }, line)); });
    });

    var sumNote = function (x) {
      return x.paydays ? fill(W.sumBreakdown, { saved: money(x.saved), amount: money(x.perPayday), count: paydaysText(x.paydays) }) : '';
    };

    return [
      title(W.title),
      h('p', null, W.intro),
      h('div', { className: 'xm-calendar' },
        countdown,
        h('p', { className: 'xm-dates' }, fill(W.today, { today: L.formatLong(t) }), ' ', fill(W.christmas, { date: L.formatLong(r.christmas) }))),
      freq,
      h('div', { className: 'field xm-next' }, h('label', { for: 'next-payday' }, W.next.label), next),
      status,
      h('div', { className: 'xm-lines' },
        moneyLine('saved', W.saved.label, W.saved.hint, function () { return state.saved; }, function (v) { state.saved = v; }),
        moneyLine('per-payday', W.perPayday.label, W.perPayday.hint, function () { return state.perPayday; }, function (v) { state.perPayday = v; })),
      totalBox(fill(W.sumLabel, { cutoff: cutoffText(r) }), function (x) { return money(x.available); }, sumNote)
    ];
  }

  /* Step 2: Who you're buying for */

  function childCount() {
    return state.people.filter(function (p) { return p.relation === 'child'; }).length;
  }

  function useChip(chip) {
    editingId = null;
    draft = { name: fill(chip.name, { n: childCount() + 1 }), relation: chip.relation, budget: draft.budget, idea: draft.idea };
    stepFlash = '';
    rerender('pp-name', true);
  }

  function editPerson(id) {
    var p = state.people.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    editingId = id;
    draft = { name: p.name, relation: p.relation, budget: p.budget, idea: p.idea };
    stepFlash = '';
    rerender('pp-name');
  }

  function removePerson(id) {
    var p = state.people.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    if (editingId === id) { editingId = null; draft = blankDraft(); }
    L.removePerson(state, id);
    edited();
    stepFlash = fill(C.people.removed, { name: p.name });
    rerender(state.people.length ? 'pp-list-heading' : 'pp-name');
  }

  function stepPeople() {
    var P = C.people;
    var r = figures();
    var full = state.people.length >= L.LIMITS.people && !editingId;

    var chips = h('div', { className: 'xm-chips-block' },
      h('p', { className: 'xm-chips-label', id: 'pp-chips-label' }, P.chipsLabel),
      h('ul', { className: 'xm-chips', role: 'list', 'aria-labelledby': 'pp-chips-label' }, P.chips.map(function (chip) {
        return h('li', null, h('button', { type: 'button', className: 'xm-chip', disabled: full, onClick: function () { useChip(chip); } },
          h('span', { 'aria-hidden': 'true' }, '+ '), chip.label));
      })),
      h('p', { className: 'xm-hint' }, P.chipHint));

    // The list so far
    var people = r.people;
    var list = h('ul', { className: 'xm-people', role: 'list' }, people.map(function (p) {
      var meta = [P.relations[p.relation]];
      if (p.idea && p.idea.trim()) meta.push(p.idea.trim());
      return h('li', { className: 'xm-person' + (editingId === p.id ? ' is-editing' : '') },
        h('span', { className: 'xm-person-text' },
          h('span', { className: 'xm-person-name' }, p.name || '…'),
          h('span', { className: 'xm-person-meta' }, meta.join(' · '))),
        h('span', { className: 'xm-person-budget' }, p.base ? money(p.base) : P.noBudget),
        h('span', { className: 'xm-person-actions' },
          h('button', { type: 'button', className: 'link-button', id: 'pp-edit-' + p.id, onClick: function () { editPerson(p.id); } },
            C.ui.edit, h('span', { className: 'visually-hidden' }, ' ' + p.name)),
          h('button', { type: 'button', className: 'link-button', onClick: function () { removePerson(p.id); } },
            C.ui.removeButton, h('span', { className: 'visually-hidden' }, ' ' + p.name))));
    }));

    // The form
    var nameError = h('p', { className: 'xm-error', id: 'pp-name-error', hidden: true });
    var nameInput = h('input', {
      id: 'pp-name', type: 'text', maxlength: String(L.MAX.name), autocomplete: 'off',
      placeholder: P.namePlaceholder, 'aria-describedby': 'pp-name-error'
    });
    nameInput.value = draft.name;
    nameInput.addEventListener('input', function () { draft.name = nameInput.value; });

    var relation = h('select', { id: 'pp-relation', 'aria-describedby': 'pp-relation-hint' },
      L.RELATIONS.map(function (id) { return h('option', { value: id, selected: draft.relation === id }, P.relations[id]); }));
    relation.addEventListener('change', function () { draft.relation = relation.value; });

    var budgetProblem = h('span', { className: 'xm-problem', id: 'pp-budget-problem' });
    var budget = h('input', {
      id: 'pp-budget', type: 'text', inputmode: 'decimal', autocomplete: 'off', maxlength: String(L.MAX.money),
      'aria-describedby': 'pp-budget-problem'
    });
    budget.value = draft.budget;
    function checkBudget() {
      var p = L.moneyProblem(budget.value);
      budgetProblem.textContent = p === 'negative' ? C.ui.noMinus : p === 'invalid' ? C.ui.notANumber : '';
      if (budgetProblem.textContent) budget.setAttribute('aria-invalid', 'true');
      else budget.removeAttribute('aria-invalid');
      return !p;
    }
    budget.addEventListener('input', function () { draft.budget = budget.value; checkBudget(); });

    var idea = h('input', { id: 'pp-idea', type: 'text', maxlength: String(L.MAX.idea), autocomplete: 'off', placeholder: P.ideaPlaceholder });
    idea.value = draft.idea;
    idea.addEventListener('input', function () { draft.idea = idea.value; });

    var form = h('form', { className: 'xm-add', novalidate: true, 'aria-labelledby': 'pp-form-heading', hidden: full },
      h('h2', { className: 'h3', id: 'pp-form-heading' }, editingId ? fill(P.editHeading, { name: draft.name || '…' }) : P.addHeading),
      h('div', { className: 'xm-fields' },
        h('div', { className: 'field' }, h('label', { for: 'pp-name' }, P.name), nameInput, nameError),
        h('div', { className: 'field' }, h('label', { for: 'pp-relation' }, P.relation), relation),
        h('div', { className: 'field' }, h('label', { for: 'pp-budget' }, P.budget),
          h('span', { className: 'xm-money' }, h('span', { className: 'xm-pound', 'aria-hidden': 'true' }, '£'), budget, budgetProblem)),
        h('div', { className: 'field' }, h('label', { for: 'pp-idea' }, P.idea, ' ', h('span', { className: 'optional' }, C.ui.optional)), idea)),
      h('p', { className: 'xm-hint', id: 'pp-relation-hint' }, P.relationHint),
      h('div', { className: 'button-row' },
        h('button', { type: 'submit', className: 'btn btn-primary' }, editingId ? P.save : P.add),
        editingId ? h('button', {
          type: 'button', className: 'btn btn-secondary', onClick: function () {
            var was = editingId;
            editingId = null;
            draft = blankDraft();
            rerender('pp-edit-' + was);
          }
        }, P.cancel) : null));

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = nameInput.value.trim();
      nameError.hidden = !!name;
      nameError.textContent = name ? '' : P.nameRequired;
      if (name) nameInput.removeAttribute('aria-invalid');
      else nameInput.setAttribute('aria-invalid', 'true');
      var budgetOk = checkBudget();
      if (!name) { nameInput.focus(); return; }
      if (!budgetOk) { budget.focus(); return; }

      var person = { name: name.slice(0, L.MAX.name), relation: relation.value, budget: budget.value.trim(), idea: idea.value.trim() };
      if (editingId) {
        var id = editingId;
        state.people = state.people.map(function (p) { return p.id === id ? Object.assign({ id: id }, person) : p; });
        stepFlash = fill(P.changed, { name: person.name });
        editingId = null;
      } else {
        if (state.people.length >= L.LIMITS.people) return;
        person.id = L.newId(state, 'p');
        state.people.push(person);
        stepFlash = fill(P.added, { name: person.name });
      }
      draft = blankDraft();
      edited();
      rerender('pp-name');
    });

    var flashLine = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' }, stepFlash);

    return [
      title(P.title),
      h('p', null, P.intro),
      chips,
      h('h2', { className: 'h3 xm-sub', id: 'pp-list-heading', tabindex: '-1' }, P.listLabel),
      people.length ? list : h('p', { className: 'muted' }, P.empty),
      flashLine,
      full ? h('p', { className: 'xm-note' }, fill(P.full, { max: L.LIMITS.people })) : null,
      form,
      totalBox(P.total, function (x) { return money(x.giftsBefore); }, function (x) {
        return x.gifts !== x.giftsBefore ? fill(C.afford.costBreakdown, { gifts: money(x.gifts), extras: money(x.extras) }) : '';
      }),
      h('p', { className: 'xm-note-quiet' }, P.private)
    ];
  }

  /* Step 3: Everything else */

  function stepExtras() {
    var E = C.extras;
    var lines = h('div', { className: 'xm-lines' }, E.items.map(function (item) {
      return moneyLine('extra-' + item.id, item.label, item.hint,
        function () { return state.extras[item.id]; },
        function (v) { state.extras[item.id] = v; });
    }));

    var full = state.ownExtras.length >= L.LIMITS.ownExtras;
    var own = h('ul', { className: 'xm-rows', role: 'list' }, state.ownExtras.map(function (row, i) {
      var name = fill(E.ownLabel, { n: i + 1 });
      var label = h('input', {
        id: 'own-' + row.id + '-label', type: 'text', className: 'xm-row-label', maxlength: String(L.MAX.label),
        placeholder: E.ownPlaceholder, autocomplete: 'off', 'aria-label': name
      });
      label.value = row.label;
      var amount = moneyBox('own-' + row.id + '-amount', function () { return row.amount; }, function (v) { row.amount = v; },
        { ariaLabel: fill(E.ownAmountLabel, { what: row.label || name }), className: 'xm-row-amount' });
      var remove = h('button', { type: 'button', className: 'xm-remove', 'aria-label': fill(C.ui.remove, { what: row.label || name }) },
        h('span', { 'aria-hidden': 'true' }, '×'));
      label.addEventListener('input', function () {
        row.label = label.value;
        var what = label.value.trim() || name;
        remove.setAttribute('aria-label', fill(C.ui.remove, { what: what }));
        amount.querySelector('input').setAttribute('aria-label', fill(E.ownAmountLabel, { what: what }));
        edited();
      });
      remove.addEventListener('click', function () {
        L.removeOwnExtra(state, row.id);
        edited();
        var left = state.ownExtras;
        rerender(left.length ? 'own-' + left[Math.min(i, left.length - 1)].id + '-label' : 'own-add');
      });
      return h('li', { className: 'xm-row' }, label, amount, remove);
    }));

    return [
      title(E.title),
      h('p', null, E.intro),
      lines,
      h('h2', { className: 'h3 xm-sub' }, E.ownHeading),
      h('p', { className: 'muted small' }, E.ownIntro),
      own,
      h('p', { className: 'xm-add-row' },
        h('button', {
          type: 'button', className: 'xm-add-line', id: 'own-add', disabled: full, onClick: function () {
            if (state.ownExtras.length >= L.LIMITS.ownExtras) return;
            var id = L.newId(state, 'x');
            state.ownExtras.push({ id: id, label: '', amount: '' });
            edited();
            rerender('own-' + id + '-label');
          }
        }, E.add),
        full ? h('span', { className: 'small muted' }, ' ' + E.full) : null),
      totalBox(E.total, function (x) { return money(x.extrasBefore); }, function (x) {
        return x.extras !== x.extrasBefore ? fill(C.afford.costBreakdown, { gifts: money(x.gifts), extras: money(x.extras) }) : '';
      }),
      h('p', { className: 'xm-tip' }, E.tip)
    ];
  }

  /* Step 4: Can you afford it? */

  function verdictText(r) {
    var A = C.afford;
    if (r.short > 0) return fill(A.short, { amount: money(r.short) });
    if (r.spare > 0) return fill(A.spare, { amount: money(r.spare) });
    return A.even;
  }

  function needText(r) {
    var A = C.afford;
    var head = r.headline;
    if (r.short <= 0) return head.kind === 'already' ? A.alreadyPaid : '';
    if (head.kind === 'needPayday') return A.needPayday;
    if (head.kind === 'noPaydays') return A.noPaydays;
    if (head.kind === 'need') {
      return r.perPayday > 0
        ? fill(A.needMore, { need: money(head.need), more: money(head.more) })
        : fill(A.needFromZero, { need: money(head.need) });
    }
    return '';
  }

  function wayControls(id, r) {
    var W = C.afford.ways[id];
    var ways = state.ways;
    if (id === 'lower') {
      return h('ul', { className: 'xm-lower', role: 'list' }, r.people.filter(function (p) { return !p.removed; }).map(function (p) {
        var label = fill(W.newBudget, { name: p.name });
        return h('li', { className: 'xm-lower-row' },
          h('label', { for: 'lower-' + p.id }, h('span', { className: 'xm-person-name' }, p.name),
            h('span', { className: 'xm-hint' }, fill(W.was, { amount: money(p.base) }))),
          moneyBox('lower-' + p.id, function () { return ways.lowered[p.id]; }, function (v) { ways.lowered[p.id] = v; },
            { ariaLabel: label, placeholder: L.toPence(p.base) ? String(p.base) : '0' }));
      }));
    }
    if (id === 'secretSanta' || id === 'cap') {
      var key = id === 'secretSanta' ? 'santaAmount' : 'capAmount';
      return h('div', { className: 'xm-line xm-way-amount' },
        h('label', { for: 'way-' + id + '-amount' }, W.amount),
        moneyBox('way-' + id + '-amount', function () { return ways[key]; }, function (v) { ways[key] = v; },
          { placeholder: L.DEFAULTS[id === 'secretSanta' ? 'santa' : 'cap'] }));
    }
    if (id === 'homemade') {
      return h('div', null,
        h('div', { className: 'xm-line xm-way-amount' },
          h('label', { for: 'way-homemade-amount' }, W.materials),
          moneyBox('way-homemade-amount', function () { return ways.materials; }, function (v) { ways.materials = v; }, { placeholder: '0' })),
        h('fieldset', { className: 'xm-pick' },
          h('legend', null, W.pick),
          r.people.filter(function (p) { return !p.removed; }).map(function (p) {
            var input = h('input', { type: 'checkbox', id: 'homemade-' + p.id });
            input.checked = ways.homemadeIds.indexOf(p.id) !== -1;
            input.addEventListener('change', function () {
              var picked = ways.homemadeIds.filter(function (x) { return x !== p.id; });
              if (input.checked) picked.push(p.id);
              ways.homemadeIds = state.people.map(function (x) { return x.id; }).filter(function (x) { return picked.indexOf(x) !== -1; });
              edited();
            });
            return h('label', { className: 'xm-pick-row', for: 'homemade-' + p.id }, input,
              h('span', { className: 'xm-pick-name' }, p.name), h('span', { className: 'xm-pick-amount' }, money(p.base)));
          })));
    }
    if (id === 'cutBack') {
      var lines = r.lines.filter(function (l) { return l.base > 0; });
      var select = h('select', { id: 'way-cut-line' },
        h('option', { value: '' }, W.choose),
        lines.map(function (l) {
          return h('option', { value: l.id, selected: ways.cutLine === l.id }, lineLabel(l) + ' (' + money(l.base) + ')');
        }));
      select.addEventListener('change', function () {
        ways.cutLine = select.value;
        edited();
      });
      return h('div', { className: 'xm-cut' },
        h('div', { className: 'field' }, h('label', { for: 'way-cut-line' }, W.line), select),
        h('div', { className: 'xm-line xm-way-amount' },
          h('label', { for: 'way-cut-amount' }, W.amount),
          moneyBox('way-cut-amount', function () { return ways.cutAmount; }, function (v) { ways.cutAmount = v; })));
    }
    return null;
  }

  function lineLabel(l) {
    if (l.label !== null) return l.label && l.label.trim() ? l.label.trim() : C.extras.ownHeading;
    var item = C.extras.items.filter(function (i) { return i.id === l.id; })[0];
    return item ? item.label : l.id;
  }

  function wayItem(id, r) {
    var A = C.afford;
    var W = A.ways[id];
    var info = r.ways[id];
    var on = !!state.ways[id];
    var disabled = !!info.problem && !on;
    var input = h('input', {
      type: 'checkbox', id: 'way-' + id, role: 'switch', disabled: disabled,
      'aria-describedby': 'way-' + id + '-hint way-' + id + '-saves'
    });
    input.checked = on;
    input.addEventListener('change', function () {
      state.ways[id] = input.checked;
      if (id === 'cutBack' && input.checked && !state.ways.cutLine) {
        // Start with the biggest line, the one most worth looking at.
        var biggest = r.lines.filter(function (l) { return l.base > 0; }).sort(function (a, b) { return b.base - a.base; })[0];
        if (biggest) state.ways.cutLine = biggest.id;
      }
      edited();
      rerender('way-' + id);
    });

    var saves = h('span', { className: 'xm-way-saves', id: 'way-' + id + '-saves' });
    updaters.push(function (x) {
      var w = x.ways[id];
      var text;
      if (w.on) text = w.saving > 0 ? fill(A.saves, { amount: money(w.saving) }) : w.blockedBy ? A.blockedBy : w.problem ? A.problems[w.problem] : A.nothing;
      else text = w.problem ? A.problems[w.problem] : w.could > 0 ? fill(A.could, { amount: money(w.could) }) : A.nothing;
      saves.textContent = text;
      saves.className = 'xm-way-saves' + (w.on && w.saving > 0 ? ' is-saving' : '') + (!w.on && w.could > 0 ? ' is-could' : '');
    });

    return h('li', { className: 'xm-way' + (on ? ' is-on' : '') + (disabled ? ' is-disabled' : '') },
      h('div', { className: 'xm-way-head' },
        h('label', { className: 'xm-way-label', for: 'way-' + id },
          input,
          h('span', { className: 'xm-switch', 'aria-hidden': 'true' }),
          h('span', { className: 'xm-way-text' },
            h('span', { className: 'xm-way-title' }, W.title),
            h('span', { className: 'xm-hint', id: 'way-' + id + '-hint' }, W.hint))),
        saves),
      on && !disabled ? h('div', { className: 'xm-way-body' }, wayControls(id, r)) : null);
  }

  function stepAfford() {
    var A = C.afford;
    var r = figures();

    var care = careBox('care-heading');
    updaters.push(function (x) { care.hidden = !x.worried; });
    var worried = h('input', { type: 'checkbox', id: 'worried', 'aria-describedby': 'worried-hint' });
    worried.checked = state.worried;
    worried.addEventListener('change', function () { state.worried = worried.checked; edited(); });

    var nodes = [
      title(A.title),
      h('p', null, A.intro),
      h('div', { className: 'checks xm-worried' },
        h('label', { className: 'check', for: 'worried' }, worried,
          h('span', null, A.worried.label, h('span', { className: 'xm-hint', id: 'worried-hint' }, A.worried.hint)))),
      care
    ];

    if (r.costBefore === 0) {
      nodes.push(h('p', { className: 'xm-status' }, A.empty, ' ', goToButton(2)));
      return nodes;
    }

    var costValue = h('output', { className: 'xm-big-value' });
    var costNote = h('p', { className: 'xm-big-note' });
    var haveValue = h('output', { className: 'xm-big-value' });
    var haveNote = h('p', { className: 'xm-big-note' });
    var verdict = h('p', { className: 'xm-verdict', 'aria-live': 'polite' });
    var need = h('p', { className: 'xm-need' });
    updaters.push(function (x) {
      costValue.textContent = money(x.cost);
      costNote.textContent = fill(A.costBreakdown, { gifts: money(x.gifts), extras: money(x.extras) });
      haveValue.textContent = money(x.available);
      haveNote.textContent = x.paydays
        ? fill(A.haveBreakdown, { saved: money(x.saved), amount: money(x.perPayday), count: paydaysText(x.paydays) })
        : fill(A.haveSaved, { saved: money(x.saved) });
      verdict.textContent = verdictText(x);
      verdict.className = 'xm-verdict ' + (x.short > 0 ? 'is-short' : 'is-covered');
      need.textContent = needText(x);
      need.hidden = !need.textContent;
    });

    var party = h('div', { className: 'xm-celebrate', role: 'status' },
      star('xm-star xm-star-big'),
      h('div', null, h('p', { className: 'xm-celebrate-heading' }, A.celebrate.heading), h('p', null, A.celebrate.body)));
    updaters.push(function (x) { party.hidden = !x.balanced; });

    var waysHeading = h('h2', { className: 'xm-sub', id: 'ways-heading' });
    updaters.push(function (x) { waysHeading.textContent = x.short > 0 ? A.waysHeading : A.waysHeadingSpare; });

    nodes.push(
      h('div', { className: 'xm-bigs' },
        h('div', { className: 'xm-big' }, h('p', { className: 'xm-big-label' }, A.cost), costValue, costNote),
        h('div', { className: 'xm-big' }, h('p', { className: 'xm-big-label' }, fill(A.have, { cutoff: cutoffText(r) })), haveValue, haveNote)),
      verdict,
      need,
      party,
      h('section', { className: 'xm-ways-block', 'aria-labelledby': 'ways-heading' },
        waysHeading,
        h('p', null, A.waysIntro),
        h('p', { className: 'xm-hint' }, A.familyNote),
        h('ul', { className: 'xm-ways', role: 'list' }, L.WAYS.map(function (id) { return wayItem(id, r); }))),
      messagePanel('m4')
    );
    return nodes;
  }

  /* Step 5: Your plan */

  function headlineText(r) {
    var P = C.plan;
    var head = r.headline;
    if (head.kind === 'covered' || head.kind === 'need') {
      return [fill(P.headline, { amount: money(head.amount), date: L.formatDayMonth(head.date) }),
        head.kind === 'need' && r.perPayday > 0 ? fill(P.stretch, { more: money(head.more) }) : ''];
    }
    if (head.kind === 'already') return [P.already, P.alreadyMore];
    if (head.kind === 'noPaydays') return [fill(P.noPaydays, { short: money(r.short) }), P.noPaydaysMore];
    if (head.kind === 'needPayday') return [P.needPayday, ''];
    return [P.empty, ''];
  }

  function toggleIn(list, id, on) {
    var rest = list.filter(function (x) { return x !== id; });
    if (on) rest.push(id);
    return rest;
  }

  function giftRows(r) {
    var P = C.plan;
    var rows = r.people.filter(function (p) { return !p.removed; }).map(function (p) {
      return { id: p.id, name: p.name, idea: p.homemade ? P.homemadeTag + (p.idea ? ': ' + p.idea : '') : p.idea, budget: p.budget };
    });
    if (r.santa !== null) rows.push({ id: L.SANTA_ID, name: P.santaLine, idea: P.santaIdea, budget: r.santa });
    return rows;
  }

  function stepPlan() {
    var P = C.plan;
    var r = figures();
    var lines = headlineText(r);

    var head = h('div', { className: 'xm-headline' + (r.balanced ? ' is-covered' : '') },
      star('xm-star xm-star-big'),
      h('div', null,
        h('p', { className: 'xm-headline-main' }, lines[0]),
        lines[1] ? h('p', { className: 'xm-headline-more' }, lines[1]) : null,
        (r.headline.kind === 'need' && r.perPayday > 0) || r.headline.kind === 'noPaydays' ? goToButton(4) : null));

    // Gift list with ticks
    var rows = giftRows(r);
    var boughtCount = h('p', { className: 'xm-count', 'aria-live': 'polite' });
    function refreshCount() {
      var done = rows.filter(function (g) { return state.bought.indexOf(g.id) !== -1; }).length;
      boughtCount.textContent = fill(P.boughtCount, { done: done, total: rows.length });
    }
    var gifts = rows.length ? h('ul', { className: 'xm-gifts', role: 'list' }, rows.map(function (g) {
      function tick(kind, label) {
        var list = kind === 'b' ? 'bought' : 'wrapped';
        var input = h('input', { type: 'checkbox', id: kind + '-' + g.id });
        input.checked = state[list].indexOf(g.id) !== -1;
        input.addEventListener('change', function () {
          state[list] = toggleIn(state[list], g.id, input.checked);
          save();
          refreshCount();
        });
        return h('label', { className: 'xm-tick', for: kind + '-' + g.id }, input,
          h('span', null, label, h('span', { className: 'visually-hidden' }, ': ' + g.name)));
      }
      return h('li', { className: 'xm-gift' },
        h('span', { className: 'xm-gift-text' },
          h('span', { className: 'xm-person-name' }, g.name),
          g.idea ? h('span', { className: 'xm-person-meta' }, g.idea) : null),
        h('span', { className: 'xm-gift-budget' }, money(g.budget)),
        h('span', { className: 'xm-gift-ticks' }, tick('b', P.bought), tick('w', P.wrapped)));
    })) : h('p', { className: 'muted' }, P.noGifts);
    refreshCount();

    // Payday tracker
    var tracker = r.tracker.length ? h('ol', { className: 'xm-tracker', role: 'list' }, r.tracker.map(function (t) {
      var input = h('input', { type: 'checkbox', id: 'pay-' + t.key });
      input.checked = state.putAside.indexOf(t.key) !== -1;
      input.addEventListener('change', function () {
        state.putAside = toggleIn(state.putAside, t.key, input.checked).filter(function (d, i, all) { return all.indexOf(d) === i; });
        save();
      });
      return h('li', { className: 'xm-payday' + (t.covers ? ' is-covers' : '') },
        h('label', { for: 'pay-' + t.key },
          input,
          h('span', { className: 'xm-payday-date' }, L.formatShort(t.date)),
          h('span', { className: 'visually-hidden' }, fill(P.trackerDone, { date: L.formatDayMonth(t.date) }) + '. '),
          h('span', { className: 'xm-payday-amount' }, fill(P.putAside, { amount: money(t.amount) })),
          h('span', { className: 'xm-payday-running' }, t.covers ? P.paidFor : fill(P.running, { amount: money(t.running) }))));
    })) : h('p', { className: 'muted' }, P.trackerNone);

    // Everything else
    var extraLines = r.lines.filter(function (l) { return l.amount > 0 || l.cut; });
    var extras = extraLines.length ? h('dl', { className: 'xm-sum' },
      extraLines.map(function (l) {
        return h('div', { className: 'xm-sum-row' }, h('dt', null, lineLabel(l)),
          h('dd', null, l.cut ? [h('s', { className: 'xm-was' }, money(l.base)), ' '] : null, money(l.amount)));
      }),
      h('div', { className: 'xm-sum-row is-result' }, h('dt', null, P.total), h('dd', null, money(r.extras)))) : h('p', { className: 'muted' }, P.extrasNone);

    return [
      title(P.title),
      head,
      r.worried ? h('p', { className: 'xm-help-line' }, C.pdf.plan.help + ' ',
        (config.debtHelp || []).map(function (org, i) { return [i ? ' · ' : '', MIM.extLink(org.url, org.name)]; })) : null,
      h('h2', { className: 'xm-sub' }, P.giftsHeading),
      h('p', { className: 'xm-hint' }, P.giftsHint),
      rows.length ? boughtCount : null,
      gifts,
      h('h2', { className: 'xm-sub' }, P.trackerHeading),
      r.tracker.length ? h('p', { className: 'xm-hint' }, P.trackerHint) : null,
      tracker,
      h('h2', { className: 'xm-sub' }, P.extrasHeading),
      extras
    ];
  }

  // Under the Step 5 card: PDFs, the family message, links, email, start again.
  function planExtras() {
    var K = C.keep;
    var P = C.plan;
    var M = C.more;
    var status = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    var keep = h('section', { className: 'card xm-keep', 'aria-labelledby': 'keep-heading' },
      h('h2', { className: 'h3', id: 'keep-heading' }, K.heading),
      h('p', null, K.body),
      h('div', { className: 'button-row' }, pdfButton('plan', status), pdfButton('list', status)),
      status);

    var message = h('section', { className: 'card xm-message-card', 'aria-label': C.message.heading }, messagePanel('m5', true));

    var more = h('section', { className: 'card card-quiet xm-more', 'aria-labelledby': 'more-heading' },
      h('h2', { className: 'h3', id: 'more-heading' }, M.heading),
      h('ul', { className: 'xm-more-list', role: 'list' },
        h('li', null, M.app + ' ', MIM.extLink(links.appWeb, M.appLink)),
        h('li', null, M.debt + ' ', h('a', { href: '../debt-planner/' }, M.debtLink)),
        h('li', null, M.quiz + ' ', h('a', { href: '../quiz/' }, M.quizLink))));

    var confirm = makeConfirm();
    var again = h('button', { type: 'button', className: 'link-button' }, P.startAgain);
    again.addEventListener('click', function () {
      confirm.ask(C.intro.startAgainConfirm, C.ui.clearYes, C.ui.clearNo, startFresh, again);
    });

    return [
      keep,
      message,
      h('div', { className: 'xm-closing' },
        h('p', { className: 'xm-kind' }, P.hardYear),
        h('p', { className: 'xm-faith' }, P.faith),
        h('figure', { className: 'xm-verse' },
          h('blockquote', null, h('p', null, '“' + P.verse.text + '”')),
          h('figcaption', null, P.verse.ref))),
      more,
      emailSection(),
      h('div', null, h('p', { className: 'xm-again' }, again), confirm)
    ];
  }

  /* ---------------- The family message ---------------- */

  function generated() {
    var m = state.message;
    return L.familyMessage(C.message.templates, {
      tone: m.tone, idea: m.idea, amount: m.idea === 'cap' ? state.ways.capAmount : state.ways.santaAmount
    });
  }

  function messagePanel(key, primary) {
    var M = C.message;
    var panelId = key + '-panel';
    var button = h('button', {
      type: 'button', className: 'btn ' + (primary ? 'btn-primary' : 'btn-secondary') + ' xm-message-btn', 'aria-expanded': String(messageOpen), 'aria-controls': panelId
    }, M.button);

    var text = h('textarea', { id: key + '-text', rows: '7', maxlength: String(L.MAX.message), 'aria-describedby': key + '-text-hint' });
    var wa = h('a', { className: 'btn btn-secondary', target: '_blank', rel: 'noopener noreferrer' }, M.whatsApp);
    var status = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    function current() { return state.message.text || generated(); }
    function refresh() {
      text.value = current();
      wa.setAttribute('href', MIM.whatsAppUrl(text.value));
    }
    text.addEventListener('input', function () {
      state.message.text = text.value;
      wa.setAttribute('href', MIM.whatsAppUrl(text.value));
      save();
    });

    function radios(name, legend, options, get, set) {
      return h('fieldset', { className: 'xm-pills' },
        h('legend', null, legend),
        h('div', { className: 'xm-pill-row' }, Object.keys(options).map(function (id) {
          var input = h('input', { type: 'radio', name: key + '-' + name, value: id, id: key + '-' + name + '-' + id });
          input.checked = get() === id;
          input.addEventListener('change', function () {
            if (!input.checked) return;
            set(id);
            state.message.text = '';
            save();
            if (name === 'idea') syncAmount();
            refresh();
          });
          return h('label', { className: 'xm-pill', for: key + '-' + name + '-' + id }, input, h('span', null, options[id]));
        })));
    }

    // The amount box writes to the same setting as the Secret Santa or cap idea in step 4.
    var amountLabel = h('label', { for: key + '-amount' });
    var amountHolder = h('span');
    function syncAmount() {
      var idea = state.message.idea;
      var setting = idea === 'cap' ? 'capAmount' : 'santaAmount';
      amountLabel.textContent = M.amount[idea];
      amountHolder.textContent = '';
      amountHolder.appendChild(moneyBox(key + '-amount', function () { return state.ways[setting]; }, function (v) {
        state.ways[setting] = v;
        state.message.text = '';
        refresh();
      }, { placeholder: L.DEFAULTS[idea === 'cap' ? 'cap' : 'santa'] }));
    }

    var copy = h('button', { type: 'button', className: 'btn btn-primary' }, M.copy);
    copy.addEventListener('click', function () {
      MIM.copyText(text.value).then(function (ok) { status.textContent = ok ? M.copied : M.copyFailed; });
    });

    var panel = h('div', { id: panelId, className: 'xm-message', hidden: !messageOpen },
      h('h2', { className: 'h3', id: key + '-heading', tabindex: '-1' }, M.heading),
      h('p', null, M.intro),
      radios('idea', M.ideaLegend, M.ideas, function () { return state.message.idea; }, function (v) { state.message.idea = v; }),
      radios('tone', M.toneLegend, M.tones, function () { return state.message.tone; }, function (v) { state.message.tone = v; }),
      h('p', { className: 'xm-hint' }, M.honestNote),
      h('div', { className: 'xm-line xm-way-amount' }, amountLabel, amountHolder),
      h('div', { className: 'field' },
        h('label', { for: key + '-text' }, M.textLabel),
        h('span', { className: 'xm-hint', id: key + '-text-hint' }, M.textHint),
        text),
      h('div', { className: 'button-row' }, copy, wa),
      status);

    button.addEventListener('click', function () {
      messageOpen = !messageOpen;
      if (messageOpen && !state.message.text) {
        // Start from whichever family idea they switched on.
        if (state.ways.cap && !state.ways.secretSanta) state.message.idea = 'cap';
        if (state.ways.secretSanta) state.message.idea = 'santa';
        rerender(key + '-heading');
        return;
      }
      panel.hidden = !messageOpen;
      button.setAttribute('aria-expanded', String(messageOpen));
      if (messageOpen) document.getElementById(key + '-heading').focus();
    });

    syncAmount();
    refresh();
    return h('div', { className: 'xm-message-block' }, button, panel);
  }

  /* ---------------- PDFs and email ---------------- */

  function pdfButton(kind, status) {
    var K = C.keep;
    var btn = h('button', { type: 'button', className: 'btn ' + (kind === 'plan' ? 'btn-primary' : 'btn-secondary') },
      kind === 'plan' ? K.planButton : K.listButton);
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      status.textContent = K.working;
      var r = figures();
      window.MIMPdf.download(kind === 'plan' ? PDFS.plan(state, r) : PDFS.list(state, r)).then(function (how) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        status.textContent = how === 'pdf' ? K.done : K.printed;
      });
    });
    return btn;
  }

  function emailSection() {
    var E = C.email;
    var ml = config.mailerlite || {};
    var own = config.christmas || {};
    var hidden = {};
    hidden[ml.toolField || 'tool'] = own.tag || 'christmas';
    var section = MIM.emailForm({ heading: E.heading, intro: E.intro, buttonLabel: E.button, hiddenFields: hidden });

    // The shared form's wording is written for the quiz, so swap in this tool's
    // consent line and thank-you message (both set in config.js > christmas).
    var form = section.querySelector('form');
    var consent = form && form.querySelector('p.small.muted');
    if (consent && own.consentText) {
      if (consent.firstChild && consent.firstChild.nodeType === 3) consent.firstChild.nodeValue = own.consentText;
      else consent.insertBefore(document.createTextNode(own.consentText), consent.firstChild);
    }
    if (form && own.successMessage) {
      // The shared form resets itself just before it shows its thank-you,
      // so we follow straight after with ours.
      form.addEventListener('reset', function () {
        Promise.resolve().then(function () {
          var status = form.querySelector('.form-status');
          if (status && !status.classList.contains('is-error')) status.textContent = own.successMessage;
        });
      });
    }
    return section;
  }

  /* ---------------- A little snow ---------------- */

  function celebrate() {
    if (reduceMotion) return;
    var layer = h('div', { className: 'xm-snow', 'aria-hidden': 'true' });
    for (var i = 0; i < 42; i++) {
      var size = 6 + Math.round(Math.random() * 8);
      layer.appendChild(h('span', {
        className: 'xm-flake is-' + (i % 4),
        style: 'left:' + (Math.random() * 100).toFixed(1) + '%;width:' + size + 'px;height:' + size + 'px;' +
          'animation-delay:' + (Math.random() * 0.9).toFixed(2) + 's;animation-duration:' + (2.4 + Math.random() * 1.6).toFixed(2) + 's'
      }));
    }
    document.body.appendChild(layer);
    setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 4800);
  }

  /* ---------------- Start ---------------- */

  // After a page reload, pick up on the same step if there's a saved plan.
  var initial = null;
  try { initial = history.state; } catch (e) { initial = null; }
  if (initial && initial.mimChristmas && initial.screen !== 'intro' && L.hasData(state) && !staleYear) {
    depth = initial.depth || 0;
    trail = [];
    trail[depth] = initial.screen;
    screen = validScreen(initial.screen);
  } else {
    try { history.replaceState({ mimChristmas: true, screen: 'intro', depth: 0 }, ''); } catch (e) { /* fine */ }
  }
  render(false);
})();
