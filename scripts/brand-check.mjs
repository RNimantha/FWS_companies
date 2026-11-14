import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const url = process.env.QA_URL || "http://127.0.0.1:4180";
const output = "artifacts/brand-review";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
const results = [];
function check(condition, message) {
  if (!condition) throw new Error(message);
}
try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [240, 320, 360, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(url, { waitUntil: "networkidle" });
      check(response.ok(), "Preview unavailable");
      await page.evaluate(() => document.fonts.ready);
      const state = await page.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        width: document.documentElement.scrollWidth,
        client: innerWidth,
        services: document.querySelectorAll(".service-card").length,
        audiences: document.querySelectorAll(".audience-card").length,
        stats: [...document.querySelectorAll(".stat dd")].map(
          (x) => x.textContent,
        ),
        h1: document.querySelectorAll("h1").length,
        login: /client login/i.test(document.body.innerText),
      }));
      check(state.theme === theme, `System theme not respected: ${theme}`);
      check(
        state.width <= state.client,
        `Overflow ${theme} ${width}: ${state.width}`,
      );
      check(
        state.services === 7 && state.audiences === 4 && state.h1 === 1,
        "Missing content",
      );
      check(
        JSON.stringify(state.stats) ===
          JSON.stringify(["8", "12", "24/7", "Certified"]),
        "Missing company highlights",
      );
      check(!state.login, "Client Login is still visible");
      check(
        await page
          .locator(".financing-banner")
          .getByText("WE OFFER FINANCING", { exact: true })
          .isVisible(),
        "Financing missing",
      );
      if (width === 375 || width === 1440) {
        await page.addScriptTag({
          path: require.resolve("axe-core/axe.min.js"),
        });
        const violations = await page.evaluate(async () => {
          const r = await window.axe.run(document, {
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
            },
          });
          return r.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          }));
        });
        check(
          !violations.length,
          JSON.stringify({ theme, width, violations }, null, 2),
        );
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        await page.screenshot({
          path: `${output}/${theme}-${width}.png`,
          fullPage: false,
        });
      }
      results.push({ theme, width, passed: true });
      console.log(
        `PASS ${theme} ${width}px: layout, brand content${width === 375 || width === 1440 ? ", automated WCAG checks" : ""}`,
      );
    }
    // Both credential images must be visible within the actual footer, without a pop-up.
    for (const source of ["/footer/footer1.jpeg", "/footer/footer2.jpeg"]) {
      const image = page.locator(`footer img[src="${source}"]`);
      check(
        await image.isVisible(),
        `Credential missing from footer: ${source}`,
      );
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((img) => img.decode());
    }
    check(
      (await page
        .getByRole("heading", { name: "Multi Family Specialist", exact: true })
        .count()) === 1,
      "Customer category wording differs from the client wording",
    );
    check(
      (await page.locator(".financing-banner a").getAttribute("href")) ===
        "#financing",
      "Financing link has no details destination",
    );
    check(
      (await page.locator("#financing").count()) === 1,
      "Financing details missing",
    );
    const paths = await page.evaluate(() => [
      ...new Set(
        [...document.querySelectorAll("img")]
          .map((img) => img.getAttribute("src"))
          .filter((path) => path?.startsWith("/")),
      ),
    ]);
    for (const path of paths) {
      const r = await page.request.get(url + path);
      check(r.ok(), `Broken image: ${path}`);
    }
    const other = theme === "light" ? "dark" : "light";
    await page.emulateMedia({ colorScheme: other });
    await page.waitForFunction(
      (t) => document.documentElement.dataset.theme === t,
      other,
    );
    await page.emulateMedia({ colorScheme: theme });
    await page.waitForFunction(
      (t) => document.documentElement.dataset.theme === t,
      theme,
    );
    await page.getByRole("button", { name: `Switch to ${other} mode` }).click();
    check(
      (await page.evaluate(() => localStorage.getItem("fwc-theme"))) === other,
      "Theme preference not saved",
    );
    await page.reload({ waitUntil: "networkidle" });
    check(
      (await page.evaluate(() => document.documentElement.dataset.theme)) ===
        other,
      "Theme did not persist on reload",
    );
    await page.emulateMedia({ colorScheme: other });
    check(
      (await page.evaluate(() => document.documentElement.dataset.theme)) ===
        other,
      "System overrode selected preference",
    );
    check(!errors.length, errors.join("\n"));
    console.log(
      `PASS ${theme}: asset URLs, visible footer credentials, system changes, persisted theme, no browser errors`,
    );
    await context.close();
  }
  const context = await browser.newContext({ colorScheme: "dark" });
  await context.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
    });
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  console.log("PASS theme toggle with storage blocked");
  await context.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
