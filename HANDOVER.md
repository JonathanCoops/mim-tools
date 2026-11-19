# Handover: Money in Motion Free Tools

Written 15 October 2026, at the end of the build session that created this repo. Last updated 19 November 2026 (see "Changes since launch"). Read this, then `README.md`, before doing any work here. The README covers how the code is laid out and the House rules for copy. This file covers why the tools exist, what was decided along the way, and what is still to do.

## Why these tools exist

Money in Motion's funnel is FREE → COURSE → COMMUNITY → DEEPER SUPPORT (see MiM-Business-Overview in Google Drive). The email list is the asset that matters most, and it is small. These tools are the free end of that funnel. Each one is built to help someone for real, with nothing to sign up for, and to offer an optional email sign-up at the end. Jonathan's words for the aim: free tools to "bless people" that also work as lead magnets.

They were built in October 2026 with one-off Claude cloud-session credit, in this order: shared foundation and quiz, then the debt planner and the Saving for Mission builder in parallel, then Christmas Without Debt, then a restyle of everything to Brand Guide 2.0.

## What is live

- Site: https://tools.moneyinmotion.org/ (GitHub Pages custom domain, deployed from `main`; the old github.io address redirects)
- Repo: https://github.com/JonathanCoops/mim-tools (public; nothing private belongs in it)

| Tool | What it does | Email tag (`tool` field) |
|---|---|---|
| Which Baby Step am I on? | 10-question quiz. Places people on the first Money in Motion Baby Step they haven't completed (0, 1, 2, 3, 3b, 4, 5, 6, 7), with 6b and giving notes, three actions for the week, Jonathan's YouTube video for that step, and a one-page PDF. | `quiz`, plus `baby_step` (for example `Step 3b`) |
| Debt Snowball Planner | Smallest-balance-first plan with a debt-free date, a chart, "what if I found £50 more" and a fridge PDF. | `debt-planner` |
| Saving for Mission Builder | Jonathan's six-step Mission Cost Plan (A to G) as a live builder, with a worked example, a full plan PDF and a "Partner with me" PDF for supporters. | `saving-for-mission` |
| Christmas Without Debt | Plans Christmas around paydays so it is paid in cash: gift list, the costs people forget, ways to cut the cost and ways to boost the pot (extra shifts, selling things and so on), a message suggesting a cheaper Christmas to the family, and two PDFs. The plan page tracks real progress: tick off each payday and each bit of extra money as it comes in, and "Still to find" goes down. | `christmas` |
| Steady Wage Planner | For income that goes up and down. Takes the last 12 months of what landed and gives a steady wage to pay yourself, the size of holding pot that keeps it steady, a quarterly pay review (hold, rise or cut) and a one-page PDF. Built 19 November 2026; live once its pull request is merged. See "Steady Wage Planner" below. | `steady-wage` |

## Source material

- The Baby Steps wording comes from Jonathan's UK Baby Steps series (three-minute summary media pack in Drive). The Step 1 starter fund is £500.
- Saving for Mission follows Jonathan's talk for the Neuma programme (Tim Jones, September 2026) and his Mission Cost Planner, both in Drive: "Saving for Mission" and "Mission-Cost-Planner-v1.md".
- The Steady Wage Planner follows Jonathan's self-employed series (three videos: pay yourself a salary, the tax pot, budgeting with variable income; media packs in Drive, the last posted to TikTok on 18 November 2026) and the "Pay yourself a wage" carousel built on 18 November 2026 (Drive folder `2026-11-18-pay-yourself-a-wage`, including `notes.md`).
- Copy follows the mim-voice skill. Faith is light and earned, there is no jargon, UK English is used throughout, and banned words stay out.

## Decisions made during the build (keep these)

- **Privacy:** nothing is stored or sent except the optional email form, which goes to a private Money in Motion Google Sheet (as the consent record) and to MailerLite, and nowhere else. Answers stay in the person's browser, with a "Clear my data" link. There are no analytics or cookies. This matches the app's "no data selling" promise.
- **Email never gates anything.** Results and PDFs show before any sign-up.
- **Videos link to YouTube**, which opens for everyone without a login, and are not embedded. All ten step links are in `assets/config.js` and were confirmed public on 15 October 2026.
- **Step 6 was corrected on 15 October 2026:** the yearly overpayment allowance "isn't always 10%". This matches Jonathan's 16 September video "Mortgage Overpayment Allowance UK: It Isn't 10%", which Step 6 now links to.
- **Debt help** (StepChange, CAP, Citizens Advice) shows first whenever someone's answers suggest they are struggling.
- **Educational, not advice.** Every page carries that line.
- **One settings file:** every link and setting lives in `assets/config.js`.

## Email sign-up: the front door (decided 15 October 2026)

Every tool posts its sign-ups to a Google Apps Script web app, the "front door" (`apps-script/` in this repo). It is bound to the Google Sheet "Free Tools — Sign-up Log" on Jonathan's business account. For each sign-up it checks for spam, adds the person to MailerLite through the API, and logs a row in the Sheet's "Sign-ups" tab as the consent record (the exact consent wording they saw, the time, the tool and the result). Deploy steps are in `apps-script/README.md`.

Decisions (15 October 2026, keep these):
- **The Apps Script front door replaces the MailerLite tools form.** The embedded form "Free Tools sign-up (mim-tools)" (id `201243958262629596`) is no longer needed. It never had content and never took a sign-up.
- **Single opt-in.** No confirmation email. Don't switch to double opt-in unless it becomes absolutely necessary. MailerLite's own double opt-in settings stay untouched. The script never sends `status` or `resubscribe`, so anyone who unsubscribed stays unsubscribed.
- **Copy promises only what is sent:** a welcome email, then the weekly Thursday email (which goes to all active MailerLite subscribers). Christmas Without Debt also promises a short payday nudge each month until Christmas. Nothing mentions a confirm link.
- **The welcome email is one automation**, triggered when someone joins "Leads - Free Tools". One email covers every tool.
- **Christmas payday nudges go out as manual campaigns** to subscribers with `tool` = `christmas`, not as an automation.
- **The M&F Waitlist form stays as it is.** No form slot needs freeing now.
- **MiMForm.tsx (the website's sign-up form) stays on MailerLite.** Pointing it at the front door is parked for a few weeks.
- **The speaking form is now a native Framer form that emails Jonathan,** and the Speaking Enquiry automation is paused. That frees the automation slot for the free-tools welcome.

MailerLite details:
- Group "Leads - Free Tools", id `201243953256727774` (the script's `MAILERLITE_GROUP_ID`). It had no subscribers on 15 October 2026.
- Fields: `baby_step` (id 1536796) and `tool` (id 1536797).
- The API token lives only in the script's Script Properties, never in this repo.

**Free plan limits** (MailerLite free plan, checked 15 October 2026):
- 250 active subscribers; there were 142 active, 183 in total.
- 3 active forms. The front door doesn't use one.
- 3 active automations of up to 5 steps. With Speaking Enquiry paused, the free-tools welcome takes that slot. Don't pause or edit the 9-step Budget Tool and App Signup flows; they exceed the current 5-step cap and may not switch back on. The Graduate Holding Sequence and the one-question welcome are still queuing for a slot. Checked 20 October 2026: all three active slots are in use (Budget Tool – Delivery & Nurture, App Signup – Welcome Flow, Free Tools – Welcome), and Speaking Enquiry no longer appears in MailerLite's automation list.
- 2,500 emails a month. The Thursday email to every active subscriber counts towards this.

Build tailored per-step sequences only after an upgrade.

## Platform decision (agreed 15 October 2026; recorded in MiM-Business-Overview)

- MailerLite stays the email platform. Systeme.io stays the home for course delivery, checkout and the shop.
- **No paid plan on either without a fresh review first.**
- Systeme.io could become the home for everything. It now has an official MCP connector covering contacts, newsletters, campaigns, automations, stats, funnels, products and courses. It is an early release: Claude Desktop only, a key that expires every 90 days (OAuth is planned), and no form management.
- Review triggers:
  - MailerLite active subscribers near 250;
  - Systeme.io's connector gaining OAuth (so it works in web and cloud sessions) and passing a hands-on test;
  - the Makeover V2 build starting.
- Suggested test: in Claude Desktop, list contacts and tags, draft (don't send) a newsletter, and pull last month's email stats.

## Steady Wage Planner (built 19 November 2026)

**Why:** people keep asking Jonathan how to budget when their income is up and down: mostly the self-employed, but also seasonal trades and anyone on commission or zero-hours. The question on the Money & Faith course was "Does the app handle one-off payments?" The answer in Jonathan's videos is to stop budgeting the lumps and pay yourself a wage from a holding account. This tool puts a number on it. For now it sits beside the budget app as the "income" tool: the wage it gives is the income to put in the app.

**The problem it solves:** for most people with lumpy income the year adds up, but the months don't. Bills are level and income isn't, so a good month feels like spare money and a lean month goes on a credit card. Budget apps assume one wage on one day. A holding pot fixes the timing, and a wage set at a quiet month keeps the pot from running dry.

**What someone puts in:** what landed in each of the last 12 months, whether tax has come off (and if not, the share they set aside for tax and costs), what's in the pot today, and the wage they pay themselves now if they have one. Nothing else.

**What it works out** (all in `steady-wage/logic.js`, which explains each rule):

| | Rule | Where it comes from |
|---|---|---|
| Wage | Last 12 months after tax and costs ÷ 15, rounded down to £10 | Jonathan's "pay yourself a quiet month" (carousel, slide 5) |
| Leanest stretch | The run of months that fell furthest behind the wage, checked round the calendar | New. It's the person's own figure for "how lumpy am I?" |
| Full pot | Leanest stretch + 3 months of wages, rounded up to £50 | The carousel says three months, or six for big lumps. This gives about 3 for steady work, 5 to 6 for lumpy work, and 7 or 8 for a long off-season |
| Low | 2 months of wages | Carousel, slide 8 |
| Good-year money | Anything over the full pot + 3 more months of wages | Carousel, slide 9 (over six months for steady work) |
| Pay review | January, April, July, October. Cut if the pot is under Low; rise if the last 12 months support 10% more and the pot would still be full; otherwise hold | Carousel, slide 8, with the sizes below |

**Three things the testing changed** (run `node steady-wage/tests/simulate.js` to see the tables). The simulation makes up thousands of five-year stretches of income, runs the planner's own sums with a review every three months, and counts the paydays that come up short. It's a guide, not proof.

1. **The pot is sized to the person, not flat.** With a flat three months, a "seven months on, five off" worker had no short payday in only 45% of five-year runs. Sized to their own leanest stretch, it was 95%.
2. **The cut is "10%, or down to what the last 12 months support if that's lower".** With a flat 10% cut, when income really fell the wage couldn't catch up. For work every month with big swings, the share of runs with no short payday went from 78% to 96% with the sharper cut.
3. **A rise is capped at 10% and needs a full pot at the new wage.** Without the cap, one good year ratcheted the wage up and the next ordinary year drained the pot.

With those rules, starting from a full pot: steady, seasonal and late-paid work had no short payday in 95 to 100% of five-year runs, and the wage changed less than once a year. The same people with no pot fall short of that wage four or five months every year. Starting from an empty pot, it filled in about 8 to 12 months.

**Where it's weaker, and says so:** very lumpy income (a third of months empty) still had the odd short payday in about a third of runs, and "three or four big payments a year" in over half. One year of figures isn't enough to pin down a wage for those people. The planner shows a note when money landed in four months or fewer, and the pay review does the rest: short paydays still fall from 8 a year to about one every two years.

**Decisions (keep these):**
- **The wage is always last year ÷ 15,** so the tool agrees with the carousel and the videos. The pot size is where it adapts.
- **No tax rates.** The share for tax and costs is the person's own figure, with a way to work it out and a link to HMRC's calculator (`links.hmrcTaxEstimate`). The carousel left the percentage off on purpose, and so does this. The made-up example uses 25%.
- **A blank month is never counted as £0.** Every month needs a figure (0 if nothing came in) unless "I started less than a year ago" is ticked. Otherwise a seasonal worker who skipped the winter boxes would get a wage that's far too high.
- **"Set £X as my wage" starts the clock.** The planner remembers the wage on the device and leaves it alone until the next review month, so nobody's wage gets chipped away each time they look. A wage typed into the form by hand is reviewed straight away.
- **With an empty pot, start anyway:** pay yourself the wage or whatever's in the pot, never more. The planner says when the pot should be full and how many paydays may come up short on the way.
- **Good-year money** goes "towards the Baby Step you're on, or on things you'd happily go without in a leaner year", which is the carousel's line with the Baby Steps added.
- **One faith line,** Proverbs 21:20, after the "when money lands" steps (the same verse as the carousel).
- **Benefits:** a line asks people on Universal Credit or other benefits to check with Citizens Advice before building a pot, with no figures.
- **The chart is plain boxes, not Chart.js,** so the same picture goes on the PDF and nothing extra is downloaded.

**Open questions for Jonathan** (none blocks the tool):
1. **Where does the pot sit in the Baby Steps?** The copy treats it as part of getting a budget (Step 0): it's wages waiting, not savings. If Jonathan would rather someone clears debt before filling it, say so on the pot card.
2. **A pay-review nudge by email.** Four short emails a year (January, April, July, October) to people who signed up from this tool would be a real reason to sign up. They'd be manual campaigns to `tool` = `steady-wage`, like the Christmas nudges. Not promised anywhere yet.
3. **The name.** "Steady Wage Planner" matches the carousel's "pay yourself a steady wage". It's set in `steady-wage/content.js` and the home page card.
4. **The app's wording.** The app card says to put the wage in "as your monthly income". Check that matches what the budget builder calls it.

## To do

**Jonathan**
1. Review and schedule the two Christmas nudge drafts in MailerLite. Suggested send dates: Friday 27 November and Friday 11 December 2026.
2. Send the Saving for Mission link (tools.moneyinmotion.org/saving-for-mission/) to Tim Jones at Neuma by WhatsApp, as planned on 3 November 2026. He may pass it to Rebecca, who runs his online course.
3. **Steady Wage Planner, before or straight after merging:** paste the new `apps-script/Code.gs` into the Apps Script editor and deploy a new version (steps in `apps-script/README.md`, "Changing the script later"). Until that's done, email sign-ups from the new tool are turned away. It's safe to do before the merge. Then do one test sign-up from the tool, and read the "Free Tools – Welcome" email to check it still makes sense for someone arriving from this tool.
4. Delete the merged branches on GitHub (Code > Branches). Cloud sessions aren't allowed to delete branches. Turning on "Automatically delete head branches" in the repo settings stops them building up.

Done by 3 November 2026: test sign-ups from every tool, the homepage link to the tools, and a check of the StepChange, CAP and Citizens Advice links.

**Claude**
1. Revisit pointing MiMForm.tsx at the front door (parked on 15 October 2026 for a few weeks, so due now).
2. Write launch content: a TikTok media pack for each tool. Christmas Without Debt is under way (first media pack drafted 19 October 2026, in Drive).
3. Optional: a cookie-free visit counter (for example GoatCounter). This needs Jonathan's OK and a line on the privacy page.
4. Email the 3 people in the old "Leads - Free Christmas Savings Tracker" group about the new Christmas planner.
5. Steady Wage Planner launch: add it to moneyinmotion.org/start if Jonathan wants it there (Framer, small text change), and write a TikTok media pack. The carousel going out on 23, 26 and 28 November 2026 is the natural place to point to it.

## Ideas backlog (not started)

- **Priority bills sorter + pastoral money first-aid guide for church leaders.** Rent, council tax and energy come first; then CAP or StepChange. This is CAP's own teaching.
- **Missing Money Finder.** A checklist of entitlements people miss, pointing to Turn2us. Rules change every April, so date every figure.
- **"If anything happens" family folder.** A possible first paid tool: a guided, printed family binder covering accounts, wishes and who to call. Hints only, never passwords.
- **Couples Money Date kit.** Paid backup idea: 12 monthly money dates. Date 1 free.
- **Church Money Health Check.** Paused: not enough church leaders yet to try it.
- **Steady Wage Planner, next steps:** a second year of figures for very lumpy income (one year isn't much to go on); a "a payment's just landed" splitter (this much to tax, this much stays, and how many paydays it covers); and the same sums inside the budget app, so the wage feeds the budget directly.
- **Also suggested:** a Give/Sow/Store planner, a 30-day no-spend challenge, a Bills MOT, a 2027 faith budget planner, and a first payslip pack for 16–22s.

## Testing

Run these after any change. All six suites passed on 19 November 2026.

```
node tests/quiz-logic.test.js                  # 57,645 checks
node debt-planner/snowball.test.js             # 4,026 checks
node saving-for-mission/tests/mission.test.js  # 41 checks
node christmas/tests/christmas.test.js         # 74 checks
node steady-wage/tests/wage.test.js            # 50 checks
node tests/signup-front-door.test.js           # 19 checks
python3 -m http.server 8000                    # then open http://localhost:8000/
```

Work on a branch and open a pull request. Several cloud sessions editing `assets/config.js` at once caused merge conflicts during the build, so keep tool-specific settings in their own block in that file.

## Changes since launch

Newest first. Each one went through a pull request on this repo unless it says otherwise.

- **19 November 2026: Steady Wage Planner** (new tool, `steady-wage/`). For income that goes up and down: a steady wage from the last 12 months, a holding pot sized to the person's own leanest stretch, a quarterly pay review and a PDF. It follows Jonathan's self-employed videos and the 18 November carousel, and the rules were tested on made-up years of income first. The home page has a fifth card, `config.js` has a `steadyWage` block and `links.hmrcTaxEstimate`, and the front door's `TOOLS` list has `steady-wage` (it needs redeploying: see To do). The full write-up is under "Steady Wage Planner" above.

- **3 November 2026: Framer connector** (not this repo). Claude can now edit moneyinmotion.org through the Framer connector from cloud and web sessions, not only from a local session on Jonathan's Mac. Tested on the 15 October "Money In Motion (copy)" project. Edits land unpublished on `main` with no branch, Claude never publishes, and big changes or new pages start with Jonathan duplicating the live project. The rules are in `CLAUDE.md` and the Business Overview.

- **3 November 2026: MailerLite tidy and the Christmas nudges** (in MailerLite, not this repo, apart from the image). Deleted the unused forms "Free Tools sign-up (mim-tools)" (never used) and "No Purchase Subscribers" (last sign-up November 2025), and the two switched-off 2025 automations "Welcome Email - Free Emergency Fund Tracker" and "Welcome Email - Free Christmas Savings Tracker". Kept "Thursday Email — website" (live) and "M&F Graduate — website" (feeds the Graduate Holding Sequence). Added the segment "Free Tools – Christmas Without Debt" (`tool` = `christmas`; 0 subscribers on 3 November) and two unsent campaigns aimed at it, "Christmas Without Debt – November payday nudge" and "– December payday nudge". Their header image is `assets/email/christmas-nudge.png` on this site: don't move or rename it, or the emails lose their picture.

- **3 November 2026: "Get the app" on the home page.** The "Want to go further?" button said "Open the app" and opened the web app. It now says "Get the app" and goes to moneyinmotion.org/app, which offers all three formats (`links.appPage` in `assets/config.js`). Later the same day every other app link followed: the footer, the quiz and debt planner app cards (one "Get the app" button instead of three), the Saving for Mission and Christmas links, and all four PDFs. The App Store, Google Play and web links now live only on the website's /app page, so `appIos`, `appAndroid` and `appWeb` are gone from `config.js`.

- **20 October 2026: quiz, savings over £500 while in debt.** Jonathan's 20 October video "Which Baby Step are you on?" teaches that if you have savings and a credit card balance, anything over the £500 starter fund should go at the debt, and it sends people to this quiz. The quiz placed them on Step 2 correctly but never said so. A follow-up question, `extraSavings` ("Do you have more than £500 in savings?"), now shows only when someone says yes to both the £500 question and the debt question, and shares question number 3 with the debt question. A yes sets `moveSavings` on the result, and on Step 2 the third action becomes "Keep £500 for emergencies. Move everything above it onto the smallest debt this week, then roll on to the next." (on screen and in the PDF). The debt-help box still comes first when it applies. Placement is unchanged: the answer never moves anyone to a different step.
- **20 October 2026: car finance counts as consumer debt** (same pull request). Jonathan's call: all car finance goes in the Step 2 snowball, the same as HP, and PCP isn't named anywhere. The lists of debts that count now say "car finance" (quiz, Baby Steps summary, debt planner, README), the "doesn't count" lists are just the mortgage and student loans, and every line calling PCP a budget line or monthly bill is gone, including the debt planner's PCP note. A quiz test fails if "PCP" comes back into the copy.
- **19 to 20 October 2026: Christmas Without Debt, extra money** (JonathanCoops/mim-tools#12). "Ways to boost the pot" in step 4: idea chips (an extra shift, overtime, Christmas temp work, Vinted, Facebook Marketplace or eBay, babysitting or pet-sitting, odd jobs, unused gift cards, loyalty points or cashback, something else), each with a rough amount that goes into the pot. A line asks people on Universal Credit or other benefits to check first. On the plan page, "Where you are now" shows In the pot so far and Still to find. Each extra-money line has a "Money in" tick, and "+ Add money that's come in" covers unplanned money. Ticking never moves the payday amount; changing an amount does, because it's then the real figure.
- **15 to 16 October 2026: custom domain** (JonathanCoops/mim-tools#10, #11, and the `CNAME` file). The site moved to tools.moneyinmotion.org. The old github.io address redirects.
- **15 October 2026: Baby Steps credit and a debt planner hint** (JonathanCoops/mim-tools#9). The steps are now described as "the Money in Motion Baby Steps, inspired by the principles of Dave Ramsey's Baby Steps and built for UK life". The debt planner's extra-payment hint now encourages any amount.
- **15 October 2026: privacy page on moneyinmotion.org** (Framer, done by Jonathan in a local session, not in this repo). Section 4 became "Website Forms, Free Tools & Email" and covers the sign-up record kept in a private spreadsheet. Section 7 gained how long details are kept (free-tool sign-up records for up to 12 months after unsubscribing), section 8 the right to withdraw consent and to complain to the ICO, and section 9 a line on providers outside the UK. If the tools ever store or send anything new, that page needs updating too.
- **15 October 2026: sign-up front door** (JonathanCoops/mim-tools#8). Replaced the MailerLite embedded form with the Apps Script described above. Single opt-in. The "Free Tools – Welcome" automation (one email) was active on 20 October 2026.

## Corrections after review (15 October 2026)

The business Claude's first review caught these, and they are fixed above or in the code:
- M&F Waitlist, not M&F Graduate, was the form to switch off. (Superseded later the same day: with the front door no form slot is needed, so M&F Waitlist stays as it is.)
- The README's house rules still said "10%" for Step 6. Fixed.
- The `christmas` tool value was missing from the `config.js` comments, and the home page description named only three tools. Both fixed.
- The email copy promised more than a single welcome email delivers ("your Step X plan is on its way", encouragement, nudges "every so often"). Fixed with the front door: the copy now promises only the welcome email and the Thursday email, plus the monthly payday nudge on the Christmas tool.
