/*
 * "Which Baby Step am I on?" quiz: the page.
 * Rules are in logic.js, words are in content.js, links are in
 * /assets/config.js. This file just puts them on screen.
 */

(function () {
  'use strict';

  var L = window.MIMQuizLogic;
  var C = window.MIM_QUIZ_CONTENT;
  var MIM = window.MIM;
  var app = document.getElementById('quiz-app');
  if (!app || !L || !C || !MIM) return;

  var h = MIM.h;
  var links = MIM.links;
  var config = MIM.config;
  var STORAGE_KEY = 'mim.quiz.v1';
  var STEPS = {};
  (window.MIM_BABY_STEPS || []).forEach(function (s) { STEPS[s.id] = s; });

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = { answers: {}, screen: 'intro' };
  // Mirror of our browser-history entries, so Back can use the browser's
  // history when it matches and the phone's back gesture works too.
  var trail = ['intro'];
  var depth = 0;
  var busy = false;
  var flash = '';

  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (match, key) {
      return values[key] !== undefined ? values[key] : match;
    });
  }
  function stepLabel(id) { return 'Step ' + id; }

  /* ---------------- Saving ---------------- */

  function save() {
    MIM.storage.set(STORAGE_KEY, { answers: state.answers, savedAt: new Date().toISOString() });
  }
  function loadSaved() {
    var data = MIM.storage.get(STORAGE_KEY);
    if (!data || typeof data !== 'object') return null;
    var answers = L.sanitize(data.answers);
    return Object.keys(answers).length ? answers : null;
  }
  function forget() {
    MIM.storage.remove(STORAGE_KEY);
  }

  /* ---------------- Moving between screens ---------------- */

  function isQuestion(screen) { return L.QUESTION_ORDER.indexOf(screen) !== -1; }

  // Makes sure a screen still makes sense for the current answers.
  function validScreen(screen) {
    if (screen === 'intro') return 'intro';
    if (screen === 'result') return L.isComplete(state.answers) ? 'result' : L.firstUnanswered(state.answers);
    if (isQuestion(screen) && L.isAsked(screen, state.answers)) return screen;
    return L.firstUnanswered(state.answers) || 'result';
  }

  // mode: 'push' (new history entry), 'replace' or 'none'
  function show(screen, mode, focus) {
    state.screen = validScreen(screen);
    try {
      if (mode === 'push') {
        trail.length = depth + 1;
        trail.push(state.screen);
        depth += 1;
        history.pushState({ mimQuiz: true, screen: state.screen, depth: depth }, '');
      } else if (mode === 'replace') {
        trail[depth] = state.screen;
        history.replaceState({ mimQuiz: true, screen: state.screen, depth: depth }, '');
      }
    } catch (e) { /* history not available: the quiz still works */ }
    render(focus !== false);
  }

  function previousScreen(screen) {
    var seq = L.sequence(state.answers);
    if (screen === 'result') return seq[seq.length - 1];
    var i = seq.indexOf(screen);
    return i > 0 ? seq[i - 1] : 'intro';
  }

  function goBack() {
    var prev = previousScreen(state.screen);
    if (depth > 0 && trail[depth - 1] === prev) {
      history.back();
    } else {
      show(prev, 'replace');
    }
  }

  window.addEventListener('popstate', function (event) {
    var entry = event.state;
    if (!entry || !entry.mimQuiz) return;
    depth = entry.depth || 0;
    if (entry.screen !== 'intro' && !Object.keys(state.answers).length) {
      state.answers = loadSaved() || {};
    }
    state.screen = validScreen(entry.screen);
    render(true);
  });

  function answer(id, value) {
    state.answers[id] = value;
    state.answers = L.sanitize(state.answers); // drops follow-ups that no longer apply
    save();
    var seq = L.sequence(state.answers);
    var i = seq.indexOf(id);
    show(i >= 0 && i < seq.length - 1 ? seq[i + 1] : 'result', 'push');
  }

  function startFresh() {
    forget();
    state.answers = {};
    show(L.QUESTION_ORDER[0], 'push');
  }

  function clearAll() {
    forget();
    state.answers = {};
    flash = C.ui.cleared;
    show('intro', 'replace');
  }

  // The footer's "Clear my answers" button
  document.addEventListener('mim:cleared', function () {
    state.answers = {};
    flash = C.ui.cleared;
    show('intro', 'replace');
  });

  /* ---------------- Rendering ---------------- */

  function render(moveFocus) {
    var nodes;
    if (state.screen === 'intro') nodes = renderIntro();
    else if (state.screen === 'result') nodes = renderResult();
    else nodes = renderQuestion(state.screen);

    app.textContent = '';
    MIM.append(app, nodes);
    document.title = (state.screen === 'result'
      ? fill(C.result.youreOn, { step: stepLabel(L.evaluate(state.answers).step) })
      : C.intro.title) + ' | Money in Motion';

    if (moveFocus) {
      var heading = app.querySelector('[data-focus-first]') || app.querySelector('h1');
      window.scrollTo(0, 0);
      if (heading) heading.focus({ preventScroll: true });
    }
  }

  /* Intro */

  function renderIntro() {
    var saved = loadSaved();
    var intro = C.intro;
    var nodes = [
      h('div', { className: 'band intro-band' },
        h('p', { className: 'eyebrow' }, intro.eyebrow),
        h('h1', { className: 'display', tabindex: '-1' }, intro.title),
        h('p', { className: 'lead' }, intro.lead)),
      h('ul', { className: 'intro-points' }, intro.points.map(function (p) { return h('li', null, p); }))
    ];

    if (flash) {
      nodes.push(h('p', { className: 'form-status', role: 'status' }, flash));
      flash = '';
    }

    if (saved && L.isComplete(saved)) {
      var savedStep = L.evaluate(saved).step;
      nodes.push(h('div', { className: 'card welcome-back' },
        h('p', null, fill(intro.welcomeBackDone, { step: stepLabel(savedStep) })),
        h('div', { className: 'button-row' },
          h('button', { type: 'button', className: 'btn btn-primary', onClick: function () { state.answers = saved; show('result', 'push'); } }, intro.seeResult),
          h('button', { type: 'button', className: 'btn btn-secondary', onClick: startFresh }, intro.startAgain)
        )
      ));
    } else if (saved) {
      nodes.push(h('div', { className: 'card welcome-back' },
        h('p', null, intro.welcomeBackPart),
        h('div', { className: 'button-row' },
          h('button', { type: 'button', className: 'btn btn-primary', onClick: function () { state.answers = saved; show(L.firstUnanswered(saved), 'push'); } }, intro.carryOn),
          h('button', { type: 'button', className: 'btn btn-secondary', onClick: startFresh }, intro.startAgain)
        )
      ));
    } else {
      nodes.push(h('div', { className: 'button-row' },
        h('button', { type: 'button', className: 'btn btn-primary', onClick: startFresh }, intro.start)
      ));
    }

    nodes.push(h('details', { className: 'steps-details' },
      h('summary', null, intro.stepsSummary),
      h('div', { className: 'steps-details-body' },
        h('ol', { className: 'ladder', role: 'list' }, (window.MIM_BABY_STEPS || []).map(function (s) {
          return h('li', null,
            h('span', { className: 'ladder-num', 'aria-hidden': 'true' }, s.id),
            h('span', null,
              h('span', { className: 'ladder-title' }, h('span', { className: 'visually-hidden' }, stepLabel(s.id) + ': '), s.title),
              h('span', { className: 'ladder-desc' }, s.summary)
            )
          );
        })),
        h('p', { className: 'small muted' }, window.MIM_BABY_STEPS_NOTE || '')
      )
    ));
    return nodes;
  }

  /* Questions */

  function renderQuestion(id) {
    var q = C.questions[id];
    var number = L.QUESTION_NUMBER[id];
    var total = L.TOTAL_QUESTIONS;
    var countText = fill(C.ui.questionCount, { n: number, total: total });
    var hasHelp = q.help && q.help.length;

    var top = h('div', { className: 'quiz-top' },
      h('button', { type: 'button', className: 'back-button', onClick: goBack },
        h('span', { 'aria-hidden': 'true' }, '←'), ' ' + C.ui.back),
      h('span', { className: 'quiz-count' }, countText)
    );
    var progress = h('div', {
      className: 'progress', role: 'progressbar', 'aria-label': 'Quiz progress',
      'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(number), 'aria-valuetext': countText
    }, h('div', { className: 'progress-fill', style: 'width:' + Math.round(number / total * 100) + '%' }));

    var heading = h('h1', { className: 'question-title', id: 'q-title', tabindex: '-1' }, q.text);
    var help = hasHelp ? h('div', { className: 'question-help', id: 'q-help' }, q.help.map(function (p) { return h('p', null, p); })) : null;

    return [top, progress, heading, help, q.multi ? renderChecks(id, q) : renderOptions(id, q, hasHelp)];
  }

  function renderOptions(id, q, hasHelp) {
    var current = state.answers[id];
    var list = h('ul', { className: 'options', role: 'list' });
    var buttons = [];
    q.options.forEach(function (opt) {
      var btn = h('button', {
        type: 'button', className: 'option', 'aria-pressed': String(current === opt.value)
      }, h('span', { className: 'option-dot', 'aria-hidden': 'true' }), h('span', null, opt.label));
      btn.addEventListener('click', function () {
        if (busy) return;
        busy = true;
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        // A brief pause so people see their choice land.
        setTimeout(function () { busy = false; answer(id, opt.value); }, reduceMotion ? 0 : 180);
      });
      buttons.push(btn);
      list.appendChild(h('li', null, btn));
    });
    return h('div', { role: 'group', 'aria-labelledby': 'q-title', 'aria-describedby': hasHelp ? 'q-help' : null }, list);
  }

  function renderChecks(id, q) {
    var current = Array.isArray(state.answers[id]) ? state.answers[id] : [];
    var fieldset = h('fieldset', { className: 'checks', 'aria-describedby': q.help && q.help.length ? 'q-help' : null },
      h('legend', { className: 'visually-hidden' }, q.text));
    q.options.forEach(function (opt) {
      var input = h('input', { type: 'checkbox', name: id, value: opt.value });
      input.checked = current.indexOf(opt.value) !== -1;
      fieldset.appendChild(h('label', { className: 'check' }, input, h('span', null, opt.label)));
    });
    var next = h('button', { type: 'button', className: 'btn btn-primary btn-block checks-continue' }, C.ui.continue);
    next.addEventListener('click', function () {
      var ticked = Array.prototype.map.call(fieldset.querySelectorAll('input:checked'), function (i) { return i.value; });
      answer(id, ticked);
    });
    return [fieldset, next];
  }

  /* Result */

  function renderResult() {
    var r = L.evaluate(state.answers);
    var copy = C.steps[r.step];
    var meta = STEPS[r.step] || { title: '' };
    var label = stepLabel(r.step);
    var R = C.result;
    var nodes = [];

    if (r.needsDebtHelp) nodes.push(debtHelpBox());

    var videoUrl = (config.videos || {})[r.step];
    var video = MIM.isSet(videoUrl)
      ? h('p', null, MIM.extLink(videoUrl, fill(R.videoLink, { step: label }) + ' (video)', 'btn btn-secondary video-link'))
      : h('p', { className: 'small muted' }, R.videoComingSoon);

    nodes.push(h('section', { className: 'card result-hero', 'aria-labelledby': 'result-title' },
      h('div', { className: 'band result-banner' },
        h('div', { className: 'step-badge', 'aria-hidden': 'true' }, r.step),
        h('h1', { className: 'result-title', id: 'result-title', tabindex: '-1' }, fill(R.youreOn, { step: label })),
        h('p', { className: 'result-subtitle' }, meta.title)),
      h('p', null, copy.meaning),
      r.headingFor ? h('p', { className: 'heading-for' }, headingForText(r.headingFor)) : null,
      h('h2', { className: 'h3' }, R.thisWeek),
      h('ol', { className: 'actions-list', role: 'list' }, copy.actions.map(function (a) { return h('li', null, a); })),
      video,
      copy.faith ? h('p', { className: 'faith-line' }, copy.faith) : null
    ));

    if (r.studentLoanNote) {
      nodes.push(h('section', { className: 'card card-quiet note' },
        h('h2', { className: 'h3' }, C.notes.studentLoan.heading),
        h('p', null, C.notes.studentLoan.body)
      ));
    }
    if (r.giving === 'no') {
      nodes.push(h('section', { className: 'card card-quiet note' },
        h('h2', { className: 'h3' }, C.notes.givingNo.heading),
        h('p', null, C.notes.givingNo.body)
      ));
    } else if (r.giving === 'yes') {
      nodes.push(h('p', { className: 'card card-quiet note' }, C.notes.givingYes));
    }

    nodes.push(h('section', { className: 'card', 'aria-labelledby': 'app-heading' },
      h('h2', { className: 'h3', id: 'app-heading' }, R.app.heading),
      h('p', null, R.app.body),
      h('div', { className: 'button-row' },
        MIM.extLink(links.appIos, R.app.ios, 'btn btn-primary'),
        MIM.extLink(links.appAndroid, R.app.android, 'btn btn-primary'),
        MIM.extLink(links.appWeb, R.app.web, 'btn btn-secondary')
      )
    ));

    nodes.push(keepCard(r));

    nodes.push(MIM.emailForm({
      heading: fill(R.email.heading, { step: label }),
      intro: R.email.intro,
      buttonLabel: R.email.button,
      hiddenFields: (function () {
        var f = {};
        f[(config.mailerlite && config.mailerlite.stepField) || 'baby_step'] = label;
        f.tool = 'quiz';
        return f;
      })(),
      stepLabel: label
    }));

    nodes.push(h('section', { className: 'card', 'aria-labelledby': 'ladder-heading' },
      h('h2', { className: 'h3', id: 'ladder-heading' }, R.ladder.heading),
      h('p', { className: 'muted' }, R.ladder.intro),
      ladderList(r)
    ));

    nodes.push(MIM.shareRow({ heading: R.share.heading, message: R.share.message, url: MIM.pageUrl() }));

    nodes.push(h('div', { className: 'result-end' },
      h('button', { type: 'button', className: 'btn btn-secondary', onClick: startFresh }, R.startAgain),
      h('button', { type: 'button', className: 'link-button', onClick: clearAll }, R.clear)
    ));

    if (MIM.isSet(links.moneyAndFaith)) {
      nodes.push(h('p', { className: 'small muted' },
        R.moneyAndFaith.text + ' ', MIM.extLink(links.moneyAndFaith, R.moneyAndFaith.link + '.')));
    }

    return h('div', { className: 'stack' }, nodes);
  }

  function headingForText(stepId) {
    return fill(C.result.headingFor, { step: stepLabel(stepId), title: (STEPS[stepId] || {}).title || '' });
  }

  function debtHelpBox() {
    var N = C.notes.debtHelp;
    return h('section', { className: 'care-box', 'aria-labelledby': 'care-heading' },
      h('h2', { id: 'care-heading', tabindex: '-1', 'data-focus-first': true }, N.heading),
      h('p', null, N.body),
      h('ul', { className: 'help-list', role: 'list' }, (config.debtHelp || []).map(function (org) {
        return h('li', null, MIM.extLink(org.url, org.name), h('p', null, org.description));
      })),
      h('p', null, h('strong', null, N.after))
    );
  }

  function ladderTag(item) {
    var T = C.result.ladder;
    if (item.state === 'current') return T.current;
    if (item.state === 'done') return T.done;
    if (item.state === 'skipped') return T.skipped;
    if (item.state === 'extra') return item.relevant ? T.extraRelevant : T.extra;
    return null;
  }

  function ladderList(r) {
    return h('ol', { className: 'ladder', role: 'list' }, r.ladder.map(function (item) {
      var s = STEPS[item.id] || {};
      var tag = ladderTag(item);
      return h('li', { className: 'is-' + item.state, 'aria-current': item.state === 'current' ? 'step' : null },
        h('span', { className: 'ladder-num', 'aria-hidden': 'true' }, item.id),
        h('span', null,
          h('span', { className: 'ladder-title' }, h('span', { className: 'visually-hidden' }, stepLabel(item.id) + ': '), s.title),
          h('span', { className: 'ladder-desc' }, s.short),
          tag ? h('span', { className: 'ladder-tag' }, tag) : null
        )
      );
    }));
  }

  /* PDF */

  function keepCard(r) {
    var K = C.result.keep;
    var status = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    var btn = h('button', { type: 'button', className: 'btn btn-primary' }, K.button);
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      status.textContent = K.working;
      window.MIMPdf.download({
        filename: C.pdf.filename,
        eyebrow: C.pdf.eyebrow,
        title: fill(C.result.youreOn, { step: stepLabel(r.step) }),
        subtitle: (STEPS[r.step] || {}).title,
        content: pdfContent(r)
      }).then(function (how) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        status.textContent = how === 'pdf' ? K.done : K.printed;
      });
    });
    return h('section', { className: 'card', 'aria-labelledby': 'keep-heading' },
      h('h2', { className: 'h3', id: 'keep-heading' }, K.heading),
      h('p', null, K.body),
      h('div', { className: 'button-row' }, btn),
      status
    );
  }

  function pdfContent(r) {
    var copy = C.steps[r.step];
    var P = C.pdf;
    var prettyUrl = window.MIMPdf.prettyUrl;
    var nodes = [];

    if (r.headingFor) nodes.push(h('p', { className: 'pdf-highlight pdf-section' }, headingForText(r.headingFor)));
    nodes.push(h('p', { className: 'pdf-section' }, copy.meaning));

    if (r.needsDebtHelp) {
      var orgs = (config.debtHelp || []).map(function (org) { return org.name + ' (' + prettyUrl(org.url).replace(/^www\./, '').split('/')[0] + ')'; });
      nodes.push(h('div', { className: 'pdf-callout' },
        h('p', { className: 'pdf-h2' }, C.notes.debtHelp.heading),
        h('p', null, P.debtHelp + ' ' + orgs.join('  ·  '))
      ));
    }

    var left = h('div', null,
      h('p', { className: 'pdf-h2' }, P.thisWeek),
      h('ul', { className: 'pdf-checklist pdf-section' }, copy.actions.map(function (a) {
        return h('li', null, h('span', { className: 'pdf-box' }), h('span', null, a));
      })),
      r.studentLoanNote ? h('div', { className: 'pdf-section' },
        h('p', { className: 'pdf-h2' }, C.notes.studentLoan.heading),
        h('p', { className: 'pdf-small' }, C.notes.studentLoan.body)) : null,
      r.giving === 'no' ? h('div', { className: 'pdf-section' },
        h('p', { className: 'pdf-h2' }, C.notes.givingNo.heading),
        h('p', { className: 'pdf-small' }, C.notes.givingNo.body)) : null,
      r.giving === 'yes' ? h('p', { className: 'pdf-small pdf-section' }, C.notes.givingYes) : null,
      copy.faith ? h('p', { className: 'pdf-quote pdf-section' }, copy.faith) : null,
      MIM.isSet((config.videos || {})[r.step]) ? h('p', { className: 'pdf-small' },
        P.video + ' ', h('a', { href: config.videos[r.step] }, prettyUrl(config.videos[r.step]))) : null
    );

    var right = h('div', null,
      h('p', { className: 'pdf-h2' }, P.ladder),
      h('ul', { className: 'pdf-ladder' }, r.ladder.map(function (item) {
        var s = STEPS[item.id] || {};
        return h('li', { className: 'is-' + item.state },
          h('span', { className: 'pdf-ladder-num' }, item.id),
          h('span', { className: 'pdf-ladder-text' },
            h('span', { className: 'pdf-ladder-title' }, s.title,
              item.state === 'current' ? h('span', { className: 'pdf-here' }, C.result.ladder.current) : null),
            h('span', { className: 'pdf-ladder-desc' }, s.short)
          )
        );
      }))
    );
    nodes.push(h('div', { className: 'pdf-grid' }, left, right));

    nodes.push(h('div', { className: 'pdf-app' },
      h('p', null, h('strong', null, P.app)),
      h('p', { className: 'pdf-small' },
        h('a', { href: links.appIos }, 'App Store'), '  ·  ',
        h('a', { href: links.appAndroid }, 'Google Play'), '  ·  ',
        h('a', { href: links.appWeb }, prettyUrl(links.appWeb))
      )
    ));
    return nodes;
  }

  /* ---------------- Start ---------------- */

  // After a page reload, pick up on the same screen if the answers are saved.
  var initial = null;
  try { initial = history.state; } catch (e) { initial = null; }
  var savedAnswers = loadSaved();
  if (initial && initial.mimQuiz && initial.screen !== 'intro' && savedAnswers) {
    state.answers = savedAnswers;
    depth = initial.depth || 0;
    trail = [];
    trail[depth] = initial.screen;
    state.screen = validScreen(initial.screen);
  } else {
    try { history.replaceState({ mimQuiz: true, screen: 'intro', depth: 0 }, ''); } catch (e) { /* fine */ }
  }
  render(false);
})();
