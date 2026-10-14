/*
 * Saving for Mission Builder: the page.
 * Sums are in logic.js, words are in content.js, the two PDFs are in
 * pdfs.js, links and settings are in /assets/config.js. This file puts
 * them on screen.
 */

(function () {
  'use strict';

  var L = window.MIMMissionLogic;
  var C = window.MIM_MISSION_CONTENT;
  var PDFS = window.MIMMissionPdfs;
  var MIM = window.MIM;
  var app = document.getElementById('mission-app');
  if (!app || !L || !C || !MIM || !PDFS) return;

  var h = MIM.h;
  var links = MIM.links;
  var config = MIM.config;
  var STORAGE_KEY = 'mim.mission.v1';

  // Which figures each step works out (highlighted in the summary bar).
  var STEP_LETTERS = { '1': [], '2': ['A'], '3': ['B'], '4': ['C', 'D', 'E', 'F'], '5': ['G'], '6': ['E', 'G'] };

  var state = L.sanitize(MIM.storage.get(STORAGE_KEY));
  var screen = 'intro';
  var updaters = []; // run after every keystroke to refresh the figures on screen
  // Mirror of our browser-history entries, so Back can use the browser's
  // history when it matches and the phone's back gesture works too.
  var trail = ['intro'];
  var depth = 0;
  var flash = '';

  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (match, key) {
      return values[key] !== undefined ? values[key] : match;
    });
  }
  function money(pounds) { return L.formatMoney(pounds); }
  function monthsText(n) { return n + ' ' + (n === 1 ? C.ui.month : C.ui.months); }
  function today() {
    var d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }
  function figures() { return L.compute(state, today()); }

  /* ---------------- Saving ---------------- */

  // Only kept while there's something worth keeping.
  function save() {
    if (L.hasData(state)) MIM.storage.set(STORAGE_KEY, state);
    else MIM.storage.remove(STORAGE_KEY);
  }

  // Called whenever someone types or ticks something.
  function edited() {
    state.example = false;
    save();
    update();
  }

  function update() {
    var r = figures();
    updaters.forEach(function (fn) { fn(r); });
  }

  function clearAll() {
    MIM.storage.remove(STORAGE_KEY);
    state = L.blank();
    flash = C.ui.cleared;
    show('intro', 'replace');
  }

  function loadExample() {
    state = L.fromExample(C.example, today());
    show('1', 'push');
  }

  function startFresh() {
    state = L.blank();
    save();
    show('1', 'push');
  }

  /* ---------------- Moving between screens ---------------- */

  function validScreen(s) { return L.SCREENS.indexOf(s) !== -1 ? s : 'intro'; }

  // mode: 'push' (new history entry), 'replace' or 'none'
  function show(next, mode) {
    screen = validScreen(next);
    if (screen !== 'intro') { state.screen = screen; save(); }
    try {
      if (mode === 'push') {
        trail.length = depth + 1;
        trail.push(screen);
        depth += 1;
        history.pushState({ mimMission: true, screen: screen, depth: depth }, '');
      } else if (mode === 'replace') {
        trail[depth] = screen;
        history.replaceState({ mimMission: true, screen: screen, depth: depth }, '');
      }
    } catch (e) { /* history not available: the builder still works */ }
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
    if (!entry || !entry.mimMission) return;
    depth = entry.depth || 0;
    screen = validScreen(entry.screen);
    if (screen !== 'intro') { state.screen = screen; save(); }
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

  // Redraws the current step after a row is added or removed, keeping
  // the scroll position and putting the cursor where it's needed.
  function rerender(focusId) {
    var y = window.pageYOffset;
    render(false);
    window.scrollTo(0, y);
    var el = focusId && document.getElementById(focusId);
    if (el) el.focus();
  }

  /* ---------------- Small building blocks ---------------- */

  function letter(l) { return h('span', { className: 'sfm-letter' }, l); }

  function title(text) { return h('h1', { id: 'step-title', className: 'sfm-title', tabindex: '-1' }, text); }

  function verse(v) {
    return h('figure', { className: 'sfm-verse' },
      h('blockquote', null, h('p', null, '“' + v.text + '”')),
      h('figcaption', null, v.ref));
  }

  function hintText(id, text) { return text ? h('span', { className: 'sfm-hint', id: id }, text) : null; }

  // A "Are you sure?" box for anything that wipes what someone has typed.
  function makeConfirm() {
    var text = h('p', { className: 'sfm-confirm-text', tabindex: '-1' });
    var yes = h('button', { type: 'button', className: 'btn btn-primary' });
    var no = h('button', { type: 'button', className: 'btn btn-secondary' });
    var box = h('div', { className: 'sfm-confirm', hidden: true }, text, h('div', { className: 'button-row' }, yes, no));
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
    var problem = h('span', { className: 'sfm-problem', id: id + '-problem' });
    var input = h('input', {
      id: id, type: 'text', inputmode: 'decimal', autocomplete: 'off', maxlength: String(L.MAX.money),
      'aria-label': opts.ariaLabel || null,
      'aria-describedby': [opts.describedBy, id + '-problem'].filter(Boolean).join(' ')
    });
    input.value = get() || '';
    function check() {
      var p = L.moneyProblem(input.value);
      var message = p === 'negative' ? (opts.negative || C.ui.noMinus) : p === 'invalid' ? C.ui.notANumber : '';
      problem.textContent = message;
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
    input.addEventListener('input', function () { set(input.value); check(); edited(); });
    check();
    return h('span', { className: 'sfm-money' + (opts.className ? ' ' + opts.className : '') },
      h('span', { className: 'sfm-pound', 'aria-hidden': 'true' }, '£'), input, problem);
  }

  // Label (and hint) on the left, £ box on the right.
  function moneyLine(id, label, hint, get, set, opts) {
    opts = opts || {};
    return h('div', { className: 'sfm-line' },
      h('label', { for: id }, label, hint ? h('span', { className: 'sfm-hint' }, hint) : null),
      moneyBox(id, get, set, opts),
      opts.after || null);
  }

  function textField(id, label, get, set, opts) {
    opts = opts || {};
    var input = h(opts.multiline ? 'textarea' : 'input', {
      id: id, type: opts.multiline ? null : 'text', maxlength: String(opts.max || L.MAX.label),
      placeholder: opts.placeholder || null, autocomplete: opts.autocomplete || 'off',
      rows: opts.multiline ? '5' : null,
      'aria-describedby': opts.hint ? id + '-hint' : null
    });
    input.value = get() || '';
    input.addEventListener('input', function () { set(input.value); edited(); });
    return h('div', { className: 'field' },
      h('label', { for: id }, label, opts.optional ? h('span', { className: 'optional' }, ' ' + C.ui.optional) : null),
      hintText(id + '-hint', opts.hint),
      input);
  }

  function dateField(id, label, get, set, opts) {
    opts = opts || {};
    var input = h('input', { id: id, type: 'date', 'aria-describedby': opts.hint ? id + '-hint' : null });
    input.value = get() || '';
    function changed() {
      // Browsers give either a full date or nothing, so this is always tidy.
      if (input.value === (get() || '')) return;
      set(L.parseDate(input.value) ? input.value : '');
      edited();
    }
    input.addEventListener('input', changed);
    input.addEventListener('change', changed);
    return h('div', { className: 'field' }, h('label', { for: id }, label), hintText(id + '-hint', opts.hint), input);
  }

  // A highlighted total, refreshed as people type.
  function totalBox(l, label, value) {
    var out = h('output', { className: 'sfm-total-value', 'aria-live': 'polite' });
    updaters.push(function (r) { out.textContent = value(r); });
    return h('div', { className: 'sfm-total' }, h('span', { className: 'sfm-total-label' }, l ? letter(l) : null, label), out);
  }

  // A worked sum: rows of label and figure. rows: { l, label, value(r), result }
  function sumList(list) {
    return h('dl', { className: 'sfm-sum' }, list.map(function (row) {
      var dd = h('dd');
      updaters.push(function (r) { dd.textContent = row.value(r); });
      return h('div', { className: 'sfm-sum-row' + (row.result ? ' is-result' : '') },
        h('dt', null, row.l ? letter(row.l) : null, row.label), dd);
    }));
  }

  /*
   * Rows people can add and remove (other costs, the three Rs, extra income).
   *   key       which list in the plan
   *   withR     show the Remove / Reduce / Replace picker
   *   chips     suggestions to add with one tap
   */
  function editableRows(o) {
    var list = function () { return state[o.key]; };
    var full = list().length >= o.limit;

    var ul = h('ul', { className: 'sfm-rows', role: 'list' });
    list().forEach(function (row, i) {
      var base = o.key + '-' + i;
      var name = fill(o.rowLabel, { n: i + 1 });
      var labelInput = h('input', {
        id: base + '-label', type: 'text', className: 'sfm-row-label', maxlength: String(L.MAX.label),
        placeholder: o.placeholder, autocomplete: 'off', 'aria-label': name
      });
      labelInput.value = row.label;

      var picker = null;
      if (o.withR) {
        picker = h('select', { id: base + '-r', className: 'sfm-row-r', 'aria-label': C.fund.rsLabel + ' (' + name + ')' },
          L.R_TYPES.map(function (r) { return h('option', { value: r, selected: row.r === r }, C.fund.rs[r]); }));
        picker.addEventListener('change', function () { list()[i].r = picker.value; edited(); });
      }

      var amount = moneyBox(base + '-amount',
        function () { return row.amount; },
        function (v) { list()[i].amount = v; },
        { ariaLabel: fill(o.amountLabel, { what: row.label || name }), className: 'sfm-row-amount' });

      var remove = h('button', {
        type: 'button', className: 'sfm-remove', 'aria-label': fill(C.ui.remove, { what: row.label || name })
      }, h('span', { 'aria-hidden': 'true' }, '×'));
      // Screen readers hear the row's own name ("Remove Gym"), kept up to date.
      labelInput.addEventListener('input', function () {
        list()[i].label = labelInput.value;
        var what = labelInput.value.trim() || name;
        remove.setAttribute('aria-label', fill(C.ui.remove, { what: what }));
        amount.querySelector('input').setAttribute('aria-label', fill(o.amountLabel, { what: what }));
        edited();
      });
      remove.addEventListener('click', function () {
        list().splice(i, 1);
        edited();
        var left = list().length;
        rerender(left ? o.key + '-' + Math.min(i, left - 1) + '-label' : o.key + '-add');
      });

      ul.appendChild(h('li', { className: 'sfm-row' + (o.withR ? ' sfm-row-with-r' : '') }, picker, labelInput, amount, remove));
    });

    function addRow(seed) {
      if (list().length >= o.limit) return;
      var row = { label: seed.label || '', amount: '' };
      if (o.withR) row.r = seed.r || 'reduce';
      list().push(row);
      edited();
      rerender(o.key + '-' + (list().length - 1) + (seed.label ? '-amount' : '-label'));
    }

    // Suggestions disappear once they've been added.
    var used = list().map(function (row) { return row.label; });
    var chips = (o.chips || []).filter(function (chip) { return used.indexOf(chip.label) === -1; });
    var chipList = chips.length ? h('ul', { className: 'sfm-chips', role: 'list', 'aria-label': o.chipsLabel || null }, chips.map(function (chip) {
      return h('li', null, h('button', { type: 'button', className: 'sfm-chip', disabled: full, onClick: function () { addRow(chip); } },
        h('span', { 'aria-hidden': 'true' }, '+ '), chip.label));
    })) : null;

    return h('div', { className: 'sfm-rows-block' },
      ul,
      chipList,
      h('p', { className: 'sfm-add-row' },
        h('button', { type: 'button', className: 'sfm-add', id: o.key + '-add', disabled: full, onClick: function () { addRow({}); } }, C.ui.addOwn),
        full ? h('span', { className: 'small muted' }, ' ' + C.ui.full) : null));
  }

  /* ---------------- Intro ---------------- */

  function renderIntro() {
    var I = C.intro;
    var nodes = [
      h('div', { className: 'band intro-band' },
        h('p', { className: 'eyebrow' }, I.eyebrow),
        h('h1', { className: 'display', tabindex: '-1' }, I.title),
        h('p', { className: 'lead' }, I.lead)),
      I.body.map(function (p) { return h('p', null, p); }),
      h('ul', { className: 'intro-points' }, I.points.map(function (p) { return h('li', null, p); }))
    ];

    if (flash) {
      nodes.push(h('p', { className: 'form-status', role: 'status' }, flash));
      flash = '';
    }

    if (L.hasData(state)) {
      var confirm = makeConfirm();
      var resume = state.screen !== 'intro' ? state.screen : '1';
      var exampleBtn = h('button', { type: 'button', className: 'btn btn-secondary' }, I.example);
      exampleBtn.addEventListener('click', function () {
        confirm.ask(I.exampleConfirm, I.exampleYes, I.keepMine, loadExample, exampleBtn);
      });
      var againBtn = h('button', { type: 'button', className: 'link-button' }, I.startAgain);
      againBtn.addEventListener('click', function () {
        confirm.ask(I.startAgainConfirm, C.ui.clearYes, C.ui.clearNo, startFresh, againBtn);
      });
      nodes.push(h('div', { className: 'card welcome-back' },
        h('p', null, I.welcomeBack),
        h('div', { className: 'button-row' },
          h('button', { type: 'button', className: 'btn btn-primary', onClick: function () { show(resume, 'push'); } }, I.carryOn),
          exampleBtn),
        h('p', { className: 'sfm-again' }, againBtn),
        confirm));
    } else {
      nodes.push(h('div', { className: 'button-row sfm-intro-buttons' },
        h('button', { type: 'button', className: 'btn btn-primary', onClick: startFresh }, I.start),
        h('button', { type: 'button', className: 'btn btn-secondary', onClick: loadExample }, I.example)));
    }

    nodes.push(h('details', { className: 'steps-details' },
      h('summary', null, I.versesSummary),
      h('div', { className: 'steps-details-body' }, I.verses.map(verse))));

    if (L.hasData(state)) nodes.push(savedLine());
    return nodes;
  }

  /* ---------------- The six steps ---------------- */

  function renderStep(id) {
    var n = +id;
    var builders = { '1': stepMission, '2': stepCosts, '3': stepHand, '4': stepFund, '5': stepGap, '6': stepSetup };
    return h('div', { className: 'sfm-screen' },
      stepNav(n),
      summaryBar(id),
      state.example ? exampleBanner() : null,
      h('section', { className: 'card sfm-step', 'aria-labelledby': 'step-title' }, builders[id]()),
      n === 6 ? setupExtras() : null,
      stepButtons(n),
      savedLine());
  }

  function stepNav(current) {
    return h('nav', { className: 'sfm-steps', 'aria-label': C.ui.stepsLabel },
      h('p', { className: 'sfm-count' }, fill(C.ui.stepCount, { n: current })),
      h('ol', { role: 'list' }, C.stepNames.map(function (name, i) {
        var n = i + 1;
        return h('li', null, h('button', {
          type: 'button',
          className: 'sfm-step-btn' + (n < current ? ' is-before' : ''),
          'aria-current': n === current ? 'step' : null,
          title: name,
          onClick: function () { if (n !== current) show(String(n), 'push'); }
        }, h('span', { 'aria-hidden': 'true' }, String(n)), h('span', { className: 'visually-hidden' }, fill(C.ui.goToStep, { n: n, title: name }))));
      })));
  }

  function summaryBar(id) {
    var active = STEP_LETTERS[id] || [];
    return h('section', { className: 'sfm-summary', 'aria-label': C.summaryLabel },
      h('dl', { className: 'sfm-summary-grid' }, L.LETTERS.map(function (l) {
        var value = h('dd');
        var tile = h('div', { className: 'sfm-tile' + (active.indexOf(l) !== -1 ? ' is-active' : '') },
          h('dt', null, letter(l), h('span', { className: 'sfm-tile-label' }, C.letters[l].short)),
          value);
        updaters.push(function (r) {
          value.textContent = money(r[l]);
          tile.classList.toggle('is-empty', !r[l] && !(l === 'G' && r.funded));
          tile.classList.toggle('is-funded', l === 'G' && r.funded);
        });
        return tile;
      })));
  }

  function exampleBanner() {
    return h('div', { className: 'sfm-banner', role: 'note' },
      h('p', null, C.ui.exampleBanner),
      h('button', { type: 'button', className: 'link-button', onClick: function () { state = L.blank(); save(); show('1', 'replace'); } }, C.ui.exampleClear));
  }

  function stepButtons(n) {
    // Next comes first so it's on top on a phone; CSS puts Back on the left on wider screens.
    return h('div', { className: 'button-row sfm-nav' },
      n < 6 ? h('button', { type: 'button', className: 'btn btn-primary', onClick: function () { show(String(n + 1), 'push'); } },
        fill(C.ui.next, { title: C.stepNames[n] })) : null,
      h('button', { type: 'button', className: 'btn btn-secondary', onClick: goBack }, n === 1 ? C.ui.toStart : C.ui.back));
  }

  function savedLine() {
    var confirm = makeConfirm();
    var btn = h('button', { type: 'button', className: 'link-button' }, C.ui.clear);
    btn.addEventListener('click', function () { confirm.ask(C.ui.clearConfirm, C.ui.clearYes, C.ui.clearNo, clearAll, btn); });
    return h('div', { className: 'sfm-saved' }, h('p', { className: 'small muted' }, C.ui.saved + ' ', btn), confirm);
  }

  /* Step 1: Your mission */

  function stepMission() {
    var M = C.mission;
    var status = h('p', { className: 'sfm-status', 'aria-live': 'polite' });
    var awayNote = h('p', { className: 'sfm-note' });
    var dueNote = h('p', { className: 'sfm-note' });

    updaters.push(function (r) {
      var m = state.mission;
      status.textContent = r.dueStatus === 'ok' ? fill(M.status.ok, { months: monthsText(r.months) }) : M.status[r.dueStatus];
      status.classList.toggle('is-warning', r.dueStatus === 'past' || r.dueStatus === 'soon');
      var leave = L.parseDate(m.leave), back = L.parseDate(m.back), due = L.parseDate(m.due);
      awayNote.textContent = leave && back && L.compareDates(back, leave) < 0 ? M.backBeforeLeave : '';
      dueNote.textContent = leave && due && L.compareDates(due, leave) > 0 ? M.dueAfterLeave : '';
    });

    return [
      title(M.title),
      h('p', null, M.intro),
      textField('m-where', M.where.label, function () { return state.mission.where; }, function (v) { state.mission.where = v; },
        { placeholder: M.where.placeholder, max: L.MAX.where }),
      h('fieldset', { className: 'sfm-fieldset' },
        h('legend', null, M.away, h('span', { className: 'optional' }, ' ' + C.ui.optional)),
        h('div', { className: 'sfm-two' },
          dateField('m-leave', M.leave, function () { return state.mission.leave; }, function (v) { state.mission.leave = v; }),
          dateField('m-back', M.back, function () { return state.mission.back; }, function (v) { state.mission.back = v; })),
        awayNote),
      dateField('m-due', M.due.label, function () { return state.mission.due; }, function (v) { state.mission.due = v; }, { hint: M.due.hint }),
      dueNote,
      totalBox(null, M.monthsLabel, function (r) { return r.months === null ? '—' : String(r.months); }),
      status
    ];
  }

  /* Step 2: Count the cost */

  function stepCosts() {
    var K = C.costs;
    var lines = h('div', { className: 'sfm-lines' }, K.items.map(function (item) {
      return moneyLine('cost-' + item.id, item.label, item.hint,
        function () { return state.costs[item.id]; },
        function (v) { state.costs[item.id] = v; });
    }));

    return [
      title(K.title),
      h('p', null, K.intro),
      verse(K.verse),
      lines,
      h('h2', { className: 'h3 sfm-sub' }, K.otherHeading),
      h('p', { className: 'muted small' }, K.otherIntro),
      editableRows({
        key: 'extraCosts', limit: L.LIMITS.extraCosts, placeholder: K.otherPlaceholder,
        rowLabel: K.otherLabel, amountLabel: K.amountLabel
      }),
      totalBox('A', C.letters.A.label, function (r) { return money(r.A); }),
      h('p', { className: 'sfm-tip' }, K.tip)
    ];
  }

  /* Step 3: What's in your hand? */

  function stepHand() {
    var H = C.hand;
    var D = H.debt;

    var sell = h('ul', { className: 'sfm-rows', role: 'list' }, state.sell.map(function (item, i) {
      var n = i + 1;
      var label = h('input', {
        id: 'sell-' + i + '-label', type: 'text', className: 'sfm-row-label', maxlength: String(L.MAX.label),
        placeholder: i === 0 ? H.sellPlaceholder : null, autocomplete: 'off', 'aria-label': fill(H.sellLabel, { n: n })
      });
      label.value = item.label;
      label.addEventListener('input', function () { state.sell[i].label = label.value; edited(); });
      return h('li', { className: 'sfm-row sfm-row-fixed' }, label,
        moneyBox('sell-' + i + '-amount', function () { return item.amount; }, function (v) { state.sell[i].amount = v; },
          { ariaLabel: fill(H.sellAmountLabel, { n: n }), className: 'sfm-row-amount' }));
    }));

    var care = h('section', { className: 'care-box sfm-care', 'aria-labelledby': 'care-heading' },
      h('h2', { className: 'h3', id: 'care-heading' }, D.careHeading),
      h('p', null, D.careBody),
      h('ul', { className: 'help-list', role: 'list' }, (config.debtHelp || []).map(function (org) {
        return h('li', null, MIM.extLink(org.url, org.name), h('p', null, org.description));
      })));
    updaters.push(function (r) { care.hidden = !r.debtWorry; });

    var checks = h('fieldset', { className: 'checks sfm-checks' },
      h('legend', { className: 'h3 sfm-legend' }, D.heading),
      h('p', { className: 'muted' }, D.intro),
      D.signs.map(function (sign) {
        var input = h('input', { type: 'checkbox', name: 'debt', value: sign.id });
        input.checked = state.debtSigns.indexOf(sign.id) !== -1;
        input.addEventListener('change', function () {
          var ticked = state.debtSigns.filter(function (s) { return s !== sign.id; });
          if (input.checked) ticked.push(sign.id);
          state.debtSigns = L.DEBT_SIGNS.filter(function (s) { return ticked.indexOf(s) !== -1; });
          edited();
        });
        return h('label', { className: 'check' }, input, h('span', null, sign.label));
      }));

    return [
      title(H.title),
      h('p', null, H.intro),
      verse(H.verse),
      h('div', { className: 'sfm-lines' },
        moneyLine('savings', H.savings.label, H.savings.hint, function () { return state.savings; }, function (v) { state.savings = v; })),
      h('h2', { className: 'h3 sfm-sub' }, H.sellHeading),
      h('p', { className: 'muted small' }, H.sellHint),
      sell,
      h('div', { className: 'sfm-lines' },
        moneyLine('promised', H.promised.label, null, function () { return state.promised; }, function (v) { state.promised = v; })),
      totalBox('B', C.letters.B.label, function (r) { return money(r.B); }),
      checks,
      care,
      h('p', { className: 'sfm-note-quiet' }, D.studentLoan)
    ];
  }

  /* Step 4: What you can fund yourself */

  function stepFund() {
    var F = C.fund;
    var targetNote = h('p', { className: 'sfm-status' });
    updaters.push(function (r) {
      targetNote.textContent = r.months === null ? F.needDue : r.months < 1 ? F.soon : '';
      targetNote.hidden = !targetNote.textContent;
    });

    var compare = h('p', { className: 'sfm-status', 'aria-live': 'polite' });
    updaters.push(function (r) {
      var text = '';
      if (r.D !== null && r.C > 0) text = r.shortfall > 0 ? fill(F.short, { amount: money(r.shortfall) }) : F.onTarget;
      compare.textContent = text;
      compare.hidden = !text;
      compare.classList.toggle('is-good', r.shortfall === 0);
    });

    var appLink = MIM.extLink(links.appWeb, F.margin.appLink);
    var marginHint = h('span', { className: 'sfm-hint', id: 'margin-hint' }, F.margin.hint + ' ' + F.margin.app + ' ', appLink, '.');

    return [
      title(F.title),
      h('p', null, F.intro),
      sumList([
        { l: 'A', label: C.letters.A.label, value: function (r) { return money(r.A); } },
        { l: 'B', label: F.lessInHand, value: function (r) { return '− ' + money(r.B); } },
        { l: 'C', label: C.letters.C.label, value: function (r) { return money(r.C); }, result: true },
        { label: F.monthsUntil, value: function (r) { return r.months === null ? '—' : String(r.months); } },
        { l: 'D', label: C.letters.D.label, value: function (r) { return r.D === null ? '—' : fill(C.ui.perMonth, { amount: money(r.D) }); }, result: true }
      ]),
      targetNote,
      h('div', { className: 'sfm-lines sfm-lines-margin' },
        h('div', { className: 'sfm-line sfm-line-stacked' },
          h('label', { for: 'margin' }, F.margin.label, marginHint),
          moneyBox('margin', function () { return state.margin; }, function (v) { state.margin = v; },
            { negative: F.margin.negative, describedBy: 'margin-hint' }))),
      h('h2', { className: 'h3 sfm-sub' }, F.rsHeading),
      h('p', { className: 'muted small' }, F.rsIntro),
      editableRows({
        key: 'cuts', limit: L.LIMITS.cuts, withR: true, chips: F.rsChips, chipsLabel: F.rsHeading,
        placeholder: F.rsPlaceholder, rowLabel: F.rsRowLabel, amountLabel: F.monthlyAmountLabel
      }),
      h('h2', { className: 'h3 sfm-sub' }, F.incomeHeading),
      h('p', { className: 'muted small' }, F.incomeIntro),
      editableRows({
        key: 'income', limit: L.LIMITS.income,
        chips: F.incomeChips.map(function (label) { return { label: label }; }), chipsLabel: F.incomeHeading,
        placeholder: F.incomePlaceholder, rowLabel: F.incomeRowLabel, amountLabel: F.monthlyAmountLabel
      }),
      sumList([
        { label: F.marginToday, value: function (r) { return money(r.margin); } },
        { label: F.freed, value: function (r) { return '+ ' + money(r.freed); } },
        { label: F.extra, value: function (r) { return '+ ' + money(r.extra); } },
        { l: 'E', label: C.letters.E.label, value: function (r) { return fill(C.ui.perMonth, { amount: money(r.E) }); }, result: true },
        { label: F.monthsUntil, value: function (r) { return r.months === null ? '—' : fill(F.times, { months: monthsText(r.months) }); } },
        { l: 'F', label: C.letters.F.label, value: function (r) { return money(r.F); }, result: true }
      ]),
      compare,
      verse(F.verse)
    ];
  }

  /* Step 5: The gap */

  function coverage(r) {
    var V = C.gap.coverage;
    var A = r.A || 0;
    var hand = Math.min(r.B || 0, A);
    var saving = Math.min(r.F || 0, A - hand);
    var gap = Math.max(0, A - hand - saving);
    function pct(x) { return A ? (x / A * 100).toFixed(2) + '%' : '0%'; }
    return h('figure', { className: 'sfm-coverage' },
      h('figcaption', { className: 'sfm-coverage-title' }, V.heading),
      h('div', { className: 'sfm-bar', 'aria-hidden': 'true' },
        h('span', { className: 'sfm-bar-part is-hand', style: 'width:' + pct(hand) }),
        h('span', { className: 'sfm-bar-part is-saving', style: 'width:' + pct(saving) }),
        h('span', { className: 'sfm-bar-part is-gap', style: 'width:' + pct(gap) })),
      h('ul', { className: 'sfm-key', role: 'list' },
        h('li', null, h('span', { className: 'sfm-swatch is-hand' }), V.inHand + ' ', h('strong', null, money(r.B))),
        h('li', null, h('span', { className: 'sfm-swatch is-saving' }), V.saving + ' ', h('strong', null, money(r.F))),
        h('li', null, h('span', { className: 'sfm-swatch is-gap' }), V.gap + ' ', h('strong', null, money(r.G)))));
  }

  function stepGap() {
    var G = C.gap;
    var r = figures();
    var nodes = [
      title(G.title),
      sumList([
        { l: 'C', label: C.letters.C.label, value: function (x) { return money(x.C); } },
        { l: 'F', label: G.lessSaved, value: function (x) { return '− ' + money(x.F); } },
        { l: 'G', label: C.letters.G.label, value: function (x) { return money(x.G); }, result: true }
      ])
    ];

    if (!r.hasCosts) {
      nodes.push(h('p', { className: 'sfm-status' }, G.needCosts, ' ',
        h('button', { type: 'button', className: 'link-button', onClick: function () { show('2', 'push'); } }, fill(C.ui.goToStep, { n: 2, title: C.stepNames[1] }))));
      return nodes;
    }
    if (r.G === null) {
      nodes.push(h('p', { className: 'sfm-status' }, G.needDue, ' ',
        h('button', { type: 'button', className: 'link-button', onClick: function () { show('1', 'push'); } }, fill(C.ui.goToStep, { n: 1, title: C.stepNames[0] }))));
      return nodes;
    }

    nodes.push(coverage(r));

    if (r.funded) {
      nodes.push(h('div', { className: 'sfm-funded' },
        h('h2', { className: 'h3' }, G.fundedHeading),
        h('p', null, G.fundedBody)));
      return nodes;
    }

    var P = G.partnerFigures;
    var status = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    nodes.push(
      h('h2', { className: 'h3 sfm-sub' }, G.faithHeading),
      h('p', null, G.faithBody),
      verse(G.faithVerse),
      h('h2', { className: 'h3 sfm-sub' }, G.partnerHeading),
      h('p', null, G.partnerBody),
      h('dl', { className: 'sfm-sum sfm-partner-figures' },
        ['A', 'B', 'E', 'G'].map(function (l) {
          return h('div', { className: 'sfm-sum-row' + (l === 'G' ? ' is-result' : '') }, h('dt', null, letter(l), P[l]), h('dd', null, money(r[l])));
        })),
      h('fieldset', { className: 'sfm-fieldset' },
        h('legend', { className: 'h3 sfm-legend' }, G.peopleHeading),
        h('ol', { className: 'sfm-people', role: 'list' }, state.people.map(function (person, i) {
          var input = h('input', {
            id: 'person-' + i, type: 'text', maxlength: String(L.MAX.person), autocomplete: 'off',
            placeholder: G.personPlaceholder, 'aria-label': fill(G.personLabel, { n: i + 1 })
          });
          input.value = person;
          input.addEventListener('input', function () { state.people[i] = input.value; edited(); });
          return h('li', null, h('span', { className: 'sfm-people-num', 'aria-hidden': 'true' }, String(i + 1)), input);
        }))),
      h('div', { className: 'sfm-page-box' },
        h('h2', { className: 'h3' }, G.pageHeading),
        h('p', { className: 'muted' }, G.pageIntro),
        textField('partner-name', G.name.label, function () { return state.name; }, function (v) { state.name = v; },
          { hint: G.name.hint, max: L.MAX.name, autocomplete: 'given-name', optional: true }),
        textField('partner-note', G.note.label, function () { return state.note; }, function (v) { state.note = v; },
          { hint: G.note.hint, max: L.MAX.note, multiline: true }),
        h('div', { className: 'button-row' }, pdfButton('partner', status)),
        status),
      h('p', { className: 'sfm-note-quiet' }, G.tooBig),
      verse(G.hebrews)
    );
    return nodes;
  }

  /* Step 6: Set it up this week */

  function stepSetup() {
    var S = C.setup;
    var r = figures();

    var checks = h('fieldset', { className: 'checks sfm-checks' },
      h('legend', { className: 'visually-hidden' }, S.title),
      S.items.map(function (item) {
        var input = h('input', { type: 'checkbox', name: 'setup', value: item.id });
        input.checked = state.done.indexOf(item.id) !== -1;
        input.addEventListener('change', function () {
          var ticked = state.done.filter(function (d) { return d !== item.id; });
          if (input.checked) ticked.push(item.id);
          state.done = L.CHECKLIST.filter(function (d) { return ticked.indexOf(d) !== -1; });
          edited();
        });
        return h('label', { className: 'check' }, input,
          h('span', null, PDFS.checkText(item, r),
            item.link ? [' ', MIM.extLink(links.appWeb, item.link)] : null));
      }));

    return [
      title(S.title),
      h('p', null, S.intro),
      checks,
      h('p', { className: 'sfm-closing' }, S.closing)
    ];
  }

  // Under the Step 6 card: the PDFs, the optional email sign-up, start again.
  function setupExtras() {
    var K = C.keep;
    var hasGap = figures().G > 0;
    var status = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    var keep = h('section', { className: 'card sfm-keep', 'aria-labelledby': 'keep-heading' },
      h('h2', { className: 'h3', id: 'keep-heading' }, K.heading),
      h('p', null, K.body + (hasGap ? ' ' + K.partnerBody : '')),
      h('div', { className: 'button-row' }, pdfButton('plan', status), hasGap ? pdfButton('partner', status) : null),
      status);

    var confirm = makeConfirm();
    var again = h('button', { type: 'button', className: 'link-button' }, C.setup.startAgain);
    again.addEventListener('click', function () {
      confirm.ask(C.intro.startAgainConfirm, C.ui.clearYes, C.ui.clearNo, startFresh, again);
    });

    return [keep, emailSection(), h('div', null, h('p', { className: 'sfm-again' }, again), confirm)];
  }

  /* ---------------- PDFs and email ---------------- */

  function pdfButton(kind, status) {
    var K = C.keep;
    var btn = h('button', { type: 'button', className: 'btn ' + (kind === 'plan' ? 'btn-primary' : 'btn-secondary') },
      kind === 'plan' ? K.planButton : K.partnerButton);
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      status.textContent = K.working;
      var r = figures();
      window.MIMPdf.download(kind === 'plan' ? PDFS.plan(state, r) : PDFS.partner(state, r)).then(function (how) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        status.textContent = how === 'pdf' ? K.done : K.printed;
      });
    });
    return btn;
  }

  function emailSection() {
    var ml = config.mailerlite || {};
    var own = config.savingForMission || {};
    // This page's sign-up has its own wording (config.js > savingForMission),
    // because it sends the tool's name rather than a Baby Step.
    if (own.consentText) ml.consentText = own.consentText;
    if (own.successMessage) ml.successMessage = own.successMessage;
    var hidden = {};
    hidden[ml.toolField || 'tool'] = own.tag || 'saving-for-mission';
    return MIM.emailForm({
      heading: C.email.heading,
      intro: C.email.intro,
      buttonLabel: C.email.button,
      hiddenFields: hidden,
      stepLabel: C.intro.title
    });
  }

  /* ---------------- Start ---------------- */

  // After a page reload, pick up on the same step if there's a saved plan.
  var initial = null;
  try { initial = history.state; } catch (e) { initial = null; }
  if (initial && initial.mimMission && initial.screen !== 'intro' && L.hasData(state)) {
    depth = initial.depth || 0;
    trail = [];
    trail[depth] = initial.screen;
    screen = validScreen(initial.screen);
  } else {
    try { history.replaceState({ mimMission: true, screen: 'intro', depth: 0 }, ''); } catch (e) { /* fine */ }
  }
  render(false);
})();
