# Fretbook

A personal fingerstyle guitar tab library and practice room. The application lives in `fretbook/` and runs entirely in the browser, without a paid API or application server.

## Run locally

Requires Node.js 20.19+ or 22.12+ (Node 24+ recommended).

```sh
cd fretbook
npm ci
npm run dev
```

From the repository root, `npm run dev`, `npm run build`, and `npm test` forward to the application. The dev server prints its URL, normally http://127.0.0.1:5173.

## What works

- Searchable library with favorites, learning progress, tuning, capo, arranger, tags and practice notes.
- Multiple originals per song: PDF, images, plain text, Guitar Pro 3–8, MusicXML and Capella files. Format support depends on alphaTab; unsupported musical features may not be reproduced exactly.
- Original and Interactive views. Guitar Pro and MusicXML use alphaTab for notation, synthesized playback, tempo changes and section looping.
- Six-string plain-text tab conversion with a playable preview, tuning and capo, configurable uniform note duration, and explicit acknowledgement of approximate rhythm. Text remains editable during conversion and the original is preserved.
- Image cropping that creates a separate attachment. Reorder image pages in Edit tab.
- Local video studio: choose a video, select the on-screen tab region, capture a frame or scan at intervals, skip similar consecutive frames, review and order the resulting images. Scans are capped at 100 sampled frames; increase the interval for longer videos.
- YouTube link → cropped tab images through desktop tab sharing: confirm a crop, collect while the video plays, skip repeated or blank frames, and save pages with the original source. Available when adding a link or viewing a saved YouTube song.
- Saved YouTube embeds and website sources; web/YouTube searches for other arrangements.
- IndexedDB persistence and JSON backup/restore, including the original files. Restoring merges songs by ID; a restored song replaces an existing song with that ID.
- Responsive layout and keyboard-accessible import/conversion/crop dialogs.

Three original Fretbook practice studies are included on first use. They can be edited or removed.

## Important boundaries

The library belongs to the current browser profile and site origin. It does not sync across devices. Browser data clearing or private browsing can remove it. Export backups regularly; a local preview and a hosted preview have separate libraries.

PDF and image music recognition is **not implemented**. These formats can immediately be read in Original view. For Interactive view, paste a six-string text transcription or attach a matching Guitar Pro/MusicXML score.

Plain-text conversion recovers fret numbers, string positions, aligned simultaneous notes and bar lines. It requires six lines per block, highest string first. It cannot infer exact rhythm, rests, independent bass sustain, voices or techniques from spacing. Every note/chord receives the selected duration. Unsupported technique symbols are flagged, rather than claimed to be preserved. Review the generated score against the original.

The video studio extracts images of existing visible tabs; it does not transcribe audio, recognise notes, or download YouTube videos. Similarity detection is conservative and can still miss changes or retain duplicates. Review its output. Video codec support depends on the browser.

No paid model, account, database or API key is required. The static `fretbook/dist` output can be hosted independently of ChatGPT. YouTube embeds load from YouTube only for songs with a saved YouTube source. Interface fonts load from Google Fonts, with local system font fallbacks.

## Extracting tabs from YouTube

1. Choose **Add a tab → Save a link**, paste a YouTube video link, then click **Extract tabs**. You can also use **YouTube to pages** in the sidebar, or **Extract tab images** on an existing song’s video.
2. Open the video, skip its intro/ads, and start playback. Theatre mode makes small tab text easier to capture.
3. Return to Fretbook, click **Share video tab**, and choose the YouTube tab in the browser’s sharing picker.
4. Drag around just the tab area in the still preview and confirm the selection.
5. Click **Collect tab sections**. Collection runs in real time while the video plays, comparing the selected region to previous pages. You can also capture a single section manually. Keep the video tab’s size and zoom steady; if its capture dimensions change, the tool pauses and asks for a new selection.
6. Pause collection, review and reorder the images, then **Add pages to tab** and save. The original YouTube source is kept alongside the images.

This feature uses the browser Screen Capture API, without paid services or a video download. It requires a desktop browser with tab sharing (Chrome or Edge recommended); mobile browsers may not support it. GitHub Pages cannot directly read raw frames from a YouTube embed, so a pasted link alone cannot run a background extraction. You explicitly choose the shared tab. No audio is requested and no screen recording is uploaded. Closing the dialog, saving, or clicking Stop sharing releases the stream. If sharing is cancelled or denied, collected pages stay available in the open tool.

Only the cropped PNG images are persisted in your library. The tool skips blank images and near-duplicates but needs review: moving playheads, ads, overlays, scrolling tabs, or small changes can cause extra/missing pages. Each collection is limited to 100 pages or 100 MB. The result is an image collection; automatic conversion of those images into editable notation remains future work.

## Hosting on GitHub Pages

The workflow in `.github/workflows/pages.yml` installs dependencies, runs the parser tests, builds the app, and deploys it when changes reach `main`. It can also be started manually from the Actions tab. In repository Settings → Pages, select **GitHub Actions** as the publishing source before running it.

For `axelamit/Guitar-Tabs`, the expected address is `https://axelamit.github.io/Guitar-Tabs/` once deployment succeeds. This is an independent website and does not require ChatGPT sign-in.

GitHub Free normally requires the source repository to be public for Pages. The standard Pages website is public, even when a paid plan allows its source repository to remain private. This does not publish your personal library: imported tabs and practice notes stay in the visitor's browser. Export your library from the old host and restore that backup on the new host to transfer it.

The build takes `VITE_BASE_PATH` so project subpaths work, including music fonts and soundfonts. The workflow reads the actual base path from GitHub Pages configuration; other static hosts can use the default `/`.

To verify a project-path build locally:

```sh
cd fretbook
VITE_BASE_PATH=/Guitar-Tabs/ npm run build
VITE_BASE_PATH=/Guitar-Tabs/ npm run preview
```

The `.openai/hosting.json` file records the earlier Sites preview; it is not used by the GitHub Pages workflow.

## Validation

```sh
npm test             # parser, alignment, chords, tuning, URL validation
npm run build        # production static build
```

With the development server running in another terminal:

```sh
cd fretbook
npm run test:browser
```

Browser tests use an installed Chrome on macOS, or Playwright Chromium elsewhere. Set `BROWSER_EXECUTABLE` and `TEST_BASE_URL` to override the browser and server. They use isolated browser profiles with generated media, covering playback, conversion, persistence, backups, cropping, MusicXML import, duplicate video-frame removal, mobile navigation, and the YouTube capture flow. The YouTube flow test uses a canvas MediaStream to test denial/retry and lifecycle cleanup; a separate smoke test uses actual browser tab sharing, auto-selecting only its own generated fixture tab in a headless browser.

## Next milestones

1. Evaluate image-to-tab recognition on representative PDFs and video captures. Check model licensing, local performance, rhythm, multiple voices and correction effort before selecting an engine.
2. Add per-note rhythm editing and sustained bass voices to text conversion.
3. Add optional storage/sync only after deciding how the collection should move between devices.
4. Consider offline caching and PDF text extraction where useful.

## Libraries

React, Vite, alphaTab (MPL-2.0), idb-keyval and Lucide. alphaTab includes the Bravura notation font and SONiVOX instrument soundfonts; their license notices are distributed with the build. Browser playback currently uses alphaTab’s supported ScriptProcessor output to avoid an AudioWorklet startup/pause race observed in Chrome during verification.
