# FWC form to Google Sheets

## Files

- `Code.gs`: Google Apps Script web-app receiver. Paste into Google's Apps Script editor.
- `appsscript.json`: optional manifest with V8, California time zone and Sheets scope.
- `../../server/google-apps-script.ts`: website backend delivery adapter. Keep it on the server.

Flow: website form -> same-origin website backend -> Apps Script -> private Google Sheet.

## Set up Google Sheets and Apps Script

1. Create a private Google Sheet owned by the account that will deploy the script. Copy the spreadsheet ID from `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.
2. Open **Extensions > Apps Script**, replace `Code.gs` with this folder's `Code.gs`, and save. No installable form-submit trigger is needed: the deployed web app's `doPost` receives the website submission.
3. In **Project Settings > Script Properties**, add:

   | Property | Value |
   | --- | --- |
   | `SPREADSHEET_ID` | Your spreadsheet ID |
   | `SHEET_NAME` | `Website Leads` or a new, dedicated tab name |
   | `SHARED_SECRET` | A randomly generated secret of at least 32 characters |

   Generate the secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store the same value in the website backend's `GOOGLE_APPS_SCRIPT_SECRET` environment variable. Do not put it in React, a VITE_ variable, Git, or a URL.
4. Select and run `setupSheet` once. Approve Google Sheets access. It creates the tab and headers without overwriting existing rows. A tab with different headers is rejected; use a new tab rather than renaming internal columns.
5. Choose **Deploy > New deployment > Web app**. Execute as **Me** (the sheet owner), with access **Anyone** so the authenticated website backend can reach it without a Google login. The shared secret still authenticates writes. Workspace administrator restrictions may affect this option. Keep the spreadsheet itself private.
6. Copy the deployed **Web app URL ending in `/exec`** and supply it for integration. The `/dev` test URL is not the production endpoint. When changing script code later, update the deployment to a new version.

The optional manifest can be pasted into `appsscript.json` after enabling manifest visibility in Project Settings. Also set the spreadsheet's own time zone to America/Los_Angeles if California-local timestamps are desired; Date cell display follows spreadsheet settings.

## Saved columns

Submitted At, Request ID, Payload Hash, Full Name, Phone, Email, Service Code, Service Required, ZIP Code, Message, Status, Preferred Contact, Property Type.

Email is optional when Phone is selected and required when Email is selected. Property type is required and accepts Single Family, Multi Family, Commercial, Institutional or HOA. Every customer-entered field is saved, including an optional blank email. The honeypot is validated and intentionally not stored. Timestamp and `New` status are added automatically. Phone and ZIP are text to preserve leading zeros. Formula-like customer strings are escaped as literal text.

The website backend also includes preferred contact and property type in the Message column, so the existing deployed receiver preserves these choices immediately. To get separate columns, paste the updated `Code.gs` into the existing Apps Script project and update its web-app deployment to a new version, keeping the same URL and Script Properties. The receiver appends the two headers to the existing 11-column layout without changing historical rows; running `setupSheet` performs the same safe migration. Existing rows have blank values in the new columns. Do not reorder or rename internal columns.

Request ID is the browser's existing Idempotency-Key. A script lock serializes lookup and append. An identical retry returns success without a second row; a changed payload using the same ID is rejected. Duplicate protection lasts while the row/ID remains in this tab. Archive rather than delete IDs if retries must continue to deduplicate. Do not manually edit Request ID or Payload Hash.

## Website backend connection

Set these only in the backend environment:

```dotenv
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GOOGLE_APPS_SCRIPT_SECRET=YOUR_PRIVATE_SHARED_SECRET
```

Use the adapter with the existing hosting-neutral handler:

```ts
import { createLeadHandler } from './server/leads';
import { createGoogleSheetsDelivery } from './server/google-apps-script';

const handler = createLeadHandler({
  ...approvedDurableStorageAndRateLimitAdapters,
  origin: 'https://fwccompanies.com',
  deliver: createGoogleSheetsDelivery({
    url: serverEnv.GOOGLE_APPS_SCRIPT_URL,
    secret: serverEnv.GOOGLE_APPS_SCRIPT_SECRET,
  }),
});
// Mount handler at POST /api/leads using the selected hosting runtime.
```

`approvedDurableStorageAndRateLimitAdapters` and `serverEnv` above describe the hosting-specific dependencies, not existing exports. The handler has not been deployed: hosting is still to be selected. Add trusted per-client rate limiting and durable claim/receipt adapters before exposing the endpoint. Apps Script adds an authenticated global cap of 60 new writes per minute but cannot reliably identify visitors' source IP addresses.

After the backend is configured and tested, set frontend `VITE_LEAD_ENDPOINT=/api/leads` and rebuild. Do not put the Apps Script URL directly into VITE_LEAD_ENDPOINT. Browser-to-Google redirects/preflight cannot be treated as confirmed delivery, and `mode: no-cors` cannot read the acknowledgement. Do not show success for opaque responses.

The adapter follows Google's ContentService redirect and requires `{ "accepted": true, "requestId": "matching-id" }`. Script failures return JSON with `accepted: false`, even where the HTTP status is 200. The browser's success state and lead-success event run only after confirmed backend acceptance.

## Verify before enabling

Send one clearly marked test request through the configured backend and check the sheet manually. Resend the same ID to confirm only one row. Check invalid fields, honeypot input, incorrect secret, mismatched retry content and unavailable Google service; these must not produce success. Keep production submissions disabled until this verification and the privacy notice update are complete.

Google Apps Script and Sheets have service quotas; monitor execution failures and revisit the append/lookup design as volume grows. No live Google account was accessed and no test row was created as part of this repository change.

References: [Google web-app deployment](https://developers.google.com/apps-script/guides/web), [ContentService and redirects](https://developers.google.com/apps-script/guides/content), [LockService](https://developers.google.com/apps-script/reference/lock/lock-service).


## Branded lead emails

After saving each new lead, the receiver sends an HTML notification with a plain-text fallback to **nimantabandara@gmail.com**. If the customer supplied an email, it also sends a matching confirmation. Both templates use the FWC black, red, white and silver identity and display all submitted fields. The customer template does not include the private Sheet link. Customer-entered HTML is escaped.

### Enable on the existing deployment

1. Replace the existing Apps Script `Code.gs` with this folder's updated file.
2. If the project uses explicit scopes in `appsscript.json`, add `https://www.googleapis.com/auth/script.send_mail` alongside the Sheets scope (the supplied manifest already includes both). If scopes are automatic, Google detects MailApp from the code.
3. Save, select **authorizeEmail**, and click **Run** as the account that owns the deployment. Approve the email permission. This authorization function sends no email.
4. Choose **Deploy > Manage deployments > Edit > New version > Deploy** on the existing web-app deployment. Keep its `/exec` URL, Script Properties and Execute-as-owner setting unchanged. Website environment variables do not change.
5. Submit a clearly labeled test lead with an email address. Confirm the Sheet row, the team email, and the customer confirmation (including spam folders). Do not test by clicking Run on `doPost`: it expects an HTTP event.

Mail is sent from the Google account executing the deployment, with the display name **FWC Plumbing & Rooter**. The team email's Reply-To is the customer address when supplied; customer replies go to **nimantabandara@gmail.com**. This does not configure a custom-domain From address.

Hover over the new row's **Status** cell to see its email-delivery note: Team/Customer `sent`, `failed`, `quota exhausted`, or customer `not provided`. `sent` means MailApp accepted the send; it does not guarantee inbox placement. Leads remain accepted and saved even if mail fails. Duplicate requests and historical rows do not trigger emails. Failed messages are not automatically resent; follow up from the saved lead. A process interruption after saving can leave no delivery note or incomplete email delivery, so the Sheet remains the source of truth. No email queue or delivery webhook is included.

The team notification gets priority when quota is low. Google applies per-account mail quotas; each new lead normally consumes two recipient sends, or one if no email was supplied. Monitor Status notes and Apps Script executions. No live emails were sent while implementing or testing this change.

Reference: [Google MailApp, permissions and send options](https://developers.google.com/apps-script/reference/mail/mail-app).

Email copy now uses normal-case headings, a dark button and an explicitly labeled website link for customers. The company phone appears once in customer guidance, without a repeated phone CTA or urgent wording. These presentation changes do not establish the cause of spam classification or guarantee inbox delivery; sender authentication and recipient filtering still require verification.
