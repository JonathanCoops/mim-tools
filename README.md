# Money in Motion Free Tools

Free web tools for [Money in Motion](https://moneyinmotion.org/). Plain HTML, CSS and JavaScript, hosted on GitHub Pages. There's no build step, no framework and no backend: what's in this folder is exactly what goes live.

| Tool | Folder | Status |
|---|---|---|
| Which Baby Step am I on? (quiz) | `quiz/` | Live |
| Debt Snowball Planner | `debt-planner/` | Coming soon page |
| Saving for Mission Builder | `saving-for-mission/` | Coming soon page |

## Folder structure

```
index.html              Home page with a card for each tool
assets/
  config.js             EVERY link and setting. Start here.
  styles.css            Shared design. Brand colours and fonts are in the first block.
  site.js               Shared helpers: footer, safe storage, email form, share buttons
  pdf.js                Shared "download as PDF" helper (falls back to print)
  baby-steps.js         The Baby Steps framework wording, used by every tool
  favicon.svg           Site icon (also used as the logo mark in the header)
quiz/
  index.html            The quiz page
  logic.js              The placement rules (no words, no page code)
  content.js            Every word the quiz uses
  quiz.js               Puts it on screen
debt-planner/index.html         Placeholder, to be replaced
saving-for-mission/index.html   Placeholder, to be replaced
tests/quiz-logic.test.js        Tests every path through the quiz
```

All links between pages are relative (`quiz/`, `../assets/...`), so the site works both at `https://<user>.github.io/mim-tools/` and on a custom domain.

## Editing `assets/config.js`

Open the file, change the text between the quote marks, save. Keep the quote marks and commas. Anything that starts with `PLACEHOLDER` still needs filling in; until then the tool still works and that bit is hidden or shows "coming soon".

| Setting | What to put there |
|---|---|
| `links.privacyPolicy` | Your website's privacy page. Shown next to the email form. |
| `mailerlite.formAction` | The `action="..."` address from your MailerLite embedded form's HTML code (Forms > Embedded forms > your form > HTML). Looks like `https://assets.mailerlite.com/jsonp/123456/forms/123456789/subscribe`. |
| MailerLite field | In MailerLite, create a text field called `baby_step`. The quiz fills it with `Step 0`, `Step 1`, `Step 2`, `Step 3`, `Step 3b`, `Step 4`, `Step 5`, `Step 6` or `Step 7`, so an automation can send each person the right email. |
| `mailerlite.extraFields` | Any other hidden inputs in your embed code (name and value). `ml-submit` and `anticsrf` are already there. |
| `mailerlite.consentText` / `successMessage` | Check these match what subscribers actually receive (e.g. mention the confirmation email if you use double opt-in). |
| `videos` | A full link to Jonathan's video for each step (`0` to `7`, plus `3b` and `6b`). Videos open in a new tab; they aren't embedded, so no video site sets cookies here. |
| `debtHelp` | The three free debt charities shown when someone's answers suggest real pressure. |
| `links` | Website, Money & Faith course and the app links (App Store, Google Play, web). |

To change the **wording** of the quiz, edit `quiz/content.js`. To change the wording of the **steps themselves**, edit `assets/baby-steps.js`. To change **colours or fonts**, edit the first `:root` block in `assets/styles.css` (each colour has a light and a dark value).

## Previewing

Any static file server works. From this folder:

```
python3 -m http.server 8000
```

then open <http://localhost:8000/>. (Opening `index.html` straight from disk mostly works too, but the copy-link button and PDF download behave best over `http://`.)

## Testing the quiz rules

```
node tests/quiz-logic.test.js
```

It walks all 39,168 possible ways through the quiz and checks each result against a separate copy of the rules, then checks the copy (three actions per step, approved verses only, no banned words, UK spelling). Run it after changing `logic.js` or `content.js`.

## Notes for future sessions (Tools 2 and 3)

- **Page shell:** copy `debt-planner/index.html`: header, `<main>`, `<footer data-mim-footer>` and the scripts. The footer (disclaimer, app and website links) fills itself in from `config.js`.
- **Saved answers:** use `MIM.storage.get/set/remove` (never throws). Give the tool its own key, e.g. `mim.debt.v1`, and list it on the body: `<body data-mim-storage="mim.debt.v1">`. The footer then shows "Clear my answers" and fires a `mim:cleared` event on `document` so the tool can reset.
- **PDF:** load `assets/pdf.js` and call `MIMPdf.download({ filename, eyebrow, title, subtitle, content, onePage })`. Build `content` with `MIM.h()` and the `pdf-*` classes in `styles.css`. Header and footer are added for you. Set `onePage: false` if the content can run to several pages. If the PDF library can't load, it opens the print window instead.
- **Email:** `MIM.emailForm({ heading, intro, buttonLabel, hiddenFields: { field: value } })` returns a ready-made MailerLite form section.
- **Sharing:** `MIM.shareRow({ heading, message, url })` gives Copy link and WhatsApp buttons.
- **Links:** add new ones to `config.js` and read them from `MIM.links`. In static HTML, `<a data-mim-link="appWeb" href="...">` takes its address from config.
- **Libraries:** only from cdnjs or jsDelivr, pinned to an exact version with an `integrity` hash, and loaded only when needed.
- **Design:** use the CSS variables, never raw colours, so dark mode and rebranding keep working.

## House rules

Every page, every line of copy and every future session follows these.

### VOICE (all copy)

Jonathan writes like a trusted friend who knows money and the Bible: warm, direct, practical, occasional dry humour, one person talking to one person. UK English (organise, favour). Short sentences, no jargon, never preachy. Banned words: journey, game-changer, life-changing, transformational, dive in, unpack, here's the thing, hustle, side hustle, abundance/scarcity mindset, in today's world, "honestly". Avoid AI tics: repeated "not X but Y", lists of three everywhere, too many em-dashes, filler like "it's worth noting", piles of exclamation marks.

Faith: at most one short line per result, earned by the practical point first, never opening with a verse. Verses available (NIV, no credit needed): Luke 14:28, Proverbs 21:20, Proverbs 22:7, Matthew 25:14–30, 2 Corinthians 9:6–8.

### ACCURACY

Use only the figures in the framework below. If you need any other UK figure or rule, write [CHECK: ...] rather than guessing. Never give personalised advice; this is education.

The framework (Jonathan's UK adaptation of Dave Ramsey's Baby Steps; use exactly this):

- Step 0: Get a budget. Tell every pound where to go before the month starts.
- Step 1: Starter emergency fund: £500 in an easy-access account.
- Step 2: Pay off all consumer debt using the snowball (smallest balance first): credit cards, personal loans, overdrafts, Buy Now Pay Later, car HP, money owed to family. Not the mortgage, not student loans. PCP car finance is a budget line, not snowball debt.
- Step 3: Full emergency fund: 3–6 months of essential expenses, easy access (e.g. a Cash ISA).
- Step 3b (optional UK extra): Save a house deposit, aim for 10%. Lifetime ISA if you qualify.
- Step 4: Invest around 15% of income for retirement. Workplace pension first and take the full employer match, then a SIPP, LISA or Stocks & Shares ISA.
- Step 5: Kids' launch fund (not a college fund): uni, house deposit, first car, whatever launches them into adult life. A Junior ISA does the job.
- Step 6: Pay off the mortgage early. Use the 10% yearly overpayment allowance; add lump sums when the fix ends.
- Step 6b (UK extra): Student loans behave like a graduate tax; most people won't clear them before they're written off. Don't overpay unless you're sure you'll clear it in full.
- Step 7: Build wealth and give generously. Generosity isn't a Step 7 reward; it's a habit from Step 1 that grows with you. Use Gift Aid.

The steps work in order, one at a time.

### PRIVACY

No analytics, no cookies, nothing sent anywhere except the optional email form. Any saved answers use localStorage wrapped in try/catch, with a "Clear my answers" link.

Footer on every page: "Educational tools, not financial advice. Your numbers stay on your device. We don't store or see them." plus links to the app and website.

How this site keeps to it:

- The only data that ever leaves the device is what someone types into the email form (name, email and their step number), sent straight to MailerLite with no cookies.
- The PDF library is fetched from jsDelivr only when someone taps "Download", with no referrer. Nothing about the person is sent with that request, and the PDF is made on their device.
- Videos and other sites are linked, never embedded.
