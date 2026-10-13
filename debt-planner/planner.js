/*
 * Debt Snowball Planner: the page.
 * The sums are in snowball.js, the words are in content.js, links and
 * settings are in /assets/config.js. This file just puts them on screen.
 */

(function () {
  'use strict';

  var S = window.MIMSnowball;
  var C = window.MIM_DEBT_CONTENT;
  var MIM = window.MIM;
  var app = document.getElementById('debt-app');
  if (!app || !S || !C || !MIM) return;

  var h = MIM.h;
  var config = MIM.config;
  var links = MIM.links;
  var R = C.results;
  var STORAGE_KEY = 'mim.debt.v1';
  var WHAT_IFS = [25, 50, 100];

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = S.sanitize(null);
  var editingId = null;
  var whatIf = null;      // 25, 50 or 100 while one of the "what if" buttons is pressed
  var current = null;     // { input, plan, start } for what's on screen
  var chart = null;
  var chartDrawn = false;
  var chartLoading = null;
  var refreshTimer = null;
  var idCount = 0;

  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (match, key) {
      return values[key] !== undefined ? values[key] : match;
    });
  }
  function pounds(amount) { return S.money(Math.round(amount * 100)); }
  // Whole pounds for big totals, pence for small ones.
  function roundMoney(pence) { return S.money(pence, Math.abs(pence) >= 10000); }
  function newId() { idCount += 1; return 'd' + Date.now().toString(36) + idCount; }
  function plainNumber(n) { return Math.round(n * 100) % 100 ? n.toFixed(2) : String(Math.round(n)); }
  function rateText(n) { return String(Math.round(n * 100) / 100); }

  function monthCount(n) { return n === 1 ? R.month : fill(R.months, { n: n }); }
  function monthsPhrase(n) {
    var base = monthCount(n);
    if (n < 12) return base;
    var split = S.splitMonths(n);
    var years = split.years === 1 ? R.year : fill(R.years, { n: split.years });
    if (!split.months) return base + ' (' + years + ')';
    return base + ' (' + fill(R.yearsAndMonths, { years: years, months: monthCount(split.months) }) + ')';
  }

  /* ---------------- Saving ---------------- */

  function save() {
    MIM.storage.set(STORAGE_KEY, {
      debts: state.debts,
      extra: state.extra,
      signs: state.signs,
      name: state.name,
      shown: state.shown,
      example: state.example,
      savedAt: new Date().toISOString()
    });
  }

  /* ---------------- Building the page ---------------- */

  var el = {};

  function field(id, label, opts) {
    opts = opts || {};
    var hintId = opts.hint ? id + '-hint' : null;
    var errorId = id + '-error';
    var input = h('input', {
      id: id, type: 'text', inputmode: opts.inputmode || null, autocomplete: 'off',
      maxlength: opts.maxlength || null, placeholder: opts.placeholder || null,
      spellcheck: opts.inputmode ? 'false' : null,
      'aria-describedby': [hintId, errorId].filter(Boolean).join(' ')
    });
    var error = h('p', { className: 'dp-error', id: errorId, hidden: true });
    var control = input;
    if (opts.prefix || opts.suffix) {
      control = h('div', { className: 'dp-affix ' + (opts.prefix ? 'dp-affix-pre' : 'dp-affix-post') },
        h('span', { 'aria-hidden': 'true' }, opts.prefix || opts.suffix), input);
    }
    var wrap = h('div', { className: 'field' + (opts.span ? ' dp-span' : '') },
      h('label', { for: id }, label, opts.optional ? [' ', h('span', { className: 'optional' }, opts.optional)] : null),
      opts.hint ? h('p', { className: 'dp-hint', id: hintId }, opts.hint) : null,
      control,
      error
    );
    return { wrap: wrap, input: input, error: error };
  }

  function setError(f, message) {
    f.error.textContent = message || '';
    f.error.hidden = !message;
    if (message) f.input.setAttribute('aria-invalid', 'true');
    else f.input.removeAttribute('aria-invalid');
  }

  function build() {
    var D = C.debts;

    el.flash = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    el.live = h('p', { className: 'visually-hidden', role: 'status', 'aria-live': 'polite' });

    var intro = h('section', { className: 'dp-intro' },
      h('p', { className: 'eyebrow' }, C.intro.eyebrow),
      h('h1', { tabindex: '-1', id: 'dp-title' }, C.intro.title),
      h('p', { className: 'lead' }, C.intro.lead),
      h('p', { className: 'small muted' }, C.intro.privacy),
      el.flash
    );

    var counts = h('section', { className: 'card card-quiet dp-counts', 'aria-labelledby': 'dp-counts-heading' },
      h('h2', { className: 'h3', id: 'dp-counts-heading' }, C.counts.heading),
      h('p', null, C.counts.yes),
      h('p', null, C.counts.no),
      h('p', null, C.counts.pcp)
    );

    // The list and the add form
    el.list = h('ul', { className: 'dp-debt-list', role: 'list' });
    el.listStatus = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    el.empty = h('p', { className: 'muted dp-empty' }, D.empty);
    el.exampleArea = h('div', { className: 'dp-example' },
      h('p', { className: 'small muted' }, D.exampleHint),
      h('button', { type: 'button', className: 'btn btn-secondary', onClick: loadExample }, D.example)
    );

    el.name = field('dp-name', D.name, { maxlength: S.MAX_NAME, placeholder: D.namePlaceholder, span: true });
    el.balance = field('dp-balance', D.balance, { inputmode: 'decimal', prefix: '£', hint: D.balanceHint });
    el.minimum = field('dp-minimum', D.minimum, { inputmode: 'decimal', prefix: '£', hint: D.minimumHint });
    el.apr = field('dp-apr', D.apr, { inputmode: 'decimal', suffix: '%', hint: D.aprHint, optional: D.optional });
    el.name.input.setAttribute('autocomplete', 'off');

    el.formHeading = h('h3', { id: 'dp-form-heading', tabindex: '-1' }, D.addHeading);
    el.addButton = h('button', { type: 'submit', className: 'btn btn-primary' }, D.add);
    el.cancelButton = h('button', { type: 'button', className: 'btn btn-secondary', hidden: true, onClick: cancelEdit }, D.cancel);
    el.formError = h('p', { className: 'dp-error', hidden: true });
    el.full = h('p', { className: 'dp-full', hidden: true }, fill(D.full, { max: S.MAX_DEBTS }));

    el.form = h('form', { className: 'dp-add', novalidate: true, 'aria-labelledby': 'dp-form-heading' },
      el.formHeading,
      h('div', { className: 'dp-fields' }, el.name.wrap, el.balance.wrap, el.minimum.wrap, el.apr.wrap),
      el.formError,
      h('div', { className: 'button-row' }, el.addButton, el.cancelButton)
    );
    el.form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitDebt(true);
    });

    var debtsCard = h('section', { className: 'card', 'aria-labelledby': 'dp-debts-heading' },
      h('h2', { id: 'dp-debts-heading', tabindex: '-1' }, D.heading),
      h('p', { className: 'muted' }, D.intro),
      el.empty,
      el.list,
      el.listStatus,
      el.exampleArea,
      el.full,
      el.form
    );

    // The extra, and the warning signs
    el.extra = field('dp-extra', C.extra.label, { inputmode: 'decimal', prefix: '£', hint: C.extra.hint });
    el.extra.input.addEventListener('input', function () {
      state.extra = el.extra.input.value;
      state.example = false;
      setError(el.extra, S.checkExtra(state.extra).error ? C.extra.invalid : '');
      save();
      scheduleRefresh();
    });

    el.signs = h('fieldset', { className: 'checks dp-signs', 'aria-describedby': 'dp-signs-help' },
      h('legend', { className: 'h3' }, C.signs.heading),
      h('p', { className: 'muted', id: 'dp-signs-help' }, C.signs.help)
    );
    C.signs.options.forEach(function (opt) {
      var input = h('input', { type: 'checkbox', name: 'dp-signs', value: opt.value });
      input.addEventListener('change', function () {
        state.signs = S.WARNING_SIGNS.filter(function (v) {
          return !!el.signs.querySelector('input[value="' + v + '"]:checked');
        });
        save();
        refresh();
      });
      el.signs.appendChild(h('label', { className: 'check' }, input, h('span', null, opt.label)));
    });

    var moreCard = h('section', { className: 'card', 'aria-label': C.extra.label },
      el.extra.wrap,
      el.signs
    );

    el.showButton = h('button', { type: 'button', className: 'btn btn-primary btn-block', onClick: showPlan }, C.show);
    el.showError = h('p', { className: 'form-status is-error', role: 'status', 'aria-live': 'polite' });
    var showRow = h('div', { className: 'dp-show' }, el.showButton, el.showError);

    // Results: the part that's redrawn whenever the numbers change...
    el.resultsMain = h('div', { className: 'stack' });
    // ...and the parts that stay put, so nothing typed in them is lost.
    el.keep = keepCard();
    el.appCard = appCard();
    el.email = emailCard();
    el.end = h('div', { className: 'result-end' },
      h('button', { type: 'button', className: 'btn btn-secondary', onClick: editDebts }, R.edit),
      h('button', { type: 'button', className: 'link-button', onClick: function () { clearAll(); } }, R.clear)
    );
    el.results = h('div', { className: 'stack dp-results', id: 'dp-results', hidden: true },
      el.resultsMain, el.keep, el.appCard, el.email, el.end
    );

    app.textContent = '';
    MIM.append(app, h('div', { className: 'stack' }, intro, counts, debtsCard, moreCard, showRow, el.results, el.live));
  }

  /* ---------------- The list of debts ---------------- */

  function debtMeta(d) {
    var D = C.debts;
    return [
      pounds(d.balance),
      fill(D.perMonth, { amount: pounds(d.minimum) }),
      d.apr === null ? D.noRate : fill(D.rate, { rate: rateText(d.apr) })
    ].join(' · ');
  }

  function renderList() {
    var D = C.debts;
    el.list.textContent = '';
    state.debts.forEach(function (d) {
      var editBtn = h('button', { type: 'button', className: 'link-button', dataset: { edit: d.id }, onClick: function () { startEdit(d.id); } },
        D.edit, h('span', { className: 'visually-hidden' }, ' ' + d.name));
      var removeBtn = h('button', { type: 'button', className: 'link-button', onClick: function () { removeDebt(d.id); } },
        D.remove, h('span', { className: 'visually-hidden' }, ' ' + d.name));
      el.list.appendChild(h('li', { className: 'dp-debt' + (editingId === d.id ? ' is-editing' : '') },
        h('span', { className: 'dp-debt-text' },
          h('span', { className: 'dp-debt-name' }, d.name),
          h('span', { className: 'dp-debt-meta' }, debtMeta(d))
        ),
        h('span', { className: 'dp-debt-actions' }, editBtn, removeBtn)
      ));
    });
    var count = state.debts.length;
    el.list.hidden = !count;
    el.empty.hidden = !!count;
    el.exampleArea.hidden = !!count;
    var full = count >= S.MAX_DEBTS && !editingId;
    el.full.hidden = !full;
    el.form.hidden = full;
  }

  function formValues() {
    return {
      name: el.name.input.value,
      balance: el.balance.input.value,
      minimum: el.minimum.input.value,
      apr: el.apr.input.value
    };
  }

  function formHasValues() {
    var v = formValues();
    return !!(v.name.trim() || v.balance.trim() || v.minimum.trim() || v.apr.trim());
  }

  function resetForm() {
    editingId = null;
    [el.name, el.balance, el.minimum, el.apr].forEach(function (f) { f.input.value = ''; setError(f, ''); });
    el.formError.hidden = true;
    el.formHeading.textContent = C.debts.addHeading;
    el.addButton.textContent = C.debts.add;
    el.cancelButton.hidden = true;
  }

  // Adds the debt in the form (or saves the one being edited).
  // Returns false and points at the problem if something's not right.
  function submitDebt(moveFocus) {
    var D = C.debts;
    var E = D.errors;
    var checked = S.checkDebt(formValues());
    var errors = checked.errors || {};
    setError(el.name, errors.name ? E.name : '');
    setError(el.balance, errors.balance ? (errors.balance === 'required' ? E.balanceRequired : E.balanceInvalid) : '');
    setError(el.minimum, errors.minimum ? (errors.minimum === 'required' ? E.minimumRequired : E.minimumInvalid) : '');
    setError(el.apr, errors.apr ? E.aprInvalid : '');
    if (!checked.debt) {
      el.formError.textContent = E.fixAbove;
      el.formError.hidden = false;
      var first = [el.name, el.balance, el.minimum, el.apr].filter(function (f) { return f.input.getAttribute('aria-invalid'); })[0];
      if (first) first.input.focus();
      return false;
    }
    el.formError.hidden = true;
    el.flash.textContent = '';

    var debt = checked.debt;
    var message;
    var editedId = editingId;
    if (editedId) {
      debt.id = editedId;
      state.debts = state.debts.map(function (d) { return d.id === editedId ? debt : d; });
      message = fill(D.saved, { name: debt.name });
    } else {
      if (state.debts.length >= S.MAX_DEBTS) return false;
      debt.id = newId();
      state.debts.push(debt);
      message = fill(D.added, { name: debt.name });
    }
    state.example = false;
    el.showError.textContent = '';
    resetForm();
    save();
    renderList();
    el.listStatus.textContent = message;
    refresh();

    if (moveFocus) {
      var editBtn = editedId && el.list.querySelector('[data-edit="' + editedId + '"]');
      if (editBtn) editBtn.focus();
      else if (!el.form.hidden) el.name.input.focus();
      else document.getElementById('dp-debts-heading').focus();
    }
    return true;
  }

  function startEdit(id) {
    var d = state.debts.filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    resetForm();
    editingId = id;
    el.name.input.value = d.name;
    el.balance.input.value = plainNumber(d.balance);
    el.minimum.input.value = plainNumber(d.minimum);
    el.apr.input.value = d.apr === null ? '' : rateText(d.apr);
    el.formHeading.textContent = fill(C.debts.editHeading, { name: d.name });
    el.addButton.textContent = C.debts.save;
    el.cancelButton.hidden = false;
    el.listStatus.textContent = '';
    renderList();
    el.name.input.focus();
  }

  function cancelEdit() {
    var id = editingId;
    resetForm();
    renderList();
    var btn = id && el.list.querySelector('[data-edit="' + id + '"]');
    if (btn) btn.focus();
  }

  function removeDebt(id) {
    var d = state.debts.filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    if (editingId === id) resetForm();
    state.debts = state.debts.filter(function (x) { return x.id !== id; });
    state.example = false;
    if (!state.debts.length) state.shown = false;
    save();
    renderList();
    el.listStatus.textContent = fill(C.debts.removed, { name: d.name });
    refresh();
    document.getElementById('dp-debts-heading').focus();
  }

  function loadExample() {
    var X = C.example;
    resetForm();
    state.debts = X.debts.map(function (raw) {
      var d = S.checkDebt(raw).debt;
      d.id = newId();
      return d;
    });
    state.extra = X.extra;
    state.example = true;
    state.shown = true;
    el.extra.input.value = X.extra;
    setError(el.extra, '');
    el.listStatus.textContent = '';
    save();
    renderList();
    renderResults(true);
  }

  /* ---------------- Showing the plan ---------------- */

  function showPlan() {
    el.showError.textContent = '';
    if (formHasValues() && !submitDebt(false)) return;
    if (!state.debts.length) {
      el.showError.textContent = C.needDebt;
      el.name.input.focus();
      return;
    }
    if (S.checkExtra(state.extra).error) {
      setError(el.extra, C.extra.invalid);
      el.extra.input.focus();
      return;
    }
    state.shown = true;
    save();
    renderResults(true);
  }

  function editDebts() {
    var heading = document.getElementById('dp-debts-heading');
    heading.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    heading.focus({ preventScroll: true });
  }

  // Redraw the results after a change, if they're showing.
  function refresh() {
    clearTimeout(refreshTimer);
    if (!state.shown) return;
    if (!state.debts.length) { hideResults(); return; }
    if (S.checkExtra(state.extra).error) return;
    renderResults(false);
    el.live.textContent = fill(C.updated, { headline: headlineText(current.plan, current.start).replace(/^./, function (c) { return c.toLowerCase(); }) });
  }
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 350);
  }

  function hideResults() {
    state.shown = false;
    destroyChart();
    el.results.hidden = true;
    el.resultsMain.textContent = '';
    current = null;
  }

  function headlineText(plan, start) {
    if (plan.budget === 0) return R.noBudgetTitle;
    if (!plan.finished) return R.notFinished.title;
    return fill(R.debtFreeBy, { date: S.monthName(S.monthOfPlan(start, plan.months)) });
  }

  function renderResults(moveFocus) {
    var input = { debts: state.debts, extra: S.checkExtra(state.extra).extra || 0 };
    var plan = S.simulate(input);
    var start = S.planStart(new Date());
    current = { input: input, plan: plan, start: start };

    destroyChart();
    el.resultsMain.textContent = '';
    var nodes = [];
    var needsHelp = state.signs.length > 0 || (!plan.finished && plan.budget > 0);
    if (needsHelp) nodes.push(helpBox(state.signs.length ? R.help.body : R.help.bodyUnfinished));
    if (state.example) nodes.push(h('p', { className: 'heading-for' }, C.example.note));
    nodes.push(heroCard(plan, start));
    if (plan.budget > 0) nodes.push(orderCard(plan, start), chartCard(plan, start), whatIfCard());
    MIM.append(el.resultsMain, nodes);

    el.results.hidden = false;
    el.keep.hidden = plan.budget === 0;
    updateWhatIf();
    drawChart();

    if (moveFocus) {
      var target = el.resultsMain.querySelector('[data-focus-first]') || el.resultsMain.querySelector('h2');
      if (target) {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        target.focus({ preventScroll: true });
      }
    }
  }

  function helpBox(body) {
    return h('section', { className: 'care-box', 'aria-labelledby': 'dp-care-heading' },
      h('h2', { id: 'dp-care-heading', tabindex: '-1', 'data-focus-first': true }, R.help.heading),
      h('p', null, body),
      h('ul', { className: 'help-list', role: 'list' }, (config.debtHelp || []).map(function (org) {
        return h('li', null, MIM.extLink(org.url, org.name), h('p', null, org.description));
      })),
      h('p', null, h('strong', null, R.help.after))
    );
  }

  function heroCard(plan, start) {
    var nodes = [h('p', { className: 'eyebrow' }, R.eyebrow)];
    var startName = S.monthName(start);

    if (plan.budget === 0) {
      nodes.push(h('h2', { className: 'dp-headline', id: 'dp-headline', tabindex: '-1' }, R.noBudgetTitle));
      nodes.push(h('p', null, R.noBudget));
    } else if (!plan.finished) {
      nodes.push(h('h2', { className: 'dp-headline', id: 'dp-headline', tabindex: '-1' }, R.notFinished.title));
      nodes.push(h('p', null, R.notFinished.body));
    } else {
      var date = S.monthName(S.monthOfPlan(start, plan.months));
      var parts = R.debtFreeBy.split('{date}');
      nodes.push(h('h2', { className: 'dp-headline', id: 'dp-headline', tabindex: '-1' },
        parts[0], h('span', { className: 'dp-headline-date' }, date), parts[1] || ''));
      nodes.push(h('p', { className: 'dp-away' }, plan.months === 1
        ? fill(R.nextMonth, { start: startName })
        : fill(R.monthsAway, { months: monthsPhrase(plan.months), start: startName })));
    }
    if (plan.budget > 0) nodes.push(h('p', { className: 'muted' }, fill(R.budget, { amount: S.money(plan.budget) })));

    if (plan.ratesGiven !== 'none' && plan.finished && plan.totalInterest > 0) {
      nodes.push(h('div', { className: 'dp-stat' },
        h('span', { className: 'dp-stat-label' }, R.interest.label),
        h('span', { className: 'dp-stat-value' }, roundMoney(plan.totalInterest)),
        plan.ratesGiven === 'some' ? h('span', { className: 'dp-stat-note' }, R.interest.some) : null
      ));
    } else if (plan.ratesGiven === 'none' && plan.finished) {
      nodes.push(h('p', { className: 'small muted' }, R.interest.none));
    }

    plan.order.forEach(function (d) {
      if (!d.growing) return;
      var text = fill(plan.finished && d.clearMonth ? R.growing : R.growingStuck, {
        name: d.name, minimum: S.money(d.minimum), interest: S.money(d.firstInterest)
      });
      nodes.push(h('p', { className: 'dp-warning' }, text));
    });

    return h('section', { className: 'card dp-hero', 'aria-labelledby': 'dp-headline' }, nodes);
  }

  function orderCard(plan, start) {
    var O = R.order;
    // The debt that clears last (or the last of those clearing in the final month).
    var lastIndex = -1;
    plan.order.forEach(function (d, i) { if (plan.finished && d.clearMonth === plan.months) lastIndex = i; });
    var list = h('ol', { className: 'ladder dp-order', role: 'list' }, plan.order.map(function (d, i) {
      var clears = d.clearMonth ? fill(O.clears, { date: S.monthName(S.monthOfPlan(start, d.clearMonth)) }) : O.notCleared;
      var next = d.rollTo !== null ? plan.order[d.rollTo] : null;
      var after = null;
      if (d.clearMonth && next) after = fill(O.roll, { amount: S.money(d.rollAmount), name: next.name });
      else if (i === lastIndex) after = O.last;
      return h('li', { className: i === 0 ? 'is-current' : '', 'aria-current': i === 0 ? 'step' : null },
        h('span', { className: 'ladder-num', 'aria-hidden': 'true' }, String(i + 1)),
        h('span', null,
          h('span', { className: 'ladder-title' }, d.name),
          h('span', { className: 'ladder-desc' }, S.money(d.startBalance) + ' · ' + clears),
          after ? h('span', { className: 'ladder-desc' }, after) : null,
          d.early ? h('span', { className: 'ladder-desc' }, O.early) : null,
          i === 0 ? h('span', { className: 'ladder-tag' }, O.startHere) : null
        )
      );
    }));
    return h('section', { className: 'card', 'aria-labelledby': 'dp-order-heading' },
      h('h2', { className: 'h3', id: 'dp-order-heading' }, O.heading),
      h('p', { className: 'muted' }, O.why),
      list,
      h('p', { className: 'faith-line' }, R.faith)
    );
  }

  /* ---------------- The chart ---------------- */

  function chartCard(plan, start) {
    var CH = R.chart;
    var startLabel = S.money(plan.totalStart, true);
    var summary = plan.finished
      ? fill(CH.summary, { start: startLabel, date: S.monthName(S.monthOfPlan(start, plan.months)) })
      : fill(CH.summaryUnfinished, { start: startLabel });
    el.canvas = h('canvas', { role: 'img', 'aria-label': summary });
    el.chartWrap = h('div', { className: 'dp-chart' }, el.canvas);
    el.chartFailed = h('p', { className: 'small muted', hidden: true }, CH.failed);
    el.chartTable = h('details', { className: 'steps-details dp-table-details' },
      h('summary', null, CH.table),
      h('div', { className: 'steps-details-body' }, numbersTable(plan, start))
    );
    return h('section', { className: 'card', 'aria-labelledby': 'dp-chart-heading' },
      h('h2', { className: 'h3', id: 'dp-chart-heading' }, CH.heading),
      h('p', { className: 'muted small' }, CH.caption),
      el.chartWrap,
      el.chartFailed,
      el.chartTable
    );
  }

  function numbersTable(plan, start) {
    var CH = R.chart;
    var last = plan.timeline.length - 1;
    var step = last <= 24 ? 3 : (last <= 60 ? 6 : 12);
    var rows = [];
    for (var i = 0; i <= last; i += step) rows.push(i);
    if (rows[rows.length - 1] !== last) rows.push(last);
    return h('table', { className: 'dp-table' },
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, CH.tableMonth), h('th', { scope: 'col' }, CH.tableLeft))),
      h('tbody', null, rows.map(function (i) {
        return h('tr', null,
          h('td', null, i === 0 ? CH.today : S.monthName(S.monthOfPlan(start, i))),
          h('td', null, S.money(plan.timeline[i], true)));
      }))
    );
  }

  function loadChartLibrary() {
    if (window.Chart) return Promise.resolve(window.Chart);
    if (chartLoading) return chartLoading;
    var lib = (config.libraries && config.libraries.chartjs) || {};
    chartLoading = new Promise(function (resolve, reject) {
      if (!lib.src) { reject(new Error('No chart library configured')); return; }
      var script = document.createElement('script');
      var timer = setTimeout(function () { reject(new Error('Chart library took too long to load')); }, 20000);
      script.src = lib.src;
      if (lib.integrity) {
        script.integrity = lib.integrity;
        script.crossOrigin = 'anonymous';
      }
      script.referrerPolicy = 'no-referrer';
      script.onload = function () {
        clearTimeout(timer);
        if (window.Chart) resolve(window.Chart);
        else reject(new Error('Chart library loaded but not available'));
      };
      script.onerror = function () { clearTimeout(timer); reject(new Error('Chart library failed to load')); };
      document.head.appendChild(script);
    });
    // If it fails, we don't keep asking: the table does the job until the page is reloaded.
    return chartLoading;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function withAlpha(colour, alpha) {
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(colour);
    if (!m) return 'transparent';
    var hex = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    var n = parseInt(hex, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function destroyChart() {
    if (chart) { chart.destroy(); chart = null; }
  }

  // Draws a thin vertical line at the month the pointer is over.
  var crosshair = {
    id: 'dpCrosshair',
    afterDatasetsDraw: function (c) {
      var active = c.tooltip && c.tooltip.getActiveElements ? c.tooltip.getActiveElements() : [];
      if (!active.length) return;
      var x = active[0].element.x;
      var ctx = c.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, c.chartArea.top);
      ctx.lineTo(x, c.chartArea.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = cssVar('--text-muted');
      ctx.stroke();
      ctx.restore();
    }
  };

  function drawChart() {
    if (!current || !el.canvas || current.plan.budget === 0) return;
    var canvas = el.canvas;
    loadChartLibrary().then(function (Chart) {
      if (!current || el.canvas !== canvas || !canvas.isConnected) return;
      destroyChart();
      var plan = current.plan;
      var start = current.start;
      var colours = {
        line: cssVar('--primary'),
        alt: cssVar('--accent'),
        text: cssVar('--text-muted'),
        grid: cssVar('--border'),
        surface: cssVar('--surface')
      };
      var labels = plan.timeline.map(function (v, i) {
        return i === 0 ? R.chart.today : S.shortMonth(S.monthOfPlan(start, i));
      });
      // Which debts clear in each month, for the dots and the tooltip.
      var clearedIn = {};
      plan.order.forEach(function (d) {
        if (d.clearMonth) (clearedIn[d.clearMonth] = clearedIn[d.clearMonth] || []).push(d.name);
      });
      var radii = plan.timeline.map(function (v, i) { return clearedIn[i] ? 5 : 0; });

      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: R.chart.label,
            data: plan.timeline.map(function (p) { return p / 100; }),
            borderColor: colours.line,
            backgroundColor: withAlpha(colours.line, 0.12),
            fill: 'origin',
            borderWidth: 2,
            borderJoinStyle: 'round',
            borderCapStyle: 'round',
            tension: 0,
            pointRadius: radii,
            pointHoverRadius: radii.map(function (r) { return r ? 6 : 4; }),
            pointBackgroundColor: colours.line,
            pointBorderColor: colours.surface,
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: reduceMotion || chartDrawn ? false : { duration: 500 },
          interaction: { mode: 'index', intersect: false },
          layout: { padding: { top: 8, right: 4 } },
          scales: {
            x: {
              grid: { display: false },
              border: { color: colours.grid },
              ticks: { color: colours.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }
            },
            y: {
              beginAtZero: true,
              grid: { color: colours.grid, lineWidth: 1 },
              border: { display: false },
              ticks: {
                color: colours.text, maxTicksLimit: 6,
                callback: function (value) { return S.money(Math.round(value * 100), true); }
              }
            }
          },
          plugins: {
            legend: {
              display: false,
              labels: {
                color: colours.text,
                usePointStyle: true,
                // Each key is a short stroke in the line's own colour and dash.
                generateLabels: function (c) {
                  return c.data.datasets.map(function (ds, i) {
                    return {
                      text: ds.label, datasetIndex: i, pointStyle: 'line', lineWidth: 2,
                      strokeStyle: ds.borderColor, fillStyle: ds.borderColor,
                      lineDash: ds.borderDash || [], fontColor: colours.text, hidden: !c.isDatasetVisible(i)
                    };
                  });
                }
              }
            },
            tooltip: {
              displayColors: true,
              usePointStyle: true,
              callbacks: {
                title: function (items) {
                  var i = items[0].dataIndex;
                  return i === 0 ? R.chart.today : S.monthName(S.monthOfPlan(start, i));
                },
                label: function (item) {
                  return ' ' + S.money(Math.round(item.raw * 100), true) + '  ' + item.dataset.label;
                },
                labelPointStyle: function () { return { pointStyle: 'line', rotation: 0 }; },
                labelColor: function (item) {
                  return { borderColor: item.dataset.borderColor, backgroundColor: item.dataset.borderColor, borderWidth: 2, borderDash: item.dataset.borderDash || [] };
                },
                afterBody: function (items) {
                  var names = clearedIn[items[0].dataIndex] || [];
                  return names.map(function (n) { return fill(R.chart.cleared, { name: n }); });
                }
              }
            }
          }
        },
        plugins: [crosshair]
      });
      chartDrawn = true;
      el.chartFailed.hidden = true;
      setAltLine();
    }).catch(function (err) {
      if (window.console) console.warn('MIM: chart could not load, showing the table instead.', err);
      if (el.canvas !== canvas) return;
      el.chartWrap.hidden = true;
      el.chartFailed.hidden = false;
      el.chartTable.open = true;
    });
  }

  // The dashed "with £50 more" line, when a what-if button is pressed.
  function setAltLine() {
    if (!chart || !current) return;
    var datasets = chart.data.datasets;
    datasets.length = 1;
    if (whatIf) {
      var alt = S.simulate({ debts: current.input.debts, extra: current.input.extra + whatIf });
      var colour = cssVar('--accent');
      datasets.push({
        label: fill(R.chart.withMore, { amount: pounds(whatIf) }),
        data: alt.timeline.map(function (p) { return p / 100; }),
        borderColor: colour,
        backgroundColor: colour,
        borderWidth: 2,
        borderDash: [6, 4],
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4
      });
    }
    chart.options.plugins.legend.display = datasets.length > 1;
    chart.update(reduceMotion ? 'none' : undefined);
  }

  /* ---------------- What if I found a bit more? ---------------- */

  function whatIfCard() {
    var W = R.whatIf;
    el.whatIfButtons = WHAT_IFS.map(function (amount) {
      return h('button', {
        type: 'button', className: 'btn btn-secondary', 'aria-pressed': 'false', dataset: { amount: String(amount) },
        onClick: function () {
          whatIf = whatIf === amount ? null : amount;
          updateWhatIf();
          setAltLine();
        }
      }, fill(W.button, { amount: pounds(amount) }));
    });
    el.whatIfResult = h('p', { className: 'dp-whatif-result', role: 'status', 'aria-live': 'polite' });
    return h('section', { className: 'card dp-whatif', 'aria-labelledby': 'dp-whatif-heading' },
      h('h2', { className: 'h3', id: 'dp-whatif-heading' }, W.heading),
      h('p', { className: 'muted' }, W.intro),
      h('div', { className: 'button-row' }, el.whatIfButtons),
      el.whatIfResult
    );
  }

  function updateWhatIf() {
    if (!current || !el.whatIfButtons || !el.whatIfResult.isConnected) return;
    var W = R.whatIf;
    el.whatIfButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.amount) === whatIf));
    });
    if (!whatIf) { el.whatIfResult.textContent = ''; return; }

    var w = S.whatIf(current.input, whatIf);
    var amount = pounds(whatIf);
    var date = S.monthName(S.monthOfPlan(current.start, w.alt.months));
    var text;
    if (!w.alt.finished) text = fill(W.stillNot, { amount: amount });
    else if (!w.base.finished) text = fill(W.nowFinishes, { amount: amount, date: date });
    else if (w.monthsSaved > 0) text = fill(W.sooner, { amount: amount, date: date, saved: monthCount(w.monthsSaved) });
    else text = fill(W.same, { amount: amount });
    if (w.base.finished && w.alt.finished && w.interestSaved >= 100) {
      text += ' ' + fill(W.interestSaved, { interest: S.money(w.interestSaved, true) });
    }
    el.whatIfResult.textContent = text;
  }

  // Redraw the chart in the right colours if the phone switches light/dark.
  if (window.matchMedia) {
    var scheme = window.matchMedia('(prefers-color-scheme: dark)');
    var onScheme = function () { if (chart) drawChart(); };
    if (scheme.addEventListener) scheme.addEventListener('change', onScheme);
    else if (scheme.addListener) scheme.addListener(onScheme);
  }

  /* ---------------- Keep your plan (PDF) ---------------- */

  function keepCard() {
    var K = R.keep;
    var nameField = field('dp-pdf-name', K.name, { hint: K.nameHint, optional: C.debts.optional, maxlength: S.MAX_NAME });
    nameField.input.setAttribute('autocomplete', 'given-name');
    el.pdfName = nameField.input;
    el.pdfName.addEventListener('input', function () {
      state.name = el.pdfName.value.slice(0, S.MAX_NAME);
      save();
    });
    var status = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    var btn = h('button', { type: 'button', className: 'btn btn-primary' }, K.button);
    btn.addEventListener('click', function () {
      if (!current) return;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      status.textContent = K.working;
      var today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      var name = state.name.trim();
      window.MIMPdf.download(fitPdf({
        filename: C.pdf.filename,
        eyebrow: C.pdf.eyebrow,
        title: C.pdf.title,
        subtitle: (name ? name + '  ·  ' : '') + today
      }, current.plan, current.start)).then(function (how) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        status.textContent = how === 'pdf' ? K.done : K.printed;
      });
    });
    return h('section', { className: 'card', 'aria-labelledby': 'dp-keep-heading' },
      h('h2', { className: 'h3', id: 'dp-keep-heading' }, K.heading),
      h('p', null, K.body),
      nameField.wrap,
      h('div', { className: 'button-row' }, btn),
      status
    );
  }

  // Roomier rows for a few debts, tighter ones for lots, so it's always one page.
  // The last one also drops the two hint lines, for devices with bigger fonts.
  var DENSITIES = ['is-roomy', '', 'is-many', 'is-dense', 'is-dense is-squeezed'];
  var PAGE_HEIGHT = 1120; // A4 at 96dpi, the same limit assets/pdf.js uses

  function sheetHeights(opts) {
    var sheet = window.MIMPdf.buildSheet(opts);
    var holder = h('div', { 'aria-hidden': 'true', style: 'position:absolute;left:-10000px;top:0;visibility:hidden;width:794px' }, sheet);
    document.body.appendChild(holder);
    var plain = sheet.offsetHeight;
    sheet.classList.add('pdf-compact');
    var compact = sheet.offsetHeight;
    document.body.removeChild(holder);
    return { plain: plain, compact: compact };
  }

  function fitPdf(opts, plan, start) {
    var count = plan.order.length;
    var first = count <= 5 ? 0 : (count <= 8 ? 1 : 2);
    var tries = DENSITIES.slice(first).map(function (density) {
      var content = pdfContent(plan, start, density);
      return { content: content, heights: sheetHeights(Object.assign({}, opts, { content: content })) };
    });
    // Keep the hint lines if tighter spacing can make room; drop them only if nothing else fits.
    var full = tries.slice(0, -1);
    var squeezed = tries[tries.length - 1];
    var pick = full.filter(function (t) { return t.heights.plain <= PAGE_HEIGHT; })[0] ||
      full.filter(function (t) { return t.heights.compact <= PAGE_HEIGHT; })[0] ||
      squeezed;
    return Object.assign({}, opts, { content: pick.content });
  }

  function pdfContent(plan, start, density) {
    var P = C.pdf;
    var prettyUrl = window.MIMPdf.prettyUrl;
    var nodes = [];

    // The big date
    var stats = [];
    if (plan.budget > 0) stats.push(fill(P.perMonth, { amount: S.money(plan.budget) }));
    stats.push(fill(P.starting, { start: S.monthName(start) }));
    if (plan.finished && plan.ratesGiven !== 'none' && plan.totalInterest > 0) {
      stats.push(fill(P.interest, { amount: roundMoney(plan.totalInterest) }));
    }
    nodes.push(h('div', { className: 'dp-pdf-hero' },
      h('div', null,
        plan.finished ? h('p', { className: 'dp-pdf-label' }, P.debtFreeBy) : null,
        h('p', { className: 'dp-pdf-date' + (plan.finished ? '' : ' is-long') },
          plan.finished ? S.monthName(S.monthOfPlan(start, plan.months)) : P.notFinished)
      ),
      h('ul', { className: 'dp-pdf-stats' }, stats.map(function (s) { return h('li', null, s); }))
    ));

    // Free help, when it's needed
    if (state.signs.length || !plan.finished) {
      var orgs = (config.debtHelp || []).map(function (org) {
        return org.name + ' (' + prettyUrl(org.url).replace(/^www\./, '').split('/')[0] + ')';
      });
      nodes.push(h('div', { className: 'pdf-callout' },
        h('p', { className: 'pdf-h2' }, R.help.heading),
        h('p', null, P.help + ' ' + orgs.join('  ·  '))
      ));
    }

    // The debts, in order, with boxes to colour in
    nodes.push(h('div', { className: 'pdf-section' },
      h('p', { className: 'pdf-h2' }, P.order),
      h('p', { className: 'pdf-small pdf-muted dp-pdf-hint' }, P.boxesHint),
      h('ol', { className: 'dp-pdf-debts' + (density ? ' ' + density : '') }, plan.order.map(function (d, i) {
        var boxes = [];
        for (var b = 0; b < 10; b++) boxes.push(h('span', { className: 'dp-pdf-cell' }));
        return h('li', { className: 'dp-pdf-debt' },
          h('span', { className: 'pdf-box dp-pdf-tick' }),
          h('span', { className: 'dp-pdf-num' }, String(i + 1)),
          h('span', { className: 'dp-pdf-text' },
            h('span', { className: 'dp-pdf-name' }, d.name),
            h('span', { className: 'dp-pdf-meta' },
              S.money(d.startBalance, true) + '  ·  ' + fill(P.perBox, { amount: S.money(Math.ceil(d.startBalance / 10), d.startBalance >= 100000) }))
          ),
          h('span', { className: 'dp-pdf-cells' }, boxes),
          h('span', { className: 'dp-pdf-clears' }, d.clearMonth
            ? fill(P.clears, { date: S.monthName(S.monthOfPlan(start, d.clearMonth)) })
            : P.notCleared)
        );
      }))
    ));

    // A year of check-ins
    var months = [];
    for (var m = 1; m <= 12; m++) {
      var free = plan.finished && m === plan.months;
      var after = plan.finished && m > plan.months;
      months.push(h('div', { className: 'dp-pdf-month' + (free ? ' is-free' : '') + (after ? ' is-after' : '') },
        h('span', null, S.shortMonth(S.monthOfPlan(start, m))),
        free ? h('span', { className: 'dp-pdf-free' }, P.debtFree) : h('span', { className: 'dp-pdf-cell' })
      ));
    }
    nodes.push(h('div', { className: 'pdf-section' },
      h('p', { className: 'pdf-h2' }, P.checkIn),
      h('p', { className: 'pdf-small pdf-muted dp-pdf-hint' }, P.checkInHint),
      h('div', { className: 'dp-pdf-months' }, months)
    ));

    // The pledge
    nodes.push(h('div', { className: 'dp-pdf-pledge' },
      h('p', { className: 'dp-pdf-pledge-title' }, P.pledge),
      h('p', { className: 'dp-pdf-line' }, h('span', null, P.signed), h('span', { className: 'dp-pdf-rule' })),
      h('p', { className: 'dp-pdf-line dp-pdf-line-short' }, h('span', null, P.date), h('span', { className: 'dp-pdf-rule' })),
      h('p', { className: 'dp-pdf-line dp-pdf-line-wide' },
        h('span', null, P.partner, ' ', h('span', { className: 'dp-pdf-partner-hint' }, '(' + P.partnerHint + ')')),
        h('span', { className: 'dp-pdf-rule' }))
    ));

    // Footer: one line of faith, and the app
    nodes.push(h('div', { className: 'dp-pdf-end' },
      h('p', { className: 'pdf-quote' }, P.faith),
      h('div', { className: 'pdf-app' },
        h('p', null, h('strong', null, P.app), '  ',
          h('a', { href: links.appWeb }, prettyUrl(links.appWeb))),
        h('p', { className: 'pdf-small' },
          h('a', { href: links.appIos }, 'App Store'), '  ·  ',
          h('a', { href: links.appAndroid }, 'Google Play'))
      )
    ));
    return nodes;
  }

  /* ---------------- The app and the email sign-up ---------------- */

  function appCard() {
    var A = R.app;
    return h('section', { className: 'card', 'aria-labelledby': 'dp-app-heading' },
      h('h2', { className: 'h3', id: 'dp-app-heading' }, A.heading),
      h('p', null, A.body),
      h('div', { className: 'button-row' },
        MIM.extLink(links.appIos, A.ios, 'btn btn-primary'),
        MIM.extLink(links.appAndroid, A.android, 'btn btn-primary'),
        MIM.extLink(links.appWeb, A.web, 'btn btn-secondary')
      )
    );
  }

  function emailCard() {
    var E = R.email;
    var ml = config.mailerlite || {};
    var own = ml.debtPlanner || {};
    var hidden = {};
    hidden[own.toolField || 'tool'] = own.toolValue || 'debt-planner';
    var section = MIM.emailForm({ heading: E.heading, intro: E.intro, buttonLabel: E.button, hiddenFields: hidden });

    // The shared form's wording is written for the quiz, so swap in this tool's
    // consent line and thank-you message (both set in config.js).
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

  /* ---------------- Clearing ---------------- */

  function clearAll(alreadyCleared) {
    if (!alreadyCleared) MIM.storage.remove(STORAGE_KEY);
    state = S.sanitize(null);
    whatIf = null;
    resetForm();
    el.extra.input.value = '';
    setError(el.extra, '');
    Array.prototype.forEach.call(el.signs.querySelectorAll('input'), function (i) { i.checked = false; });
    el.pdfName.value = '';
    el.listStatus.textContent = '';
    el.showError.textContent = '';
    hideResults();
    renderList();
    el.flash.textContent = R.cleared;
    var title = document.getElementById('dp-title');
    window.scrollTo(0, 0);
    if (title) title.focus({ preventScroll: true });
  }

  // The footer's "Clear my answers" button
  document.addEventListener('mim:cleared', function () { clearAll(true); });

  /* ---------------- Start ---------------- */

  build();
  state = S.sanitize(MIM.storage.get(STORAGE_KEY));
  el.extra.input.value = state.extra;
  Array.prototype.forEach.call(el.signs.querySelectorAll('input'), function (i) {
    i.checked = state.signs.indexOf(i.value) !== -1;
  });
  el.pdfName.value = state.name;
  renderList();
  if (state.shown) renderResults(false);
})();
