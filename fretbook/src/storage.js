import { get, set } from "idb-keyval";
const KEY = "fretbook-library-v1";
export async function readLibrary() {
  return (await get(KEY)) ?? null;
}
export async function writeLibrary(songs) {
  await set(KEY, songs);
}
export async function backupLibrary(songs) {
  const rows = await Promise.all(
    songs.map(async (song) => ({
      ...song,
      attachments: await Promise.all(
        song.attachments.map(async (a) => ({
          ...a,
          blob: undefined,
          data: a.blob ? await blobToData(a.blob) : null,
        })),
      ),
    })),
  );
  return new Blob(
    [
      JSON.stringify({
        format: "fretbook",
        version: 1,
        exportedAt: new Date().toISOString(),
        songs: rows,
      }),
    ],
    { type: "application/json" },
  );
}
function blobToData(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
export async function restoreLibrary(file) {
  const data = JSON.parse(await file.text());
  if (
    data.format !== "fretbook" ||
    data.version !== 1 ||
    !Array.isArray(data.songs)
  )
    throw new Error("Choose a Fretbook backup (.json).");
  return Promise.all(
    data.songs.map(async (s) => {
      if (
        typeof s.id !== "string" ||
        typeof s.title !== "string" ||
        !Array.isArray(s.attachments)
      )
        throw new Error("The backup contains an invalid tab.");
      const attachments = await Promise.all(
        s.attachments.map(async (a) => {
          if (
            !["image", "pdf", "text", "score"].includes(a.kind) ||
            typeof a.name !== "string"
          )
            throw new Error("The backup contains an invalid attachment.");
          let blob = null;
          if (a.data) {
            if (
              typeof a.data !== "string" ||
              !/^data:[\w.+/-]*(?:;[^,]*)?;base64,/.test(a.data)
            )
              throw new Error("Invalid attachment data in backup.");
            const [header, encoded] = a.data.split(",");
            const bytes = Uint8Array.from(atob(encoded), (c) =>
              c.charCodeAt(0),
            );
            const declared = header.slice(5).split(";")[0];
            const type =
              a.kind === "pdf"
                ? "application/pdf"
                : a.kind === "image" &&
                    [
                      "image/png",
                      "image/jpeg",
                      "image/webp",
                      "image/gif",
                      "image/avif",
                    ].includes(declared)
                  ? declared
                  : "application/octet-stream";
            blob = new Blob([bytes], { type });
          }
          return {
            id: typeof a.id === "string" ? a.id : crypto.randomUUID(),
            name: a.name,
            kind: a.kind,
            blob,
            text: typeof a.text === "string" ? a.text : undefined,
          };
        }),
      );
      return {
        id: s.id,
        title: s.title,
        artist: typeof s.artist === "string" ? s.artist : "",
        arranger: typeof s.arranger === "string" ? s.arranger : "",
        tuning: typeof s.tuning === "string" ? s.tuning : "Standard",
        capo: Number(s.capo) || 0,
        bpm: Number(s.bpm) || 90,
        status: ["Learning", "Want to learn", "Comfortable"].includes(s.status)
          ? s.status
          : "Want to learn",
        favorite: !!s.favorite,
        notes: typeof s.notes === "string" ? s.notes : "",
        url: typeof s.url === "string" ? s.url : "",
        tags: typeof s.tags === "string" ? s.tags : "",
        createdAt: s.createdAt || Date.now(),
        lastOpened: Number(s.lastOpened) || 0,
        attachments,
        conversion:
          s.conversion && typeof s.conversion.tex === "string"
            ? {
                tex: s.conversion.tex,
                approximate: true,
                technique: !!s.conversion.technique,
                sourceText:
                  typeof s.conversion.sourceText === "string"
                    ? s.conversion.sourceText
                    : undefined,
                duration: [4, 8, 16].includes(Number(s.conversion.duration))
                  ? Number(s.conversion.duration)
                  : 8,
              }
            : null,
      };
    }),
  );
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
