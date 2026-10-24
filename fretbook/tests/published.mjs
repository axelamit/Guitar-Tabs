import { chromium, expect } from "@playwright/test";
import { browserOptions, baseURL } from "./browser-config.mjs";
import { publishedTabs } from "../src/published-library.js";

const browser = await chromium.launch(browserOptions);
const importedKey = "fretbook-published-tabs-v1";
const libraryKey = "fretbook-library-v1";
const original = {
  id: "personal-arrangement",
  title: "My saved arrangement",
  artist: "Me",
  arranger: "",
  tuning: "Standard",
  status: "Learning",
  tags: "",
  notes: "Keep my practice notes",
  attachments: [],
  createdAt: 1,
};

async function stored(page, operation, value) {
  return page.evaluate(
    async ({ operation, value, libraryKey, importedKey }) => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("keyval-store", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(
            "keyval",
            operation === "read" ? "readonly" : "readwrite",
          );
          const store = tx.objectStore("keyval");
          let result;
          if (operation === "read") {
            const request = store.get(libraryKey);
            request.onsuccess = () => {
              result = request.result;
            };
          } else {
            store.put(value.songs, libraryKey);
            value.imported === null
              ? store.delete(importedKey)
              : store.put(value.imported, importedKey);
          }
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    { operation, value, libraryKey, importedKey },
  );
}

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.locator(".song-row")).toHaveCount(2);
  for (const tab of publishedTabs) {
    await page
      .getByRole("button", { name: `Open ${tab.title}`, exact: true })
      .click();
    await expect(page.locator(".pdf-frame")).toBeVisible();
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download original", exact: true })
      .click();
    const download = await downloading;
    if (download.suggestedFilename() !== tab.file)
      throw Error("Wrong PDF attachment");
    await page.getByRole("button", { name: "Back to library" }).click();
  }
  // Existing browsers receive the new songs and lose only the original demos.
  const existing = await stored(page, "read");
  const edited = {
    ...existing[0],
    notes: "My edited published tab",
    favorite: true,
  };
  await stored(page, "write", {
    songs: [
      original,
      edited,
      ...[0, 1, 2].map((i) => ({
        ...original,
        id: `study-${i}`,
        title: `Old demo ${i}`,
        demo: true,
      })),
    ],
    imported: null,
  });
  await page.reload();
  await expect(page.locator(".song-row")).toHaveCount(3);
  const migrated = await stored(page, "read");
  if (
    migrated.find((s) => s.id === edited.id).notes !== edited.notes ||
    migrated.find((s) => s.id === original.id).notes !== original.notes ||
    migrated.some((s) => s.demo)
  )
    throw Error("Migration lost user changes or retained demos");
  // Locally removing a bundled song must survive a reload without downloading it again.
  await stored(page, "write", {
    songs: migrated.filter((s) => s.id !== edited.id),
    imported: publishedTabs.map((s) => s.id),
  });
  await page.route("**/library/*.pdf", (route) => route.abort());
  await page.reload();
  await expect(page.locator(".song-row")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: `Open ${edited.title}`, exact: true }),
  ).toHaveCount(0);
  // Interrupted downloads keep the previous library and retry on the next visit.
  await stored(page, "write", { songs: [original], imported: null });
  await page.reload();
  await expect(
    page.getByText(/Published tabs could not be saved/),
  ).toBeVisible();
  await expect(page.locator(".song-row")).toHaveCount(1);
  await page.unroute("**/library/*.pdf");
  await page.reload();
  await expect(page.locator(".song-row")).toHaveCount(3);
  await context.close();
  console.log(
    "Published library: new/existing profiles, PDF downloads, edits, demo removal, deletion persistence and download retry passed.",
  );
} finally {
  await browser.close();
}
