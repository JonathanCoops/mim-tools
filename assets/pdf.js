/*
 * Shared PDF helper: turns a block of results into a one-page A4 PDF,
 * made entirely in the browser. Nothing is uploaded anywhere.
 *
 * Usage (any tool):
 *
 *   MIMPdf.download({
 *     filename: 'my-plan.pdf',
 *     eyebrow: 'Which Baby Step am I on?',   // small line above the title
 *     title: "You're on Step 2",
 *     subtitle: 'Pay off all consumer debt',  // optional
 *     content: someElement,                    // a DOM node (or array of nodes)
 *     onePage: true                            // default: tighten spacing to fit
 *                                              // one A4 page; false lets long
 *                                              // content run onto more pages
 *   }).then(function (how) {
 *     // how === 'pdf'   the file was downloaded
 *     // how === 'print' the PDF library couldn't load, so the print
 *     //                 window opened instead ("Save as PDF" works there)
 *   });
 *
 * Build `content` with MIM.h() and the pdf-* classes in styles.css
 * (pdf-section, pdf-h2, pdf-list, pdf-callout, pdf-ladder, pdf-grid ...).
 * The page header and the footer (disclaimer, links, date) are added for you.
 *
 * The PDF library (html2pdf.js) is only fetched when someone asks for a PDF,
 * and is set in config.js > libraries.html2pdf.
 */

window.MIMPdf = (function () {
  'use strict';

  var A4_WIDTH_PX = 794;  // 210mm at 96dpi
  var A4_HEIGHT_PX = 1120; // 297mm at 96dpi, less a hair for rounding
  var loading = null;

  function loadLibrary() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    if (loading) return loading;
    var lib = (window.MIM_CONFIG && window.MIM_CONFIG.libraries && window.MIM_CONFIG.libraries.html2pdf) || {};
    if (!lib.src) return Promise.reject(new Error('No PDF library configured'));

    loading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      var timer = setTimeout(function () { fail(new Error('PDF library took too long to load')); }, 20000);
      function fail(err) { clearTimeout(timer); loading = null; reject(err); }
      script.src = lib.src;
      if (lib.integrity) {
        script.integrity = lib.integrity;
        script.crossOrigin = 'anonymous';
      }
      script.referrerPolicy = 'no-referrer';
      script.onload = function () {
        clearTimeout(timer);
        if (window.html2pdf) resolve(window.html2pdf);
        else fail(new Error('PDF library loaded but not available'));
      };
      script.onerror = function () { fail(new Error('PDF library failed to load')); };
      document.head.appendChild(script);
    });
    return loading;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function prettyUrl(url) {
    return String(url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  // Builds the A4 sheet: header band, title, the tool's content, footer.
  function buildSheet(opts) {
    var links = (window.MIM_CONFIG && window.MIM_CONFIG.links) || {};
    var sheet = el('div', 'pdf-sheet');

    var head = el('div', 'pdf-head');
    var brand = el('div', 'pdf-brand');
    brand.appendChild(el('span', 'pdf-brand-name', 'Money in Motion'));
    if (opts.eyebrow) brand.appendChild(el('span', 'pdf-brand-tool', opts.eyebrow));
    head.appendChild(brand);
    sheet.appendChild(head);

    var titleBlock = el('div', 'pdf-title-block');
    titleBlock.appendChild(el('h1', 'pdf-title', opts.title || ''));
    if (opts.subtitle) titleBlock.appendChild(el('p', 'pdf-subtitle', opts.subtitle));
    sheet.appendChild(titleBlock);

    var body = el('div', 'pdf-body');
    [].concat(opts.content || []).forEach(function (node) {
      if (node) body.appendChild(node.cloneNode(true));
    });
    sheet.appendChild(body);

    var foot = el('div', 'pdf-foot');
    foot.appendChild(el('p', 'pdf-foot-disclaimer',
      'Educational tools, not financial advice. Your numbers stay on your device. We don’t store or see them.'));
    var date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    foot.appendChild(el('p', 'pdf-foot-meta', prettyUrl(links.website) + '  ·  Made on ' + date));
    sheet.appendChild(foot);

    return sheet;
  }

  // If the sheet is taller than one page, switch to tighter spacing.
  function fitToOnePage(sheet) {
    var holder = el('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;width:' + A4_WIDTH_PX + 'px';
    holder.appendChild(sheet);
    document.body.appendChild(holder);
    if (sheet.offsetHeight > A4_HEIGHT_PX) sheet.classList.add('pdf-compact');
    holder.removeChild(sheet);
    document.body.removeChild(holder);
  }

  // Fallback: show only the sheet and open the print window.
  function printSheet(sheet) {
    var root = document.getElementById('mim-print-root');
    if (!root) {
      root = el('div');
      root.id = 'mim-print-root';
      document.body.appendChild(root);
    }
    root.textContent = '';
    root.appendChild(sheet);
    document.documentElement.classList.add('mim-print-sheet');
    var cleanup = function () {
      document.documentElement.classList.remove('mim-print-sheet');
      root.textContent = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  }

  function download(opts) {
    opts = opts || {};
    var sheet = buildSheet(opts);
    if (opts.onePage !== false) fitToOnePage(sheet);
    var filename = opts.filename || 'money-in-motion.pdf';

    return loadLibrary()
      .then(function (html2pdf) {
        return html2pdf()
          .set({
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: A4_WIDTH_PX, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css'] }
          })
          .from(sheet)
          .save();
      })
      .then(function () { return 'pdf'; })
      .catch(function (err) {
        if (window.console) console.warn('MIM: PDF download failed, opening print instead.', err);
        printSheet(sheet);
        return 'print';
      });
  }

  return {
    download: download,
    buildSheet: buildSheet,
    printSheet: printSheet,
    loadLibrary: loadLibrary,
    prettyUrl: prettyUrl
  };
})();
