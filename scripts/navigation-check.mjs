import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
const base = process.env.QA_URL || "http://127.0.0.1:4173";
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const id of [
      "estimate",
      "services",
      "who-we-serve",
      "why-fwc",
      "projects",
      "faq",
      "financing",
      "credentials",
      "privacy",
      "main",
    ]) {
      const response = await page.goto(`${base}/${id}`, {
        waitUntil: "networkidle",
      });
      assert.equal(response.status(), 200, `Direct /${id}`);
      await page.waitForFunction((id) => {
        const rect = document.getElementById(id).getBoundingClientRect();
        return rect.top < innerHeight && rect.bottom > 0;
      }, id);
      assert.equal(await page.locator('a[href^="#"]').count(), 0);
    }
    await page.goto(`${base}/?utm_source=qa#estimate`, {
      waitUntil: "networkidle",
    });
    assert.equal(new URL(page.url()).pathname, "/estimate");
    assert.equal(new URL(page.url()).hash, "");
    await page.locator("#name").fill("Navigation test");
    await page.locator(".brand").first().click();
    await page.waitForURL("**/?utm_source=qa");
    assert.equal(await page.locator("#name").inputValue(), "Navigation test");
    if (width === 375) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.locator('#mobile-nav a[href="/services"]').click();
      assert.equal(await page.locator("#mobile-nav").count(), 0);
    } else {
      await page.locator('.desktop-nav a[href="/services"]').click();
    }
    await page.waitForURL("**/services?utm_source=qa");
    await page.locator('.svc-card a[href="/estimate"]').first().click();
    await page.waitForURL("**/estimate?utm_source=qa");
    assert.equal(await page.locator("#service").inputValue(), "plumbing");
    assert.equal(await page.locator("#name").inputValue(), "Navigation test");
    await page.goBack();
    await page.waitForURL("**/services?utm_source=qa");
    await page.goForward();
    await page.waitForURL("**/estimate?utm_source=qa");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      const rect = document.getElementById("estimate").getBoundingClientRect();
      return rect.top < innerHeight && rect.bottom > 0;
    });
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${width}px: direct section paths, legacy links, clean URLs, query preservation, mobile navigation, service selection, form state, refresh and back/forward.`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
