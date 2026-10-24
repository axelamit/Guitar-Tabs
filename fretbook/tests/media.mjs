import { chromium, expect } from "@playwright/test";
import { browserOptions, baseURL, artifact } from "./browser-config.mjs";
const browser = await chromium.launch(browserOptions);
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.stack));
await page.goto(baseURL);
await expect(page.locator(".song-row")).toHaveCount(3);
const picture = await page.evaluate(() => {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 300;
  const g = c.getContext("2d");
  g.fillStyle = "white";
  g.fillRect(0, 0, 600, 300);
  g.fillStyle = "black";
  g.font = "22px monospace";
  for (let i = 0; i < 6; i++)
    g.fillText("e|----0----2----3----|", 20, 40 + i * 40);
  return c.toDataURL("image/png").split(",")[1];
});
await page
  .getByRole("button", { name: "Add a tab", exact: true })
  .first()
  .click();
await page
  .getByLabel("Song title", { exact: true })
  .fill("Image and score test");
await page
  .locator(".add-modal input[type=file]")
  .setInputFiles({
    name: "original.png",
    mimeType: "image/png",
    buffer: Buffer.from(picture, "base64"),
  });
await page
  .getByRole("button", { name: "Crop original.png", exact: true })
  .click();
const surface = page.locator(".crop-modal .crop-surface");
await expect(surface.locator("img")).toBeVisible();
const box = await surface.boundingBox();
await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.2);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.8);
await page.mouse.up();
await page.getByRole("button", { name: "Save crop", exact: true }).click();
await expect(page.locator(".attachment-item")).toHaveCount(2);
const xml = `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Imported guitar study</work-title></work><part-list><score-part id="P1"><part-name>Guitar</part-name><score-instrument id="I1"><instrument-name>Acoustic guitar</instrument-name></score-instrument><midi-instrument id="I1"><midi-channel>1</midi-channel><midi-program>25</midi-program></midi-instrument></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><notations><technical><string>1</string><fret>0</fret></technical></notations></note></measure></part></score-partwise>`;
await page
  .locator(".add-modal input[type=file]")
  .setInputFiles({
    name: "study.musicxml",
    mimeType: "application/xml",
    buffer: Buffer.from(xml),
  });
await page.getByRole("button", { name: "Save tab", exact: true }).click();
await page.getByRole("button", { name: "Open Image and score test" }).click();
await expect(page.getByRole("button", { name: "Play score" })).toBeEnabled({
  timeout: 45000,
});
await expect(page.locator(".alpha-host svg")).not.toHaveCount(0);
await page.getByRole("button", { name: "Original", exact: true }).click();
await expect(
  page
    .getByRole("combobox", { name: "Choose original attachment" })
    .locator("option"),
).toHaveCount(3);
await expect(page.locator(".original-image")).toBeVisible();
await page.getByRole("button", { name: "Back to library" }).click();
const downloading = page.waitForEvent("download");
await page.getByRole("button", { name: "Export library", exact: true }).click();
const backup = await downloading;
const backupPath = await backup.path();
await page.locator(".sidebar input[type=file]").setInputFiles(backupPath);
await expect(page.getByRole("status")).toContainText("Restored 4 tabs");
await page.getByRole("button", { name: "Open Image and score test" }).click();
await page.getByRole("button", { name: "Original", exact: true }).click();
await expect(page.locator(".original-image")).toHaveJSProperty(
  "naturalWidth",
  600,
);
await page
  .getByRole("combobox", { name: "Choose original attachment" })
  .selectOption({ label: "original (cropped).png" });
await expect(page.locator(".original-image")).toHaveJSProperty(
  "naturalWidth",
  480,
);
await page.getByRole("button", { name: "Back to library" }).click();
const recording = await page.evaluate(async () => {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 360;
  const g = c.getContext("2d");
  const stream = c.captureStream(10),
    recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise((resolve) => (recorder.onstop = resolve));
  let tick = 0;
  const draw = () => {
    g.fillStyle = "#385747";
    g.fillRect(0, 0, 640, 360);
    g.fillStyle = "white";
    g.fillRect(0, 225, 640, 135);
    g.fillStyle = "black";
    g.font = "22px monospace";
    for (let i = 0; i < 6; i++)
      g.fillText(
        `${["e", "B", "G", "D", "A", "E"][i]}|---${tick < 12 ? "0----2----3" : "5----7----9"}---|`,
        30,
        244 + i * 20,
      );
    tick++;
  };
  draw();
  recorder.start();
  const timer = setInterval(draw, 100);
  await new Promise((r) => setTimeout(r, 2500));
  clearInterval(timer);
  recorder.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(new Blob(chunks, { type: "video/webm" }));
  });
});
await page
  .getByRole("button", { name: "Video to pages", exact: false })
  .click();
await page
  .locator(".video-modal input[type=file]")
  .setInputFiles({
    name: "Test video.webm",
    mimeType: "video/webm",
    buffer: Buffer.from(recording, "base64"),
  });
await expect(
  page.getByRole("button", { name: "Capture this section" }),
).toBeEnabled({ timeout: 15000 });
await page
  .getByRole("combobox", { name: "Capture interval" })
  .selectOption("1");
await page
  .getByRole("button", { name: "Collect sections", exact: true })
  .click();
await expect(
  page.getByRole("button", { name: "Collect sections", exact: true }),
).toBeEnabled({ timeout: 20000 });
await expect(page.locator(".frame-thumb")).toHaveCount(2, { timeout: 5000 });
await page
  .getByRole("button", { name: "Add pages to a tab", exact: false })
  .click();
await expect(page.locator(".add-modal .attachment-item")).toHaveCount(2);
await page.getByRole("button", { name: "Save tab", exact: true }).click();
await expect(page.locator(".song-row")).toHaveCount(5);
console.log(
  "Media checks passed: image crops preserve originals, MusicXML renders, file backups restore, video scan removes duplicate frames. Runtime errors:",
  JSON.stringify(errors),
);
if (errors.length) process.exitCode = 1;
await browser.close();
