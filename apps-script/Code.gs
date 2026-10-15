/*
 * Money in Motion Free Tools: sign-up front door
 * ==============================================
 * A Google Apps Script web app, bound to the Sheet "Free Tools — Sign-up Log".
 * The four tools POST their email sign-ups here. This script:
 *   1. checks the request (honeypot, timing, rate limits, field rules);
 *   2. adds the person to MailerLite (group from MAILERLITE_GROUP_ID);
 *   3. logs every request to the "Sign-ups" tab as a consent record.
 *
 * Single opt-in: no confirmation email is sent. The MailerLite call never
 * sends "status" or "resubscribe", so anyone who unsubscribed stays
 * unsubscribed.
 *
 * Script Properties (Project Settings > Script Properties):
 *   MAILERLITE_API_KEY   a MailerLite API token
 *   MAILERLITE_GROUP_ID  the "Leads - Free Tools" group id
 * No secrets live in this file or anywhere in the repo.
 *
 * Deploy steps are in apps-script/README.md.
 * Tests: node tests/signup-front-door.test.js
 */

var SHEET_NAME = 'Sign-ups';
var HEADERS = [
  'Received (Europe/London)', 'Tool', 'Baby step', 'Email', 'First name',
  'Consent text shown', 'Page', 'Result', 'MailerLite status'
];
var TOOLS = ['quiz', 'debt-planner', 'saving-for-mission', 'christmas'];
var MAILERLITE_URL = 'https://connect.mailerlite.com/api/subscribers';
var TIME_ZONE = 'Europe/London';

var MIN_ELAPSED_MS = 3000;       // faster than this is a bot
var PER_EMAIL_PER_HOUR = 3;
var TOTAL_PER_HOUR = 100;
var HOUR_MS = 60 * 60 * 1000;

var EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
var PATH_PATTERN = /^\/[^\s?#:]*$/;

/* ---------------- Web app entry points ---------------- */

// Health check: open the web app URL in a browser and it says "ok".
function doGet() {
  return ContentService.createTextOutput('ok');
}

// The tools send JSON as text/plain (no CORS preflight), so it arrives in
// e.postData.contents.
function doPost(e) {
  try {
    return handleSignup_(e);
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server-error' });
  }
}

function handleSignup_(e) {
  var body = parseBody_(e);
  if (!body) {
    logRejected_('', 'invalid');
    return json_({ ok: false, error: 'invalid' });
  }
  var knownTool = TOOLS.indexOf(body.tool) !== -1 ? body.tool : '';

  // Honeypot: real people never see the "website" box. Say yes so bots
  // don't learn anything, but send nothing to MailerLite.
  if (body.website !== undefined && body.website !== null && String(body.website).trim() !== '') {
    logRejected_(knownTool, 'spam');
    return json_({ ok: true });
  }

  var elapsed = Number(body.elapsed_ms);
  if (!(elapsed >= MIN_ELAPSED_MS)) {
    logRejected_(knownTool, 'too-fast');
    return json_({ ok: false, error: 'too-fast' });
  }

  var signup = validate_(body);
  if (!signup) {
    logRejected_(knownTool, 'invalid');
    return json_({ ok: false, error: 'invalid' });
  }

  var allowed = withLock_(function () { return takeRateLimit_(signup.email); });
  if (!allowed) {
    logRejected_(signup.tool, 'rate-limited');
    return json_({ ok: false, error: 'rate-limited' });
  }

  var ml = addToMailerLite_(signup);
  // A failed MailerLite call keeps the full row: the person agreed on screen,
  // and the row lets Jonathan add them by hand.
  appendRow_([
    now_(), signup.tool, signup.baby_step, signup.email, signup.name,
    signup.consent_text, signup.page, ml.ok ? 'added' : 'mailerlite-error', ml.detail
  ]);
  return json_(ml.ok ? { ok: true } : { ok: false, error: 'mailerlite-error' });
}

/* ---------------- Checking the request ---------------- */

function parseBody_(e) {
  var raw = e && e.postData && e.postData.contents;
  if (typeof raw !== 'string' || raw === '') return null;
  try {
    var body = JSON.parse(raw);
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch (err) {
    return null;
  }
}

// Optional text: missing is '', anything other than a string is invalid (null).
function text_(value) {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value.trim() : null;
}

// Returns the cleaned sign-up, or null if anything breaks the rules.
function validate_(body) {
  var email = text_(body.email);
  var name = text_(body.name);
  var babyStep = text_(body.baby_step);
  var consent = text_(body.consent_text);
  var page = text_(body.page);
  if ([email, name, babyStep, consent, page].indexOf(null) !== -1) return null;

  email = email.toLowerCase();
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  if (TOOLS.indexOf(body.tool) === -1) return null;
  if (name.length > 80) return null;
  if (babyStep.length > 40) return null;
  if (!consent || consent.length > 1000) return null;
  if (page.length > 200 || (page && !PATH_PATTERN.test(page))) return null;

  return { email: email, name: name, tool: body.tool, baby_step: babyStep, consent_text: consent, page: page };
}

/* ---------------- Rate limits (CacheService) ---------------- */

// At most PER_EMAIL_PER_HOUR per address and TOTAL_PER_HOUR overall. Each
// window starts with its first sign-up and lasts an hour. Counts only
// requests that passed every other check. Returns false when over a limit.
function takeRateLimit_(email) {
  var cache = CacheService.getScriptCache();
  var now = Date.now();
  var emailKey = 'rl:e:' + hash_(email);
  var totalKey = 'rl:total';
  var perEmail = readWindow_(cache, emailKey, now);
  var total = readWindow_(cache, totalKey, now);
  if (perEmail.n >= PER_EMAIL_PER_HOUR || total.n >= TOTAL_PER_HOUR) return false;
  writeWindow_(cache, emailKey, perEmail, now);
  writeWindow_(cache, totalKey, total, now);
  return true;
}

function readWindow_(cache, key, now) {
  try {
    var saved = JSON.parse(cache.get(key) || 'null');
    if (saved && typeof saved.n === 'number' && now - saved.t < HOUR_MS) return saved;
  } catch (err) { /* treat as a fresh window */ }
  return { n: 0, t: now };
}

function writeWindow_(cache, key, win, now) {
  var secondsLeft = Math.max(1, Math.ceil((win.t + HOUR_MS - now) / 1000));
  cache.put(key, JSON.stringify({ n: win.n + 1, t: win.t }), secondsLeft);
}

// Cache keys are limited to 250 characters, so addresses are hashed.
function hash_(value) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes);
}

/* ---------------- MailerLite ---------------- */

function addToMailerLite_(signup) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('MAILERLITE_API_KEY');
  var groupId = props.getProperty('MAILERLITE_GROUP_ID');
  if (!apiKey || !groupId) return { ok: false, detail: 'not configured' };

  // Empty fields are left out so they never blank an existing value.
  // No "status" and no "resubscribe": unsubscribed people stay unsubscribed.
  var fields = {};
  if (signup.name) fields.name = signup.name;
  if (signup.tool) fields.tool = signup.tool;
  if (signup.baby_step) fields.baby_step = signup.baby_step;
  var payload = { email: signup.email, fields: fields, groups: [String(groupId)] };

  try {
    var response = UrlFetchApp.fetch(MAILERLITE_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + apiKey, Accept: 'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = response.getResponseCode();
    if (code !== 200 && code !== 201) console.warn('MailerLite ' + code + ': ' + response.getContentText().slice(0, 500));
    return { ok: code === 200 || code === 201, detail: String(code) };
  } catch (err) {
    console.error(err);
    return { ok: false, detail: 'request failed' };
  }
}

/* ---------------- The Sheet ---------------- */

// Run once from the editor after binding the script to the Sheet. Safe to
// run again: it only adds the tab and the headers if they're missing.
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Rejected rows say which tool and why, and nothing about the person.
function logRejected_(tool, result) {
  appendRow_([now_(), tool, '', '', '', '', '', result, '']);
}

function appendRow_(row) {
  withLock_(function () {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME) || setupSheet();
    sheet.appendRow(row.map(cell_));
  });
}

// Stops text like "=IMPORTXML(...)" in a name being run as a formula.
function cell_(value) {
  var s = value === undefined || value === null ? '' : String(value);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function now_() {
  return Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
}

/* ---------------- Helpers ---------------- */

// Runs fn under the script lock. If the lock can't be had within 10 seconds,
// runs it anyway: a sign-up is worth more than a perfectly ordered log.
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  var locked = lock.tryLock(10000);
  try {
    return fn();
  } finally {
    if (locked) lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
