/*
 * Christmas Without Debt: the two PDFs.
 *   plan(state, figures)  "My Debt-Free Christmas Plan": the headline, the gift
 *                         list with bought and wrapped boxes, everything else,
 *                         the payday tracker and a pledge to sign
 *   list(state, figures)  "Christmas shopping list": names, budgets and ideas,
 *                         with columns for bought and spent
 * Each returns the options for MIMPdf.download() in /assets/pdf.js, which adds
 * the header and footer and makes the file on the person's device. Both are
 * one A4 page: with a long list the rows get tighter and the type smaller.
 * Words are in content.js. Styles are the xm-pdf-* classes in christmas.css.
 */

window.MIMChristmasPdfs = (function () {
  'use strict';

  var L = window.MIMChristmasLogic;
  var C = window.MIM_CHRISTMAS_CONTENT;
  var MIM = window.MIM;
  var h = MIM.h;

  // Roomier rows for a short list, tighter ones for a long one. The last
  // two shrink the type, and the very last cuts long gift ideas to one line,
  // for very long lists or big device fonts.
  var DENSITIES = ['is-roomy', '', 'is-many', 'is-dense', 'is-dense is-squeezed', 'is-dense is-squeezed is-trimmed'];
  var PAGE_HEIGHT = 1120; // A4 at 96dpi, the same limit assets/pdf.js uses

  function money(pounds) { return L.formatMoney(pounds); }
  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (match, key) {
      return values[key] !== undefined ? values[key] : match;
    });
  }
  function filled(s) { return typeof s === 'string' && s.trim() !== ''; }
  // "A good book from the shop on the high…"
  function shorten(text, max) {
    if (!text || text.length <= max) return text;
    var cut = text.slice(0, max - 1);
    var space = cut.lastIndexOf(' ');
    return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:-]+$/, '') + '…';
  }
  function trimmed(density) { return density.indexOf('is-trimmed') !== -1; }
  function box(done) { return h('span', { className: 'pdf-box xm-pdf-box' + (done ? ' is-done' : '') }, done ? '✓' : ''); }

  // The presents actually being bought, after any ideas from step 4.
  function gifts(r) {
    var P = C.plan;
    var rows = r.people.filter(function (p) { return !p.removed; }).map(function (p) {
      var idea = filled(p.idea) ? p.idea.trim() : '';
      if (p.homemade) idea = P.homemadeTag + (idea ? ': ' + idea : '');
      return { id: p.id, name: filled(p.name) ? p.name.trim() : '…', idea: idea, budget: p.budget };
    });
    if (r.santa !== null) rows.push({ id: L.SANTA_ID, name: P.santaLine, idea: P.santaIdea, budget: r.santa });
    return rows;
  }

  function lineLabel(l) {
    if (l.label !== null) return filled(l.label) ? l.label.trim() : C.extras.ownHeading;
    var item = C.extras.items.filter(function (i) { return i.id === l.id; })[0];
    return item ? item.label : l.id;
  }

  // Measures a sheet off-screen, as it is and with pdf.js's tighter spacing.
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

  // Picks the roomiest rows that fit on one page, with pdf.js's tighter
  // spacing if that's what it takes (it adds that by itself), before
  // shrinking the type.
  function fit(opts, build) {
    var last = null;
    for (var i = 0; i < DENSITIES.length; i++) {
      var content = build(DENSITIES[i]);
      var heights = sheetHeights(Object.assign({}, opts, { content: content }));
      last = content;
      if (Math.min(heights.plain, heights.compact) <= PAGE_HEIGHT) break;
    }
    return Object.assign({}, opts, { content: last });
  }

  /* ---------------- My Debt-Free Christmas Plan ---------------- */

  function hero(r) {
    var P = C.pdf.plan;
    var head = r.headline;
    var main, sub;
    if (head.kind === 'covered' || head.kind === 'need') {
      main = fill(P.saveEach, { amount: money(head.amount) });
      sub = fill(P.paidBy, { date: L.formatDayMonth(head.date) });
    } else if (head.kind === 'already') {
      main = C.plan.already;
      sub = C.plan.alreadyMore;
    } else if (head.kind === 'noPaydays') {
      main = fill(C.plan.noPaydays, { short: money(r.short) });
      sub = C.plan.noPaydaysMore;
    } else {
      main = head.kind === 'needPayday' ? C.plan.needPayday : C.plan.empty;
    }
    var stats = [];
    if (r.cost > 0) stats.push(fill(P.costs, { amount: money(r.cost) }));
    if (r.saved > 0) stats.push(fill(P.saved, { amount: money(r.saved) }));
    if (r.pay.status === 'ok') stats.push(fill(P.paydays, { count: r.paydays + ' ' + (r.paydays === 1 ? C.ui.payday : C.ui.paydays) }));
    var long = main.length > 40;
    return h('div', { className: 'xm-pdf-hero' },
      h('div', null,
        h('p', { className: 'xm-pdf-main' + (long ? ' is-long' : '') }, main),
        sub ? h('p', { className: 'xm-pdf-sub' }, sub) : null),
      stats.length ? h('ul', { className: 'xm-pdf-stats' }, stats.map(function (s) { return h('li', null, s); })) : null);
  }

  function tracker(state, r) {
    var P = C.pdf.plan;
    if (!r.tracker.length) return null;
    var many = r.tracker.length > 26 ? ' is-many' : r.tracker.length > 13 ? ' is-some' : '';
    return h('div', { className: 'pdf-section xm-pdf-tracker-block' },
      h('p', { className: 'pdf-h2' }, P.tracker, ' ',
        h('span', { className: 'xm-pdf-h2-hint' }, fill(P.trackerEach, { amount: money(r.tracker[0].amount) }) + ' ' + P.trackerHint)),
      h('div', { className: 'xm-pdf-tracker' + many }, r.tracker.map(function (t) {
        return h('div', { className: 'xm-pdf-payday' + (t.covers ? ' is-covers' : '') },
          h('span', { className: 'xm-pdf-payday-date' }, L.formatShort(t.date)),
          box(state.putAside.indexOf(t.key) !== -1),
          t.covers ? h('span', { className: 'xm-pdf-payday-flag' }, C.plan.paidFor) : null);
      })));
  }

  function giftTable(state, r, density) {
    var P = C.pdf.plan;
    var rows = gifts(r);
    var body = rows.length ? rows.map(function (g) {
      var idea = trimmed(density) ? shorten(g.idea, Math.max(14, 44 - g.name.length)) : g.idea;
      return h('tr', null,
        h('td', { className: 'xm-pdf-who' },
          h('span', { className: 'xm-pdf-name' }, g.name),
          idea ? h('span', { className: 'xm-pdf-idea' }, idea) : null),
        h('td', { className: 'xm-pdf-money' }, money(g.budget)),
        h('td', { className: 'xm-pdf-check' }, box(state.bought.indexOf(g.id) !== -1)),
        h('td', { className: 'xm-pdf-check' }, box(state.wrapped.indexOf(g.id) !== -1)));
    }) : [h('tr', null, h('td', { colspan: '4', className: 'pdf-muted' }, C.plan.noGifts))];
    return h('div', { className: 'pdf-section' },
      h('p', { className: 'pdf-h2' }, P.gifts),
      h('table', { className: 'xm-pdf-table xm-pdf-gifts ' + density },
        h('thead', null, h('tr', null,
          h('th', null, ''), h('th', { className: 'xm-pdf-money' }, P.budget),
          h('th', { className: 'xm-pdf-check' }, P.bought), h('th', { className: 'xm-pdf-check' }, P.wrapped))),
        h('tbody', null, body),
        h('tfoot', null, h('tr', null,
          h('td', null, P.giftTotal), h('td', { className: 'xm-pdf-money' }, money(r.gifts)), h('td', null, ''), h('td', null, '')))));
  }

  function extrasTable(r, density) {
    var P = C.pdf.plan;
    var lines = r.lines.filter(function (l) { return l.amount > 0; });
    return h('div', { className: 'pdf-section' },
      h('p', { className: 'pdf-h2' }, P.extras),
      h('table', { className: 'xm-pdf-table xm-pdf-extras ' + density },
        h('tbody', null, lines.length ? lines.map(function (l) {
          return h('tr', null, h('td', null, lineLabel(l)), h('td', { className: 'xm-pdf-money' }, money(l.amount)));
        }) : h('tr', null, h('td', { className: 'pdf-muted', colspan: '2' }, C.plan.extrasNone))),
        h('tfoot', null, h('tr', null, h('td', null, P.total), h('td', { className: 'xm-pdf-money' }, money(r.extras))))));
  }

  function addsUp(r) {
    var P = C.pdf.plan;
    var rows = [[P.cost, money(r.cost)], [fill(P.have, { cutoff: L.formatDayMonth(r.cutoff) }), money(r.available)]];
    if (r.short > 0) rows.push([P.short, money(r.short), 'is-short']);
    else rows.push([P.spare, money(r.spare), 'is-spare']);
    return h('div', { className: 'pdf-section xm-pdf-adds' },
      h('p', { className: 'pdf-h2' }, P.adds),
      h('table', { className: 'xm-pdf-table' }, h('tbody', null, rows.map(function (row) {
        return h('tr', { className: row[2] || null }, h('td', null, row[0]), h('td', { className: 'xm-pdf-money' }, row[1]));
      }))));
  }

  function pledge() {
    var P = C.pdf.plan;
    return h('div', { className: 'xm-pdf-pledge' },
      h('p', { className: 'xm-pdf-pledge-title' }, P.pledge),
      h('p', { className: 'xm-pdf-sign' }, h('span', null, P.signed), h('span', { className: 'xm-pdf-rule' })),
      h('p', { className: 'xm-pdf-sign' }, h('span', null, P.signed), h('span', { className: 'xm-pdf-rule' })));
  }

  function planContent(state, r, density) {
    var P = C.pdf.plan;
    var links = MIM.links;
    var help = r.worried ? h('p', { className: 'xm-pdf-help' }, P.help + ' ' +
      (MIM.config.debtHelp || []).map(function (org) { return org.name; }).join(', ')) : null;
    return [
      hero(r),
      tracker(state, r),
      h('div', { className: 'xm-pdf-cols' },
        giftTable(state, r, density),
        h('div', null, extrasTable(r, density), r.cost > 0 ? addsUp(r) : null)),
      pledge(),
      h('div', { className: 'xm-pdf-end' },
        help,
        h('p', { className: 'pdf-quote xm-pdf-verse' }, '“' + C.plan.verse.text + '”  ' + C.plan.verse.ref),
        h('div', { className: 'pdf-app' },
          h('p', null, h('strong', null, P.app), '  ', h('a', { href: links.appWeb }, window.MIMPdf.prettyUrl(links.appWeb)))))
    ];
  }

  function plan(state, r) {
    var P = C.pdf.plan;
    return fit({
      filename: P.filename,
      eyebrow: C.pdf.eyebrow,
      title: P.title,
      subtitle: fill(P.subtitle, { year: r.christmas.y }),
      onePage: true
    }, function (density) { return planContent(state, r, density); });
  }

  /* ---------------- Christmas shopping list ---------------- */

  function listContent(state, r, density) {
    var S = C.pdf.list;
    var rows = gifts(r);
    var body = rows.length ? rows.map(function (g, i) {
      return h('tr', null,
        h('td', { className: 'xm-pdf-num' }, String(i + 1)),
        h('td', { className: 'xm-pdf-name' }, g.name),
        h('td', { className: 'xm-pdf-idea-cell' }, trimmed(density) ? shorten(g.idea, 54) : g.idea),
        h('td', { className: 'xm-pdf-money' }, money(g.budget)),
        h('td', { className: 'xm-pdf-check' }, box(state.bought.indexOf(g.id) !== -1)),
        h('td', { className: 'xm-pdf-spent' }, h('span', { className: 'xm-pdf-blank' }, '£')));
    }) : [h('tr', null, h('td', { colspan: '6', className: 'pdf-muted' }, S.empty))];

    return [
      h('p', { className: 'xm-pdf-list-intro' }, fill(S.intro, { amount: money(r.gifts) })),
      h('table', { className: 'xm-pdf-table xm-pdf-list ' + density },
        h('thead', null, h('tr', null,
          h('th', { className: 'xm-pdf-num' }, ''), h('th', null, S.name), h('th', null, S.idea),
          h('th', { className: 'xm-pdf-money' }, S.budget), h('th', { className: 'xm-pdf-check' }, S.bought),
          h('th', { className: 'xm-pdf-spent' }, S.spent))),
        h('tbody', null, body),
        h('tfoot', null, h('tr', null,
          h('td', null, ''), h('td', null, S.total), h('td', null, ''),
          h('td', { className: 'xm-pdf-money' }, money(r.gifts)), h('td', null, ''),
          h('td', { className: 'xm-pdf-spent' }, h('span', { className: 'xm-pdf-blank' }, '£')))))
    ];
  }

  function list(state, r) {
    var S = C.pdf.list;
    return fit({
      filename: S.filename,
      eyebrow: C.pdf.eyebrow,
      title: S.title,
      subtitle: fill(S.subtitle, { year: r.christmas.y }),
      onePage: true
    }, function (density) { return listContent(state, r, density); });
  }

  return { plan: plan, list: list };
})();
