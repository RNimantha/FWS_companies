import { chromium } from "playwright";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
const page = await browser.newPage({
  colorScheme: process.env.QA_THEME === "dark" ? "dark" : "light",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = process.env.QA_URL || "http://127.0.0.1:4173";
try {
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      services: document.querySelectorAll(".svc-card").length,
      emergency: document.querySelectorAll(".svc-emergency").length,
      h1: document.querySelectorAll("h1").length,
    }));
    if (result.scroll > width || result.services !== 6 ||
      result.emergency !== 1 || result.h1 !== 1)
      throw new Error(`Layout failed: ${width} ${JSON.stringify(result)}`);
    if (width === 375) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.keyboard.press("Escape");
      if (
        (await page
          .getByRole("button", { name: "Open menu" })
          .getAttribute("aria-expanded")) !== "false"
      )
        throw new Error("Menu Escape failed");
    }
    if (width === 375 || width === 1440) {
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      const violations = await page.evaluate(async () => {
        const r = await window.axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
          },
        });
        return r.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        }));
      });
      if (violations.length) throw new Error(JSON.stringify(violations));
    }
    console.log(
      `PASS ${width}px: layout, content${width === 375 || width === 1440 ? ", axe WCAG automated checks" : ""}`,
    );
  }
  await page
    .locator(".svc-card")
    .first()
    .getByRole("link", { name: "Get a plumbing estimate" })
    .click();
  if ((await page.locator("#service").inputValue()) !== "plumbing")
    throw new Error("Service preselection failed");
  await page.locator(".faq-list summary").first().click();
  if (
    (await page.locator(".faq-list details").first().getAttribute("open")) ===
    null
  )
    throw new Error("FAQ failed");
  if (process.env.QA_FORM === "1") {
    const button = page.getByRole("button", { name: "Request my estimate" });
    await button.click();
    if (!(await page.getByText("Enter your full name.").isVisible()))
      throw new Error("Validation missing");
    await page.getByLabel("Full name", { exact: true }).fill("Test Customer");
    await page.getByLabel("Phone number", { exact: true }).fill("7145550123");
    await page.getByLabel("ZIP code", { exact: true }).fill("92870");
    let count = 0;
    await page.route("**/api/leads", async (route) => {
      count++;
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: '{"accepted":false}',
      });
    });
    await button.click();
    await page.getByRole("alert").waitFor();
    if (
      (await page.getByLabel("Full name", { exact: true }).inputValue()) !==
      "Test Customer"
    )
      throw new Error("Lost form inputs");
    await page.unroute("**/api/leads");
    await page.route("**/api/leads", (route) => {
      count++;
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: '{"accepted":true}',
      });
    });
    await button.click();
    await page.getByRole("heading", { name: "Request received." }).waitFor();
    if (count !== 2) throw new Error("Unexpected number of submissions");
    console.log(
      "PASS mocked form: validation, provider failure, preserved input, retry and confirmed success. No real lead sent.",
    );
  } else if (
    process.env.QA_EXPECT_DISABLED === "1" &&
    !(await page.locator(".form-submit").isDisabled())
  )
    throw new Error("Unconfigured form must remain disabled");
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("PASS interactions and no browser errors.");
} finally {
  await browser.close();
}
