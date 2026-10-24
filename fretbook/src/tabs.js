export const TUNINGS = {
  Standard: ["E4", "B3", "G3", "D3", "A2", "E2"],
  "Drop D": ["E4", "B3", "G3", "D3", "A2", "D2"],
  DADGAD: ["D4", "A3", "G3", "D3", "A2", "D2"],
  "Open D": ["D4", "A3", "F#3", "D3", "A2", "D2"],
  "Open G": ["D4", "B3", "G3", "D3", "G2", "D2"],
};
export function parseAscii(text) {
  const blocks = [];
  let pending = [];
  for (const line of text.replace(/\r/g, "").split("\n")) {
    const match = line.match(
      /^\s*(?:[A-Ga-g](?:#|b)?|[1-6])?\s*[|:]([\s\S]*)$/,
    );
    if (match && /[-\d|xX]/.test(match[1])) {
      pending.push(match[1]);
      if (pending.length === 6) {
        blocks.push(pending);
        pending = [];
      }
    } else if (pending.length)
      throw new Error(
        "Each tab block needs six consecutive string lines, highest string first.",
      );
  }
  if (pending.length) throw new Error("Each tab block needs six string lines.");
  if (!blocks.length)
    throw new Error(
      "No six-string tab found. Start each string line with e|, B|, G|, D|, A|, E|.",
    );
  const bars = [];
  let technique = false;
  for (const rows of blocks) {
    const boundaries = rows.map((row) =>
      [...row.matchAll(/\|/g)].map((m) => m.index).join(","),
    );
    if (new Set(boundaries).size > 1)
      throw new Error(
        "Bar lines must line up across all six strings. Use a monospaced editor to align them.",
      );
    const positions = new Map();
    const separators = new Set();
    rows.forEach((row, index) => {
      if (/[hpbsr~^\\/<>]/i.test(row)) technique = true;
      if (/[^\d\s\-|xXhpbsr~^\\/<>.()]/i.test(row))
        throw new Error(
          "This tab contains unsupported symbols. Use fret numbers, dashes and aligned bar lines.",
        );
      for (const match of row.matchAll(/\d+|[xX]|\|/g)) {
        if (match[0] === "|") {
          separators.add(match.index);
          continue;
        }
        const fret = /x/i.test(match[0]) ? "x" : Number(match[0]);
        if (fret !== "x" && fret > 36)
          throw new Error(
            `Fret ${fret} is outside the supported range (0–36).`,
          );
        const notes = positions.get(match.index) || [];
        notes.push({ fret, string: index + 1 });
        positions.set(match.index, notes);
      }
    });
    let current = [];
    for (const column of [
      ...new Set([...positions.keys(), ...separators]),
    ].sort((a, b) => a - b)) {
      if (separators.has(column) && current.length) {
        bars.push(current);
        current = [];
      }
      if (positions.has(column)) current.push(positions.get(column));
    }
    if (current.length) bars.push(current);
  }
  if (!bars.length) throw new Error("No fret numbers found in this tab.");
  return {
    bars,
    technique,
    noteCount: bars.reduce(
      (n, b) => n + b.reduce((s, beat) => s + beat.length, 0),
      0,
    ),
  };
}
export function toAlphaTex(
  parsed,
  {
    title = "Untitled",
    artist = "",
    tuning = "Standard",
    capo = 0,
    bpm = 90,
    duration = 8,
  } = {},
) {
  const quote = (value) => String(value).replace(/[\\"\n\r]/g, " ");
  if (!TUNINGS[tuning])
    throw new Error("Choose a supported tuning before converting.");
  if (![1, 2, 4, 8, 16, 32].includes(Number(duration)))
    throw new Error("Unsupported note duration.");
  const notes = parsed.bars
    .map((bar) =>
      bar
        .map((beat) =>
          beat.length === 1
            ? `${beat[0].fret}.${beat[0].string}`
            : `(${beat.map((n) => `${n.fret}.${n.string}`).join(" ")})`,
        )
        .join(" "),
    )
    .join(" | ");
  return `\\title "${quote(title)}"\n\\artist "${quote(artist)}"\n\\tempo ${Math.max(20, Math.min(300, Number(bpm) || 90))}\n\\instrument 25\n\\tuning ${TUNINGS[tuning].join(" ")}\n\\capo ${Math.max(0, Math.min(12, Number(capo) || 0))}\n.\n:${duration} ${notes} |`;
}
export function youtubeId(value) {
  try {
    const u = new URL(value);
    if (!["https:", "http:"].includes(u.protocol)) return null;
    let id = null;
    if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname)
    )
      id =
        u.searchParams.get("v") ||
        u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    if (u.hostname === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    return /^[\w-]{11}$/.test(id || "") ? id : null;
  } catch {
    return null;
  }
}
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function formatFor(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (
    [
      "gp",
      "gp3",
      "gp4",
      "gp5",
      "gpx",
      "xml",
      "musicxml",
      "mxl",
      "capx",
    ].includes(ext)
  )
    return "score";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(ext))
    return "image";
  if (["txt", "tab", "text"].includes(ext)) return "text";
  return null;
}
export const EXAMPLE = `e|--------0-------|--------0-------|--------1-------|--------0-------|
B|----1-------1---|----1-------1---|----1-------1---|----0-------0---|
G|--0---0---0---0-|--2---2---2---2-|--2---2---2---2-|--0---0---0---0-|
D|----------------|----------------|0---------------|----------------|
A|3---------------|0---------------|----------------|----------------|
E|----------------|----------------|----------------|3---------------|`;
