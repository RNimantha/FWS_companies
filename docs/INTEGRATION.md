# Production integration gate

The frontend is complete as a local review build. It does not send leads until VITE_LEAD_ENDPOINT is set. There are no tracking vendors installed, no persistent attribution identifiers, and no fabricated success state.

## Endpoint contract
POST JSON matching `src/lib/leads.ts`, with an `Idempotency-Key` UUID header. Return HTTP 200/201 and `{ "accepted": true }` only after durable acceptance or confirmed destination delivery. Every other result remains a form error. A timed-out retry must reuse the same key.

Before enabling the endpoint:
- Confirm approved Jobber API access or receiving email/CRM and notifications.
- Deploy a same-origin serverless function with strict method/origin/content-type checks and a small body limit.
- Validate again on the server. The shared schema in src/lib/leads.ts is server-safe; do not trust the browser.
- Add shared/durable rate limiting, honeypot validation and optional server-verified challenge.
- Use atomic durable idempotency storage. Store accepted receipts, prevent concurrent duplicate delivery, expire records according to policy.
- Use HTTPS, server-only credentials, bounded provider timeouts, scrubbed operational logs and minimal retention. No secrets in VITE_ variables.
- Test actual delivery, notification, provider rejection, timeout/retry, spam and rate-limit behavior in staging.
- Approve privacy policy and processor disclosures; replace the interim footer notice.

## Advertising
Meta Pixel `4096193424023864` now maps the existing form hooks and delegated CTA/telephone clicks through explicit marketing consent. The SDK loads only after opt-in, and defaults to production builds on `https://fwccompanies.services`. No form values are forwarded. See [META-PIXEL.md](META-PIXEL.md) for event mapping, testing overrides, account settings, privacy review and verification. Earlier statements that no tracking vendor is installed are superseded by this integration. The local `fwc:analytics` event remains available; only its first-interaction and confirmed-success hooks forward to Meta. Consent-controlled additional UTM/ad-ID capture is not implemented.

## Content and launch confirmations
TODO: Client confirmation required — CSLB/license classes, BBB/current accreditation, certificates and badge rights, exact service coverage, restoration/hazardous-material scope, public business address, warranties, response-time claims, financing and free offers. These claims are not promoted in this build.

The typographic FWC header is a provisional wordmark, not an approved replacement logo. Photos are reference assets from the existing website CDN; obtain originals and permission before launch. No stock/AI images, invented reviews, project outcomes or ratings were added.

The published Ontario water-heater project is represented as a text case study; the electrical gallery image is explicitly labeled gallery work and not assigned to that project.

Before domain replacement, approve individual migration outcomes for all 13 existing URLs. Do not blanket redirect unrelated pages. Hosting, redirects, email/CRM delivery, production security headers and policy approval are not configured.

## SEO / future routes
The Vite build prerenders the complete page into HTML and hydrates it in the browser. Canonical, sitemap and social URL use the intended fwccompanies.com domain; adjust for the actual deployment. Future blog/service/campaign routes can reuse typed content and sections; no empty routes or unnecessary router are added. The LocalBusiness schema uses only the report’s name, phone, email and address; confirm these before launch. FAQ rich-result eligibility is not promised.

A hosting-neutral Request/Response handler is provided in server/leads.ts. It enforces origin/method/type/body bounds, validation, rate-limit and atomic idempotency adapter contracts. It is deliberately not deployed or connected. Supply trusted client identity, durable shared stores and a provider adapter with downstream idempotency/timeout support.

## Google Sheets option

A concrete server-side destination adapter now exists at `server/google-apps-script.ts`, with the separate Google receiver at `integrations/google-apps-script/Code.gs`. See `integrations/google-apps-script/README.md` for Script Properties, private sheet setup, deployment and the backend connection. The destination is not connected or deployed. The Apps Script write is confirmed before acceptance and independently deduplicates by request ID under a script lock. All customer form fields are saved; the honeypot is rejected rather than stored.

Local connection verified on 6 November 2026: Apps Script accepted a labeled test row, deduplicated its retry, and the browser form confirmed receipt through the local Vite backend. `.env.local` now sets VITE_LEAD_ENDPOINT=/api/leads. This does not deploy a production backend; live hosting configuration remains outstanding.

## Netlify production route

The missing production route is now implemented at netlify/functions/leads.ts with custom path /api/leads. netlify.toml selects the Functions directory and build defaults. See docs/NETLIFY.md for runtime-secret scopes and deployment verification. This supersedes earlier notes that no production handler exists; actual live deployment must still be checked.
