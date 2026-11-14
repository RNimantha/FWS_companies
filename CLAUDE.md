# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

The application is now scaffolded as React + strict TypeScript + Vite + Tailwind CSS.

- `instruction.MD` is the governing project brief.
- `fwcdetails.md` is the factual discovery source.
- `src/` contains the landing page, reusable header/actions/services/form, content and validation.
- `server/leads.ts` is the shared submission handler. `netlify/functions/leads.ts` mounts the production `/api/leads` endpoint; `server/netlify-leads.ts` connects Google Sheets. Apps Script provides locked, durable request-ID/payload deduplication; Netlify config supplies platform per-client rate limiting. See `docs/NETLIFY.md` for runtime environment requirements.
- `docs/INTEGRATION.md` records remaining production gates.

Actual scripts: `npm run dev`, `npm run build` (type-check, client build, Vite SSR build and static prerender), `npm run preview`, `npm run typecheck`, `npm run lint`, `npm test`. See package.json for additional QA scripts.

Online submission stays disabled without VITE_LEAD_ENDPOINT. Never enable it without an approved endpoint. No advertising vendors are installed; analytics events are local readiness hooks only. The header and footer use the client-supplied logo; public/Lory.jpeg is the primary brand reference. Source image files are preserved unchanged.

## What this project is

A single-page, mobile-first, ClickFunnels-style **lead-generation landing page** for FWC Companies (legal name FWC LLC), a 24/7 plumbing/electrical/HVAC contractor in Placentia, CA serving Orange County and the Inland Empire. It replaces an existing Jobber-builder site. This is explicitly **not** a traditional multi-page corporate site for phase one — it's one high-converting page optimized for paid traffic (Google/Meta Ads).

Primary conversion: estimate/contact form submission. Secondary conversion: phone call.

## Source-of-truth priority (critical)

When content, copy, or business facts are ambiguous or conflicting, resolve in this order:
1. Client-approved requirements (explicit instructions given in the session)
2. `fwcdetails.md` (the discovery report)
3. Existing repository content (once code exists)
4. The live site at fwccompanies.com

**Never invent** testimonials, certifications, reviews, addresses, years of experience, pricing, guarantees, or other business claims. Mark anything unconfirmed as `TODO: Client confirmation required` rather than guessing. Only confirmed-active services may be presented; legacy/unclear services require explicit approval before inclusion.

### Known data landmines from the discovery report

The current live site has verified factual errors — do not carry these into the new build, and flag them if asked to "migrate" content verbatim:
- Plumbing and Electrical page meta descriptions name a different company ("RPM Property Services Inc.") — never reuse.
- The HVAC page's meta description and one benefit card contain restoration (fire/flood/mold) copy, not HVAC copy.
- Service area claims conflict across pages (Anaheim vs. Placentia vs. Norco vs. Santa Ana; stray mentions of Arizona, LA, San Bernardino) — do not assert a service area beyond what's client-confirmed.
- Financing figures conflict ($250,000 in meta vs. $400,000 on-page) — treat both as unverified until confirmed with Hearth/the client.
- Company founding year, CSLB license number, and several certification details are unverified — see `fwcdetails.md` §14 ("Missing Information to Request from the Client") before stating any of these as fact.

## Technology stack (required once code exists)

- React + TypeScript (strict mode)
- Vite
- Tailwind CSS
- React Router, React Hook Form + Zod, Lucide React, Vitest + React Testing Library, Playwright, ESLint + Prettier — add only as needed, not preemptively

Avoid unnecessary dependencies and overengineering. Do not introduce a different framework without explicit approval. Plan for prerendering/SSR for SEO, but don't build it until it's actually needed.

## Planned component architecture

`instruction.MD` specifies this structure for when the app is scaffolded:

```
src/components/layout
src/components/ui
src/components/sections
src/components/forms
src/pages
src/data
src/hooks
src/lib
src/types
src/styles
public/assets
```

Key reusable components called out: `Header`, `HeroSection`, `TrustBar`, `ServiceCard`, `ServicesSection`, `ProjectsGallery`, `LeadForm`, `FAQAccordion`, `StickyMobileCTA`, `Footer`. Keep business content (copy, service data) separate from UI components where practical — e.g. service definitions belong in `src/data`, not hardcoded in JSX.

## Landing page structure

Single page, in this order (reorderable only when justified by UX/CRO reasoning): Header → Hero → Trust Indicators → Services → Why Choose FWC → Projects → How It Works → Contact Form → FAQ → Final CTA → Footer. A sticky mobile CTA bar (Call Now / Get Estimate) must persist across the page without blocking content.

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

Before changing code: inspect existing conventions, read `instruction.MD` and `fwcdetails.md`, identify relevant files, and plan substantial changes before implementing. Keep changes small and focused; don't touch unrelated files. After implementation: run lint/type-check/tests/build (once configured), verify responsive behavior where possible, and report actual results — including limitations — rather than assuming success. Work incrementally through the phases in `instruction.MD` §15 (requirements → design system → component build → form/integrations → SEO/perf/a11y → production readiness) rather than building everything at once.
