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
   * Email sign-up
   *
   * Every tool's sign-up goes to the Money in Motion "front door": a Google
   * Apps Script web app (apps-script/ in this repo). It records the sign-up
   * in a private Google Sheet as proof of consent, then adds the person to
   * the MailerLite group "Leads - Free Tools". Single opt-in: there's no
   * confirmation email. The MailerLite API key lives in the script's
   * settings, never in this file.
   * ------------------------------------------------------------------- */
  signup: {
    // The web app URL from Apps Script (Deploy > Manage deployments), ending
    // in /exec. Leave it empty until the script is deployed: the form then
    // says "isn't connected yet" and sends nothing. Redeploying a new version
    // keeps the same URL, so this only changes if you make a new deployment.
    endpoint: '',

    // The MailerLite field that receives the quiz result: "Step 0" ... "Step 7",
    // including "Step 3b". Must match the field name in apps-script/Code.gs.
    stepField: 'baby_step',

    // The MailerLite field that says which tool someone signed up from:
    // "quiz", "debt-planner", "saving-for-mission" or "christmas".
    toolField: 'tool',

    // Ask for a first name as well as an email address? (true or false)
    askForName: true,

    // The quiz's wording. Single opt-in: a welcome email, then the Thursday email.
    // The exact words shown are saved with each sign-up as the consent record.
    consentText: "We'll send a welcome email, then the weekly Thursday email from Money in Motion. Unsubscribe any time. Only your email, first name and result are sent. We keep a record of this sign-up to show you agreed. Your other answers stay on this device.",

    // Shown after someone signs up.
    successMessage: "You're in. Your welcome email is on its way. No email in a few minutes? Have a look in your spam folder.",

    // Debt Snowball Planner: "Stay in touch while you pay this off".
    // Fills the tool field with "debt-planner".
    // No debts, balances or dates are ever sent.
    debtPlanner: {
      toolField: 'tool',
      toolValue: 'debt-planner',
      consentText: "We'll send a welcome email, then the weekly Thursday email from Money in Motion. Unsubscribe any time. Only your email and first name are sent. We keep a record of this sign-up to show you agreed. Your debts stay on this device.",
      successMessage: "You're in. Your welcome email is on its way. No email in a few minutes? Have a look in your spam folder."
    }
  },

  /* ---------------------------------------------------------------------
   * Saving for Mission Builder
   * Its email sign-up ("Stay in touch while you save for the trip") goes to
   * the same front door as the quiz (signup.endpoint above), but says which
   * tool it came from instead of a Baby Step.
   * ------------------------------------------------------------------- */
  savingForMission: {
    // Goes into the MailerLite "tool" field (signup.toolField above).
    tag: 'saving-for-mission',
    consentText: "We'll send a welcome email, then the weekly Thursday email from Money in Motion. Unsubscribe any time. Only your email, your first name if you give it, and the name of this tool are sent. We keep a record of this sign-up to show you agreed. Your figures stay on this device.",
    successMessage: "You're in. Your welcome email is on its way. No email in a few minutes? Have a look in your spam folder."
  },

  /* ---------------------------------------------------------------------
   * Christmas Without Debt
   * Its email sign-up ("Want a nudge each payday until Christmas?") uses the
   * same front door as the quiz (signup.endpoint above), and fills the
   * "tool" field with "christmas" instead of a Baby Step. Only the email
   * address, first name (if given) and "christmas" are sent: no budgets,
   * no names from the gift list, no amounts and no paydays.
   * ------------------------------------------------------------------- */
  christmas: {
    // Goes into the MailerLite "tool" field (signup.toolField above).
    // The payday nudges go out as manual MailerLite campaigns to tool = christmas.
    tag: 'christmas',
    consentText: "We'll send a welcome email, a short payday nudge each month until Christmas, and the weekly Thursday email from Money in Motion. Unsubscribe any time. Only your email, your first name if you give it, and the name of this tool are sent. We keep a record of this sign-up to show you agreed. Your plan and the names on your list stay on this device.",
    successMessage: "You're in. Your welcome email is on its way, with payday nudges to follow. No email in a few minutes? Have a look in your spam folder."
  },

  /* ---------------------------------------------------------------------
   * Jonathan's videos, one per step
   * Paste a full link (YouTube, Vimeo, Instagram...) for each step.
   * Videos open in a new tab rather than being embedded, so no video
   * site can set cookies on these pages.
   * Leave a PLACEHOLDER in and that step shows "video coming soon".
   * ------------------------------------------------------------------- */
  videos: {
    '0':  'https://www.youtube.com/watch?v=bZw6_iw-j1A',
    '1':  'https://www.youtube.com/watch?v=HDv2S90dM3E',
    '2':  'https://www.youtube.com/watch?v=bRGaa12_FxI',
    '3':  'https://www.youtube.com/watch?v=cIYNPBAa-6o',
    '3b': 'https://www.youtube.com/watch?v=5RfUzS8wT2Q',
    '4':  'https://www.youtube.com/watch?v=LYlI2iVICY8',
    '5':  'https://www.youtube.com/watch?v=NdglBuXYlV8',
    '6':  'https://www.youtube.com/watch?v=ZMwFi4QepPU',
    '6b': 'https://www.youtube.com/watch?v=56IIoIzmKBU',
    '7':  'https://www.youtube.com/watch?v=BjTN6e-XGHI'
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
    },

    // Draws the "watch it fall" chart in the Debt Snowball Planner. Loaded
    // only when someone sees their plan. Same rule: a new version needs a
    // new integrity value (cdnjs shows it under "Copy SRI"). If it can't
    // load, the planner shows the numbers as a table instead.
    chartjs: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.1/chart.umd.min.js',
      integrity: 'sha384-jb8JQMbMoBUzgWatfe6COACi2ljcDdZQ2OxczGA3bGNeWe+6DChMTBJemed7ZnvJ'
    }
  }
};
