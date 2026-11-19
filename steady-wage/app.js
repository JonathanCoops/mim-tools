/*
 * Pay Yourself a Steady Wage: the page.
 * The sums are in logic.js, the words are in content.js, links and settings
 * are in /assets/config.js. This file just puts them on screen.
 */

(function () {
  'use strict';

  var L = window.MIMWageLogic;
  var C = window.MIM_WAGE_CONTENT;
  var MIM = window.MIM;
  var app = document.getElementById('wage-app');
  if (!app || !L || !C || !MIM) return;

  var h = MIM.h;
  var config = MIM.config;
  var links = MIM.links;
  var R = C.results;
  var STORAGE_KEY = 'mim.wage.v1';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var today = L.todayParts();
  var months = L.monthsFor(today);   // the 12 months asked about, oldest first
  var state = L.blank();
  var current = null;                // the plan on screen (from L.compute)
  var triedToShow = false;           // errors only show once someone has asked for a plan
  var refreshTimer = null;
  var el = {};

  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (match, key) {
      return values[key] !== undefined ? values[key] : match;
    });
  }
  // Whole pounds: nobody plans a wage to the penny.
  function money(pounds) { return L.formatMoney(Math.round(pounds)); }
  function monthLabel(mo) { return fill(C.income.month, { month: L.monthShort(mo.m), year: mo.y }); }
  function thisMonthKey() { return L.monthKey(today.y, today.m); }

  /* ---------------- Saving ---------------- */

  function save() {
    MIM.storage.set(STORAGE_KEY, {
      months: state.months,
      partYear: state.partYear,
      tax: state.tax,
      setAside: state.setAside,
      pot: state.pot,
      wage: state.wage,
      wageSet: state.wageSet,
      name: state.name,
      shown: state.shown,
      example: state.example,
      savedAt: new Date().toISOString()
    });
  }

  /* ---------------- Building the page ---------------- */

  function field(id, label, opts) {
    opts = opts || {};
    var hintId = opts.hint ? id + '-hint' : null;
    var errorId = id + '-error';
    var input = h('input', {
      id: id, type: 'text', inputmode: opts.inputmode || null, autocomplete: 'off',
      maxlength: opts.maxlength || null, spellcheck: opts.inputmode ? 'false' : null,
      'aria-describedby': [hintId, opts.noError ? null : errorId].filter(Boolean).join(' ') || null
    });
    var error = opts.noError ? null : h('p', { className: 'sw-error', id: errorId, hidden: true });
    var control = input;
    if (opts.prefix || opts.suffix) {
      control = h('div', { className: 'sw-affix ' + (opts.prefix ? 'sw-affix-pre' : 'sw-affix-post') },
        h('span', { 'aria-hidden': 'true' }, opts.prefix || opts.suffix), input);
    }
    var wrap = h('div', { className: 'field' + (opts.className ? ' ' + opts.className : '') },
      h('label', { for: id }, label, opts.optional ? [' ', h('span', { className: 'optional' }, opts.optional)] : null),
      opts.hint ? h('p', { className: 'sw-hint', id: hintId }, opts.hint) : null,
      control,
      error
    );
    return { wrap: wrap, input: input, error: error };
  }

  function setError(f, message) {
    if (f.error) {
      f.error.textContent = message || '';
      f.error.hidden = !message;
    }
    if (message) f.input.setAttribute('aria-invalid', 'true');
    else f.input.removeAttribute('aria-invalid');
  }

  function changed() {
    state.example = false;
    save();
    scheduleRefresh();
  }

  function build() {
    var I = C.income;
    var T = C.tax;
    var P = C.pot;

    el.flash = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    el.live = h('p', { className: 'visually-hidden', role: 'status', 'aria-live': 'polite' });

    var intro = h('section', { className: 'sw-intro band intro-band' },
      h('p', { className: 'eyebrow' }, C.intro.eyebrow),
      h('h1', { className: 'display', tabindex: '-1', id: 'sw-title' }, C.intro.title),
      h('p', { className: 'lead' }, C.intro.lead),
      h('p', { className: 'small muted' }, C.intro.privacy),
      el.flash
    );

    var how = h('section', { className: 'card card-quiet sw-how', 'aria-labelledby': 'sw-how-heading' },
      h('h2', { className: 'h3', id: 'sw-how-heading' }, C.how.heading),
      h('p', null, C.how.who),
      h('ol', { className: 'sw-how-steps' }, C.how.steps.map(function (text) { return h('li', null, text); })),
      h('p', null, C.how.after)
    );

    // What landed: one box for each of the last 12 months
    el.months = {};
    var grid = h('div', { className: 'sw-months' }, months.map(function (mo) {
      var f = field('sw-month-' + mo.key, monthLabel(mo), { inputmode: 'decimal', prefix: '£', maxlength: L.MAX.money, noError: true, className: 'sw-month' });
      f.input.setAttribute('aria-describedby', 'sw-income-error');
      f.input.addEventListener('input', function () {
        var value = f.input.value;
        if (value.trim() === '') delete state.months[mo.key];
        else state.months[mo.key] = value;
        changed();
      });
      el.months[mo.key] = f;
      return f.wrap;
    }));
    el.incomeError = h('p', { className: 'sw-error', id: 'sw-income-error', hidden: true });

    el.partYear = h('input', { type: 'checkbox', id: 'sw-part-year' });
    el.partYear.addEventListener('change', function () {
      state.partYear = el.partYear.checked;
      changed();
      refresh();
    });
    var partYear = h('label', { className: 'check sw-part-year' }, el.partYear,
      h('span', null, I.partYear, h('span', { className: 'sw-check-hint' }, I.partYearHint)));

    el.exampleArea = h('div', { className: 'sw-example' },
      h('p', { className: 'small muted' }, I.exampleHint),
      h('button', { type: 'button', className: 'btn btn-secondary', onClick: loadExample }, I.example)
    );

    var incomeCard = h('section', { className: 'card', 'aria-labelledby': 'sw-income-heading' },
      h('h2', { id: 'sw-income-heading', tabindex: '-1' }, I.heading),
      h('p', { className: 'muted' }, I.intro + ' ', h('strong', null, I.zero)),
      grid,
      el.incomeError,
      partYear,
      el.exampleArea
    );

    // Tax and costs
    el.taxInputs = {};
    function taxChoice(value, label, hint) {
      var input = h('input', { type: 'radio', name: 'sw-tax', value: value, 'aria-describedby': 'sw-tax-error' });
      input.addEventListener('change', function () {
        if (!input.checked) return;
        state.tax = value;
        showSetAside();
        changed();
        refresh();
      });
      el.taxInputs[value] = input;
      return h('label', { className: 'check' }, input, h('span', null, label, h('span', { className: 'sw-check-hint' }, hint)));
    }
    el.taxError = h('p', { className: 'sw-error', id: 'sw-tax-error', hidden: true });
    el.setAside = field('sw-set-aside', T.setAside, { inputmode: 'decimal', suffix: '%', maxlength: L.MAX.percent, hint: T.setAsideHint, className: 'sw-narrow' });
    el.setAside.input.addEventListener('input', function () {
      state.setAside = el.setAside.input.value;
      changed();
    });
    el.setAsideArea = h('div', { className: 'sw-set-aside', hidden: true },
      el.setAside.wrap,
      MIM.isSet(links.hmrcTaxEstimate) ? h('p', { className: 'small' }, MIM.extLink(links.hmrcTaxEstimate, T.hmrc)) : null
    );
    var taxCard = h('section', { className: 'card', 'aria-labelledby': 'sw-tax-heading' },
      h('h2', { className: 'h3', id: 'sw-tax-heading' }, T.heading),
      h('fieldset', { className: 'checks sw-tax' },
        h('legend', null, T.legend),
        taxChoice('after', T.after, T.afterHint),
        taxChoice('before', T.before, T.beforeHint)
      ),
      el.taxError,
      el.setAsideArea
    );

    // The pot, and the wage for anyone who already pays themselves one
    el.pot = field('sw-pot', P.label, { inputmode: 'decimal', prefix: '£', maxlength: L.MAX.money, hint: P.hint, className: 'sw-narrow' });
    el.pot.input.addEventListener('input', function () {
      state.pot = el.pot.input.value;
      changed();
    });
    el.wage = field('sw-wage', P.wage, { inputmode: 'decimal', prefix: '£', maxlength: L.MAX.money, hint: P.wageHint, className: 'sw-narrow' });
    el.wage.input.addEventListener('input', function () {
      state.wage = el.wage.input.value;
      state.wageSet = '';   // typed by hand, so the planner reviews it straight away
      changed();
    });
    el.wageArea = h('div', { className: 'sw-wage-area', hidden: true }, el.wage.wrap);
    el.already = h('button', { type: 'button', className: 'link-button', onClick: function () { showWage(true); el.wage.input.focus(); } }, P.already);
    var potCard = h('section', { className: 'card', 'aria-labelledby': 'sw-pot-heading' },
      h('h2', { className: 'h3', id: 'sw-pot-heading' }, P.heading),
      el.pot.wrap,
      el.already,
      el.wageArea
    );

    el.showButton = h('button', { type: 'button', className: 'btn btn-primary btn-block', onClick: showPlan }, C.show);
    el.showError = h('p', { className: 'form-status is-error', role: 'status', 'aria-live': 'polite' });
    var showRow = h('div', { className: 'sw-show' }, el.showButton, el.showError);

    // Results: the part that's redrawn whenever the numbers change...
    el.resultsMain = h('div', { className: 'stack' });
    // ...and the parts that stay put, so nothing typed in them is lost.
    el.keep = keepCard();
    el.email = emailCard();
    el.share = MIM.shareRow({ heading: R.share.heading, message: R.share.message });
    el.end = h('div', { className: 'result-end' },
      h('button', { type: 'button', className: 'btn btn-secondary', onClick: editNumbers }, R.edit),
      h('button', { type: 'button', className: 'link-button', onClick: function () { clearAll(); } }, R.clear)
    );
    el.results = h('div', { className: 'stack sw-results', id: 'sw-results', hidden: true },
      el.resultsMain, el.keep, el.email, el.share, el.end
    );

    app.textContent = '';
    MIM.append(app, h('div', { className: 'stack' }, intro, how, incomeCard, taxCard, potCard, showRow, el.results, el.live));
  }

  function showSetAside() {
    el.setAsideArea.hidden = state.tax !== 'before';
  }

  // The wage box stays out of the way until there's a wage to put in it.
  function showWage(open) {
    el.wageArea.hidden = !open;
    el.already.hidden = open;
  }

  // Puts what's saved into the boxes.
  function fillForm() {
    months.forEach(function (mo) { el.months[mo.key].input.value = state.months[mo.key] || ''; });
    el.partYear.checked = state.partYear;
    L.TAX.forEach(function (value) { el.taxInputs[value].checked = state.tax === value; });
    el.setAside.input.value = state.setAside;
    el.pot.input.value = state.pot;
    el.wage.input.value = state.wage;
    el.pdfName.value = state.name;
    showSetAside();
    showWage(state.wage.trim() !== '');
    el.exampleArea.hidden = L.hasData(state);
  }

  function loadExample() {
    var X = C.example;
    state = L.blank();
    months.forEach(function (mo, i) { state.months[mo.key] = X.months[i]; });
    state.tax = X.tax;
    state.setAside = X.setAside;
    state.pot = X.pot;
    state.example = true;
    state.shown = true;
    triedToShow = true;
    save();
    fillForm();
    showErrors(L.compute(state, today));
    el.showError.textContent = '';
    renderResults(true);
  }

  /* ---------------- Checking what's been typed ---------------- */

  function monthNames(keys) {
    var names = keys.map(function (key) {
      var mo = L.parseMonth(key);
      return L.monthName(mo.m);
    });
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  // Shows (or clears) the messages next to the boxes. Returns the first
  // box with a problem, if there is one.
  function showErrors(result) {
    var E = result.errors;
    var first = null;
    function note(input) { if (!first) first = input; }

    var incomeMessage = '';
    months.forEach(function (mo) { setError(el.months[mo.key], ''); });
    if (E.months === 'empty') { incomeMessage = C.income.errors.empty; note(el.months[months[0].key].input); }
    else if (E.months === 'invalid') {
      incomeMessage = C.income.errors.invalid;
      result.invalid.forEach(function (key) { setError(el.months[key], ' '); note(el.months[key].input); });
    } else if (E.months === 'missing') {
      incomeMessage = fill(C.income.errors.missing, { months: monthNames(result.missing) });
      result.missing.forEach(function (key) { setError(el.months[key], ' '); note(el.months[key].input); });
    } else if (E.months === 'tooFew') { incomeMessage = fill(C.income.errors.tooFew, { min: L.MIN_MONTHS }); note(el.partYear); }
    else if (E.months === 'tooLow') { incomeMessage = C.income.errors.tooLow; note(el.months[months[0].key].input); }
    el.incomeError.textContent = incomeMessage;
    el.incomeError.hidden = !incomeMessage;

    el.taxError.textContent = E.tax ? C.tax.errors.required : '';
    el.taxError.hidden = !E.tax;
    if (E.tax) note(el.taxInputs.after);

    setError(el.setAside, E.setAside === 'required' ? C.tax.errors.setAsideRequired
      : E.setAside === 'invalid' ? fill(C.tax.errors.setAsideInvalid, { max: L.MAX_SET_ASIDE }) : '');
    if (E.setAside) note(el.setAside.input);

    setError(el.pot, E.pot ? C.pot.errors.pot : '');
    if (E.pot) note(el.pot.input);
    setError(el.wage, E.wage ? C.pot.errors.wage : '');
    if (E.wage) note(el.wage.input);
    return first;
  }

  /* ---------------- Showing the plan ---------------- */

  function showPlan() {
    triedToShow = true;
    var result = L.compute(state, today);
    var first = showErrors(result);
    if (!result.ok) {
      el.showError.textContent = C.fixAbove;
      hideResults();
      if (first) first.focus();
      return;
    }
    el.showError.textContent = '';
    state.shown = true;
    save();
    renderResults(true);
  }

  function editNumbers() {
    var heading = document.getElementById('sw-income-heading');
    heading.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    heading.focus({ preventScroll: true });
  }

  // Redraw the results after a change, if they're showing.
  function refresh() {
    clearTimeout(refreshTimer);
    el.exampleArea.hidden = L.hasData(state);
    if (!triedToShow) return;
    var result = L.compute(state, today);
    showErrors(result);
    if (!state.shown) return;
    if (!result.ok) { hideResults(true); return; }
    el.showError.textContent = '';
    renderResults(false);
    el.live.textContent = fill(C.updated, { headline: headlineText(current) });
  }
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 400);
  }

  // keepShown: the numbers are mid-edit, so the plan comes back by itself
  // once they add up again.
  function hideResults(keepShown) {
    if (!keepShown) state.shown = false;
    el.results.hidden = true;
    el.resultsMain.textContent = '';
    current = null;
  }

  function headlineText(plan) {
    return fill(R[plan.verdict].headline, { wage: money(plan.wage) });
  }

  function renderResults(moveFocus) {
    var plan = L.compute(state, today);
    if (!plan.ok) { hideResults(true); return; }
    current = plan;

    el.resultsMain.textContent = '';
    var nodes = [];
    if (state.example) nodes.push(h('p', { className: 'heading-for' }, C.example.note));
    nodes.push(heroCard(plan), chartCard(plan), potCard(plan), planCard(plan), tipsCard(plan));
    MIM.append(el.resultsMain, nodes);
    el.results.hidden = false;

    if (moveFocus) {
      var target = document.getElementById('sw-headline');
      if (target) {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        target.focus({ preventScroll: true });
      }
    }
  }

  /* ---------------- The wage ---------------- */

  function heroCard(plan) {
    var V = R[plan.verdict];
    var wage = money(plan.wage);
    var body;
    if (plan.verdict === 'start') {
      body = V.body;
    } else if (plan.verdict === 'set') {
      body = fill(V.body, { since: L.formatMonth(plan.wageSet), review: L.formatMonth(plan.nextReview) });
    } else if (plan.verdict === 'cut') {
      // A cut deeper than the usual step means the last 12 months set it.
      var deep = plan.wage < plan.previousWage * (100 - L.STEP_PERCENT) / 100 - 10;
      body = fill(deep ? V.bodyDeep : V.body, { previous: money(plan.previousWage), wage: wage });
    } else {
      body = fill(V.body, { previous: money(plan.previousWage), wage: wage });
    }

    var parts = V.headline.split('{wage}');
    var nodes = [
      h('p', { className: 'eyebrow' }, V.eyebrow),
      h('h2', { className: 'sw-headline', id: 'sw-headline', tabindex: '-1' },
        parts[0], h('span', { className: 'sw-headline-wage' }, wage), parts[1] || ''),
      h('p', { className: 'sw-hero-body' }, body)
    ];

    var N = R.notes;
    if (!plan.fullYear) nodes.push(h('p', { className: 'sw-warning' }, fill(N.partYear, { n: plan.counted })));
    var paying = plan.rows.filter(function (row) { return row.counted && row.net > 0; }).length;
    if (plan.fullYear && paying <= 4) nodes.push(h('p', { className: 'sw-warning' }, fill(N.fewPayments, { n: paying })));
    if ((plan.verdict === 'hold' || plan.verdict === 'set') && plan.quietWage < plan.wage * (100 - L.STEP_PERCENT) / 100) {
      nodes.push(h('p', { className: 'sw-warning' }, fill(N.drift, { quiet: money(plan.quietWage) })));
    }
    return h('section', { className: 'card sw-hero band', 'aria-labelledby': 'sw-headline' }, nodes);
  }

  /* ---------------- The year, against the wage ---------------- */

  function shortText(plan) {
    var CH = R.chart;
    if (!plan.shortMonths) return CH.shortNone;
    if (plan.shortMonths === 1) return fill(CH.shortOne, { n: plan.counted });
    return fill(CH.shortMany, { count: plan.shortMonths, n: plan.counted });
  }

  function leanText(plan) {
    if (!plan.lean) return '';
    var CH = R.chart;
    return fill(plan.lean.length === 1 ? CH.leanOne : CH.lean, {
      from: L.monthName(plan.lean.from.m), to: L.monthName(plan.lean.to.m), shortfall: money(plan.lean.shortfall)
    });
  }

  // The bars. Plain boxes rather than a chart library, so the same picture
  // goes on the PDF. compact: the smaller one for the printed page.
  function bars(plan, compact) {
    var CH = R.chart;
    var rows = plan.rows.filter(function (row) { return row.counted; });
    var top = Math.max.apply(null, rows.map(function (row) { return row.net; }).concat(plan.wage)) * 1.08;
    var columns = rows.map(function (row) {
      var height = Math.max(row.net / top * 100, row.net > 0 ? 2 : 0.8);
      return h('div', { className: 'sw-col' },
        h('div', { className: 'sw-bar' + (row.short ? ' is-short' : '') + (row.net > 0 ? '' : ' is-empty'), style: 'height:' + height.toFixed(2) + '%' }),
        h('span', { className: 'sw-col-label', 'aria-hidden': 'true' },
          h('span', { className: 'sw-col-long' }, L.monthShort(row.m)),
          h('span', { className: 'sw-col-short' }, L.monthShort(row.m).charAt(0)))
      );
    });
    var line = h('div', { className: 'sw-wage-line', style: 'bottom:' + (plan.wage / top * 100).toFixed(2) + '%' },
      h('span', null, fill(CH.wage, { wage: money(plan.wage) })));
    var summary = fill(CH.summary, { n: plan.counted, wage: money(plan.wage), short: shortText(plan) });
    return h('div', { className: 'sw-chart' + (compact ? ' is-compact' : ''), role: 'img', 'aria-label': summary },
      h('div', { className: 'sw-plot' }, columns, line)
    );
  }

  function chartCard(plan) {
    var CH = R.chart;
    var taxed = plan.percent > 0;
    var head = [h('th', { scope: 'col' }, CH.colMonth), h('th', { scope: 'col' }, CH.colLanded)];
    if (taxed) head.push(h('th', { scope: 'col' }, CH.colNet));
    head.push(h('th', { scope: 'col' }, CH.colPot));
    var counted = plan.rows.filter(function (row) { return row.counted; });
    var table = h('table', { className: 'sw-table' },
      h('thead', null, h('tr', null, head)),
      h('tbody', null, counted.map(function (row, i) {
        var cells = [h('th', { scope: 'row' }, monthLabel(row)), h('td', null, money(row.landed))];
        if (taxed) cells.push(h('td', null, money(row.net)));
        cells.push(h('td', null, money(plan.replay.afterPayday[i])));
        return h('tr', { className: row.short ? 'is-short' : null }, cells);
      }))
    );
    var lean = leanText(plan);
    return h('section', { className: 'card', 'aria-labelledby': 'sw-chart-heading' },
      h('h2', { className: 'h3', id: 'sw-chart-heading' }, CH.heading),
      h('p', { className: 'muted small' }, fill(plan.fullYear ? CH.caption : CH.captionPart, { afterTax: taxed ? R.afterTax : '', total: money(plan.total) })),
      bars(plan, false),
      h('ul', { className: 'sw-legend', 'aria-hidden': 'true' },
        h('li', null, h('span', { className: 'sw-key' }), CH.covered),
        h('li', null, h('span', { className: 'sw-key is-short' }), CH.under)
      ),
      h('p', { className: 'sw-chart-note' }, h('strong', null, shortText(plan)), lean ? ' ' + lean : ''),
      h('details', { className: 'steps-details sw-table-details' },
        h('summary', null, CH.table),
        h('div', { className: 'steps-details-body' },
          table,
          h('p', { className: 'small muted sw-table-note' }, fill(CH.tableNote, { full: money(plan.full) })))
      )
    );
  }

  /* ---------------- The pot ---------------- */

  function wholeMonths(n) {
    return String(Math.round(n * 2) / 2).replace(/\.5$/, '½');
  }

  // One number to aim for, and where the pot is today. The other two lines
  // (low, and good-year money) are in the tips, where they're needed.
  function potCard(plan) {
    var P = R.pot;
    var building = plan.stage === 'building';
    var share = Math.max(0, Math.min(100, plan.full > 0 ? plan.pot / plan.full * 100 : 0));

    var status;
    if (building) {
      var B = P.building;
      var f = plan.forecast;
      status = B.body + ' ';
      if (f.months === null) status += B.never;
      else {
        status += fill(plan.fullYear ? B.when : B.whenAverage, { month: L.formatMonth(f.month) });
        if (f.short) status += ' ' + (f.short === 1 ? B.shortOne : fill(B.shortMany, { count: f.short }));
      }
    } else if (plan.stage === 'steady') {
      status = P.steady;
    } else {
      status = fill(P.over, { amount: money(plan.goodYear), top: money(plan.top) });
    }

    return h('section', { className: 'card', 'aria-labelledby': 'sw-pot-result-heading' },
      h('h2', { className: 'h3', id: 'sw-pot-result-heading' }, P.heading),
      h('p', { className: 'sw-full' }, P.full, ' ', h('strong', null, money(plan.full))),
      h('p', null, plan.lean ? fill(P.fullBody, { months: wholeMonths(plan.fullMonths) }) : P.fullBodyFlat),
      h('div', { className: 'sw-today' },
        h('p', { className: 'sw-today-label' },
          h('span', null, P.today, ' ', h('strong', null, money(plan.pot))),
          building ? h('span', { className: 'muted' }, fill(P.toGo, { amount: money(plan.toFull) })) : null),
        h('div', { className: 'sw-meter', role: 'img', 'aria-label': fill(P.meter, { pot: money(plan.pot), full: money(plan.full) }) },
          h('div', { className: 'sw-meter-fill', style: 'width:' + share.toFixed(1) + '%' }))
      ),
      h('p', { className: 'sw-pot-status' }, status),
      building && plan.lean && plan.lean.length > 1 && plan.fullYear
        ? h('p', { className: 'small muted' }, fill(P.season, { month: L.monthName(plan.lean.from.m) })) : null
    );
  }

  /* ---------------- What to do now ---------------- */

  // Setting the wage, so the next visit is a pay review. Once it's set, this
  // just says when the next review is.
  function setWageArea(plan) {
    var V = R.plan;
    var typedWage = L.toPence(state.wage) / 100;
    var needsSetting = plan.verdict === 'start' || plan.verdict === 'rise' || plan.verdict === 'cut' ||
      (plan.verdict === 'hold' && !state.wageSet);
    var status = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    if (!needsSetting) {
      status.id = 'sw-set-status';
      status.tabIndex = -1;
      status.textContent = fill(V.next, { month: L.formatMonth(plan.nextReview) });
      return h('span', { className: 'sw-step-action' }, status);
    }
    var label = fill(typedWage && typedWage !== plan.wage ? V.change : V.set, { wage: money(plan.wage) });
    var button = h('button', { type: 'button', className: 'btn btn-secondary' }, label);
    button.addEventListener('click', function () {
      state.wage = String(plan.wage);
      state.wageSet = thisMonthKey();
      state.example = false;
      el.wage.input.value = state.wage;
      showWage(true);
      save();
      renderResults(false);
      var done = document.getElementById('sw-set-status');
      if (done) {
        done.textContent = fill(V.setDone, { month: L.formatMonth(current.nextReview) });
        done.focus();
      }
    });
    return h('span', { className: 'sw-step-action' },
      button,
      h('span', { className: 'sw-step-hint' }, fill(V.setHint, { month: L.formatMonth(L.nextReview(today)) })),
      status);
  }

  function planCard(plan) {
    var S = R.plan.steps;
    var wage = money(plan.wage);
    var tax = plan.percent > 0
      ? { title: fill(S.before.title, { percent: String(plan.percent) }),
          body: fill(S.before.body, { aside: money(plan.per1000.aside), keep: money(plan.per1000.pot) }) }
      : S.after;
    var steps = [
      S.account,
      tax,
      { title: fill(S.pay.title, { wage: wage }),
        body: fill(plan.stage === 'building' ? S.pay.building : S.pay.full, { wage: wage }),
        action: setWageArea(plan) },
      { title: fill(S.budget.title, { wage: wage }),
        body: S.budget.body,
        action: h('span', { className: 'sw-step-action' }, MIM.extLink(links.appPage, S.budget.button, 'btn btn-primary')) }
    ];
    return h('section', { className: 'card', 'aria-labelledby': 'sw-plan-heading' },
      h('h2', { className: 'h3', id: 'sw-plan-heading' }, R.plan.heading),
      h('ol', { className: 'ladder sw-plan', role: 'list' }, steps.map(function (step, i) {
        return h('li', null,
          h('span', { className: 'ladder-num', 'aria-hidden': 'true' }, String(i + 1)),
          h('span', null,
            h('span', { className: 'ladder-title' }, step.title),
            h('span', { className: 'ladder-desc' }, step.body),
            step.action || null)
        );
      }))
    );
  }

  /* ---------------- Good months and lean months ---------------- */

  function tipsCard(plan) {
    var T = R.tips;
    var values = { low: money(plan.low), top: money(plan.top) };
    return h('section', { className: 'card', 'aria-labelledby': 'sw-tips-heading' },
      h('h2', { className: 'h3', id: 'sw-tips-heading' }, T.heading),
      h('ul', { className: 'sw-tips', role: 'list' }, T.items.map(function (tip) {
        return h('li', null, h('strong', null, tip.title), ' ', fill(tip.body, values));
      })),
      h('details', { className: 'steps-details sw-rules-details' },
        h('summary', null, T.rulesHeading),
        h('div', { className: 'steps-details-body' },
          h('ul', { className: 'sw-rules' }, T.rules.map(function (rule) { return h('li', null, fill(rule, values)); })))
      ),
      h('p', { className: 'small sw-benefits' }, T.benefits),
      h('p', { className: 'faith-line' }, T.faith)
    );
  }

  /* ---------------- Keep your plan (PDF) ---------------- */

  function keepCard() {
    var K = R.keep;
    var nameField = field('sw-pdf-name', K.name, { hint: K.nameHint, optional: C.pot.optional, maxlength: L.MAX.name, noError: true });
    nameField.input.setAttribute('autocomplete', 'given-name');
    el.pdfName = nameField.input;
    el.pdfName.addEventListener('input', function () {
      state.name = el.pdfName.value.slice(0, L.MAX.name);
      save();
    });
    var status = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    var btn = h('button', { type: 'button', className: 'btn btn-primary' }, K.button);
    btn.addEventListener('click', function () {
      if (!current) return;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      status.textContent = K.working;
      var date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      var name = state.name.trim();
      window.MIMPdf.download({
        filename: C.pdf.filename,
        eyebrow: C.pdf.eyebrow,
        title: C.pdf.title,
        subtitle: (name ? name + '  ·  ' : '') + date,
        content: pdfContent(current)
      }).then(function (how) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        status.textContent = how === 'pdf' ? K.done : K.printed;
      });
    });
    return h('section', { className: 'card', 'aria-labelledby': 'sw-keep-heading' },
      h('h2', { className: 'h3', id: 'sw-keep-heading' }, K.heading),
      h('p', null, K.body),
      nameField.wrap,
      h('div', { className: 'button-row' }, btn),
      status
    );
  }

  function pdfContent(plan) {
    var P = C.pdf;
    var prettyUrl = window.MIMPdf.prettyUrl;
    var wage = money(plan.wage);
    var nodes = [];

    nodes.push(h('div', { className: 'sw-pdf-hero' },
      h('div', null,
        h('p', { className: 'sw-pdf-label' }, P.wage),
        h('p', { className: 'sw-pdf-wage' }, wage, ' ', h('span', null, P.perMonth)),
        h('p', { className: 'sw-pdf-payday' }, P.payday, ' ', h('span', { className: 'sw-pdf-blank' }), ' ', P.paydayAfter),
        h('p', { className: 'sw-pdf-from' }, P.from)
      ),
      h('div', { className: 'sw-pdf-lines' },
        h('p', { className: 'sw-pdf-label' }, P.lines),
        h('dl', null,
          h('dt', null, P.full), h('dd', null, money(plan.full)),
          h('dt', null, P.low), h('dd', null, fill(P.under, { amount: money(plan.low) })),
          h('dt', null, P.top), h('dd', null, fill(P.over, { amount: money(plan.top) })))
      )
    ));

    nodes.push(h('div', { className: 'pdf-section' },
      h('p', { className: 'pdf-h2' }, plan.fullYear ? P.year : fill(P.yearPart, { n: plan.counted })),
      bars(plan, true),
      h('p', { className: 'pdf-small pdf-muted' }, shortText(plan) + (leanText(plan) ? ' ' + leanText(plan) : ''))
    ));

    var steps = [
      P.landsIn,
      plan.percent > 0 ? fill(P.landsBefore, { percent: String(plan.percent) }) : P.landsAfter,
      fill(P.landsPay, { wage: wage }),
      fill(P.landsBudget, { wage: wage })
    ];
    nodes.push(h('div', { className: 'pdf-section' },
      h('p', { className: 'pdf-h2' }, P.lands),
      h('ol', { className: 'sw-pdf-steps' }, steps.map(function (text, i) {
        return h('li', null, h('span', { className: 'sw-pdf-num' }, String(i + 1)), h('span', null, text));
      }))
    ));

    var reviews = [];
    var month = plan.nextReview;
    for (var i = 0; i < 4; i++) {
      reviews.push(h('div', { className: 'sw-pdf-review' },
        h('p', { className: 'sw-pdf-review-month' }, L.formatMonth(month)),
        h('p', { className: 'sw-pdf-review-line' }, P.potBlank, ' £', h('span', { className: 'sw-pdf-rule' })),
        h('p', { className: 'sw-pdf-review-choices' }, P.choices)
      ));
      month = L.addMonths(month, 3);
    }
    nodes.push(h('div', { className: 'pdf-section' },
      h('p', { className: 'pdf-h2' }, P.reviews),
      h('p', { className: 'pdf-small pdf-muted' }, fill(P.reviewsHint, { low: money(plan.low) })),
      h('div', { className: 'sw-pdf-reviews' }, reviews),
      h('p', { className: 'pdf-highlight sw-pdf-good' }, fill(P.goodYear, { top: money(plan.top) }))
    ));

    nodes.push(h('div', { className: 'sw-pdf-end' },
      h('p', { className: 'pdf-quote' }, P.faith),
      h('div', { className: 'pdf-app' },
        h('p', null, h('strong', null, P.app), '  ',
          h('a', { href: links.appPage }, prettyUrl(links.appPage)))
      )
    ));
    return nodes;
  }

  /* ---------------- The email sign-up ---------------- */

  function emailCard() {
    var E = R.email;
    var own = config.steadyWage || {};
    var hidden = {};
    hidden[(config.signup || {}).toolField || 'tool'] = own.tag || 'steady-wage';
    return MIM.emailForm({
      heading: E.heading, intro: E.intro, buttonLabel: E.button, hiddenFields: hidden,
      consentText: own.consentText, successMessage: own.successMessage
    });
  }

  /* ---------------- Clearing ---------------- */

  function clearAll(alreadyCleared) {
    if (!alreadyCleared) MIM.storage.remove(STORAGE_KEY);
    state = L.blank();
    triedToShow = false;
    fillForm();
    showErrors({ errors: {}, missing: [], invalid: [] });
    el.showError.textContent = '';
    hideResults();
    el.flash.textContent = R.cleared;
    var title = document.getElementById('sw-title');
    window.scrollTo(0, 0);
    if (title) title.focus({ preventScroll: true });
  }

  document.addEventListener('mim:cleared', function () { clearAll(true); });

  /* ---------------- Start ---------------- */

  build();
  state = L.sanitize(MIM.storage.get(STORAGE_KEY), today);
  fillForm();
  if (state.shown) {
    triedToShow = true;
    var saved = L.compute(state, today);
    showErrors(saved);
    if (saved.ok) renderResults(false);
    // A new month has come round since the last visit.
    else if (saved.errors.months === 'missing') el.flash.textContent = C.welcomeBack;
  }
})();
