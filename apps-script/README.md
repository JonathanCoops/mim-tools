# Sign-up front door (Google Apps Script)

Every email sign-up from the four tools comes here first. The script:

1. checks the request: a hidden "website" box that only bots fill in, at least 3 seconds between the form appearing and being sent, at most 3 sign-ups per email address an hour and 100 an hour in total, and the field rules (a real-looking email, a known tool, sensible lengths);
2. adds the person to MailerLite, in the group "Leads - Free Tools", with the `name`, `tool` and `baby_step` fields filled in;
3. writes a row to the "Sign-ups" tab of the Sheet as the consent record: when, which tool, the email, the first name, the exact consent wording they saw, the page, and the result.

It's single opt-in: no confirmation email. It never sends MailerLite a `status` or `resubscribe`, so anyone who has unsubscribed stays unsubscribed. MailerLite's own double opt-in settings are left as they are.

| File | What it is |
|---|---|
| `Code.gs` | The script: `doPost` (sign-ups), `doGet` (a health check that says "ok") and `setupSheet` |
| `appsscript.json` | The project settings: London time, the web app settings and the two permissions it needs (this Sheet, and calling MailerLite) |

Tests: `node tests/signup-front-door.test.js` runs `Code.gs` against stand-ins for the Google services, so nothing is sent anywhere.

## What lands in the Sheet

| Result | Meaning | What's logged |
|---|---|---|
| `added` | MailerLite took it (HTTP 200 or 201) | Everything |
| `mailerlite-error` | It passed every check but MailerLite said no, or couldn't be reached. The person sees an error that suggests emailing Jonathan. | Everything, plus MailerLite's status code, so you can add them by hand |
| `spam` | The hidden box was filled in. The bot is told it worked. | Tool and result only |
| `too-fast` | Sent within 3 seconds of the form appearing | Tool and result only |
| `invalid` | Broke a field rule | Tool (if it was a real one) and result only |
| `rate-limited` | Over 3 an hour for that address, or 100 an hour overall | Tool and result only |

Anything typed that starts with `=`, `+`, `-` or `@` is stored as plain text, so it can't run as a formula.

## First deploy

Do this signed in to the Money in Motion business Google account.

1. **Make the Sheet.** In Google Drive, create a Google Sheet called **Free Tools — Sign-up Log**. Keep it private: it holds people's email addresses.
2. **Add the script.** In the Sheet, open **Extensions > Apps Script**. Rename the project (for example "Free Tools front door"). Replace everything in `Code.gs` with this folder's `Code.gs`.
3. **Add the project settings.** In Apps Script, open **Project Settings** (the cog) and tick **Show "appsscript.json" manifest file in editor**. Back in the editor, replace the contents of `appsscript.json` with this folder's `appsscript.json`.
4. **Add the Script Properties.** In **Project Settings > Script Properties**, add:
   - `MAILERLITE_API_KEY`: a MailerLite API token (MailerLite > Integrations > API > Generate new token). Give it a name like "Free Tools front door".
   - `MAILERLITE_GROUP_ID`: `201243953256727774` (the "Leads - Free Tools" group).

   Never paste the token into a file in this repo.
5. **Make the tab.** In the editor, choose `setupSheet` in the function list and press **Run**. Google asks for permission the first time: allow it (it asks to see this spreadsheet and to connect to an external service, MailerLite). The Sheet now has a "Sign-ups" tab with the headers.
6. **Deploy.** Press **Deploy > New deployment**, choose the type **Web app**, and set:
   - Description: for example "v1";
   - Execute as: **Me**;
   - Who has access: **Anyone**.

   Press **Deploy** and copy the **Web app URL** (it ends in `/exec`).
7. **Check it.** Open the URL in a browser. It should say `ok`.
8. **Connect the tools.** Paste the URL into `assets/config.js` as `signup.endpoint`, on a branch, and open a pull request. Once it's merged and live, do one test sign-up from each tool and check: a row with `added` in the Sheet, the subscriber in "Leads - Free Tools" in MailerLite with `tool` (and `baby_step` from the quiz) filled in, and the welcome email arriving. The subscriber should show as **Active**. If it shows as **Unconfirmed**, MailerLite is applying double opt-in to API sign-ups: leave the setting alone and raise it in a Claude session before changing anything.

## Changing the script later (same URL)

1. Edit `Code.gs` in this repo first, run `node tests/signup-front-door.test.js`, and merge it.
2. Paste the new `Code.gs` into the Apps Script editor and save.
3. Press **Deploy > Manage deployments**, select the existing web app deployment and press the **pencil (Edit)**.
4. Under **Version**, choose **New version**, add a short description and press **Deploy**.

The URL stays the same, so `config.js` doesn't change. Don't use **New deployment** for an update: that makes a new URL, and the tools would carry on using the old version.

To change the API token or group, edit the Script Properties. That takes effect straight away, with no redeploy.

## If something goes wrong

- **Every sign-up shows `mailerlite-error` with `401`:** the API token is wrong or was revoked. Make a new one and update `MAILERLITE_API_KEY`.
- **`mailerlite-error` with `not configured`:** a Script Property is missing.
- **`mailerlite-error` with `422`:** MailerLite didn't like the data (usually the email address). Check the address by hand.
- **Nothing reaches the Sheet at all:** open the web app URL and check it says `ok`; check the deployment's access is still "Anyone"; then look at **Executions** in Apps Script for errors.
