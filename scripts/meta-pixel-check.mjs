import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
const local = process.env.QA_URL || "http://127.0.0.1:4190";
const origin = process.env.QA_PIXEL_ORIGIN || "https://fwccompanies.services";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
const sdk = `(() => {
  const q = window.fbq;
  window.__metaCalls = q.queue.map(args => Array.from(args));
  q.queue = [];
  q.callMethod = (...args) => window.__metaCalls.push(args);
})();`;
async function harness({ gpc = false, block = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
    reducedMotion: "reduce",
  });
  if (gpc)
    await context.addInitScript(() =>
      Object.defineProperty(navigator, "globalPrivacyControl", { value: true }),
    );
  let sdkRequests = 0;
  let leadStatus = 502;
  let accepted = false;
  let leadRequests = 0;
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "connect.facebook.net") {
      sdkRequests++;
      if (block) return route.abort();
      return route.fulfill({
        contentType: "application/javascript",
        body: sdk,
      });
    }
    if (url.hostname.endsWith("facebook.com"))
      throw new Error("Unexpected real Meta beacon");
    if (url.origin === origin || url.origin === new URL(local).origin) {
      if (url.pathname === "/api/leads") {
        leadRequests++;
        return route.fulfill({ status: leadStatus, json: { accepted } });
      }
      const response = await route.fetch({
        url: new URL(url.pathname + url.search, local).href,
      });
      return route.fulfill({ response });
    }
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return {
    context,
    page,
    errors,
    sdkRequests: () => sdkRequests,
    leadRequests: () => leadRequests,
    setResponse: (status, value) => {
      leadStatus = status;
      accepted = value;
    },
  };
}
const count = (page, name) =>
  page.evaluate(
    (name) =>
      (window.__metaCalls || []).filter((args) => args[1] === name).length,
    name,
  );
async function fill(page) {
  await page.locator("#name").fill("Pixel QA customer");
  await page.locator("#phone").fill("(714) 555-0123");
  await page.locator("#zip").fill("92870");
  await page.locator("#service").selectOption("plumbing");
  await page.locator("#propertyType").selectOption("Single Family");
}
try {
  const h = await harness();
  const { page } = h;
  await page.goto(origin, { waitUntil: "networkidle" });
  assert.equal(h.sdkRequests(), 0);
  await page.addStyleTag({
    content:
      "*, *::before, *::after { transition: none !important; animation: none !important; }",
  });
  await page.evaluate(() => document.fonts.ready);
  for (const theme of ["light", "dark"])
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      const panel = await page.locator(".marketing-consent").boundingBox();
      assert.ok(
        panel && panel.x >= 0 && panel.y >= 0 && panel.x + panel.width <= width,
      );
      if (width === 375 || width === 1440) {
        await page.addScriptTag({
          path: require.resolve("axe-core/axe.min.js"),
        });
        const violations = await page.evaluate(async () =>
          (
            await window.axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
              },
            })
          ).violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          })),
        );
        assert.deepEqual(violations, []);
      }
    }
  console.log("PASS consent UI: 7 widths, light/dark, automated WCAG checks.");
  await page.setViewportSize({ width: 375, height: 900 });
  await page
    .getByRole("button", { name: "Reject marketing", exact: true })
    .click();
  assert.equal(h.sdkRequests(), 0);
  await page.locator("#name").focus();
  assert.equal(await count(page, "LeadFormStart"), 0);
  await page
    .getByRole("button", { name: "Cookie settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Accept marketing", exact: true })
    .click();
  await page.waitForFunction(() =>
    window.__metaCalls?.some((args) => args[1] === "PageView"),
  );
  assert.equal(h.sdkRequests(), 1);
  assert.equal(await count(page, "PageView"), 1);
  assert.equal(
    await count(page, "LeadFormStart"),
    0,
    "No pre-consent form-start replay",
  );
  await page.locator(".brand").first().click();
  await page.locator('.hero-actions a[href="/estimate"]').click();
  assert.equal(await count(page, "EstimateButtonClick"), 1);
  assert.equal(
    await count(page, "PageView"),
    1,
    "Section routes are not new visits",
  );
  await page.locator('.hero-actions a[href^="tel:"]').click();
  assert.equal(await count(page, "Contact"), 1);
  await page
    .getByRole("button", { name: "Request my estimate", exact: true })
    .click();
  assert.equal(h.leadRequests(), 0);
  assert.equal(await count(page, "Lead"), 0);
  await fill(page);
  await page
    .getByRole("button", { name: "Request my estimate", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  assert.equal(await count(page, "Lead"), 0, "HTTP failure is not a lead");
  h.setResponse(200, false);
  await page
    .getByRole("button", { name: "Request my estimate", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  assert.equal(
    await count(page, "Lead"),
    0,
    "Unconfirmed response is not a lead",
  );
  h.setResponse(200, true);
  await page
    .getByRole("button", { name: "Request my estimate", exact: true })
    .click();
  await page.getByRole("heading", { name: "Request received." }).waitFor();
  assert.equal(
    await count(page, "Lead"),
    1,
    "Successful retry creates one Lead",
  );
  // Starting a new page creates a new form attempt.
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(h.sdkRequests(), 2);
  await fill(page);
  await page.locator("#phone").focus();
  assert.equal(await count(page, "LeadFormStart"), 1);
  h.setResponse(200, true);
  await page
    .getByRole("button", { name: "Request my estimate", exact: true })
    .click();
  await page.getByRole("heading", { name: "Request received." }).waitFor();
  assert.equal(await count(page, "Lead"), 1);
  const calls = await page.evaluate(() => window.__metaCalls);
  assert.deepEqual(
    calls
      .filter((args) => args[0] === "track" || args[0] === "trackCustom")
      .map((args) => args[2]),
    [{}, {}, {}],
  );
  assert.ok(!JSON.stringify(calls).includes("Pixel QA customer"));
  assert.ok(!JSON.stringify(calls).includes("555-0123"));
  await h.context.addCookies([
    { name: "_fbp", value: "test", url: origin },
    { name: "_fbc", value: "test", url: origin },
  ]);
  await page
    .getByRole("button", { name: "Cookie settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reject marketing", exact: true })
    .click();
  assert.equal(
    (await h.context.cookies()).filter(
      (c) => c.name === "_fbp" || c.name === "_fbc",
    ).length,
    0,
  );
  const before = await page.evaluate(() => window.__metaCalls.length);
  await page.locator('.hero-actions a[href="/estimate"]').click();
  assert.equal(await page.evaluate(() => window.__metaCalls.length), before);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(h.sdkRequests(), 2);
  assert.equal(await page.locator(".marketing-consent").count(), 0);
  assert.deepEqual(h.errors, []);
  await h.context.close();
  console.log(
    "PASS acceptance/rejection, persistent consent, exact events, failed/unconfirmed requests, new attempt, no PII, withdrawal and cookie clearing. No real leads or Meta requests.",
  );

  const failed = await harness();
  await failed.page.goto(origin, { waitUntil: "networkidle" });
  await failed.page
    .getByRole("button", { name: "Accept marketing", exact: true })
    .click();
  await failed.page.waitForFunction(() => window.fbq?.callMethod);
  await failed.page.evaluate(() => {
    window.fbq.callMethod = () => {
      throw new Error("SDK failure");
    };
  });
  await fill(failed.page);
  failed.setResponse(200, true);
  await failed.page
    .getByRole("button", { name: "Request my estimate", exact: true })
    .click();
  await failed.page
    .getByRole("heading", { name: "Request received." })
    .waitFor();
  assert.deepEqual(failed.errors, []);
  await failed.context.close();
  console.log("PASS SDK runtime exceptions do not interrupt lead success.");

  const blocked = await harness({ block: true });
  await blocked.page.goto(origin, { waitUntil: "networkidle" });
  await blocked.page
    .getByRole("button", { name: "Accept marketing", exact: true })
    .click();
  await fill(blocked.page);
  blocked.setResponse(200, true);
  await blocked.page
    .getByRole("button", { name: "Request my estimate", exact: true })
    .click();
  await blocked.page
    .getByRole("heading", { name: "Request received." })
    .waitFor();
  assert.deepEqual(blocked.errors, []);
  await blocked.context.close();
  console.log("PASS blocked SDK does not interrupt lead success.");

  const optedOut = await harness({ gpc: true });
  await optedOut.page.goto(origin, { waitUntil: "networkidle" });
  await optedOut.page
    .getByRole("button", { name: "Cookie settings", exact: true })
    .click();
  assert.equal(
    await optedOut.page
      .getByRole("button", { name: "Accept marketing", exact: true })
      .count(),
    0,
  );
  assert.equal(optedOut.sdkRequests(), 0);
  await optedOut.context.close();
  console.log("PASS Global Privacy Control disables marketing.");

  if (origin !== new URL(local).origin) {
    const preview = await harness();
    await preview.page.goto(local, { waitUntil: "networkidle" });
    await preview.page
      .getByRole("button", { name: "Accept marketing", exact: true })
      .click();
    assert.equal(preview.sdkRequests(), 0);
    await preview.context.close();
    console.log("PASS local production preview remains disabled by default.");
  }
} finally {
  await browser.close();
}
