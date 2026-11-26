# Meta Pixel integration

Pixel: `4096193424023864`. Production origin: `https://fwccompanies.services`.

## Architecture and privacy boundary

`src/main.tsx` installs the tracking controller once outside React StrictMode. `src/lib/meta-pixel.ts` implements Meta's official asynchronous `fbq` base-code queue and script, with TypeScript types and a fixed event allowlist. The SDK is inserted into the document head only after affirmative marketing consent. No static script, preconnect, noscript image, tag manager, npm SDK, or server-side Conversions API is added.

`src/lib/marketing-consent.ts` manages a versioned browser preference, stored for up to 180 days. Unknown, expired, malformed, or rejected choices do not permit tracking. Storage failures keep an explicit choice in memory for this page only. Global Privacy Control overrides acceptance. Other-tab changes to the choice are honored. No pre-consent actions are buffered or replayed. Consent is independent of the form's contact-request disclosure.

`src/components/privacy/MarketingConsent.tsx` provides equally styled accept/reject controls, plus a persistent footer Cookie settings button. Withdrawal sends Meta's consent revoke command, discards unsent event commands while the script is loading, and expires accessible first-party `_fbp` / `_fbc` cookies at the root path and host/parent domains. It cannot delete cookies on Meta's domains or undo previously sent data. A loaded SDK cannot be unloaded; the revoke API and event gate stop subsequent explicit events. The footer describes the provider, purposes, event types, cookie identifiers, browser metadata, preference retention, withdrawal and Meta policy links.

Manual-only configuration (`fbq('set', 'autoConfig', false, pixelId)`) precedes initialization. No advanced-matching fields are supplied. Custom event parameter objects are always empty. Only randomly generated event IDs are supplied in the event options; form conversion IDs derive from the form's random idempotency UUID. Names, emails, phone numbers, ZIP codes, property types, services, messages, link text and link destinations are never included in event parameters. The shared click handler inspects a link locally to classify it without transmitting its contents.

Meta's own SDK transmits standard browser/network metadata, such as page URL, referrer, IP/browser information and advertising cookie identifiers. Do not put personal or sensitive information in page URLs or campaign parameters. This integration does not claim anonymous tracking or zero personal-data processing by Meta.

## Event mapping

| Event | Meta API | Trigger | Duplicate control |
| --- | --- | --- | --- |
| PageView | track | First permitted page view after consent | Once per document, not per section URL or React effect |
| Lead | track | `submitLead` resolves after HTTP success and `accepted === true` | Once per form attempt UUID; same ID reused on submission retry |
| Contact | track | Any `tel:` anchor click, including mobile/header/footer/service links | One delegated document listener, no second forwarding of component phone hooks |
| EstimateButtonClick | trackCustom | Same-origin link to `/estimate` (or legacy `#estimate`) | One delegated listener covers all estimate CTAs |
| LeadFormStart | trackCustom | First input/select/textarea focus in an estimate-form attempt | Existing component ref plus UUID event deduplication |

The existing `fwc:analytics` local CustomEvent remains available. Only its confirmed-success and first-form-interaction hooks map to Meta. Form-submit, error, phone and hero local hooks do not separately forward to Meta. The success screen is terminal for that mounted form; a reload/remount creates a new attempt. Validation errors, HTTP errors, timeouts, malformed/unaccepted responses and CTA clicks never generate Lead. Contact is a telephone-link click, not proof of a completed call. Marketing failures are contained and do not change success or failure of lead submission.

Pixel/event deduplication state lives outside React components, so StrictMode effect replays do not initialize a second Pixel or repeat PageView. A successful attempt is marked before dispatching its event. A blocked tracker may lose the measurement; it never fabricates a replacement conversion or retries a previously attempted event. Failed business requests retain their original form idempotency key.

## Netlify configuration

No new server function, secret or dependency is needed. Existing API paths and Netlify section rewrites stay unchanged. Vite embeds these optional **Builds-scoped** public variables at build time:

| Variable | Default | Purpose |
| --- | --- | --- |
| VITE_META_PIXEL_ID | 4096193424023864 | Public Pixel ID; can use a separate test Pixel |
| VITE_META_PIXEL_ENABLED | enabled unless exactly false | Deployment kill switch |
| VITE_META_PIXEL_TEST_MODE | false | Explicitly permits localhost/dev/preview tracking, still requiring consent |

By default tracking requires a production build **and** the exact HTTPS origin `https://fwccompanies.services`. Localhost, Netlify deploy previews, the old `.com` domain, HTTP and unlisted www hostnames are disabled. Keep test mode false in production and general preview contexts. To verify on a dedicated staging deploy, set test mode true for that context and preferably use a separate test Pixel ID, then rebuild. Never include a Meta access token in VITE_ variables. There is no query-string or UI bypass for consent or production gating.

The repository has no existing Content Security Policy. If Netlify/site-level headers introduce one, allow the SDK at `https://connect.facebook.net` (including its `/signals/config/` resource), and Meta's HTTPS event endpoints at `https://www.facebook.com` in the applicable script/connect/image directives. Verify the actual requests in staging and retain the rest of the policy; do not add blanket wildcard permissions. This change does not weaken or replace security headers.

## Meta account configuration before live verification

The account owner must confirm access/ownership of this Pixel, connect the correct ad account, and confirm the production domain/traffic permissions in Events Manager as required by that account. In the Pixel/dataset settings:

- Disable **Automatic Advanced Matching**. The code never supplies matching fields, but account-side settings must also remain off.
- Disable automatically detected events / **Track events automatically without code** (wording may vary). Remove Event Setup Tool rules that fire Lead on a button, page URL or form submit. Only this confirmed-success integration should generate Lead.
- Remove any duplicate Pixel installation through Netlify snippets, a tag manager or another integration. The controller refuses to initialize over an unknown existing `fbq`, so conflicting installations must be removed.
- Configure website-lead campaigns to optimize for the standard **Lead** event, not EstimateButtonClick or LeadFormStart. The latter are custom funnel events, not accepted leads. No revenue value is invented.

These account settings cannot be changed or verified from this repository.

## Verification in Events Manager

1. Deploy to production (or a dedicated testing context configured as above). Open **Meta Events Manager > Data sources**, choose Pixel `4096193424023864`, then **Test events**. Open the website using its browser-event testing flow. Do not add a server-side `test_event_code` to this browser Pixel implementation.
2. In a clean browser profile, verify no `fbevents.js` or Meta event requests before a choice. Reject marketing: the form still works, and no Meta events should appear.
3. Open **Cookie settings**, accept marketing, and confirm exactly one PageView. Use Meta's **Meta Ads Data Advisor** extension (formerly Pixel Helper) as an additional installation check.
4. Click one estimate CTA: one EstimateButtonClick. Click one phone link: one Contact. Click another section link: no extra PageView for the same landing-page document.
5. Interact with several form fields: one LeadFormStart. Submit an empty/invalid form: no Lead. Exercise a failed request on staging with a mocked backend: no Lead.
6. Send one clearly labeled authorized test lead through the live form. Confirm its Sheet row and exactly one Lead. Inspect event parameters: no form values. This manual test creates a real lead and may count in reporting; coordinate it with FWC. The automated checks do not do this.
7. Withdraw consent. Confirm the revoke call, expired accessible cookies and no further explicit events. Reload: rejection persists and the SDK stays unloaded. Verify Global Privacy Control disables marketing even when a previous stored choice granted consent.
8. Review **Diagnostics** for duplicate event, domain or setup warnings. A blocker/browser restriction may prevent events; the form must still work. Local mocks establish code behavior, not Meta ingestion, attribution, match quality, inbox placement or account settings.

## Automated checks

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- `QA_URL=http://127.0.0.1:4190 node scripts/meta-pixel-check.mjs` against a fresh built preview. It serves local assets under an intercepted production origin and mocks every Meta and lead request: **no real Meta calls or leads**. It covers consent gates, production exclusion, event mapping, failed/unconfirmed submissions, withdrawal, GPC, SDK failures, and seven widths/light/dark plus axe checks.
- `QA_URL=http://127.0.0.1:4190 QA_FORM=1 npm run test:browser` for the existing site/form regression suite.
- For a dedicated dev server with `VITE_META_PIXEL_TEST_MODE=true`, run the Pixel browser check with `QA_PIXEL_ORIGIN` equal to that local origin to exercise React's development StrictMode. Do not leave the override enabled in normal deployment contexts.

## Remaining privacy decisions

FWC must review/approve the public privacy/cookie wording, Meta advertising/remarketing purposes, applicable regional opt-out disclosures, retention and privacy-request handling before launch. GPC handling and opt-in controls are implemented; they are not a blanket legal-compliance certification. No regional exemptions, consent bypasses, retrospective conversion replay, advanced matching, or Conversions API were enabled. The code does not request consent for unrelated marketing channels or reuse the form's contact permission as cookie consent.

Official references: [base code](https://developers.facebook.com/documentation/meta-pixel/get-started), [standard events](https://developers.facebook.com/documentation/meta-pixel/reference), [consent API](https://developers.facebook.com/documentation/meta-pixel/implementation/gdpr), [manual-only configuration and CSP](https://developers.facebook.com/documentation/meta-pixel/advanced/).
