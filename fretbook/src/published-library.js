const publishedAt = Date.UTC(2026, 9, 24);

export const publishedTabs = [
  {
    id: "57766bb0-c2a4-4c1d-9669-5cafaa0f476b",
    title: "Single Handed Sailor",
    artist: "Dire Straits",
    arranger: "Jose Churruca",
    url: "https://www.youtube.com/watch?v=6esoZ3MZMq4",
    file: "single-handed-sailor.pdf",
  },
  {
    id: "aefb561e-e6b3-47b6-9313-b2381434aa1c",
    title: "Wicked Game",
    artist: "Chris Isaak",
    arranger: "Kenneth Acoustic",
    url: "https://www.youtube.com/watch?v=82p6wSWJ9Xg",
    file: "wicked-game.pdf",
  },
];

export async function loadPublishedTab(tab) {
  const response = await fetch(
    `${import.meta.env.BASE_URL}library/${tab.file}`,
  );
  if (!response.ok) throw new Error("Could not download published tabs.");
  const blob = await response.blob();
  // A missing asset on some static hosts returns an HTML fallback with status 200.
  if (!(await blob.slice(0, 5).text()).startsWith("%PDF-"))
    throw new Error("Could not download published tabs.");
  const { file, ...song } = tab;
  return {
    ...song,
    tuning: "Standard",
    capo: 0,
    bpm: tab.title === "Wicked Game" ? 112 : 90,
    status: "Want to learn",
    favorite: false,
    tags: "Video tabs, PDF",
    createdAt: publishedAt,
    lastOpened: 0,
    notes:
      "Tab screenshots extracted from the linked video with TabCapture. Highlights and some overlapping measures are preserved. Review against the original video.",
    attachments: [
      {
        id: `${tab.id}-pdf`,
        name: file,
        kind: "pdf",
        blob: new Blob([blob], { type: "application/pdf" }),
      },
    ],
    conversion: null,
  };
}
