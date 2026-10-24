import { chromium, expect } from "@playwright/test";
import { browserOptions, baseURL, artifact } from "./browser-config.mjs";
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.stack));
  // Exercise the permission/capture boundary with a real canvas MediaStream,
  // without silently sharing a developer's actual desktop or relying on YouTube.
  await page.addInitScript(() => {
    window.__captureMode = "allowed";
    window.__tabFrame = 0;
    window.__captureStreams = [];
    window.__captureOptions = [];
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      configurable: true,
      value: async (options) => {
        window.__captureOptions.push(options);
        if (window.__captureMode === "denied")
          throw new DOMException("Denied", "NotAllowedError");
        const canvas = document.createElement("canvas");
        canvas.width = 900;
        canvas.height = 600;
        const ctx = canvas.getContext("2d");
        const draw = () => {
          if (window.__tabFrame === -1) {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, 900, 600);
            return;
          }
          ctx.fillStyle = "#283e32";
          ctx.fillRect(0, 0, 900, 600);
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 360, 900, 240);
          ctx.fillStyle = "#111";
          ctx.font = "26px monospace";
          for (let i = 0; i < 6; i++)
            ctx.fillText(
              `${["e", "B", "G", "D", "A", "E"][i]}|---${window.__tabFrame ? "5----7----9" : "0----2----3"}---|`,
              30,
              397 + i * 35,
            );
        };
        draw();
        const timer = setInterval(draw, 80);
        const stream = canvas.captureStream(10);
        const track = stream.getVideoTracks()[0];
        track.addEventListener("ended", () => clearInterval(timer));
        const stop = track.stop.bind(track);
        track.stop = () => {
          clearInterval(timer);
          stop();
        };
        window.__captureStreams.push(stream);
        if (window.__captureMode === "deferred")
          await new Promise((resolve) => {
            window.__permissionResolve = resolve;
          });
        return stream;
      },
    });
  });
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>Test source video</p>",
    }),
  );
  await page.goto(baseURL);
  await expect(page.locator(".song-row")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Add a tab", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Save a link", exact: true }).click();
  await page
    .getByPlaceholder("https://youtube.com/watch?v=… or any website")
    .fill("https://youtu.be/M7lc1UVf-VE");
  await expect(
    page.getByRole("button", { name: "Extract tabs", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Extract tabs", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "YouTube to tab pages" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "YouTube video link" }),
  ).toHaveValue("https://youtu.be/M7lc1UVf-VE");
  await page
    .getByRole("textbox", { name: "Song title", exact: true })
    .last()
    .fill("Captured YouTube arrangement");
  await page.evaluate(() => (window.__captureMode = "denied"));
  await page
    .getByRole("button", { name: "Share video tab", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("cancelled or blocked");
  await page.evaluate(() => (window.__captureMode = "allowed"));
  await page
    .getByRole("button", { name: "Share video tab", exact: true })
    .click();
  await expect(
    page.getByRole("img", {
      name: "Shared YouTube tab: drag to select the tab area",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Collect tab sections" }),
  ).toBeDisabled();
  const surface = page.locator(".youtube-crop"),
    box = await surface.boundingBox();
  await page.mouse.move(box.x + 1, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 1, box.y + box.height - 1);
  await page.mouse.up();
  await page
    .getByRole("checkbox", {
      name: "The selected area contains only the tabs I want to save.",
    })
    .check();
  await page
    .getByRole("combobox", { name: "YouTube capture interval" })
    .selectOption("1");
  await page.getByRole("button", { name: "Collect tab sections" }).click();
  await expect(page.locator(".youtube-results .frame-thumb")).toHaveCount(1);
  await expect(page.locator(".capture-progress")).toContainText(
    "1 repeated or blank frames skipped",
    { timeout: 5000 },
  );
  await page.evaluate(() => (window.__tabFrame = 1));
  await expect(page.locator(".youtube-results .frame-thumb")).toHaveCount(2, {
    timeout: 5000,
  });
  await page.getByRole("button", { name: "Pause collection" }).click();
  await expect(
    page.getByRole("button", { name: "Collect tab sections" }),
  ).toBeEnabled();
  await page.screenshot({
    path: artifact("fretbook-youtube.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Stop sharing", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Share video tab", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__captureStreams.every((s) =>
          s.getTracks().every((t) => t.readyState === "ended"),
        ),
      ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Add 2 pages to tab", exact: true })
    .click();
  await expect(page.locator(".add-modal .attachment-item")).toHaveCount(2);
  await expect(page.getByLabel("Song title", { exact: true })).toHaveValue(
    "Captured YouTube arrangement",
  );
  await page.getByRole("button", { name: "Save tab", exact: true }).click();
  await expect(page.locator(".song-row")).toHaveCount(4);
  await page
    .getByRole("button", {
      name: "Open Captured YouTube arrangement",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("combobox", { name: "Choose original attachment" })
      .locator("option"),
  ).toHaveCount(2);
  await expect(page.locator(".original-image")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Watch on YouTube" }),
  ).toHaveAttribute("href", "https://www.youtube.com/watch?v=M7lc1UVf-VE");
  await page
    .getByRole("button", { name: "Extract tab images", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Share video tab", exact: true })
    .click();
  await expect(page.locator(".youtube-crop img")).toBeVisible();
  // The browser's own Stop sharing control should preserve the captured pages.
  await page.evaluate(() =>
    window.__captureStreams
      .at(-1)
      .getVideoTracks()[0]
      .dispatchEvent(new Event("ended")),
  );
  await expect(
    page.getByRole("button", { name: "Share video tab", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".capture-progress")).toContainText(
    "Sharing stopped",
  );
  await page
    .getByRole("button", { name: "Share video tab", exact: true })
    .click();
  await expect(page.locator(".youtube-crop img")).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "The selected area contains only the tabs I want to save.",
    })
    .check();
  await page.getByRole("button", { name: "Capture this section" }).click();
  await expect(page.locator(".youtube-results .frame-thumb")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Add 1 page to tab", exact: true })
    .click();
  await expect(
    page
      .getByRole("combobox", { name: "Choose original attachment" })
      .locator("option"),
  ).toHaveCount(3);
  await page
    .getByRole("button", { name: "Extract tab images", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Share video tab", exact: true })
    .click();
  await expect(page.locator(".youtube-crop img")).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "The selected area contains only the tabs I want to save.",
    })
    .check();
  await page.getByRole("button", { name: "Collect tab sections" }).click();
  await expect(page.locator(".youtube-results .frame-thumb")).toHaveCount(1);
  await page.getByRole("button", { name: "Close YouTube capture" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__captureStreams.every((s) =>
          s.getTracks().every((t) => t.readyState === "ended"),
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Back to library" }).click();
  await page.reload();
  await expect(page.locator(".song-row")).toHaveCount(4);
  await page
    .getByRole("button", { name: "YouTube to pages", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Share video tab", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "YouTube video link" })
    .fill("https://youtube.com.evil.test/watch?v=M7lc1UVf-VE");
  await expect(
    page.getByRole("button", { name: "Share video tab", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Close YouTube capture" }).click();
  await page
    .getByRole("button", { name: "YouTube to pages", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "YouTube video link" })
    .fill("https://youtu.be/M7lc1UVf-VE");
  await page.evaluate(() => (window.__captureMode = "deferred"));
  await page
    .getByRole("button", { name: "Share video tab", exact: true })
    .click();
  await page.getByRole("button", { name: "Close YouTube capture" }).click();
  await page.evaluate(() => window.__permissionResolve());
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__captureStreams.every((s) =>
          s.getTracks().every((t) => t.readyState === "ended"),
        ),
      ),
    )
    .toBe(true);
  await page.evaluate(() =>
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      configurable: true,
      value: undefined,
    }),
  );
  await page
    .getByRole("button", { name: "YouTube to pages", exact: false })
    .click();
  await expect(
    page.getByText("This browser doesn’t support tab sharing.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  const options = await page.evaluate(() => window.__captureOptions);
  if (
    options.some((o) => o.audio !== false || o.selfBrowserSurface !== "exclude")
  )
    throw new Error("Capture requested unintended audio/current-tab access");
  console.log(
    "YouTube flow checks passed: permission denial/retry, real MediaStream cropping, deduplication, saved source/images, persistence, stopped sharing, cleanup, unsupported browsers. Runtime errors:",
    JSON.stringify(errors),
  );
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
