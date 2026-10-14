/*
 * Saving for Mission Builder: the two PDFs.
 *   plan(plan, figures)     "My Mission Cost Plan": all six steps, A to G, the checklist
 *   partner(plan, figures)  "Partner with me": one page to share with supporters
 * Each returns the options for MIMPdf.download() in /assets/pdf.js, which
 * adds the header and footer and makes the file on the person's device.
 * Words are in content.js. Styles are the sfm-pdf-* classes in builder.css.
 */

window.MIMMissionPdfs = (function () {
  'use strict';

  var L = window.MIMMissionLogic;
  var C = window.MIM_MISSION_CONTENT;
  var MIM = window.MIM;
  var h = MIM.h;

  function money(pounds) { return L.formatMoney(pounds); }
  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (match, key) {
      return values[key] !== undefined ? values[key] : match;
    });
  }
  function filled(s) { return typeof s === 'string' && s.trim() !== ''; }
  function letter(l) { return h('span', { className: 'sfm-pdf-letter' }, l); }
  function letterLabel(l) { return [letter(l), C.letters[l].label]; }

  // A two-column list of label and amount. rows: [label, value, className]
  // Amounts stay on one line; words (where, when) can wrap.
  function rows(list) {
    return h('table', { className: 'sfm-pdf-rows' }, h('tbody', null, list.map(function (row) {
      var words = typeof row[1] === 'string' && !/^[+−-]?\s?£|^\d/.test(row[1]);
      return h('tr', { className: row[2] || null }, h('td', null, row[0]), h('td', { className: words ? 'sfm-pdf-text' : null }, row[1]));
    })));
  }

  function stepBlock(n, body) {
    return h('div', { className: 'sfm-pdf-step' },
      h('p', { className: 'sfm-pdf-step-head' }, h('span', { className: 'sfm-pdf-num' }, String(n)), C.stepNames[n - 1]),
      body);
  }

  function itemLabel(id) {
    var item = C.costs.items.filter(function (i) { return i.id === id; })[0];
    return item ? item.label : id;
  }

  /* ---------------- My Mission Cost Plan ---------------- */

  function strip(r) {
    return h('div', { className: 'sfm-pdf-strip' }, L.LETTERS.map(function (l) {
      return h('div', { className: 'sfm-pdf-tile' + (l === 'G' ? ' is-gap' : '') },
        h('span', { className: 'sfm-pdf-tile-head' }, letter(l), h('span', null, C.letters[l].label)),
        h('span', { className: 'sfm-pdf-tile-value' }, money(r[l])));
    }));
  }

  function plan(state, r) {
    var P = C.pdf.plan;
    var m = state.mission;
    var months = r.months === null ? P.notSet : r.months + ' ' + (r.months === 1 ? C.ui.month : C.ui.months);

    var s1 = rows([
      [P.where, filled(m.where) ? m.where : P.notSet],
      [P.away, L.formatRange(m.leave, m.back) || P.notSet],
      [P.due, L.formatDate(m.due) || P.notSet],
      [P.months, months]
    ]);

    var costRows = L.costLines(state).filter(function (line) { return line.pence > 0; }).map(function (line) {
      return [line.id === 'other' ? (filled(line.label) ? line.label : C.costs.otherHeading) : itemLabel(line.id), money(line.pence / 100)];
    });
    if (!costRows.length) costRows.push([P.nothing, '']);
    costRows.push([letterLabel('A'), money(r.A), 'is-total']);

    var handRows = [];
    if (L.toPence(state.savings)) handRows.push([P.savings, money(L.toPence(state.savings) / 100)]);
    state.sell.forEach(function (item) {
      if (L.toPence(item.amount)) handRows.push([fill(P.sold, { what: filled(item.label) ? item.label : '…' }), money(L.toPence(item.amount) / 100)]);
    });
    if (L.toPence(state.promised)) handRows.push([P.promised, money(L.toPence(state.promised) / 100)]);
    if (!handRows.length) handRows.push([P.nothing, '']);
    handRows.push([letterLabel('B'), money(r.B), 'is-total']);
    var debtNote = r.debtWorry ? h('p', { className: 'sfm-pdf-debt' }, P.debt + ' ' +
      ((MIM.config.debtHelp || []).map(function (org) { return org.name; }).join(', '))) : null;

    var fundRows = [
      [letterLabel('C'), money(r.C), 'is-total'],
      [C.fund.monthsUntil, r.months === null ? P.notSet : String(r.months)],
      [letterLabel('D'), r.D === null ? '—' : fill(C.ui.perMonth, { amount: money(r.D) }), 'is-total'],
      [C.fund.marginToday, money(r.margin)]
    ];
    state.cuts.forEach(function (cut) {
      if (L.toPence(cut.amount)) fundRows.push([C.fund.rs[cut.r] + ': ' + (filled(cut.label) ? cut.label : '…'), '+' + money(L.toPence(cut.amount) / 100)]);
    });
    state.income.forEach(function (inc) {
      if (L.toPence(inc.amount)) fundRows.push([C.fund.extra + ': ' + (filled(inc.label) ? inc.label : '…'), '+' + money(L.toPence(inc.amount) / 100)]);
    });
    fundRows.push([letterLabel('E'), fill(C.ui.perMonth, { amount: money(r.E) }), 'is-total']);
    fundRows.push([letterLabel('F'), money(r.F), 'is-total']);

    var gapBody;
    if (!r.hasCosts) gapBody = h('p', null, C.gap.needCosts);
    else if (r.G === null) gapBody = h('p', null, C.gap.needDue);
    else gapBody = [
      h('p', { className: 'sfm-pdf-gap' }, letter('G'), h('span', null, C.letters.G.label), h('strong', null, money(r.G))),
      h('p', { className: 'sfm-pdf-small' }, h('strong', null, r.funded ? C.gap.fundedHeading + '. ' : C.gap.faithHeading + '. '),
        r.funded ? C.gap.fundedBody : C.gap.faithBody)
    ];
    var people = state.people.filter(filled);
    var invite = !r.funded && people.length ? h('div', null,
      h('p', { className: 'sfm-pdf-sub' }, P.invite),
      h('p', { className: 'sfm-pdf-small' }, people.join(', '))) : null;

    var checklist = h('ul', { className: 'pdf-checklist sfm-pdf-checklist' }, C.setup.items.map(function (item) {
      var done = state.done.indexOf(item.id) !== -1;
      return h('li', null,
        h('span', { className: 'pdf-box' + (done ? ' is-done' : '') }, done ? '✓' : ''),
        h('span', null, checkText(item, r)));
    }));

    var content = [
      strip(r),
      h('div', { className: 'sfm-pdf-cols' },
        h('div', null,
          stepBlock(1, s1),
          stepBlock(2, rows(costRows)),
          stepBlock(3, [rows(handRows), debtNote])),
        h('div', null,
          stepBlock(4, rows(fundRows)),
          stepBlock(5, [gapBody, invite]),
          stepBlock(6, checklist))),
      h('p', { className: 'sfm-pdf-closing' }, C.setup.closing),
      h('div', { className: 'pdf-app sfm-pdf-app' },
        h('p', { className: 'pdf-small' }, P.app + ' ',
          h('a', { href: MIM.links.appWeb }, window.MIMPdf.prettyUrl(MIM.links.appWeb))))
    ];

    return {
      filename: P.filename,
      eyebrow: C.pdf.eyebrow,
      title: P.title,
      subtitle: filled(m.where) ? m.where : null,
      content: content,
      onePage: true
    };
  }

  // Checklist wording with the person's own figures filled in.
  function checkText(item, r) {
    if (item.id === 'standing') return r.E ? fill(item.text, { E: money(r.E) }) : item.noFigure;
    if (item.id === 'pray') return r.G ? fill(item.text, { G: money(r.G) }) : item.noFigure;
    return item.text;
  }

  /* ---------------- Partner with me ---------------- */

  function thermometer(r, state) {
    var P = C.pdf.partner;
    var A = r.A || 0;
    var hand = Math.min(r.B || 0, A);
    var saving = Math.min(r.F || 0, A - hand);
    var HEIGHT = 470;
    function px(x) { return A ? Math.round(x / A * HEIGHT) : 0; }

    var scale = h('div', { className: 'sfm-thermo-scale', style: 'height:' + HEIGHT + 'px' },
      [1, 0.75, 0.5, 0.25, 0].map(function (f) {
        return h('span', { className: 'sfm-thermo-tick', style: 'bottom:' + Math.round(f * HEIGHT) + 'px' }, money(Math.round(A * f)));
      }));
    var tube = h('div', { className: 'sfm-thermo-tube', style: 'height:' + HEIGHT + 'px' },
      [0.25, 0.5, 0.75].map(function (f) {
        return h('span', { className: 'sfm-thermo-line', style: 'bottom:' + Math.round(f * HEIGHT) + 'px' });
      }),
      h('span', { className: 'sfm-thermo-hand', style: 'height:' + px(hand) + 'px' }),
      h('span', { className: 'sfm-thermo-saving', style: 'bottom:' + px(hand) + 'px;height:' + px(saving) + 'px' }));

    var savingLabel = filled(state.mission.due) ? fill(P.saving, { date: L.formatDate(state.mission.due) }) : P.savingNoDate;
    return h('div', { className: 'sfm-thermo' },
      h('p', { className: 'sfm-pdf-sub' }, P.thermo),
      h('div', { className: 'sfm-thermo-body' },
        scale,
        h('div', { className: 'sfm-thermo-col' }, tube, h('span', { className: 'sfm-thermo-bulb' }))),
      h('ul', { className: 'sfm-thermo-legend' },
        h('li', null, h('span', { className: 'sfm-swatch is-hand' }), h('span', null, P.inHand), h('strong', null, money(r.B))),
        h('li', null, h('span', { className: 'sfm-swatch is-saving' }), h('span', null, savingLabel), h('strong', null, money(r.F))),
        h('li', null, h('span', { className: 'sfm-swatch is-gap' }), h('span', null, P.gap), h('strong', null, money(r.G)))),
      h('p', { className: 'sfm-pdf-small sfm-pdf-muted' }, P.colourIn));
  }

  function partner(state, r) {
    var P = C.pdf.partner;
    var F = C.gap.partnerFigures;
    var m = state.mission;

    var facts = [];
    var away = L.formatRange(m.leave, m.back);
    if (away) facts.push([P.when, away]);
    if (L.formatDate(m.due)) facts.push([P.due, L.formatDate(m.due)]);

    var note = filled(state.note) ? h('div', { className: 'sfm-pdf-note' },
      state.note.split(/\n+/).filter(filled).map(function (p) { return h('p', null, p); })) : null;

    function figure(l, value, extra) {
      return h('div', { className: 'sfm-pdf-figure' + (extra ? ' ' + extra : '') },
        h('span', { className: 'sfm-pdf-figure-label' }, F[l]),
        h('span', { className: 'sfm-pdf-figure-value' }, value));
    }

    var left = h('div', null,
      facts.length ? rows(facts) : null,
      note,
      h('div', { className: 'sfm-pdf-figures' },
        figure('A', money(r.A)),
        figure('B', money(r.B)),
        figure('E', money(r.E)),
        figure('G', money(r.G), 'is-gap')),
      filled(state.name)
        ? h('p', { className: 'sfm-pdf-signoff' }, P.from, h('br'), state.name.trim())
        : h('p', { className: 'sfm-pdf-signoff' }, P.thanks));

    return {
      filename: P.filename,
      eyebrow: C.pdf.eyebrow,
      title: P.title,
      subtitle: filled(m.where) ? m.where : null,
      content: [h('div', { className: 'sfm-pdf-partner' }, left, thermometer(r, state))],
      onePage: true
    };
  }

  return { plan: plan, partner: partner, checkText: checkText };
})();
