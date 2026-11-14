# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A single-page, mobile-first, ClickFunnels-style **lead-generation landing page** for FWC Companies (legal name FWC LLC), a 24/7 plumbing/electrical/HVAC contractor in Placentia, CA serving Orange County and the Inland Empire. It replaces an existing Jobber-builder site. This is explicitly **not** a traditional multi-page corporate site for phase one — it's one high-converting page optimized for paid traffic (Google/Meta Ads).

Primary conversion: estimate/contact form submission. Secondary conversion: phone call.

- `instruction.MD` is the governing project brief.
- `fwcdetails.md` is the factual discovery source.
- `docs/INTEGRATION.md` records remaining production gates; `docs/NETLIFY.md` covers deployment/runtime env; `docs/QA.md`/`docs/QA-FOLLOWUP.md`/`docs/BRAND-REVIEW.md` record verification already performed and what's still outstanding.

## Commands

- `npm run dev` — Vite dev server on `127.0.0.1`. Includes the local `/api/leads` middleware (see Architecture below); without `GOOGLE_APPS_SCRIPT_URL`/`GOOGLE_APPS_SCRIPT_SECRET` in `.env.local` it answers 503 instead of delivering.
- `npm run build` — `tsc -b` type-check → Vite client build → Vite SSR build of `src/entry-server.tsx` into `.prerender/` → `scripts/prerender.mjs` renders `App` to a string, inlines it into `dist/index.html`, and deletes `.prerender/`.
- `npm run preview` — serves the built `dist/` on `127.0.0.1` with the same lead middleware as `dev`.
- `npm run typecheck` — `tsc -b` only.
- `npm run lint` — ESLint over the repo.
- `npm run format` — Prettier over `src server tests scripts vite.config.ts eslint.config.js tsconfig.json package.json index.html`.
- `npm test` — `vitest run` (all tests, once). Single file: `npx vitest run tests/leads.test.ts`. Single test by name: `npx vitest run tests/leads.test.ts -t "name substring"`.
- `npm run test:browser` — `scripts/browser-check.mjs`: Playwright sweep of a built+previewed app across 320–1440px checking for horizontal overflow, expected section counts, mobile-menu Escape handling, and axe WCAG checks at 375/1440px. Requires `npm run build && npm run preview` already running (default `QA_URL=http://127.0.0.1:4173`) and Chromium (`npx playwright install chromium`, or set `CHROME_PATH` to an installed Chrome binary). For the mocked lead-form path, start Vite with `VITE_LEAD_ENDPOINT=/api/leads`, point `QA_URL` at that dev server, and set `QA_FORM=1` — it intercepts every submission and sends nothing real.
- `npm run test:brand` — `scripts/brand-check.mjs`: brand/theme QA (light + dark, more widths) against a local preview, default `QA_URL=http://127.0.0.1:4180`; same `CHROME_PATH` override. Writes artifacts to `artifacts/brand-review/`.
- `npm run assets:brand` — `scripts/optimize-brand-assets.mjs` regenerates resized/WebP derivatives of the supplied brand photos (e.g. `public/Lory.jpeg`); it never modifies the original source files.

Node engines: `^22.12.0 || ^24.0.0 || >=26.0.0`.

## Architecture

### Lead submission pipeline

This is the one piece of real backend logic in the repo, and it's reused across three hosts rather than duplicated:

1. `src/lib/lead-schema.ts` defines the Zod `leadSchema`/`Lead` type — shared by client and server, so the server never trusts the browser's own validation.
2. `src/components/forms/LeadForm.tsx` (React Hook Form) calls `submitLead` in `src/lib/leads.ts`, which throws immediately if `VITE_LEAD_ENDPOINT` is unset. **Online submission is opt-in, not default** — see `docs/INTEGRATION.md` before ever setting that variable against a real endpoint.
3. `server/leads.ts` exports `createLeadHandler(deps)`, a hosting-neutral `Request -> Response` handler: enforces POST/origin/content-type/body-size, validates with `leadSchema`, requires an `Idempotency-Key` UUID header, then calls injected `deps` for rate limiting and idempotency claim/accept/release/delivery. It never talks to Google directly — that's injected, so it's testable without network calls (see `tests/leads.test.ts`, `tests/server.test.ts`).
4. `server/google-apps-script.ts` is the one real delivery adapter: it POSTs to a deployed Google Apps Script web app (`integrations/google-apps-script/Code.gs`), which does locked, durable dedup by request ID *and* payload fingerprint — that lock is the actual source of truth for "was this lead already saved," not anything in this repo's process memory.
5. Two hosts wire `createLeadHandler` + the Apps Script adapter together:
   - `server/local-leads.ts` — a Vite plugin (`localLeadPlugin`, mounted in `vite.config.ts`) used by `dev`/`preview`; does in-memory per-IP rate limiting, which is fine only because it's local/single-process.
   - `netlify/functions/leads.ts` — the production `/api/leads` Netlify Function, via `server/netlify-leads.ts`; rate limiting is delegated to Netlify's `config.rateLimit` rather than reimplemented in-process.

Never add an in-memory "already accepted" cache as a substitute for the Apps Script lock — multiple function instances and retries must all hit the same durable check (see the comments in `server/leads.ts` and `server/netlify-leads.ts` explaining why).

### Page composition

`src/App.tsx` is the entire page — see "Landing page structure" below for section order — and is intentionally not split into routes (no React Router is installed). `src/entry-server.tsx` renders that same `App` with `renderToString` for `scripts/prerender.mjs` to inline into `dist/index.html`, so the shipped HTML carries full content and the business `LocalBusiness` JSON-LD with JavaScript disabled, and React then hydrates on top for menus, service selection and the form.

- Business content (services, FAQs, company facts) lives in `src/data/content.ts`, not inline in JSX — put new/changed copy there, and keep stable `service.id`s intact since the lead form, analytics and URLs reference them.
- Components are split into `src/components/{layout,ui,sections,forms}` by role (layout chrome, small reusable actions/toggles, page sections, the form).
- `src/hooks/useTheme.ts` plus the inline script in `index.html`'s `<head>` keep the `fwc-theme` dark/light preference consistent from first paint through hydration (avoids a flash/mismatch); both read/write the same `localStorage` key and must stay in sync if touched.
- `src/lib/motion.tsx` (+ the lazy-loaded `src/lib/motion-features.ts`) centralizes the `motion` (Framer Motion) setup: `LazyMotion`/`strict` mode, the `reveal()`/`useRevealVariants()` scroll-entrance helpers, and `useRevealKey()`, which remounts animated containers after hydration so the prerendered output stays fully visible with JS off and `prefers-reduced-motion` is respected.
- `src/lib/analytics.ts`'s `track()` is a local-only readiness hook (`fwc:analytics` CustomEvent) — no vendor is wired up; never pass PII, raw URLs or query strings into it (see Non-negotiable constraints).

## Landing page structure

Single page, in this order (reorderable only when justified by UX/CRO reasoning): Header → Hero → Trust Indicators → Services → Why Choose FWC → Projects → How It Works → Contact Form → FAQ → Final CTA → Footer. A sticky mobile CTA bar (Call Now / Get Estimate) must persist across the page without blocking content.

## Source-of-truth priority (critical)

When content, copy, or business facts are ambiguous or conflicting, resolve in this order:
1. Client-approved requirements (explicit instructions given in the session)
2. `fwcdetails.md` (the discovery report)
3. Existing repository content (`src/data/content.ts`, etc.)
4. The live site at fwccompanies.com

**Never invent** testimonials, certifications, reviews, addresses, years of experience, pricing, guarantees, or other business claims. Mark anything unconfirmed as `TODO: Client confirmation required` rather than guessing. Only confirmed-active services may be presented; legacy/unclear services require explicit approval before inclusion.

### Known data landmines from the discovery report

The current live site has verified factual errors — do not carry these into the new build, and flag them if asked to "migrate" content verbatim:
- Plumbing and Electrical page meta descriptions name a different company ("RPM Property Services Inc.") — never reuse.
- The HVAC page's meta description and one benefit card contain restoration (fire/flood/mold) copy, not HVAC copy.
- Service area claims conflict across pages (Anaheim vs. Placentia vs. Norco vs. Santa Ana; stray mentions of Arizona, LA, San Bernardino) — do not assert a service area beyond what's client-confirmed.
- Financing figures conflict ($250,000 in meta vs. $400,000 on-page) — treat both as unverified until confirmed with Hearth/the client.
- Company founding year, CSLB license number, and several certification details are unverified — see `fwcdetails.md` §14 ("Missing Information to Request from the Client") before stating any of these as fact.

## Design direction (client-approved, 12 November 2026)

The latest client branding supersedes the earlier Navy & Signal Red direction.

- Official public name: **FWC Plumbing & Rooter**. Associated branding: **Powered by FWC Companies**. Legal footer name remains FWC LLC.
- Primary slogan: **ONE CALL, WE DO IT ALL**. Secondary: **WE HANDLE PROBLEMS OTHERS CAN'T FIGURE OUT**.
- Palette: black #101010, vivid red #E51C35, white #FFFFFF, silver #C6C8CC. Theme surfaces/text use shared CSS tokens, with accessible red text variants where needed.
- Use the supplied logo public/lofwc.jpeg without redrawing, filters or metallic CSS effects. public/Lory.jpeg is the real company truck reference. Resized/WebP derivatives improve loading; originals remain unchanged.
- Light/dark toggle follows the system on first visit, persists fwc-theme preference, and initializes before React hydration.
- Keep honeycomb texture subtle and limited to the hero. Avoid excessive red surfaces and effects.
- Client-approved company highlights: 8 Trucks, 12 Employees, 24/7 Service, Certified Technicians.
- Include WE OFFER FINANCING, with no invented financing terms. Remove public Client Login links.
- Who We Serve: Single Family, Multi-Family Specialist, Commercial & Institutional, HOA.
- Preserve all seven service categories and stable backend service IDs; group truck-listed capabilities into existing cards.
- public/footer/footer1.jpeg is a supplied BBB badge; footer2.jpeg is a promotional credentials overview, not an issuer certificate. Display both supplied credential images inline in the actual footer, not only in a pop-up. Identify the overview as company-supplied material without adding credential numbers or warranty promises. Current validity, detailed certificates, and badge permissions still need client documentation.
- Never push these changes without a new explicit user instruction; the current branding request expressly prohibits pushing.

## Non-negotiable constraints

- **Mobile-first, always.** Design and test at 320/375/390/430/768/1024/1440px. No horizontal scroll, 44×44px minimum touch targets, no hover-only functionality, respect safe-area insets.
- **Lead form is business-critical.** Server-side validation, spam/rate limiting, duplicate-submission prevention, accessible error states, and a real approved submission destination (business email/CRM/Jobber) — never fake a successful submission or expose API credentials client-side. Confirm integration details before wiring up production submission.
- **Analytics only after approval**, and never send PII (name/email/phone) in event payloads. Planned events: `page_view`, `hero_cta_click`, `phone_click`, `lead_form_start`, `lead_form_submit`, `lead_form_success`, `lead_form_error`.
- **Performance/accessibility/security targets:** LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1; WCAG 2.2 AA; HTTPS, server-side validation, no hardcoded secrets, minimal data retention.
- Never claim tests passed, or report a task complete, unless actually executed/verified.

## Working process

Component build-out (`instruction.MD` §15 phases 1–3) is done; current work sits in phases 4–6 — approved integrations/conversion events, SEO/performance/accessibility, and production readiness. Check `docs/INTEGRATION.md` for what's still gating a real production lead destination, and `docs/QA.md`/`docs/QA-FOLLOWUP.md`/`docs/BRAND-REVIEW.md` for what's already been verified, before assuming something is or isn't done.

Before changing code: inspect existing conventions, read `instruction.MD` and `fwcdetails.md`, identify relevant files, and plan substantial changes before implementing. Keep changes small and focused; don't touch unrelated files. After implementation: run lint/type-check/tests/build, verify responsive behavior where possible, and report actual results — including limitations — rather than assuming success.
## Design skills (taste-skill) — scope limits

The client-approved design direction above overrides any design skill.
When using design-taste-frontend or redesign-existing-projects:
- Do not change the palette, logo, slogans, fonts, or honeycomb usage.
- No new animation libraries (no GSAP); use src/lib/motion.tsx only, and
  keep prefers-reduced-motion and the useRevealKey hydration behaviour.
- Use existing CSS theme tokens; every change must work in light and dark.
- Never add or rewrite business claims, stats, testimonials or copy;
  copy changes go through src/data/content.ts and need my approval.
- Never change LeadForm logic, lead-schema, server/, or service IDs.
  Styling of the form is allowed.
- Do not reorder sections without stating the CRO reason first.