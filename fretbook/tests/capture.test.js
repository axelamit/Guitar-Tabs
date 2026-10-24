import { test } from "node:test";
import assert from "node:assert/strict";
import { similarFrames, blankFrame, captureError } from "../src/capture.js";
const pixels = (...values) =>
  Uint8ClampedArray.from(values.flatMap((value) => [value, value, value, 255]));
test("duplicate detection tolerates small rendering noise but keeps changed digits", () => {
  const frame = pixels(255, 255, 0, 255, 0, 255, 255, 0);
  assert.equal(similarFrames(frame, frame), true);
  assert.equal(
    similarFrames(frame, pixels(254, 255, 0, 255, 0, 255, 255, 0)),
    true,
  );
  assert.equal(
    similarFrames(frame, pixels(255, 255, 0, 0, 0, 255, 255, 0)),
    false,
  );
  assert.equal(similarFrames(frame, null), false);
  assert.equal(similarFrames(new Uint8Array(), new Uint8Array()), false);
});
test("blank frames are skipped, black text on white remains", () => {
  assert.equal(blankFrame(pixels(255, 255, 255)), true);
  assert.equal(blankFrame(pixels(0, 0, 0)), true);
  assert.equal(blankFrame(pixels(0, 255, 255)), false);
});
test("a sparse high-contrast fret change is kept even with a low average difference", () => {
  const frame = new Uint8ClampedArray(4000).fill(255);
  const changed = frame.slice();
  changed[1000] = changed[1001] = changed[1002] = 0;
  assert.equal(similarFrames(frame, changed), false);
});
test("capture permission denial explains a retry without losing saved pages", () => {
  assert.match(
    captureError({ name: "NotAllowedError" }),
    /cancelled or blocked/,
  );
  assert.match(captureError({ name: "AbortError" }), /pages are still here/);
});
