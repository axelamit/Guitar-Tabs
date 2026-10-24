import { chromium, expect } from "@playwright/test";
import { browserOptions, baseURL } from "./browser-config.mjs";
// Auto-select only our isolated fixture tab, never the developer's desktop.
const browser = await chromium.launch({
  ...browserOptions,
  args: [
    ...browserOptions.args,
    "--enable-usermedia-screen-capturing",
    "--auto-select-tab-capture-source-by-title=Fretbook Capture Fixture",
  ],
});
try {
  const source = await browser.newPage({
    viewport: { width: 900, height: 600 },
  });
  await source.setContent(
    '<title>Fretbook Capture Fixture</title><style>body{margin:0;background:#294b39}canvas{display:block}</style><canvas width="900" height="600"></canvas>',
  );
  await source.evaluate(() => {
    const g = document.querySelector("canvas").getContext("2d");
    g.fillStyle = "#294b39";
    g.fillRect(0, 0, 900, 600);
    g.fillStyle = "white";
    g.fillRect(0, 360, 900, 240);
    g.fillStyle = "black";
    g.font = "26px monospace";
    for (let i = 0; i < 6; i++)
      g.fillText("e|---0----2----3---|", 20, 395 + i * 35);
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(baseURL);
  await page
    .getByRole("button", { name: "YouTube to pages", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "YouTube video link" })
    .fill("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  await page
    .getByRole("button", { name: "Share video tab", exact: true })
    .click();
  await expect(page.locator(".youtube-crop img")).toBeVisible({
    timeout: 20000,
  });
  await page
    .getByRole("checkbox", {
      name: "The selected area contains only the tabs I want to save.",
    })
    .check();
  await page.getByRole("button", { name: "Capture this section" }).click();
  await expect(page.locator(".youtube-results .frame-thumb")).toHaveCount(1);
  await page.getByRole("button", { name: "Close YouTube capture" }).click();
  console.log(
    "Actual browser tab sharing and cropped image capture passed. Runtime errors:",
    JSON.stringify(errors),
  );
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
