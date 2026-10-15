/*
 * Shared helpers for every Money in Motion tool.
 * Needs config.js loaded first.
 *
 *   MIM.config            the settings from config.js
 *   MIM.isSet(value)      false for empty values and PLACEHOLDERs
 *   MIM.storage           localStorage that never throws
 *   MIM.h(tag, props, …)  tiny DOM builder (text is always escaped)
 *   MIM.copyText(text)    copy to clipboard, resolves true/false
 *   MIM.whatsAppUrl(text) share link for WhatsApp
 *   MIM.emailForm(…)      email sign-up form, sent to the front door in config.js
 *   MIM.shareRow(…)       "Copy link" and "WhatsApp" buttons
 *
 * The footer is filled in automatically on every page that has
 * <footer data-mim-footer> (use data-mim-footer="wide" on wide pages), and
 * any <a data-mim-link="website"> takes its address from config.js links. If <body data-mim-storage="key1 key2"> is set,
 * the footer gets a "Clear my answers" button that removes those keys and
 * fires a "mim:cleared" event on document.
 */

window.MIM = (function () {
  'use strict';

  var config = window.MIM_CONFIG || {};
  var links = config.links || {};

  function isSet(value) {
    return typeof value === 'string' && value.trim() !== '' && value.indexOf('PLACEHOLDER') === -1;
  }

  /* ---------------- Storage (never throws) ---------------- */

  var storage = {
    get: function (key) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove: function (key) {
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  /* ---------------- DOM builder ---------------- */

  // h('a', { href: '#', className: 'btn' }, 'Text', otherNode)
  // Strings become text nodes, so copy can never inject HTML.
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var value = props[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'className') el.className = value;
        else if (key === 'text') el.textContent = value;
        else if (key === 'dataset') Object.keys(value).forEach(function (d) { el.dataset[d] = value[d]; });
        else if (key.indexOf('on') === 0 && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
        else if (value === true) el.setAttribute(key, '');
        else el.setAttribute(key, value);
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function append(parent, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(parent, c); }); return; }
    parent.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }

  // Link that opens in a new tab and tells the other site nothing about us.
  function extLink(href, text, className) {
    return h('a', { href: href, className: className, target: '_blank', rel: 'noopener noreferrer' }, text);
  }

  /* ---------------- Clipboard and sharing ---------------- */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    var field = h('textarea', { readonly: true, 'aria-hidden': 'true', style: 'position:fixed;top:-1000px;opacity:0' });
    field.value = text;
    document.body.appendChild(field);
    field.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(field);
    return ok;
  }

  function whatsAppUrl(text) {
    return 'https://wa.me/?text=' + encodeURIComponent(text);
  }

  // A clean link to the current page (no #hash or ?query).
  function pageUrl() {
    return window.location.origin + window.location.pathname;
  }

  // Copy link + WhatsApp buttons. opts: { url, message, heading }
  function shareRow(opts) {
    var url = opts.url || pageUrl();
    var status = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    var copyBtn = h('button', { type: 'button', className: 'btn btn-secondary' }, 'Copy link');
    copyBtn.addEventListener('click', function () {
      copyText(url).then(function (ok) {
        status.textContent = ok ? 'Link copied. Paste it wherever you like.' : 'Copying didn’t work here. The link is: ' + url;
      });
    });
    var waText = (opts.message || '').replace('{url}', url);
    if (waText.indexOf(url) === -1) waText = (waText ? waText + ' ' : '') + url;

    return h('section', { className: 'share card card-quiet', 'aria-labelledby': 'share-heading' },
      h('h2', { id: 'share-heading', className: 'h3' }, opts.heading || 'Share this tool'),
      h('div', { className: 'button-row' },
        copyBtn,
        h('a', { className: 'btn btn-secondary', href: whatsAppUrl(waText), target: '_blank', rel: 'noopener noreferrer' }, 'Share on WhatsApp')
      ),
      status
    );
  }

  /* ---------------- Email sign-up form ---------------- */

  var SIGNUP_HELP = 'Sorry, that didn’t go through. Please try again in a minute, or email jonathan@moneyinmotion.org and we’ll add you.';

  // opts: { heading, intro, buttonLabel, hiddenFields: { field: value },
  //         consentText, successMessage }
  // consentText and successMessage default to the quiz's, in config.js > signup.
  // Sends JSON to the sign-up front door (config.js > signup.endpoint).
  function emailForm(opts) {
    var su = config.signup || {};
    var uid = 'su-' + Math.random().toString(36).slice(2, 8);
    var renderedAt = Date.now();
    var consentText = opts.consentText || su.consentText || '';
    var status = h('p', { className: 'form-status', role: 'status', 'aria-live': 'polite' });
    var emailInput = h('input', {
      id: uid + '-email', type: 'email', name: 'email', required: true, maxlength: '254',
      autocomplete: 'email', inputmode: 'email', spellcheck: 'false'
    });
    var nameInput = null;
    var nameField = null;
    if (su.askForName) {
      nameInput = h('input', { id: uid + '-name', type: 'text', name: 'name', maxlength: '80', autocomplete: 'given-name' });
      nameField = h('div', { className: 'field' },
        h('label', { for: uid + '-name' }, 'First name ', h('span', { className: 'optional' }, '(optional)')),
        nameInput
      );
    }

    // Honeypot: off screen, out of the tab order and hidden from screen
    // readers, so only bots fill it in.
    var honeypot = h('input', { type: 'text', name: 'website', id: uid + '-website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
    var honeypotField = h('div', { className: 'hp-field', 'aria-hidden': 'true' },
      h('label', { for: uid + '-website' }, 'Leave this empty'),
      honeypot
    );

    var consent = h('p', { className: 'small muted' }, consentText);
    if (isSet(links.privacyPolicy)) {
      append(consent, [' ', extLink(links.privacyPolicy, 'Privacy policy')]);
    }

    var button = h('button', { type: 'submit', className: 'btn btn-primary' }, opts.buttonLabel || 'Sign me up');
    var form = h('form', { className: 'email-form', novalidate: true },
      nameField,
      h('div', { className: 'field' },
        h('label', { for: uid + '-email' }, 'Email address'),
        emailInput
      ),
      honeypotField,
      consent,
      button,
      status
    );

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      status.classList.remove('is-error');

      if (!emailInput.value.trim() || !emailInput.checkValidity()) {
        status.classList.add('is-error');
        status.textContent = 'That email address doesn’t look quite right. Have another go?';
        emailInput.focus();
        return;
      }
      if (!isSet(su.endpoint)) {
        status.classList.add('is-error');
        status.textContent = 'Email sign-up isn’t connected yet. (Add the sign-up address in assets/config.js.)';
        if (window.console) console.warn('MIM: signup.endpoint is not set in assets/config.js');
        return;
      }

      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      status.textContent = 'Sending…';

      var done = function () {
        form.reset();
        button.removeAttribute('aria-busy');
        status.textContent = opts.successMessage || su.successMessage || 'You’re in. Check your inbox.';
      };
      var fail = function () {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        status.classList.add('is-error');
        status.textContent = SIGNUP_HELP;
      };

      var fields = opts.hiddenFields || {};
      var payload = {
        email: emailInput.value.trim(),
        name: nameInput ? nameInput.value.trim() : '',
        tool: fields[su.toolField || 'tool'] || '',
        baby_step: fields[su.stepField || 'baby_step'] || '',
        consent_text: consentText,
        page: window.location.pathname,
        elapsed_ms: Date.now() - renderedAt,
        website: honeypot.value
      };

      // text/plain keeps this a "simple" request, so the browser sends it
      // without a CORS preflight. No cookies or referrer go with it.
      fetch(su.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          if (data && data.ok === true) done();
          else fail();
        })
        .catch(fail);
    });

    var section = h('section', { className: 'card email-card', 'aria-labelledby': uid + '-heading' },
      h('h2', { id: uid + '-heading', className: 'h3' }, opts.heading || 'Stay in touch'),
      opts.intro ? h('p', null, opts.intro) : null,
      form
    );
    return section;
  }

  /* ---------------- Footer ---------------- */

  function renderFooter() {
    var footer = document.querySelector('[data-mim-footer]');
    if (!footer) return;
    var keys = (document.body.getAttribute('data-mim-storage') || '').split(/\s+/).filter(Boolean);

    var appLinks = h('p', { className: 'footer-links' },
      h('span', { className: 'footer-label' }, 'Get the free Money in Motion app: '),
      extLink(links.appIos, 'App Store'), ' · ',
      extLink(links.appAndroid, 'Google Play'), ' · ',
      extLink(links.appWeb, 'Web')
    );
    var siteLink = h('p', { className: 'footer-links' },
      extLink(links.website, 'moneyinmotion.org')
    );

    var clearArea = null;
    if (keys.length) {
      var clearStatus = h('span', { className: 'footer-status', role: 'status', 'aria-live': 'polite' });
      var clearBtn = h('button', { type: 'button', className: 'link-button' }, 'Clear my answers');
      clearBtn.addEventListener('click', function () {
        keys.forEach(storage.remove);
        clearStatus.textContent = 'Done. Your answers have been cleared from this device.';
        document.dispatchEvent(new CustomEvent('mim:cleared'));
      });
      clearArea = h('p', { className: 'footer-clear' }, clearBtn, ' ', clearStatus);
    }

    var inner = h('div', { className: footer.getAttribute('data-mim-footer') === 'wide' ? 'container container-wide' : 'container' },
      h('p', { className: 'footer-disclaimer' },
        'Educational tools, not financial advice. Your numbers stay on your device. We don’t store or see them.'),
      appLinks,
      siteLink,
      clearArea,
      h('p', { className: 'footer-small' }, '© ' + new Date().getFullYear() + ' Money in Motion Ltd')
    );
    footer.textContent = '';
    footer.appendChild(inner);
  }

  // Any <a data-mim-link="appWeb"> gets its address from config.js.
  // (Keep a sensible href in the HTML too, for anyone without JavaScript.)
  function applyLinks() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-mim-link]'), function (a) {
      var url = links[a.getAttribute('data-mim-link')];
      if (isSet(url)) a.setAttribute('href', url);
    });
  }

  function init() {
    renderFooter();
    applyLinks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    config: config,
    links: links,
    isSet: isSet,
    storage: storage,
    h: h,
    append: append,
    extLink: extLink,
    copyText: copyText,
    whatsAppUrl: whatsAppUrl,
    pageUrl: pageUrl,
    shareRow: shareRow,
    emailForm: emailForm
  };
})();
