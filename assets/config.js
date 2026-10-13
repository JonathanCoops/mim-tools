/*
 * Money in Motion Free Tools: settings
 * =====================================
 * Every link and setting the tools use lives in this one file.
 *
 * HOW TO EDIT
 * - Change the text between the quote marks. Keep the quotes and the commas.
 * - Anything starting with PLACEHOLDER needs filling in before the tools go live.
 *   Until then the tools still work; the bit that needs the setting is hidden
 *   or shows a "coming soon" message.
 * - Save, refresh the page, and check it still loads. If the page goes blank,
 *   a quote mark or comma has usually gone missing.
 */

window.MIM_CONFIG = {

  /* ---------------------------------------------------------------------
   * Main links
   * ------------------------------------------------------------------- */
  links: {
    website: 'https://moneyinmotion.org/',
    moneyAndFaith: 'https://moneyinmotion.org/money-and-faith',

    // The free app
    appIos: 'https://apps.apple.com/us/app/money-in-motion/id6760107760',
    appAndroid: 'https://play.google.com/store/apps/details?id=com.moneyinmotion.app',
    appWeb: 'https://app.moneyinmotion.org/',

    // Your website's privacy page. Shown next to the email form.
    privacyPolicy: 'https://moneyinmotion.org/privacy'
  },

  /* ---------------------------------------------------------------------
   * Free debt help
   * Shown first on the quiz result when someone's debt answers suggest
   * they need more than a budget.
   * ------------------------------------------------------------------- */
  debtHelp: [
    {
      name: 'StepChange',
      url: 'https://www.stepchange.org/',
      description: 'Free, confidential debt advice online or over the phone.'
    },
    {
      name: 'CAP (Christians Against Poverty)',
      url: 'https://capuk.org/',
      description: 'Free debt help from a Christian charity that works with local churches.'
    },
    {
      name: 'Citizens Advice',
      url: 'https://www.citizensadvice.org.uk/debt-and-money/',
      description: 'Free, independent advice on debt, money and much more.'
    }
  ],

  /* ---------------------------------------------------------------------
   * MailerLite email sign-up
   *
   * 1. In MailerLite, open Forms > Embedded forms and pick (or create) the
   *    form for the quiz.
   * 2. Open its HTML embed code and find the <form ... action="..."> line.
   * 3. Paste that action address into formAction below. It usually looks like
   *    https://assets.mailerlite.com/jsonp/123456/forms/123456789/subscribe
   * 4. In MailerLite, create a text field called baby_step (Subscribers >
   *    Fields). The quiz fills it with "Step 0", "Step 1" ... "Step 7"
   *    (including "Step 3b"), so you can send each person the right email.
   * 5. If your embed code has other hidden inputs, copy their name and value
   *    into extraFields.
   * ------------------------------------------------------------------- */
  // Connected 13 Oct 2026 to the MailerLite embedded form
  // "Free Tools sign-up (mim-tools)", which adds people to the group
  // "Leads - Free Tools". Fields used: baby_step (quiz result) and
  // tool (quiz / debt-planner / saving-for-mission).
  // The form uses double opt-in: people must click a confirmation email.
  mailerlite: {
    formAction: 'https://assets.mailerlite.com/jsonp/1795296/forms/201243958262629596/subscribe',

    // The MailerLite field that receives the quiz result.
    stepField: 'baby_step',

    // Ask for a first name as well as an email address? (true or false)
    askForName: true,

    // Hidden inputs MailerLite's embed code includes.
    extraFields: {
      'ml-submit': '1',
      'anticsrf': 'true'
    },

    // Matches what subscribers get: a confirmation email first (double opt-in),
    // then their plan, then the occasional Money in Motion email.
    consentText: "We'll send a quick email to confirm it's you, then your plan and the occasional email from Money in Motion. Unsubscribe any time. Only your email, first name and result are sent. Your other answers stay on this device.",

    // Shown after someone signs up. {step} becomes their step, e.g. "Step 2".
    successMessage: "Nearly done. Check your inbox and tap the confirm link, then your {step} plan is on its way. No email in a few minutes? Have a look in your spam folder."
  },

  /* ---------------------------------------------------------------------
   * Jonathan's videos, one per step
   * Paste a full link (YouTube, Vimeo, Instagram...) for each step.
   * Videos open in a new tab rather than being embedded, so no video
   * site can set cookies on these pages.
   * Leave a PLACEHOLDER in and that step shows "video coming soon".
   * ------------------------------------------------------------------- */
  videos: {
    '0':  'PLACEHOLDER_VIDEO_URL_STEP_0',
    '1':  'PLACEHOLDER_VIDEO_URL_STEP_1',
    '2':  'PLACEHOLDER_VIDEO_URL_STEP_2',
    '3':  'PLACEHOLDER_VIDEO_URL_STEP_3',
    '3b': 'PLACEHOLDER_VIDEO_URL_STEP_3B',
    '4':  'PLACEHOLDER_VIDEO_URL_STEP_4',
    '5':  'PLACEHOLDER_VIDEO_URL_STEP_5',
    '6':  'PLACEHOLDER_VIDEO_URL_STEP_6',
    '6b': 'PLACEHOLDER_VIDEO_URL_STEP_6B',
    '7':  'PLACEHOLDER_VIDEO_URL_STEP_7'
  },

  /* ---------------------------------------------------------------------
   * Technical settings. You shouldn't need to touch these.
   * ------------------------------------------------------------------- */
  libraries: {
    // Makes the downloadable PDFs. Loaded only when someone taps "Download".
    // If you change the version, the integrity value must change too,
    // otherwise the browser will refuse to load it (and the tools fall back
    // to the print window).
    html2pdf: {
      src: 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.14.0/dist/html2pdf.bundle.min.js',
      integrity: 'sha384-EaWTV/aVUkLz3tfwg3+5ycX7Q/d9ET9ruOKUgUuFIRUCfzHO1eo2J62a844iWPmY'
    }
  }
};
