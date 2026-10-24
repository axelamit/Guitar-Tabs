import { chromium, expect } from "@playwright/test";
import { browserOptions, baseURL, artifact } from "./browser-config.mjs";
const browser = await chromium.launch(browserOptions);
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.stack));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text());
});
await page.goto(baseURL);
await expect(
  page.getByRole("heading", { name: "Your tab library" }),
).toBeVisible();
await expect(page.locator(".song-row")).toHaveCount(3);
await page.screenshot({
  path: artifact("fretbook-library.png"),
  fullPage: true,
});
await page
  .getByRole("button", { name: "Open Morning light", exact: true })
  .click();
await expect(page.getByRole("button", { name: "Play score" })).toBeEnabled({
  timeout: 45000,
});
await expect(page.locator(".alpha-host svg")).not.toHaveCount(0);
await page.getByRole("button", { name: "Play score" }).click();
await expect(
  page.getByRole("button", { name: "Pause playback" }),
).toBeVisible();
await page.getByRole("button", { name: "Pause playback" }).click();
await page.screenshot({
  path: artifact("fretbook-reader.png"),
  fullPage: true,
});
await page.getByRole("button", { name: "Original", exact: true }).click();
await expect(page.locator(".original-text")).toContainText("e|");
await page.getByRole("button", { name: "Back to library" }).click();
await page
  .getByRole("button", { name: "Add a tab", exact: true })
  .first()
  .click();
await page.getByLabel("Song title", { exact: true }).fill("Browser test study");
await page.getByLabel("Artist", { exact: true }).fill("Test composer");
await page.getByRole("button", { name: "Paste tabs", exact: true }).click();
await page.getByRole("button", { name: "Use an original example" }).click();
await page.getByRole("button", { name: "Save tab", exact: true }).click();
await expect(page.locator(".song-row")).toHaveCount(4);
await page.getByRole("button", { name: "Open Browser test study" }).click();
await page.getByRole("button", { name: "Interactive", exact: true }).click();
await page
  .getByRole("button", { name: "Create interactive draft", exact: true })
  .click();
await page.getByRole("button", { name: "Preview draft", exact: true }).click();
await expect(
  page.getByText("notes recognised.", { exact: false }),
).toBeVisible();
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: "Save draft", exact: true }).click();
await expect(page.getByRole("button", { name: "Play score" })).toBeEnabled({
  timeout: 45000,
});
await page.getByRole("button", { name: "Back to library" }).click();
await page.reload();
await expect(page.locator(".song-row")).toHaveCount(4);
await page
  .getByRole("textbox", { name: "Search your tabs" })
  .fill("Browser test");
await expect(page.locator(".song-row")).toHaveCount(1);
await page.getByRole("button", { name: "Clear search" }).click();
const downloading = page.waitForEvent("download");
await page.getByRole("button", { name: "Export library", exact: true }).click();
const backup = await downloading;
await backup.saveAs(artifact("fretbook-test-backup.json"));
await page
  .getByRole("button", { name: "Video to pages", exact: false })
  .click();
await expect(
  page.getByRole("heading", { name: "Video to tab pages" }),
).toBeVisible();
await page.getByRole("button", { name: "Close video studio" }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({
  path: artifact("fretbook-mobile.png"),
  fullPage: true,
});
await page.getByRole("button", { name: "Open navigation" }).click();
await expect(
  page.locator(".sidebar .nav-item").filter({ hasText: "Favorites" }),
).toBeVisible();
await page.getByRole("button", { name: "Close navigation" }).click();
await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
console.log("Browser checks passed. Runtime errors:", JSON.stringify(errors));
if (errors.length) process.exitCode = 1;
await browser.close();
