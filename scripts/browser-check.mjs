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
    if (
      result.scroll > width ||
      result.services !== 6 ||
      result.emergency !== 1 ||
      result.h1 !== 1
    )
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
    let count = 0;
    let accepted = false;
    const payloads = [];
    await page.route("**/api/leads", async (route) => {
      count++;
      payloads.push(route.request().postDataJSON());
      await route.fulfill({
        status: accepted ? 201 : 502,
        contentType: "application/json",
        body: JSON.stringify({ accepted }),
      });
    });
    const button = page.getByRole("button", { name: "Request my estimate" });
    await button.click();
    if (!(await page.getByText("Enter your full name.").isVisible()))
      throw new Error("Validation missing");
    await page.getByLabel("Full name", { exact: true }).fill("Test Customer");
    await page.getByLabel("Phone number", { exact: true }).fill("7145550123");
    await page.getByLabel("ZIP code", { exact: true }).fill("92870");
    if (
      (await page.locator("#message").count()) ||
      !(await page.locator("#email").count())
    )
      throw new Error("Email/project fields incorrect");
    const choices = await page
      .locator("#propertyType option")
      .allTextContents();
    if (
      JSON.stringify(choices.slice(1)) !==
      JSON.stringify([
        "Single Family",
        "Multi Family",
        "Commercial",
        "Institutional",
        "HOA",
      ])
    )
      throw new Error("Property options incorrect");
    await page.locator("#propertyType").selectOption("Commercial");
    await page.getByRole("radio", { name: "Email", exact: true }).check();
    await button.click();
    if (!(await page.locator("#email-error").isVisible()) || count !== 0)
      throw new Error("Email preference did not require email");
    await page.locator("#email").fill("customer@example.com");
    await button.click();
    await page.getByRole("alert").waitFor();
    if (
      (await page.locator("#email").inputValue()) !== "customer@example.com" ||
      (await page.locator("#propertyType").inputValue()) !== "Commercial"
    )
      throw new Error("Lost form values");
    accepted = true;
    await button.click();
    await page.getByRole("heading", { name: "Request received." }).waitFor();
    if (
      count !== 2 ||
      payloads.some(
        (p) =>
          p.email !== "customer@example.com" ||
          p.preferredContact !== "Email" ||
          p.propertyType !== "Commercial" ||
          p.message !== "",
      )
    )
      throw new Error("Email submission payload incorrect");
    await page.reload({ waitUntil: "networkidle" });
    await page.getByLabel("Full name", { exact: true }).fill("Test Customer");
    await page.getByLabel("Phone number", { exact: true }).fill("7145550123");
    await page.getByLabel("ZIP code", { exact: true }).fill("92870");
    await page.locator("#service").selectOption("plumbing");
    await page.locator("#propertyType").selectOption("HOA");
    if (
      !(await page
        .getByRole("radio", { name: "Phone", exact: true })
        .isChecked())
    )
      throw new Error("Phone is not the default");
    await page.getByRole("button", { name: "Request my estimate" }).click();
    await page.getByRole("heading", { name: "Request received." }).waitFor();
    if (
      count !== 3 ||
      payloads[2].preferredContact !== "Phone" ||
      payloads[2].propertyType !== "HOA" ||
      payloads[2].email !== ""
    )
      throw new Error("Phone submission payload incorrect");
    console.log(
      "PASS mocked form: conditional email validation, five property types, both contact preferences, failure recovery and success. No real lead sent.",
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
