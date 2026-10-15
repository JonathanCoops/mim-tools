#!/usr/bin/env node
/*
 * Tests for the sign-up front door (apps-script/Code.gs).
 *
 *   node tests/signup-front-door.test.js
 *
 * No installs needed, just Node. Code.gs runs in a sandbox with stand-ins
 * for the Google services it uses (SpreadsheetApp, CacheService,
 * LockService, PropertiesService, UrlFetchApp, ContentService, Utilities),
 * so nothing is sent anywhere. It checks the spam rules, the field rules,
 * the rate limits, what goes to MailerLite and what lands in the Sheet.
 */

'use strict';

var assert = require('node:assert/strict');
var crypto = require('node:crypto');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

var ROOT = path.join(__dirname, '..');
var CODE = fs.readFileSync(path.join(ROOT, 'apps-script', 'Code.gs'), 'utf8');
var MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps-script', 'appsscript.json'), 'utf8'));

var passed = 0;
var failures = [];
function test(name, fn) {
  try { fn(); passed++; }
  catch (err) { failures.push(name + '\n    ' + err.message.split('\n').join('\n    ')); }
}

/* ---------------- A pretend Google ---------------- */

// opts: { mailerliteCode, properties, fetchThrows }
function makeScript(opts) {
  opts = opts || {};
  var rows = [];
  var calls = [];
  var cacheStore = {};
  var lock = { held: false, taken: 0 };
  var sheet = null;
  var headerRows = 0;

  function makeSheet() {
    return {
      appendRow: function (row) {
        if (row[0] === 'Received (Europe/London)') { headerRows++; return; }
        assert.ok(lock.held, 'sign-up rows are only appended while holding the lock');
        rows.push(Array.from(row)); // copied out of the sandbox so comparisons work normally
      },
      getLastRow: function () { return headerRows + rows.length; },
      getRange: function () { return { setFontWeight: function () { return this; } }; },
      setFrozenRows: function () {}
    };
  }
  var spreadsheet = {
    getSheetByName: function (name) { return name === 'Sign-ups' ? sheet : null; },
    insertSheet: function (name) { assert.equal(name, 'Sign-ups'); sheet = makeSheet(); return sheet; }
  };
  var props = opts.properties || { MAILERLITE_API_KEY: 'test-key', MAILERLITE_GROUP_ID: '201243953256727774' };

  var sandbox = {
    console: { log: function () {}, warn: function () {}, error: function () {} },
    SpreadsheetApp: { getActiveSpreadsheet: function () { return spreadsheet; } },
    CacheService: {
      getScriptCache: function () {
        return {
          get: function (k) { return Object.prototype.hasOwnProperty.call(cacheStore, k) ? cacheStore[k] : null; },
          put: function (k, v, ttl) {
            assert.ok(k.length <= 250, 'cache key under 250 characters');
            assert.ok(ttl >= 1 && ttl <= 3600, 'cache lifetime within an hour');
            cacheStore[k] = v;
          }
        };
      }
    },
    LockService: {
      getScriptLock: function () {
        return {
          tryLock: function () { lock.held = true; lock.taken++; return true; },
          releaseLock: function () { lock.held = false; }
        };
      }
    },
    PropertiesService: {
      getScriptProperties: function () {
        return { getProperty: function (k) { return Object.prototype.hasOwnProperty.call(props, k) ? props[k] : null; } };
      }
    },
    UrlFetchApp: {
      fetch: function (url, options) {
        calls.push({ url: url, options: options, body: JSON.parse(options.payload) });
        if (opts.fetchThrows) throw new Error('DNS error');
        var code = opts.mailerliteCode || 201;
        return { getResponseCode: function () { return code; }, getContentText: function () { return '{}'; } };
      }
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: function (text) {
        return { text: text, mime: 'text/plain', setMimeType: function (m) { this.mime = m; return this; } };
      }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: function (alg, value) { return Array.from(crypto.createHash('sha256').update(value, 'utf8').digest()); },
      base64EncodeWebSafe: function (bytes) { return Buffer.from(bytes).toString('base64url'); },
      formatDate: function (date, tz, pattern) {
        assert.equal(tz, 'Europe/London');
        assert.equal(pattern, 'yyyy-MM-dd HH:mm:ss');
        return '2026-10-15 09:30:00';
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(CODE, sandbox, { filename: 'apps-script/Code.gs' });
  sandbox.setupSheet();

  function post(body) {
    var raw = typeof body === 'string' ? body : JSON.stringify(body);
    var out = sandbox.doPost({ postData: { contents: raw, type: 'text/plain' } });
    assert.equal(out.mime, 'application/json', 'replies with JSON');
    return JSON.parse(out.text);
  }
  return { sandbox: sandbox, post: post, rows: rows, calls: calls, lock: lock, sheetHeaderRows: function () { return headerRows; } };
}

function goodBody(extra) {
  var body = {
    email: '  Someone@Example.org ',
    name: ' Sam ',
    tool: 'quiz',
    baby_step: 'Step 3b',
    consent_text: "We'll send a welcome email, then the weekly Thursday email from Money in Motion. Unsubscribe any time.",
    page: '/mim-tools/quiz/',
    elapsed_ms: 12000,
    website: ''
  };
  Object.keys(extra || {}).forEach(function (k) {
    if (extra[k] === undefined) delete body[k];
    else body[k] = extra[k];
  });
  return body;
}

// Columns: Received, Tool, Baby step, Email, First name, Consent text shown, Page, Result, MailerLite status
function assertRejectedRow(row, tool, result) {
  assert.deepEqual(row, ['2026-10-15 09:30:00', tool, '', '', '', '', '', result, ''], 'rejected rows carry the tool and result only');
}

/* ---------------- The tests ---------------- */

test('a valid sign-up goes to MailerLite with the right body and logs "added"', function () {
  var s = makeScript();
  var reply = s.post(goodBody());
  assert.deepEqual(reply, { ok: true });
  assert.equal(s.calls.length, 1);
  var call = s.calls[0];
  assert.equal(call.url, 'https://connect.mailerlite.com/api/subscribers');
  assert.equal(call.options.method, 'post');
  assert.equal(call.options.contentType, 'application/json');
  assert.equal(call.options.headers.Authorization, 'Bearer test-key');
  assert.equal(call.options.headers.Accept, 'application/json');
  assert.equal(call.options.muteHttpExceptions, true);
  assert.deepEqual(call.body, {
    email: 'someone@example.org',
    fields: { name: 'Sam', tool: 'quiz', baby_step: 'Step 3b' },
    groups: ['201243953256727774']
  });
  assert.equal(s.rows.length, 1);
  assert.deepEqual(s.rows[0], [
    '2026-10-15 09:30:00', 'quiz', 'Step 3b', 'someone@example.org', 'Sam',
    goodBody().consent_text, '/mim-tools/quiz/', 'added', '201'
  ]);
  assert.equal(s.lock.held, false, 'lock released');
});

test('empty fields are left out of the MailerLite body', function () {
  var s = makeScript({ mailerliteCode: 200 });
  var reply = s.post(goodBody({ tool: 'debt-planner', name: '', baby_step: undefined }));
  assert.deepEqual(reply, { ok: true }, '200 counts as success too');
  assert.deepEqual(s.calls[0].body.fields, { tool: 'debt-planner' });
  assert.equal(s.rows[0][7], 'added');
  assert.equal(s.rows[0][8], '200');
});

test('every tool name is accepted', function () {
  ['quiz', 'debt-planner', 'saving-for-mission', 'christmas'].forEach(function (tool) {
    var s = makeScript();
    assert.deepEqual(s.post(goodBody({ tool: tool })), { ok: true }, tool);
    assert.equal(s.calls[0].body.fields.tool, tool);
  });
});

test('the honeypot says ok but sends nothing to MailerLite', function () {
  var s = makeScript();
  var reply = s.post(goodBody({ website: 'http://spam.example' }));
  assert.deepEqual(reply, { ok: true });
  assert.equal(s.calls.length, 0);
  assert.equal(s.rows.length, 1);
  assertRejectedRow(s.rows[0], 'quiz', 'spam');
});

test('too fast is rejected', function () {
  [2999, 0, -5, 'soon', undefined].forEach(function (ms) {
    var s = makeScript();
    var reply = s.post(goodBody({ elapsed_ms: ms }));
    assert.deepEqual(reply, { ok: false, error: 'too-fast' }, String(ms));
    assert.equal(s.calls.length, 0);
    assertRejectedRow(s.rows[0], 'quiz', 'too-fast');
  });
  var s = makeScript();
  assert.deepEqual(s.post(goodBody({ elapsed_ms: 3000 })), { ok: true }, 'exactly 3 seconds is fine');
});

test('a bad email is rejected', function () {
  ['', 'not-an-email', 'a@b', 'two@@example.org', 'space in@example.org', 'x@example..org',
    'a'.repeat(250) + '@example.org', 42, null].forEach(function (email) {
    var s = makeScript();
    var reply = s.post(goodBody({ email: email }));
    assert.deepEqual(reply, { ok: false, error: 'invalid' }, String(email));
    assert.equal(s.calls.length, 0, 'nothing sent for ' + email);
    assertRejectedRow(s.rows[0], 'quiz', 'invalid');
  });
});

test('an unknown tool is rejected, and its name is not logged', function () {
  ['', 'newsletter', 'QUIZ', '=HYPERLINK("x")', undefined].forEach(function (tool) {
    var s = makeScript();
    var reply = s.post(goodBody({ tool: tool }));
    assert.deepEqual(reply, { ok: false, error: 'invalid' }, String(tool));
    assert.equal(s.calls.length, 0);
    assertRejectedRow(s.rows[0], '', 'invalid');
  });
});

test('the other field rules', function () {
  var bad = [
    { name: 'n'.repeat(81) },
    { baby_step: 's'.repeat(41) },
    { consent_text: '' },
    { consent_text: undefined },
    { consent_text: 'c'.repeat(1001) },
    { page: 'https://example.org/quiz/' },
    { page: '/quiz/?email=x' },
    { page: '/' + 'p'.repeat(200) },
    { name: { first: 'Sam' } }
  ];
  bad.forEach(function (extra) {
    var s = makeScript();
    assert.deepEqual(s.post(goodBody(extra)), { ok: false, error: 'invalid' }, JSON.stringify(extra).slice(0, 60));
    assert.equal(s.calls.length, 0);
  });
  var s = makeScript();
  assert.deepEqual(s.post(goodBody({ name: 'n'.repeat(80), baby_step: 's'.repeat(40), consent_text: 'c'.repeat(1000), page: '/' + 'p'.repeat(199) })), { ok: true }, 'limits are inclusive');
});

test('a body that is not JSON is rejected', function () {
  ['', 'email=x@example.org', '[1,2]', 'null'].forEach(function (raw) {
    var s = makeScript();
    var out = s.sandbox.doPost({ postData: { contents: raw } });
    assert.deepEqual(JSON.parse(out.text), { ok: false, error: 'invalid' }, raw);
    assert.equal(s.calls.length, 0);
  });
  var s = makeScript();
  assert.deepEqual(JSON.parse(s.sandbox.doPost({}).text), { ok: false, error: 'invalid' }, 'no body at all');
});

test('the per-email rate limit works', function () {
  var s = makeScript();
  for (var i = 0; i < 3; i++) assert.deepEqual(s.post(goodBody()), { ok: true }, 'sign-up ' + (i + 1));
  var reply = s.post(goodBody({ email: 'SOMEONE@example.org' }));
  assert.deepEqual(reply, { ok: false, error: 'rate-limited' }, 'the same address in other capitals');
  assert.equal(s.calls.length, 3);
  assertRejectedRow(s.rows[3], 'quiz', 'rate-limited');
  assert.deepEqual(s.post(goodBody({ email: 'someone.else@example.org' })), { ok: true }, 'other people are unaffected');
});

test('the overall rate limit works', function () {
  var s = makeScript();
  for (var i = 0; i < 100; i++) assert.deepEqual(s.post(goodBody({ email: 'person' + i + '@example.org' })), { ok: true });
  assert.deepEqual(s.post(goodBody({ email: 'one-too-many@example.org' })), { ok: false, error: 'rate-limited' });
  assert.equal(s.calls.length, 100);
});

test('a MailerLite 422 or 500 logs "mailerlite-error" and returns ok:false', function () {
  [422, 500, 401].forEach(function (code) {
    var s = makeScript({ mailerliteCode: code });
    var reply = s.post(goodBody());
    assert.deepEqual(reply, { ok: false, error: 'mailerlite-error' }, String(code));
    assert.equal(s.rows[0][7], 'mailerlite-error');
    assert.equal(s.rows[0][8], String(code));
    assert.equal(s.rows[0][3], 'someone@example.org', 'kept so Jonathan can add them by hand');
  });
  var s = makeScript({ fetchThrows: true });
  assert.deepEqual(s.post(goodBody()), { ok: false, error: 'mailerlite-error' }, 'network failure');
  assert.equal(s.rows[0][7], 'mailerlite-error');
  var unset = makeScript({ properties: {} });
  assert.deepEqual(unset.post(goodBody()), { ok: false, error: 'mailerlite-error' }, 'Script Properties missing');
  assert.equal(unset.calls.length, 0);
});

test('the MailerLite body never contains status or resubscribe', function () {
  var s = makeScript();
  s.post(goodBody({ status: 'active', resubscribe: true }));
  s.post(goodBody({ email: 'b@example.org', tool: 'christmas', name: '', baby_step: '' }));
  assert.equal(s.calls.length, 2);
  s.calls.forEach(function (call) {
    assert.ok(!/status|resubscribe/.test(call.options.payload), call.options.payload);
    assert.deepEqual(Object.keys(call.body).sort(), ['email', 'fields', 'groups']);
    assert.deepEqual(Object.keys(call.body.fields).filter(function (k) { return ['name', 'tool', 'baby_step'].indexOf(k) === -1; }), []);
  });
  var code = CODE.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').replace("'MailerLite status'", '');
  assert.ok(!/\b(status|resubscribe)\b/.test(code), 'Code.gs never mentions them outside comments');
});

test('text that looks like a formula is stored as text', function () {
  var s = makeScript();
  s.post(goodBody({ name: '=IMPORTXML("http://x","//a")' }));
  assert.equal(s.rows[0][4], '\'=IMPORTXML("http://x","//a")');
  assert.equal(s.calls[0].body.fields.name, '=IMPORTXML("http://x","//a")', 'MailerLite gets the name as typed');
});

test('doGet is a plain health check', function () {
  var s = makeScript();
  var out = s.sandbox.doGet({});
  assert.equal(out.text, 'ok');
  assert.equal(out.mime, 'text/plain');
});

test('setupSheet writes the headers once', function () {
  var s = makeScript();
  // makeScript already ran setupSheet; run it again and check nothing is added.
  s.sandbox.setupSheet();
  assert.equal(s.sheetHeaderRows(), 1);
  assert.equal(s.rows.length, 0);
  assert.deepEqual(Array.from(s.sandbox.HEADERS), [
    'Received (Europe/London)', 'Tool', 'Baby step', 'Email', 'First name',
    'Consent text shown', 'Page', 'Result', 'MailerLite status'
  ]);
});

test('appsscript.json: London time, anonymous web app run as the deployer, minimal scopes', function () {
  assert.equal(MANIFEST.timeZone, 'Europe/London');
  assert.deepEqual(MANIFEST.webapp, { executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' });
  assert.deepEqual(MANIFEST.oauthScopes.slice().sort(), [
    'https://www.googleapis.com/auth/script.external_request',
    'https://www.googleapis.com/auth/spreadsheets.currentonly'
  ]);
});

test('no secrets in the repo', function () {
  assert.ok(!/MAILERLITE_API_KEY\s*=|Bearer\s+[A-Za-z0-9._-]{20,}|eyJ[A-Za-z0-9_-]{20,}/.test(CODE), 'no key in Code.gs');
  var config = fs.readFileSync(path.join(ROOT, 'assets', 'config.js'), 'utf8');
  assert.ok(!/eyJ[A-Za-z0-9_-]{20,}|MAILERLITE_API_KEY|formAction/.test(config), 'no key or old form address in config.js');
});

test('the tools send what the script expects', function () {
  var site = fs.readFileSync(path.join(ROOT, 'assets', 'site.js'), 'utf8');
  ['email', 'name', 'tool', 'baby_step', 'consent_text', 'page', 'elapsed_ms', 'website'].forEach(function (key) {
    assert.ok(new RegExp('\\b' + key + ':').test(site), 'site.js sends ' + key);
  });
  assert.ok(/'Content-Type': 'text\/plain;charset=utf-8'/.test(site), 'no CORS preflight');
  assert.ok(/credentials: 'omit'/.test(site), 'no cookies');
  assert.ok(/window\.location\.pathname/.test(site), 'page is the path only');
  assert.ok(/name: 'website'[^)]*tabindex: '-1'[^)]*autocomplete: 'off'[^)]*'aria-hidden': 'true'/.test(site), 'honeypot is hidden from people');
});

var total = passed + failures.length;
if (failures.length) {
  console.log('\n' + failures.length + ' of ' + total + ' checks FAILED:\n');
  failures.forEach(function (f) { console.log('  ✗ ' + f); });
  process.exit(1);
}
console.log('All ' + total + ' sign-up front door checks passed.');
