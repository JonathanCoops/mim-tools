# Handover: Money in Motion Free Tools

Written 15 October 2026, at the end of the build session that created this repo. Read this, then `README.md`, before doing any work here. The README covers how the code is laid out and the House rules for copy. This file covers why the tools exist, what was decided along the way, and what is still to do.

## Why these tools exist

Money in Motion's funnel is FREE → COURSE → COMMUNITY → DEEPER SUPPORT (see MiM-Business-Overview in Google Drive). The email list is the asset that matters most, and it is small. These tools are the free end of that funnel. Each one is built to help someone for real, with nothing to sign up for, and to offer an optional email sign-up at the end. Jonathan's words for the aim: free tools to "bless people" that also work as lead magnets.

They were built in October 2026 with one-off Claude cloud-session credit, in this order: shared foundation and quiz, then the debt planner and the Saving for Mission builder in parallel, then Christmas Without Debt, then a restyle of everything to Brand Guide 2.0.

## What is live

- Site: https://jonathancoops.github.io/mim-tools/ (GitHub Pages, deployed from `main`)
- Repo: https://github.com/JonathanCoops/mim-tools (public; nothing private belongs in it)

| Tool | What it does | Email tag (`tool` field) |
|---|---|---|
| Which Baby Step am I on? | 10-question quiz. Places people on the first Money in Motion Baby Step they haven't completed (0, 1, 2, 3, 3b, 4, 5, 6, 7), with 6b and giving notes, three actions for the week, Jonathan's YouTube video for that step, and a one-page PDF. | `quiz`, plus `baby_step` (for example `Step 3b`) |
| Debt Snowball Planner | Smallest-balance-first plan with a debt-free date, a chart, "what if I found £50 more" and a fridge PDF. | `debt-planner` |
| Saving for Mission Builder | Jonathan's six-step Mission Cost Plan (A to G) as a live builder, with a worked example, a full plan PDF and a "Partner with me" PDF for supporters. | `saving-for-mission` |
| Christmas Without Debt | Plans Christmas around paydays so it is paid in cash: gift list, the costs people forget, ways to close the gap, a message suggesting a cheaper Christmas to the family, and two PDFs. | `christmas` |

## Source material

- The Baby Steps wording comes from Jonathan's UK Baby Steps series (three-minute summary media pack in Drive). The Step 1 starter fund is £500.
- Saving for Mission follows Jonathan's talk for the Neuma programme (Tim Jones, September 2026) and his Mission Cost Planner, both in Drive: "Saving for Mission" and "Mission-Cost-Planner-v1.md".
- Copy follows the mim-voice skill. Faith is light and earned, there is no jargon, UK English is used throughout, and banned words stay out.

## Decisions made during the build (keep these)

- **Privacy:** nothing is stored or sent except the optional email form. Answers stay in the person's browser, with a "Clear my data" link. There are no analytics or cookies. This matches the app's "no data selling" promise.
- **Email never gates anything.** Results and PDFs show before any sign-up.
- **Videos link to YouTube**, which opens for everyone without a login, and are not embedded. All ten step links are in `assets/config.js` and were confirmed public on 15 October 2026.
- **Step 6 was corrected on 15 October 2026:** the yearly overpayment allowance "isn't always 10%". This matches Jonathan's 16 September video "Mortgage Overpayment Allowance UK: It Isn't 10%", which Step 6 now links to.
- **Debt help** (StepChange, CAP, Citizens Advice) shows first whenever someone's answers suggest they are struggling.
- **Educational, not advice.** Every page carries that line.
- **One settings file:** every link and setting lives in `assets/config.js`.

## MailerLite: current state (needs finishing)

All four tools post to one MailerLite embedded form.

- Form "Free Tools sign-up (mim-tools)", id `201243958262629596`. Double opt-in is on. Its address is already in `config.js`.
- Group "Leads - Free Tools", id `201243953256727774`. It had no subscribers on 15 October 2026.
- Fields: `baby_step` (id 1536796) and `tool` (id 1536797).

**Blocker:** the form was created through the connector, which can't build form content, so it has no content yet and has never taken a sign-up. Jonathan has to open it in MailerLite, choose any template, add `baby_step` and `tool` as hidden fields, then save and publish. After that, do one test sign-up and check that both fields arrive.

**No welcome emails exist yet.** The quiz promises "your Step X plan is on its way", the Christmas tool promises payday nudges and the debt planner promises encouragement.

**Free plan limits** (MailerLite free plan, checked 15 October 2026):
- 250 active subscribers; there were 142 active, 183 in total.
- 3 active forms.
- 3 active automations of up to 5 steps; all three slots are in use.
- 2,500 emails a month.

**Plan agreed:**
- Turn off the "M&F Waitlist" form to free a form slot (the course is live, and its last sign-up was 10 August). Do NOT turn off "M&F Graduate": it has no sign-ups because the graduate QR opt-in hasn't launched yet, and it feeds the Graduate Holding Sequence, which is a retention priority. Check in the MailerLite dashboard which three forms count as active, because the API doesn't show it.
- Free one automation slot. Pausing Speaking Enquiry is the only realistic option, and only if Jonathan has another way to hear about enquiries. Automation slots are the real constraint, not subscribers: three things are queuing (the free-tools welcome, the Graduate Holding Sequence and the one-question welcome). Don't pause or edit the 9-step Budget Tool and App Signup flows; they exceed the current 5-step cap and may not switch back on.
- Write one welcome email covering all four tools.
- Build tailored per-step sequences only after an upgrade.

## Platform decision (agreed 15 October 2026; recorded in MiM-Business-Overview)

- MailerLite stays the email platform. Systeme.io stays the home for course delivery, checkout and the shop.
- **No paid plan on either without a fresh review first.**
- Systeme.io could become the home for everything. It now has an official MCP connector covering contacts, newsletters, campaigns, automations, stats, funnels, products and courses. It is an early release: Claude Desktop only, a key that expires every 90 days (OAuth is planned), and no form management.
- Review triggers:
  - MailerLite active subscribers near 250;
  - Systeme.io's connector gaining OAuth (so it works in web and cloud sessions) and passing a hands-on test;
  - the Makeover V2 build starting.
- Suggested test: in Claude Desktop, list contacts and tags, draft (don't send) a newsletter, and pull last month's email stats.

## To do

**Jonathan**
1. Build and publish the MailerLite form with the two hidden fields, then do a test sign-up.
2. Add a "Free money tools" button to moneyinmotion.org in Framer. Suggested copy: "Free tools to get you started. Find your Baby Step in two minutes, plan your way out of debt, or work out how to pay for a mission trip. Free, and your numbers never leave your phone."
3. Send the Saving for Mission link to Tim Jones at Neuma.
4. Click the StepChange, CAP and Citizens Advice links once. The build environment couldn't reach outside sites.
5. Decide on a custom domain (for example tools.moneyinmotion.org): one DNS record at Porkbun plus the GitHub Pages setting.

**Claude**
1. After the form works: write the welcome email in Jonathan's voice and build the automation, left switched off for review.
2. Write launch content: a TikTok media pack for Christmas Without Debt first (it is seasonal), then one for each other tool.
3. Add the free tools to Products & Status in MiM-Business-Overview. They are not listed there yet.
4. Optional: a cookie-free visit counter (for example GoatCounter). This needs Jonathan's OK and a line on the privacy page.
5. Email the 3 people in the old "Leads - Free Christmas Savings Tracker" group about the new Christmas planner.

## Ideas backlog (not started)

- **Priority bills sorter + pastoral money first-aid guide for church leaders.** Rent, council tax and energy come first; then CAP or StepChange. This is CAP's own teaching.
- **Missing Money Finder.** A checklist of entitlements people miss, pointing to Turn2us. Rules change every April, so date every figure.
- **"If anything happens" family folder.** A possible first paid tool: a guided, printed family binder covering accounts, wishes and who to call. Hints only, never passwords.
- **Couples Money Date kit.** Paid backup idea: 12 monthly money dates. Date 1 free.
- **Church Money Health Check.** Paused: not enough church leaders yet to try it.
- **Also suggested:** a Give/Sow/Store planner, a 30-day no-spend challenge, a Bills MOT, a 2027 faith budget planner, and a first payslip pack for 16–22s.

## Testing

Run these after any change. All four suites passed on 15 October 2026.

```
node tests/quiz-logic.test.js                  # 39,207 checks
node debt-planner/snowball.test.js             # 4,026 checks
node saving-for-mission/tests/mission.test.js  # 41 checks
node christmas/tests/christmas.test.js         # 65 checks
python3 -m http.server 8000                    # then open http://localhost:8000/
```

Work on a branch and open a pull request. Several cloud sessions editing `assets/config.js` at once caused merge conflicts during the build, so keep tool-specific settings in their own block in that file.

## Corrections after review (15 October 2026)

The business Claude's first review caught these, and they are fixed above or in the code:
- M&F Waitlist, not M&F Graduate, is the form to switch off.
- The README's house rules still said "10%" for Step 6. Fixed.
- The `christmas` tool value was missing from the `config.js` comments, and the home page description named only three tools. Both fixed.
- Still open: the email copy promises more than a single welcome email delivers ("your Step X plan is on its way", payday nudges, encouragement). Either the emails deliver it or the copy changes. Decide this before the form goes live.
