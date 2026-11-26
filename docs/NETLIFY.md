# Netlify deployment

The repository now includes a real serverless function, `netlify/functions/leads.ts`, mounted at `/api/leads` through its exported `config.path`. No manual redirect or SPA fallback is needed for this endpoint. `netlify.toml` sets the build, static directory, Node version and Functions directory.

## Build settings

- Branch: main
- Base directory: blank (repository root)
- Build command: npm run build
- Publish directory: dist
- Functions directory: netlify/functions

## Environment variables

In Netlify Project configuration > Environment variables, make these available to the production deploy context:

| Variable | Value | Scope |
| --- | --- | --- |
| NODE_VERSION | 24 (also set in netlify.toml) | Builds |
| VITE_LEAD_ENDPOINT | /api/leads (also set in netlify.toml) | Builds |
| GOOGLE_APPS_SCRIPT_URL | Existing deployed /exec URL | Functions |
| GOOGLE_APPS_SCRIPT_SECRET | Existing private value matching Apps Script SHARED_SECRET | Functions |

The two Google variables must include the **Functions** scope; setting them for builds only does not make them available to the running function. Do not add the secret to netlify.toml or prefix it with VITE_. The ignored local .env.local is not uploaded. SHARE_ORIGIN is only for local tunnels and is unnecessary on Netlify.

Redeploy after changing the environment. Inspect the deploy's Functions list to confirm `leads` was deployed. A GET to /api/leads should return HTTP 405 JSON, not a 404 HTML page. A POST without the runtime Google configuration returns 503; a Google refusal or timeout returns 502. Success is returned only after an acknowledged, matching Google Sheets request ID.

## Security and deduplication

The function uses existing server validation, a bounded request body, honeypot and exact same-origin checks. Netlify's config applies a per-domain/per-IP limit of 10 requests per 60 seconds. Its enforcement can lag briefly and is not emulated by direct unit calls. Apps Script also has a global write cap. Apps Script's lock and durable request-ID/payload-hash lookup prevent duplicate rows across retries and independent function instances. No in-process cache is used to represent durable receipts. Keep the deployed Code.gs receiver up to date with that implementation.

## Verification

Automated tests use a fake Google transport and exercise the actual Netlify handler. After deployment, check the route before sending a clearly labeled test lead, then confirm the row and a retry receipt. Local tests cannot establish that Netlify runtime secrets are correct.

Official references: [custom function paths](https://docs.netlify.com/build/functions/configuration/), [Functions environment variables](https://docs.netlify.com/build/functions/environment-variables/), [rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/).

## Meta Pixel

Marketing consent and Pixel configuration are documented in [META-PIXEL.md](META-PIXEL.md). The public Pixel ID defaults to `4096193424023864`. Production tracking is enabled only on the exact origin `https://fwccompanies.services` in production builds and only after consent. Optional `VITE_META_PIXEL_ID`, `VITE_META_PIXEL_ENABLED` and `VITE_META_PIXEL_TEST_MODE` use **Builds** scope and require a rebuild. Leave test mode false in production and ordinary deploy previews. Existing Functions/Google settings are unchanged.
