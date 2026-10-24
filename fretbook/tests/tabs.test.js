import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAscii,
  toAlphaTex,
  EXAMPLE,
  youtubeId,
  safeUrl,
} from "../src/tabs.js";
test("parses six string blocks, chords and two-digit frets", () => {
  const text = [
    "e|--12--0--|",
    "B|--10-----|",
    "G|---------|",
    "D|---------|",
    "A|---------|",
    "E|0--------|",
  ].join("\n");
  const p = parseAscii(text);
  assert.equal(p.bars.length, 1);
  assert.equal(p.bars[0].length, 3);
  assert.deepEqual(p.bars[0][1], [
    { fret: 12, string: 1 },
    { fret: 10, string: 2 },
  ]);
  assert.match(
    toAlphaTex(p, { tuning: "Drop D" }),
    /\\tuning E4 B3 G3 D3 A2 D2/,
  );
});
test("example imports all four bars", () => {
  assert.equal(parseAscii(EXAMPLE).bars.length, 4);
});
test("rejects incomplete, empty and misaligned input", () => {
  for (const text of [
    "hello",
    "e|---0---|",
    Array(6).fill("e|-------|").join("\n"),
    ["e|0--|", "B|--|", ...Array(4).fill("G|---|")].join("\n"),
  ])
    assert.throws(() => parseAscii(text));
});
test("techniques are flagged for review", () => {
  assert.equal(
    parseAscii(["e|0h2----|", ...Array(5).fill("B|-------|")].join("\n"))
      .technique,
    true,
  );
});
test("source URLs reject script schemes and lookalike video hosts", () => {
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(
    youtubeId("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ"),
    null,
  );
  assert.equal(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=2"), "dQw4w9WgXcQ");
});
