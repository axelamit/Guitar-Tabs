import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Music2,
  Plus,
  Search,
  BookOpen,
  Heart,
  PanelLeftClose,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Upload,
  Download,
  Link,
  FileText,
  Image as ImageIcon,
  Play,
  Pause,
  Square,
  Repeat2,
  SlidersHorizontal,
  Grid2X2,
  List,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Film,
  Scissors,
  Trash2,
  Settings2,
  FolderOpen,
  NotebookPen,
  Volume2,
  ZoomIn,
  ZoomOut,
  Camera,
  Loader2,
  FileMusic,
  HardDrive,
  Menu,
} from "lucide-react";
import {
  parseAscii,
  toAlphaTex,
  TUNINGS,
  EXAMPLE,
  formatFor,
  safeUrl,
  youtubeId,
} from "./tabs.js";
import {
  initializeLibrary,
  writeLibrary,
  backupLibrary,
  restoreLibrary,
  download,
} from "./storage.js";
import { useDialog } from "./dialog.js";
const LazyScore = React.lazy(() =>
  import("./score.jsx").then((module) => ({ default: module.Score })),
);
function Score(props) {
  return (
    <React.Suspense
      fallback={
        <div className="score-loading">
          <Loader2 size={20} className="spin" />
          Opening your score…
        </div>
      }
    >
      <LazyScore {...props} />
    </React.Suspense>
  );
}
import { Cropper, VideoExtractor } from "./studio.jsx";
import { YouTubeExtractor } from "./youtube.jsx";
import "./style.css";
const uid = () => crypto.randomUUID();
const iconFor = (kind) =>
  kind === "image" ? ImageIcon : kind === "score" ? FileMusic : FileText;
const kinds = (s) => [...new Set(s.attachments.map((a) => a.kind))];
function IconButton({ icon: Icon, label, ...props }) {
  return (
    <button className="icon-button" title={label} aria-label={label} {...props}>
      <Icon size={18} />
    </button>
  );
}
function Notice({ children, tone = "" }) {
  return (
    <div className={`notice ${tone}`}>
      <AlertCircle size={16} />
      <span>{children}</span>
    </div>
  );
}
function App() {
  const [songs, setSongs] = useState([]),
    [loaded, setLoaded] = useState(false),
    [storageError, setStorageError] = useState(""),
    [collection, setCollection] = useState("All tabs"),
    [query, setQuery] = useState(""),
    [tuning, setTuning] = useState("All tunings"),
    [format, setFormat] = useState("All formats"),
    [sort, setSort] = useState("Recently added"),
    [layout, setLayout] = useState("list"),
    [active, setActive] = useState(null),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false),
    [studio, setStudio] = useState(false),
    [youtubeStudio, setYoutubeStudio] = useState(false);
  const fileRef = useRef(),
    saveQueue = useRef(Promise.resolve());
  useEffect(() => {
    initializeLibrary(() => [])
      .then(({ songs, error }) => {
        setSongs(songs);
        if (error) setStorageError(error);
        setLoaded(true);
      })
      .catch(() => {
        setStorageError(
          "Device storage is unavailable. Changes are temporary; export a backup before closing.",
        );
        setSongs([]);
        setLoaded(true);
      });
  }, []);
  useEffect(() => {
    if (loaded)
      saveQueue.current = saveQueue.current
        .catch(() => {})
        .then(() => writeLibrary(songs))
        .catch(() =>
          setStorageError(
            "Your latest changes could not be saved on this device. Export a backup before closing.",
          ),
        );
  }, [songs, loaded]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const update = (song) =>
    setSongs((all) => all.map((s) => (s.id === song.id ? song : s)));
  const open = (s) => {
    setActive(s.id);
    update({ ...s, lastOpened: Date.now() });
    setMobile(false);
  };
  const selected = songs.find((s) => s.id === active);
  const navigate = (c) => {
    setCollection(c);
    setActive(null);
    setMobile(false);
  };
  const save = (s) => {
    setSongs((all) =>
      all.some((x) => x.id === s.id)
        ? all.map((x) => (x.id === s.id ? s : x))
        : [s, ...all],
    );
    setModal(null);
    setToast("Tab saved to your library");
  };
  const exportAll = async () => {
    try {
      download(await backupLibrary(songs), "fretbook-backup.json");
      setToast("Backup exported, including your original files");
    } catch {
      setToast("Could not export this backup. Please try again.");
    }
  };
  const importAll = async (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      const restored = await restoreLibrary(file);
      setSongs((old) => [
        ...restored,
        ...old.filter((s) => !restored.some((r) => r.id === s.id)),
      ]);
      setToast(`Restored ${restored.length} tabs`);
    } catch (e) {
      setToast(e.message);
    }
  };
  let filtered = songs.filter(
    (s) =>
      (collection !== "Favorites" || s.favorite) &&
      (collection !== "Learning" || s.status === "Learning") &&
      (collection !== "Comfortable" || s.status === "Comfortable") &&
      (tuning === "All tunings" || s.tuning === tuning) &&
      (format === "All formats" ||
        (format === "Interactive"
          ? s.conversion || kinds(s).includes("score")
          : kinds(s).includes(format.toLowerCase()))) &&
      `${s.title} ${s.artist} ${s.arranger} ${s.tags} ${s.tuning}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  filtered.sort((a, b) =>
    sort === "Title A–Z"
      ? a.title.localeCompare(b.title)
      : sort === "Last opened"
        ? (b.lastOpened || 0) - (a.lastOpened || 0)
        : b.createdAt - a.createdAt,
  );
  const continuing = [...songs]
    .filter((s) => s.status === "Learning")
    .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))[0];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("All tabs");
          }}
        >
          <span className="brand-icon">
            <Music2 size={23} />
          </span>
          fretbook<span className="brand-dot">.</span>
        </a>
        <button
          className="button primary add-main"
          onClick={() => setModal({})}
        >
          <Plus size={18} />
          Add a tab<span className="keyboard-hint">＋</span>
        </button>
        <div className="nav-label">YOUR LIBRARY</div>
        <nav>
          {[
            [BookOpen, "All tabs", songs.length],
            [Heart, "Favorites", songs.filter((s) => s.favorite).length],
            [
              NotebookPen,
              "Learning",
              songs.filter((s) => s.status === "Learning").length,
            ],
            [
              CheckCircle2,
              "Comfortable",
              songs.filter((s) => s.status === "Comfortable").length,
            ],
          ].map(([Icon, name, count]) => (
            <button
              key={name}
              className={`nav-item ${collection === name && !selected ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              <span className="nav-count">{count}</span>
            </button>
          ))}
        </nav>
        <div className="nav-label tools-label">MAKE IT YOURS</div>
        <button
          className="nav-item"
          onClick={() => {
            setYoutubeStudio(true);
            setMobile(false);
          }}
        >
          <Film size={18} />
          <span>YouTube to pages</span>
          <span className="small-tag">FREE</span>
        </button>
        <button className="nav-item" onClick={() => setStudio(true)}>
          <Scissors size={18} />
          <span>Video to pages</span>
          <span className="small-tag">LOCAL</span>
        </button>
        <button className="nav-item" onClick={exportAll}>
          <Download size={18} />
          <span>Export library</span>
        </button>
        <button className="nav-item" onClick={() => fileRef.current.click()}>
          <Upload size={18} />
          <span>Restore backup</span>
        </button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".json"
          onChange={importAll}
        />
        <div className="sidebar-bottom">
          <div className="little-note">
            <span className="note-spark">✳</span>
            <p>
              A little practice.
              <br />A little progress.
              <br />
              <strong>Every day.</strong>
            </p>
          </div>
          <div className="local-status">
            <span className="status-dot" />
            <span>Saved on this device</span>
            <HardDrive size={14} />
          </div>
          <p className="storage-note">
            Your music, your space. Export a backup to keep a copy.
          </p>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Your workspace</span>
            <span className="crumb-slash">/</span>
            <span>{selected ? "Practice room" : collection}</span>
          </div>
          <div className="topbar-right">
            <span className="local-pill">
              <span className="status-dot" />
              Personal library
            </span>
            <span className="avatar">A</span>
          </div>
        </header>
        {storageError && <Notice tone="warning">{storageError}</Notice>}
        {!loaded ? (
          <div className="loading">
            <Loader2 className="spin" /> Opening your library…
          </div>
        ) : selected ? (
          <Reader
            key={selected.id}
            song={selected}
            update={update}
            onBack={() => setActive(null)}
            onEdit={() => setModal(selected)}
            onDelete={() => {
              setSongs((all) => all.filter((x) => x.id !== selected.id));
              setActive(null);
              setToast("Tab removed from your library");
            }}
            notify={setToast}
          />
        ) : (
          <div className="library-page">
            <div className="page-heading">
              <div>
                <div className="eyebrow">A SPACE FOR YOUR STRINGS</div>
                <h1>
                  {collection === "All tabs" ? "Your tab library" : collection}
                </h1>
                <p>
                  Good music starts with a little practice. Find your next
                  piece.
                </p>
              </div>
              <button
                className="button primary desktop-add"
                onClick={() => setModal({})}
              >
                <Plus size={17} />
                Add a tab
              </button>
            </div>
            <div className="feature-grid">
              <section className="continue-card">
                <div className="continue-content">
                  <div className="eyebrow">
                    <span className="tiny-circle" />
                    PICK UP WHERE YOU LEFT OFF
                  </div>
                  <h2>{continuing?.title || "Make time to play"}</h2>
                  <p>
                    {continuing
                      ? `${continuing.artist} · ${continuing.tuning}${continuing.capo ? ` · Capo ${continuing.capo}` : ""}`
                      : "Add a piece you’d love to learn."}
                  </p>
                  <button
                    className="button cream"
                    onClick={() =>
                      continuing ? open(continuing) : setModal({})
                    }
                  >
                    {continuing ? (
                      <Play size={15} fill="currentColor" />
                    ) : (
                      <Plus size={15} />
                    )}{" "}
                    {continuing ? "Continue practising" : "Add your first tab"}
                    <ArrowRight size={16} />
                  </button>
                </div>
                <StaffArt />
              </section>
              <section className="collection-card">
                <span className="collection-icon">
                  <FolderOpen size={22} />
                </span>
                <div className="collection-number">
                  {songs.length}
                  <span>pieces & counting</span>
                </div>
                <p>
                  A collection that sounds
                  <br />a little more like you.
                </p>
                <div className="collection-footer">
                  <span>
                    {songs.filter((s) => s.status === "Learning").length}{" "}
                    learning
                  </span>
                  <span className="small-dot" />
                  <span>
                    {songs.filter((s) => s.status === "Comfortable").length}{" "}
                    comfortable
                  </span>
                </div>
              </section>
            </div>
            <div className="library-section-heading">
              <div className="section-tabs">
                <button className="active">
                  {collection}
                  <span>{filtered.length}</span>
                </button>
              </div>
              <span className="library-caption">
                A place for every arrangement.
              </span>
            </div>
            <div className="toolbar">
              <label className="search-field">
                <Search size={18} />
                <input
                  aria-label="Search your tabs"
                  placeholder="Search by song, artist, or tag…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    className="clear-search"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              <div className="filter-group">
                <label className="select-wrap">
                  <SlidersHorizontal size={15} />
                  <select
                    aria-label="Filter tuning"
                    value={tuning}
                    onChange={(e) => setTuning(e.target.value)}
                  >
                    <option>All tunings</option>
                    {Object.keys(TUNINGS).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </label>
                <label className="select-wrap">
                  <select
                    aria-label="Filter format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    {[
                      "All formats",
                      "Interactive",
                      "PDF",
                      "Image",
                      "Text",
                      "Score",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </label>
                <div className="view-switch">
                  <IconButton
                    icon={List}
                    label="List view"
                    className={`icon-button ${layout === "list" ? "active" : ""}`}
                    onClick={() => setLayout("list")}
                  />
                  <IconButton
                    icon={Grid2X2}
                    label="Grid view"
                    className={`icon-button ${layout === "grid" ? "active" : ""}`}
                    onClick={() => setLayout("grid")}
                  />
                </div>
              </div>
            </div>
            <div className="results-meta">
              <span>
                {filtered.length} {filtered.length === 1 ? "tab" : "tabs"} in
                your collection
              </span>
              <label>
                Sort by{" "}
                <select
                  aria-label="Sort tabs"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option>Recently added</option>
                  <option>Last opened</option>
                  <option>Title A–Z</option>
                </select>
              </label>
            </div>
            {filtered.length ? (
              <div className={`tab-list ${layout}`}>
                {layout === "list" && (
                  <div className="table-head">
                    <span>SONG / ARRANGEMENT</span>
                    <span>TUNING & CAPO</span>
                    <span>FORMAT</span>
                    <span>PROGRESS</span>
                    <span />
                  </div>
                )}
                {filtered.map((s, i) => (
                  <article className="song-row" key={s.id}>
                    <button className="song-main" onClick={() => open(s)}>
                      <span
                        className={`song-art ${s.tone || ["sage", "clay", "sand", "blue"][i % 4]}`}
                      >
                        <Music2 size={24} />
                        <span className="art-line" />
                      </span>
                      <span>
                        <strong>{s.title}</strong>
                        <span className="song-artist">
                          {s.artist || "Your arrangement"}
                          {s.demo && <span className="demo-label">STUDY</span>}
                        </span>
                      </span>
                    </button>
                    <div className="tuning-cell">
                      <span>{s.tuning}</span>
                      <small>{s.capo ? `Capo ${s.capo}` : "No capo"}</small>
                    </div>
                    <div className="format-cell">
                      {kinds(s).map((k) => {
                        const Icon = iconFor(k);
                        return (
                          <span className="format-badge" key={k}>
                            <Icon size={12} />
                            {k === "score"
                              ? "Score"
                              : k === "pdf"
                                ? "PDF"
                                : k === "image"
                                  ? "Images"
                                  : "Text"}
                          </span>
                        );
                      })}
                      {!s.attachments.length && (
                        <span className="format-badge">
                          <Link size={12} />
                          Link
                        </span>
                      )}
                      {(s.conversion || kinds(s).includes("score")) && (
                        <span
                          className="interactive-dot"
                          title="Interactive version available"
                        />
                      )}
                    </div>
                    <div className="progress-cell">
                      <span
                        className={`progress-badge ${s.status.replaceAll(" ", "-").toLowerCase()}`}
                      >
                        <span />
                        {s.status}
                      </span>
                    </div>
                    <div className="row-actions">
                      <IconButton
                        icon={Heart}
                        label={
                          s.favorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        className={`icon-button favorite ${s.favorite ? "is-favorite" : ""}`}
                        onClick={() => update({ ...s, favorite: !s.favorite })}
                      />
                      <IconButton
                        icon={ArrowUpRight}
                        label={`Open ${s.title}`}
                        onClick={() => open(s)}
                      />
                    </div>
                  </article>
                ))}
                <button className="add-row" onClick={() => setModal({})}>
                  <Plus size={17} />
                  <span>Add something you love to play</span>
                  <span className="add-row-formats">
                    PDF, images, text, Guitar Pro & more
                  </span>
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <BookOpen size={35} />
                <h3>
                  {query || tuning !== "All tunings" || format !== "All formats"
                    ? "No tabs match these filters"
                    : "Your next favorite starts here"}
                </h3>
                <p>
                  {query
                    ? "Try another song, artist or tag."
                    : "Add a tab, a screenshot, or a link to get started."}
                </p>
                <button className="button primary" onClick={() => setModal({})}>
                  <Plus size={16} />
                  Add a tab
                </button>
              </div>
            )}
            <div className="library-bottom">
              <span>
                <span className="status-dot" />
                Your library stays on this device. No account needed.
              </span>
              <button onClick={exportAll}>
                Make a backup
                <ArrowUpRight size={14} />
              </button>
            </div>
            <section className="import-banner">
              <span className="import-banner-icon">
                <Scissors size={23} />
              </span>
              <div>
                <h3>Your favorite video, a little easier to practise.</h3>
                <p>
                  Collect the on-screen tabs from a YouTube link or a local
                  video.
                </p>
              </div>
              <button
                className="button subtle"
                onClick={() => setYoutubeStudio(true)}
              >
                Extract from YouTube
                <ArrowRight size={16} />
              </button>
            </section>
          </div>
        )}
      </main>
      {modal && (
        <AddTab initial={modal} onClose={() => setModal(null)} onSave={save} />
      )}
      {studio && (
        <VideoExtractor
          onClose={() => setStudio(false)}
          onDone={(attachments, title) => {
            setStudio(false);
            setModal({ title, attachments });
          }}
        />
      )}
      {youtubeStudio && (
        <YouTubeExtractor
          onClose={() => setYoutubeStudio(false)}
          onLocalVideo={() => {
            setYoutubeStudio(false);
            setStudio(true);
          }}
          onDone={(attachments, title, url) => {
            setYoutubeStudio(false);
            setModal({ title, url, attachments });
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function StaffArt() {
  return (
    <div className="staff-art" aria-hidden="true">
      <svg viewBox="0 0 330 185">
        <g transform="rotate(-12 160 90)" opacity=".36">
          {[55, 73, 91, 109, 127, 145].map((y) => (
            <path
              key={y}
              d={`M 8 ${y} H 325`}
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}
          {[40, 134, 228, 322].map((x) => (
            <path
              key={x}
              d={`M ${x} 55 V 145`}
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}
          <g fontFamily="Georgia,serif" fontSize="23" fill="currentColor">
            <text x="59" y="80">
              0
            </text>
            <text x="83" y="116">
              2
            </text>
            <text x="108" y="61">
              0
            </text>
            <text x="153" y="98">
              1
            </text>
            <text x="180" y="134">
              3
            </text>
            <text x="205" y="80">
              0
            </text>
            <text x="250" y="62">
              2
            </text>
            <text x="278" y="116">
              0
            </text>
          </g>
        </g>
      </svg>
      <span className="staff-caption">let it ring.</span>
    </div>
  );
}
function AddTab({ initial, onClose, onSave }) {
  const dialogRef = useDialog(onClose);
  const [form, setForm] = useState({
    title: "",
    artist: "",
    arranger: "",
    tuning: "Standard",
    capo: 0,
    bpm: 90,
    status: "Want to learn",
    url: "",
    notes: "",
    tags: "",
    ...initial,
  });
  const [attachments, setAttachments] = useState(initial.attachments || []),
    [method, setMethod] = useState("files"),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [crop, setCrop] = useState(null),
    [dragging, setDragging] = useState(false),
    [youtubeImport, setYoutubeImport] = useState(false);
  const fileRef = useRef();
  const change = (key, value) => setForm({ ...form, [key]: value });
  const addFiles = async (files) => {
    setError("");
    setBusy(true);
    try {
      const added = [];
      for (const file of files) {
        const kind = formatFor(file);
        if (!kind) throw new Error(`“${file.name}” is not a supported format.`);
        if (file.size > 40 * 1024 * 1024)
          throw new Error("Please keep each tab attachment under 40 MB.");
        added.push({
          id: uid(),
          name: file.name,
          kind,
          blob: file,
          text: kind === "text" ? await file.text() : undefined,
        });
      }
      setAttachments((a) => [...a, ...added]);
      if (!form.title && files[0])
        change("title", files[0].name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (form.url && !safeUrl(form.url)) {
      setError("Enter a full http:// or https:// source link.");
      return;
    }
    let all = [...attachments];
    if (text.trim())
      all.push({
        id: uid(),
        name: "Pasted tabs.txt",
        kind: "text",
        text: text.trim(),
      });
    if (!all.length && !form.url) {
      setError("Add a file, paste some tabs, or include a source link.");
      return;
    }
    let conversion = initial.conversion || null;
    if (
      conversion &&
      ["title", "artist", "tuning", "capo", "bpm"].some(
        (key) => form[key] !== initial[key],
      )
    ) {
      const source =
        conversion.sourceText || all.find((a) => a.kind === "text")?.text;
      try {
        conversion = source
          ? {
              ...conversion,
              tex: toAlphaTex(parseAscii(source), {
                ...form,
                duration: conversion.duration || 8,
              }),
            }
          : null;
      } catch {
        conversion = null;
      }
    }
    onSave({
      ...form,
      title: form.title.trim(),
      id: initial.id || uid(),
      createdAt: initial.createdAt || Date.now(),
      attachments: all,
      conversion,
      favorite: initial.favorite || false,
    });
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="modal add-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
      >
        <header className="modal-header">
          <div>
            <div className="eyebrow">BUILD YOUR COLLECTION</div>
            <h2 id="add-title">
              {initial.id ? "Edit your tab" : "A new piece to play"}
            </h2>
          </div>
          <IconButton icon={X} label="Close dialog" onClick={onClose} />
        </header>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-grid">
              <label className="field">
                Song title
                <input
                  autoFocus
                  required
                  maxLength={200}
                  placeholder="What are we playing?"
                  value={form.title}
                  onChange={(e) => change("title", e.target.value)}
                />
              </label>
              <label className="field">
                Artist
                <input
                  maxLength={200}
                  placeholder="Artist or composer"
                  value={form.artist}
                  onChange={(e) => change("artist", e.target.value)}
                />
              </label>
            </div>
            <div className="input-tabs">
              {[
                ["files", Upload, "Upload files"],
                ["text", FileText, "Paste tabs"],
                ["link", Link, "Save a link"],
              ].map(([value, Icon, label]) => (
                <button
                  type="button"
                  key={value}
                  className={method === value ? "active" : ""}
                  onClick={() => setMethod(value)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
            {method === "files" && (
              <div
                className={`dropzone ${dragging ? "dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles([...e.dataTransfer.files]);
                }}
              >
                <span className="upload-icon">
                  <Upload size={23} />
                </span>
                <strong>Drop your tabs here</strong>
                <p>PDF, images, text, Guitar Pro, or MusicXML</p>
                <button
                  type="button"
                  className="button outline"
                  onClick={() => fileRef.current.click()}
                >
                  Browse files
                </button>
                <small>Multiple files welcome · up to 40 MB each</small>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.avif,.gif,.txt,.tab,.gp,.gp3,.gp4,.gp5,.gpx,.xml,.musicxml,.mxl,.capx"
                  onChange={(e) => {
                    addFiles([...e.target.files]);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
            {method === "text" && (
              <label className="field">
                Plain-text tabs
                <textarea
                  className="tab-text-input"
                  rows={8}
                  spellCheck="false"
                  placeholder={EXAMPLE}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <small>
                  Preserves spacing. Six-string tabs can also become an
                  interactive draft.
                </small>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setText(EXAMPLE)}
                >
                  Use an original example
                </button>
              </label>
            )}
            {method === "link" && (
              <div className="link-help">
                <Link size={27} />
                <h3>Keep the source close</h3>
                <p>
                  Paste a YouTube link below to collect its on-screen tabs, or
                  save any website as a reference.
                </p>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="attachment-list">
                {attachments.map((a, index) => {
                  const Icon = iconFor(a.kind);
                  return (
                    <div className="attachment-item" key={a.id}>
                      <Icon size={17} />
                      <span>{a.name}</span>
                      <div>
                        {a.kind === "image" && (
                          <IconButton
                            icon={Scissors}
                            label={`Crop ${a.name}`}
                            onClick={() => setCrop(a)}
                            type="button"
                          />
                        )}
                        <IconButton
                          icon={ChevronUp}
                          label={`Move ${a.name} up`}
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            setAttachments((all) => {
                              const next = [...all];
                              [next[index - 1], next[index]] = [
                                next[index],
                                next[index - 1],
                              ];
                              return next;
                            })
                          }
                        />
                        <IconButton
                          icon={ChevronDown}
                          label={`Move ${a.name} down`}
                          type="button"
                          disabled={index === attachments.length - 1}
                          onClick={() =>
                            setAttachments((all) => {
                              const next = [...all];
                              [next[index + 1], next[index]] = [
                                next[index],
                                next[index + 1],
                              ];
                              return next;
                            })
                          }
                        />
                        <IconButton
                          icon={X}
                          label={`Remove ${a.name}`}
                          type="button"
                          onClick={() =>
                            setAttachments((all) =>
                              all.filter((x) => x.id !== a.id),
                            )
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="form-grid three">
              <label className="field">
                Tuning
                <select
                  value={form.tuning}
                  onChange={(e) => change("tuning", e.target.value)}
                >
                  {Object.keys(TUNINGS).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Capo
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={form.capo}
                  onChange={(e) => change("capo", Number(e.target.value))}
                />
              </label>
              <label className="field">
                Progress
                <select
                  value={form.status}
                  onChange={(e) => change("status", e.target.value)}
                >
                  {["Want to learn", "Learning", "Comfortable"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              Source link <span className="optional">optional</span>
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=… or any website"
                value={form.url}
                onChange={(e) => change("url", e.target.value)}
              />
            </label>
            {youtubeId(form.url) && (
              <div className="youtube-import-prompt">
                <Film size={22} />
                <div>
                  <strong>Tabs on screen? Bring them into your library.</strong>
                  <p>
                    Share the YouTube tab, select the tab area, and collect
                    images while it plays. Desktop browser required.
                  </p>
                </div>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setYoutubeImport(true)}
                >
                  <Scissors size={15} />
                  Extract tabs
                </button>
              </div>
            )}
            <div className="form-grid">
              <label className="field">
                Arranger
                <input
                  placeholder="Whose arrangement?"
                  value={form.arranger}
                  onChange={(e) => change("arranger", e.target.value)}
                />
              </label>
              <label className="field">
                Tags
                <input
                  placeholder="Fingerstyle, mellow, warm-up…"
                  value={form.tags}
                  onChange={(e) => change("tags", e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              Practice notes
              <textarea
                rows={2}
                placeholder="Things to remember when you play…"
                value={form.notes}
                onChange={(e) => change("notes", e.target.value)}
              />
            </label>
            {error && <Notice tone="warning">{error}</Notice>}
          </div>
          <footer className="modal-footer">
            <span>
              <HardDrive size={14} />
              Saved on this device
            </span>
            <button type="button" className="button subtle" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <Plus size={17} />
              )}
              Save tab
            </button>
          </footer>
        </form>
      </section>
      {youtubeImport && (
        <YouTubeExtractor
          initialUrl={form.url}
          initialTitle={form.title}
          onClose={() => setYoutubeImport(false)}
          onDone={(pages, title, url) => {
            setAttachments((all) => [...all, ...pages]);
            setForm((current) => ({
              ...current,
              title: current.title || title,
              url,
            }));
            setYoutubeImport(false);
          }}
        />
      )}
      {crop && (
        <Cropper
          attachment={crop}
          onClose={() => setCrop(null)}
          onSave={(a) => {
            setAttachments((all) => [...all, a]);
            setCrop(null);
          }}
        />
      )}
    </div>
  );
}
function Reader({ song, update, onBack, onEdit, onDelete, notify }) {
  const hasInteractive =
    !!song.conversion || song.attachments.some((a) => a.kind === "score");
  const [view, setView] = useState(hasInteractive ? "interactive" : "original"),
    [attachmentId, setAttachmentId] = useState(song.attachments[0]?.id),
    [convert, setConvert] = useState(false),
    [crop, setCrop] = useState(null),
    [confirmDelete, setConfirmDelete] = useState(false),
    [zoom, setZoom] = useState(100),
    [scrolling, setScrolling] = useState(false),
    [notes, setNotes] = useState(song.notes),
    [find, setFind] = useState(false),
    [youtubeImport, setYoutubeImport] = useState(false);
  const viewport = useRef();
  const a =
    song.attachments.find((x) => x.id === attachmentId) || song.attachments[0];
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!a?.blob) {
      setUrl("");
      return;
    }
    const u = URL.createObjectURL(a.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [a?.blob]);
  useEffect(() => {
    if (!scrolling) return;
    const id = setInterval(() => {
      const el = viewport.current;
      if (el) {
        el.scrollTop += 1;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight)
          setScrolling(false);
      }
    }, 40);
    return () => clearInterval(id);
  }, [scrolling]);
  useEffect(() => {
    setScrolling(false);
  }, [view]);
  useEffect(() => setNotes(song.notes || ""), [song.notes]);
  const video = youtubeId(song.url);
  return (
    <div className="reader-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to library
      </button>
      <div className="reader-heading">
        <div>
          <div className="eyebrow">YOUR PRACTICE ROOM</div>
          <h1>{song.title}</h1>
          <p>
            {song.artist || "Your arrangement"}
            {song.arranger ? ` · Arranged by ${song.arranger}` : ""}
          </p>
        </div>
        <div className="reader-actions">
          <IconButton
            icon={Heart}
            label={song.favorite ? "Remove from favorites" : "Add to favorites"}
            className={`icon-button favorite ${song.favorite ? "is-favorite" : ""}`}
            onClick={() => update({ ...song, favorite: !song.favorite })}
          />
          <button className="button outline" onClick={onEdit}>
            <Settings2 size={16} />
            Edit tab
          </button>
        </div>
      </div>
      <div className="reader-layout">
        <section className="reader-content">
          <div className="reader-view-tabs">
            <div>
              <button
                className={view === "original" ? "active" : ""}
                onClick={() => setView("original")}
              >
                <FileText size={16} />
                Original
              </button>
              <button
                className={view === "interactive" ? "active" : ""}
                onClick={() => setView("interactive")}
              >
                <Music2 size={16} />
                Interactive{hasInteractive && <span className="status-dot" />}
              </button>
            </div>
            <span className="reader-source-label">
              {view === "interactive"
                ? "MAKE IT YOUR OWN"
                : "JUST AS YOU SAVED IT"}
            </span>
          </div>
          {view === "original" ? (
            <>
              <div className="original-toolbar">
                <select
                  aria-label="Choose original attachment"
                  value={a?.id || ""}
                  onChange={(e) => setAttachmentId(e.target.value)}
                >
                  {song.attachments.map((f) => (
                    <option value={f.id} key={f.id}>
                      {f.name}
                    </option>
                  ))}
                  {!song.attachments.length && <option>No attachments</option>}
                </select>
                <div>
                  <IconButton
                    icon={ZoomOut}
                    label="Zoom out"
                    onClick={() => setZoom((z) => Math.max(50, z - 10))}
                  />
                  <span className="zoom-label">{zoom}%</span>
                  <IconButton
                    icon={ZoomIn}
                    label="Zoom in"
                    onClick={() => setZoom((z) => Math.min(200, z + 10))}
                  />
                  {a?.kind === "image" && (
                    <IconButton
                      icon={Scissors}
                      label="Crop image"
                      onClick={() => setCrop(a)}
                    />
                  )}
                  <button
                    className={`button small ${scrolling ? "primary" : "outline"}`}
                    onClick={() => setScrolling(!scrolling)}
                  >
                    {scrolling ? <Pause size={14} /> : <Play size={14} />}Scroll
                  </button>
                  {a && (
                    <IconButton
                      icon={Download}
                      label="Download original"
                      onClick={() =>
                        download(
                          a.blob || new Blob([a.text], { type: "text/plain" }),
                          a.name,
                        )
                      }
                    />
                  )}
                </div>
              </div>
              <div className="original-viewport" ref={viewport}>
                {a?.kind === "text" ? (
                  <pre
                    className="original-text"
                    style={{ fontSize: `${(13 * zoom) / 100}px` }}
                  >
                    {a.text}
                  </pre>
                ) : a?.kind === "image" ? (
                  <img
                    className="original-image"
                    src={url}
                    alt={a.name}
                    style={{ width: `${zoom}%`, maxWidth: "none" }}
                  />
                ) : a?.kind === "pdf" ? (
                  <object
                    className="pdf-frame"
                    data={`${url}#zoom=${zoom}`}
                    type="application/pdf"
                  >
                    <p>
                      Your browser cannot preview this PDF.{" "}
                      <a href={url} download={a.name}>
                        Download the original
                      </a>
                      .
                    </p>
                  </object>
                ) : a?.kind === "score" ? (
                  <div className="empty-state">
                    <FileMusic size={35} />
                    <h3>This file contains an interactive score</h3>
                    <p>
                      The original file is preserved. Open Interactive to read
                      and play it.
                    </p>
                    <button
                      className="button primary"
                      onClick={() => setView("interactive")}
                    >
                      Open interactive view
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Link size={35} />
                    <h3>Your source is saved</h3>
                    <p>Add a PDF, images or text to read tabs here.</p>
                    <button className="button primary" onClick={onEdit}>
                      Add files
                      <Plus size={16} />
                    </button>
                  </div>
                )}
              </div>
              {a?.kind === "text" && (
                <div className="source-footer">
                  <span>Original spacing preserved</span>
                  <button onClick={() => setConvert(true)}>
                    Create interactive draft
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </>
          ) : hasInteractive ? (
            <>
              <Score song={song} />
              {song.conversion && (
                <div className="source-footer">
                  <span>Text conversion · original preserved</span>
                  <button onClick={() => setConvert(true)}>
                    Review conversion
                    <Settings2 size={14} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="conversion-empty">
              <span className="conversion-art">
                <Music2 size={36} />
              </span>
              <div className="eyebrow">A NEW WAY TO PRACTISE</div>
              <h2>Give your tabs a little movement.</h2>
              <p>
                Create a playable draft from six-string text tabs, or attach a
                Guitar Pro / MusicXML file for an interactive score.
              </p>
              <button
                className="button primary"
                onClick={() => setConvert(true)}
              >
                <Music2 size={16} />
                Create interactive draft
              </button>
              <button className="text-button" onClick={onEdit}>
                Attach an existing score
              </button>
              {song.attachments.some((a) =>
                ["image", "pdf"].includes(a.kind),
              ) && (
                <Notice>
                  Automatic recognition of PDFs and images is planned. For now,
                  paste the tab text or attach a matching score.
                </Notice>
              )}
            </div>
          )}
        </section>
        <aside className="practice-sidebar">
          <section className="practice-details">
            <div className="panel-title">
              <h3>The arrangement</h3>
              <Music2 size={17} />
            </div>
            <dl>
              <div>
                <dt>Tuning</dt>
                <dd>{song.tuning}</dd>
              </div>
              <div>
                <dt>Capo</dt>
                <dd>{song.capo ? `Fret ${song.capo}` : "No capo"}</dd>
              </div>
            </dl>
            <label className="field">
              Your progress
              <select
                value={song.status}
                onChange={(e) => update({ ...song, status: e.target.value })}
              >
                {["Want to learn", "Learning", "Comfortable"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {song.tags && (
              <div className="tag-list">
                {song.tags
                  .split(",")
                  .filter(Boolean)
                  .map((t, i) => (
                    <span key={i}>{t.trim()}</span>
                  ))}
              </div>
            )}
          </section>
          <section className="notes-panel">
            <div className="panel-title">
              <h3>Practice notes</h3>
              <NotebookPen size={17} />
            </div>
            <textarea
              aria-label="Practice notes"
              rows={5}
              placeholder="One thing to work on next time…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== song.notes && update({ ...song, notes })}
            />
            <span className="notes-hint">Saves when you leave the field</span>
          </section>
          {video && (
            <section className="video-panel">
              <iframe
                title={`Video for ${song.title}`}
                src={`https://www.youtube-nocookie.com/embed/${video}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
              <a href={safeUrl(song.url)} target="_blank" rel="noreferrer">
                Watch on YouTube
                <ExternalLink size={13} />
              </a>
              <button
                className="video-extract-button"
                onClick={() => setYoutubeImport(true)}
              >
                <Scissors size={15} />
                Extract tab images
                <ArrowRight size={14} />
              </button>
            </section>
          )}
          {safeUrl(song.url) && !video && (
            <a
              className="source-link"
              href={safeUrl(song.url)}
              target="_blank"
              rel="noreferrer"
            >
              <Link size={18} />
              <span>Open original source</span>
              <ExternalLink size={15} />
            </a>
          )}
          <button className="find-button" onClick={() => setFind(!find)}>
            <Search size={16} />
            Find other arrangements
            <ChevronDown size={15} />
          </button>
          {find && (
            <div className="find-links">
              {[
                [
                  "Web search",
                  `https://www.google.com/search?q=${encodeURIComponent(song.title + " " + song.artist + " fingerstyle guitar tab")}`,
                ],
                [
                  "YouTube",
                  `https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + " " + song.artist + " fingerstyle tabs")}`,
                ],
              ].map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noreferrer">
                  {name}
                  <ArrowUpRight size={14} />
                </a>
              ))}
            </div>
          )}
          <button
            className="delete-link"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={14} />
            Remove from library
          </button>
        </aside>
      </div>
      {convert && (
        <ConvertDialog
          song={song}
          onClose={() => setConvert(false)}
          onSave={(conversion) => {
            update({ ...song, conversion });
            setConvert(false);
            setView("interactive");
            notify(
              "Interactive draft saved. Review the rhythm before practising.",
            );
          }}
        />
      )}
      {crop && (
        <Cropper
          attachment={crop}
          onClose={() => setCrop(null)}
          onSave={(attachment) => {
            update({ ...song, attachments: [...song.attachments, attachment] });
            setAttachmentId(attachment.id);
            setCrop(null);
          }}
        />
      )}
      {youtubeImport && (
        <YouTubeExtractor
          initialUrl={song.url}
          initialTitle={song.title}
          onClose={() => setYoutubeImport(false)}
          onDone={(pages) => {
            update({ ...song, attachments: [...song.attachments, ...pages] });
            setAttachmentId(pages[0].id);
            setView("original");
            setYoutubeImport(false);
            notify(`${pages.length} tab pages added to your arrangement`);
          }}
        />
      )}
      {confirmDelete && (
        <div className="modal-backdrop">
          <section
            className="modal compact-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <div className="modal-body">
              <h2 id="delete-title">Remove “{song.title}”?</h2>
              <p>
                This removes the tab and its attachments from this device.
                Export a backup first if you want to keep a copy.
              </p>
            </div>
            <footer className="modal-footer">
              <button
                className="button subtle"
                onClick={() => setConfirmDelete(false)}
              >
                Keep tab
              </button>
              <button className="button danger" onClick={onDelete}>
                Remove tab
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
function ConvertDialog({ song, onClose, onSave }) {
  const dialogRef = useDialog(onClose);
  const textFiles = song.attachments.filter((a) => a.kind === "text");
  const [text, setText] = useState(
      song.conversion?.sourceText || textFiles[0]?.text || "",
    ),
    [bpm, setBpm] = useState(song.bpm || 90),
    [duration, setDuration] = useState(song.conversion?.duration || 8),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(null),
    [reviewed, setReviewed] = useState(false);
  const convert = () => {
    try {
      const parsed = parseAscii(text);
      setPreview({
        tex: toAlphaTex(parsed, { ...song, bpm, duration }),
        approximate: true,
        technique: parsed.technique,
        noteCount: parsed.noteCount,
        sourceText: text,
        duration,
        bpm,
      });
      setError("");
    } catch (e) {
      setError(e.message);
      setPreview(null);
    }
  };
  return (
    <div className="modal-backdrop">
      <section
        ref={dialogRef}
        className="modal convert-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-title"
      >
        <header className="modal-header">
          <div>
            <div className="eyebrow">FROM TEXT TO MUSIC</div>
            <h2 id="convert-title">Create an interactive draft</h2>
          </div>
          <IconButton icon={X} label="Close conversion" onClick={onClose} />
        </header>
        <div className="modal-body">
          <Notice tone="warning">
            Text spacing does not reliably encode rhythm. This draft gives every
            note or chord the same duration. Bass sustain and guitar techniques
            need review.
          </Notice>
          {textFiles.length > 1 && (
            <label className="field">
              Use text attachment
              <select
                onChange={(e) => {
                  setText(textFiles[Number(e.target.value)].text);
                  setPreview(null);
                }}
              >
                {textFiles.map((a, i) => (
                  <option key={a.id} value={i}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            Six-string tabs
            <textarea
              rows={10}
              className="tab-text-input"
              spellCheck="false"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setPreview(null);
              }}
              placeholder={EXAMPLE}
            />
          </label>
          <div className="form-grid">
            <label className="field">
              Tempo (BPM)
              <input
                type="number"
                min="20"
                max="300"
                value={bpm}
                onChange={(e) => {
                  setBpm(Number(e.target.value));
                  setPreview(null);
                }}
              />
            </label>
            <label className="field">
              Duration for every note
              <select
                value={duration}
                onChange={(e) => {
                  setDuration(Number(e.target.value));
                  setPreview(null);
                }}
              >
                <option value={4}>Quarter note</option>
                <option value={8}>Eighth note</option>
                <option value={16}>Sixteenth note</option>
              </select>
            </label>
          </div>
          <p className="muted small">
            Using {song.tuning} tuning ·{" "}
            {song.capo ? `Capo ${song.capo}` : "No capo"}. Change these in Edit
            tab before converting.
          </p>
          {error && <Notice tone="warning">{error}</Notice>}
          {preview && (
            <>
              <Notice>
                {preview.noteCount} notes recognised.{" "}
                {preview.technique
                  ? "Technique markings were found and are not preserved in this draft."
                  : "Check the notes and timing against your original."}
              </Notice>
              <Score
                song={{ ...song, conversion: preview, attachments: [] }}
                compact
              />
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                I understand the rhythm is approximate and will review it.
              </label>
            </>
          )}
        </div>
        <footer className="modal-footer">
          <button className="button subtle" onClick={onClose}>
            Cancel
          </button>
          <button className="button outline" onClick={convert}>
            Preview draft
          </button>
          <button
            className="button primary"
            disabled={!preview || !reviewed}
            onClick={() => onSave(preview)}
          >
            <Check size={16} />
            Save draft
          </button>
        </footer>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
