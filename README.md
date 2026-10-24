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

Browser tests use an installed Chrome on macOS, or Playwright Chromium elsewhere. Set `BROWSER_EXECUTABLE` and `TEST_BASE_URL` to override the browser and server. They use an isolated browser profile with generated media, covering playback, conversion, persistence, backups, cropping, MusicXML import, duplicate video-frame removal and mobile navigation.

## Next milestones

1. Evaluate image-to-tab recognition on representative PDFs and video captures. Check model licensing, local performance, rhythm, multiple voices and correction effort before selecting an engine.
2. Add per-note rhythm editing and sustained bass voices to text conversion.
3. Add optional storage/sync only after deciding how the collection should move between devices.
4. Consider offline caching and PDF text extraction where useful.

## Libraries

React, Vite, alphaTab (MPL-2.0), idb-keyval and Lucide. alphaTab includes the Bravura notation font and SONiVOX instrument soundfonts; their license notices are distributed with the build. Browser playback currently uses alphaTab’s supported ScriptProcessor output to avoid an AudioWorklet startup/pause race observed in Chrome during verification.
