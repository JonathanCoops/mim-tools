# CLAUDE.md

Money in Motion's free money tools: four browser tools at https://tools.moneyinmotion.org/, served by GitHub Pages from `main`. Plain HTML, CSS and JavaScript with no build step. Email sign-ups go through a Google Apps Script in `apps-script/`.

## Read first, every session

1. `HANDOVER.md`: why the tools exist, the decisions made (and the reasons), what changed since launch, and what's still to do.
2. `README.md`: how the code is laid out, how to edit `assets/config.js`, and the House rules (voice, accuracy, privacy) that every line of copy follows.
3. `apps-script/README.md`, before touching sign-ups: how the script is deployed and how to redeploy it without changing its URL.

## The bigger picture lives in Google Drive, not here

This repo only covers the tools. For anything about the wider business, read the Drive docs instead of guessing:

- **MiM-Business-Overview** owns product status, priorities and the platform plan. That covers the website (Framer), email (MailerLite), payments and checkout (systeme.io with Stripe; Payhip for the 12-Day Makeover until V2) and how Claude may edit the website.
- **Doc 3 — Knowledge Base** owns product details, links and prices (apart from Money & Faith).
- **Doc 1 — Voice + Brand** owns Jonathan's voice. The mim-voice skill applies to any copy.

Nothing about payments is built in this repo. The tools are free and take no money.

## Working rules

- Work on a branch and open a pull request. Never push to `main`; it goes live as soon as it's merged.
- Run all five test suites before pushing. The commands are in `HANDOVER.md` under Testing.
- The repo is public. No secrets, API keys or personal data, ever. The MailerLite key lives only in the Apps Script's Script Properties.
- Every link and setting lives in `assets/config.js`. Each tool's words live in its own `content.js`.
- Nothing a person types leaves their device except the optional email sign-up. No analytics and no cookies unless Jonathan agrees and the privacy page says so.
- When something is built, changed or decided, record it in `HANDOVER.md` in the same pull request, so the next session knows.
- The main website, moneyinmotion.org (including its /privacy page), is a Framer project, not this repo. Edit it only through the Framer agent in a local Claude Code session on Jonathan's Mac, as the Business Overview describes.
