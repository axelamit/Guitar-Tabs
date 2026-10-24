import React, { useState, useEffect, useRef } from "react";
import { useDialog } from "./dialog.js";
import {
  X,
  Scissors,
  Upload,
  Camera,
  Play,
  Loader2,
  ArrowRight,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  AlertCircle,
} from "lucide-react";
function useBlobUrl(blob) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) return;
    const value = URL.createObjectURL(blob);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [blob]);
  return url;
}
function CropSurface({ children, rect, setRect, className = "" }) {
  const ref = useRef(),
    start = useRef();
  const point = (e) => {
    const b = ref.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)),
      y: Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)),
    };
  };
  return (
    <div
      ref={ref}
      className={`crop-surface ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        start.current = point(e);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const p = point(e),
          s = start.current;
        setRect({
          x: Math.min(p.x, s.x),
          y: Math.min(p.y, s.y),
          w: Math.max(0.01, Math.abs(p.x - s.x)),
          h: Math.max(0.01, Math.abs(p.y - s.y)),
        });
      }}
      onPointerUp={(e) => {
        if (start.current) {
          const p = point(e),
            s = start.current;
          if (Math.abs(p.x - s.x) > 0.01 && Math.abs(p.y - s.y) > 0.01)
            setRect({
              x: Math.min(p.x, s.x),
              y: Math.min(p.y, s.y),
              w: Math.abs(p.x - s.x),
              h: Math.abs(p.y - s.y),
            });
          start.current = null;
        }
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
    >
      {children}
      <div
        className="crop-selection"
        style={{
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.w * 100}%`,
          height: `${rect.h * 100}%`,
        }}
      >
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
async function cropBlob(source, rect, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.w * width));
  canvas.height = Math.max(1, Math.round(rect.h * height));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    source,
    rect.x * width,
    rect.y * height,
    rect.w * width,
    rect.h * height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("Could not capture this image.")),
      "image/png",
    ),
  );
}
export function Cropper({ attachment, onClose, onSave }) {
  const dialogRef = useDialog(onClose);
  const url = useBlobUrl(attachment.blob),
    img = useRef();
  const [rect, setRect] = useState({ x: 0, y: 0, w: 1, h: 1 }),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const save = async () => {
    try {
      const image = img.current;
      const blob = await cropBlob(
        image,
        rect,
        image.naturalWidth,
        image.naturalHeight,
      );
      onSave({
        ...attachment,
        id: crypto.randomUUID(),
        name: attachment.name.replace(/\.[^.]+$/, "") + " (cropped).png",
        blob,
      });
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="modal-backdrop crop-backdrop">
      <section
        ref={dialogRef}
        className="modal crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
      >
        <header className="modal-header">
          <div>
            <div className="eyebrow">KEEP THE PART THAT MATTERS</div>
            <h2 id="crop-title">Crop your tab image</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close crop tool"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        <div className="modal-body">
          <p className="muted">
            Drag a rectangle around the tabs. Your original image is kept
            alongside the cropped copy.
          </p>
          <CropSurface rect={rect} setRect={setRect}>
            <img
              ref={img}
              src={url}
              onLoad={() => setReady(true)}
              onError={() => setError("This image could not be opened.")}
              alt="Select an area to crop"
              draggable="false"
            />
          </CropSurface>
          {error && <p role="alert">{error}</p>}
        </div>
        <footer className="modal-footer">
          <button
            className="button subtle"
            onClick={() => setRect({ x: 0, y: 0, w: 1, h: 1 })}
          >
            Reset selection
          </button>
          <button className="button primary" disabled={!ready} onClick={save}>
            <Scissors size={16} />
            Save crop
          </button>
        </footer>
      </section>
    </div>
  );
}
function FrameThumb({ attachment, index, remove, move, total }) {
  const url = useBlobUrl(attachment.blob);
  return (
    <article className="frame-thumb">
      <img src={url} alt={`Tab section ${index + 1}`} />
      <div>
        <span>
          {index + 1}. {attachment.name}
        </span>
        <button
          className="icon-button"
          aria-label={`Move page ${index + 1} up`}
          disabled={index === 0}
          onClick={() => move(index, -1)}
        >
          <ChevronUp size={15} />
        </button>
        <button
          className="icon-button"
          aria-label={`Move page ${index + 1} down`}
          disabled={index === total - 1}
          onClick={() => move(index, 1)}
        >
          <ChevronDown size={15} />
        </button>
        <button
          className="icon-button"
          aria-label={`Remove page ${index + 1}`}
          onClick={() => remove(index)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
export function VideoExtractor({ onClose, onDone }) {
  const dialogRef = useDialog(onClose);
  const [file, setFile] = useState(null),
    [rect, setRect] = useState({ x: 0, y: 0.63, w: 1, h: 0.37 }),
    [ready, setReady] = useState(false),
    [frames, setFrames] = useState([]),
    [interval, setIntervalValue] = useState(4),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [error, setError] = useState(""),
    [title, setTitle] = useState("");
  const video = useRef(),
    input = useRef(),
    cancel = useRef(false),
    alive = useRef(true);
  const url = useBlobUrl(file);
  useEffect(
    () => () => {
      alive.current = false;
      cancel.current = true;
    },
    [],
  );
  const select = (f) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("Choose a video file such as MP4 or WebM.");
      return;
    }
    setFile(f);
    setTitle(f.name.replace(/\.[^.]+$/, ""));
    setFrames([]);
    setReady(false);
    setError("");
  };
  const capture = async () => {
    try {
      video.current.pause();
      const v = video.current;
      const blob = await cropBlob(v, rect, v.videoWidth, v.videoHeight);
      setFrames((all) => [
        ...all,
        {
          id: crypto.randomUUID(),
          name: `Section at ${Math.floor(v.currentTime / 60)}m${Math.floor(v.currentTime % 60)}s.png`,
          kind: "image",
          blob,
        },
      ]);
    } catch (e) {
      setError(e.message);
    }
  };
  const seek = (t) =>
    new Promise((resolve, reject) => {
      const v = video.current;
      if (Math.abs(v.currentTime - t) < 0.05 && v.readyState >= 2) {
        resolve();
        return;
      }
      const cleanup = () => {
        clearTimeout(timer);
        v.removeEventListener("seeked", done);
        v.removeEventListener("error", failed);
      };
      const done = () => {
        cleanup();
        resolve();
      };
      const failed = () => {
        cleanup();
        reject(new Error("Could not read this video frame."));
      };
      const timer = setTimeout(failed, 15000);
      v.addEventListener("seeked", done);
      v.addEventListener("error", failed);
      v.currentTime = t;
    });
  const collect = async () => {
    setBusy(true);
    setError("");
    cancel.current = false;
    video.current.pause();
    let previous = null;
    let collected = [];
    try {
      const v = video.current;
      if (!Number.isFinite(v.duration) || v.duration <= 0)
        throw new Error(
          "The video duration is unavailable. Capture individual sections instead.",
        );
      const count = Math.min(100, Math.ceil(v.duration / interval));
      const probe = document.createElement("canvas");
      probe.width = 160;
      probe.height = 60;
      const ctx = probe.getContext("2d", { willReadFrequently: true });
      for (let i = 0; i < count; i++) {
        if (cancel.current || !alive.current) break;
        setProgress(`Checking frame ${i + 1} of ${count}…`);
        await seek(Math.min(i * interval, Math.max(0, v.duration - 0.1)));
        if (cancel.current || !alive.current) break;
        ctx.drawImage(
          v,
          rect.x * v.videoWidth,
          rect.y * v.videoHeight,
          rect.w * v.videoWidth,
          rect.h * v.videoHeight,
          0,
          0,
          160,
          60,
        );
        const pixels = ctx.getImageData(0, 0, 160, 60).data;
        let diff = 0;
        if (previous) {
          for (let j = 0; j < pixels.length; j += 4)
            diff +=
              Math.abs(pixels[j] - previous[j]) +
              Math.abs(pixels[j + 1] - previous[j + 1]) +
              Math.abs(pixels[j + 2] - previous[j + 2]);
          diff /= 160 * 60 * 3;
        }
        if (!previous || diff > 0.8) {
          const blob = await cropBlob(v, rect, v.videoWidth, v.videoHeight);
          collected.push({
            id: crypto.randomUUID(),
            name: `Section at ${Math.floor(v.currentTime / 60)}m${Math.floor(v.currentTime % 60)}s.png`,
            kind: "image",
            blob,
          });
          previous = new Uint8ClampedArray(pixels);
        }
      }
      if (alive.current) {
        setFrames((all) => [...all, ...collected]);
        setProgress(
          `${collected.length} sections collected. Review the images and remove any duplicates.${count === 100 ? " Scan capped at 100 frames; use a larger interval to cover more of the video." : ""}`,
        );
      }
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const move = (i, d) =>
    setFrames((all) => {
      const next = [...all];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  return (
    <div className="modal-backdrop">
      <section
        ref={dialogRef}
        className="modal video-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-title"
      >
        <header className="modal-header">
          <div>
            <div className="eyebrow">LESS PAUSING. MORE PLAYING.</div>
            <h2 id="video-title">Video to tab pages</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close video studio"
            onClick={() => {
              cancel.current = true;
              onClose();
            }}
          >
            <X size={19} />
          </button>
        </header>
        <div className="modal-body">
          <div className="notice">
            <Scissors size={18} />
            <span>
              Collect the tabs already visible in a local video. Everything runs
              on your device; the video is never uploaded.
            </span>
          </div>
          <input
            type="file"
            ref={input}
            hidden
            accept="video/*"
            onChange={(e) => select(e.target.files[0])}
          />
          {!file ? (
            <div
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                select(e.dataTransfer.files[0]);
              }}
            >
              <span className="upload-icon">
                <Upload size={24} />
              </span>
              <strong>Bring a video with on-screen tabs</strong>
              <p>Use a local video file you have permission to use.</p>
              <button
                className="button primary"
                onClick={() => input.current.click()}
              >
                Choose a video
              </button>
              <small>
                YouTube links can be saved alongside a song; this tool needs a
                local file.
              </small>
            </div>
          ) : (
            <>
              <label className="field">
                Song title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <div className="studio-instruction">
                <span className="step-number">1</span>
                <div>
                  <strong>Select the tab area</strong>
                  <p>
                    Pause on a clear frame, then drag a rectangle around the
                    tabs.
                  </p>
                </div>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => input.current.click()}
                >
                  Change video
                </button>
              </div>
              <CropSurface rect={rect} setRect={busy ? () => {} : setRect}>
                <video
                  ref={video}
                  src={url}
                  preload="auto"
                  playsInline
                  onLoadedData={() => setReady(true)}
                  onError={() =>
                    setError(
                      "This browser cannot open the video. Try an MP4 or WebM file.",
                    )
                  }
                />
              </CropSurface>
              <div className="video-seek">
                <button
                  className="button outline small"
                  disabled={!ready || busy}
                  onClick={() =>
                    video.current.paused
                      ? video.current.play().catch((e) => setError(e.message))
                      : video.current.pause()
                  }
                >
                  <Play size={14} />
                  Preview / pause
                </button>
                <input
                  aria-label="Video position"
                  type="range"
                  min="0"
                  max="1000"
                  defaultValue="0"
                  disabled={!ready || busy}
                  onChange={(e) => {
                    const v = video.current;
                    if (Number.isFinite(v.duration))
                      v.currentTime =
                        (Number(e.target.value) / 1000) * v.duration;
                  }}
                />
              </div>
              <div className="studio-instruction">
                <span className="step-number">2</span>
                <div>
                  <strong>Collect your sections</strong>
                  <p>
                    Capture one frame, or scan at intervals and skip similar
                    consecutive frames.
                  </p>
                </div>
              </div>
              <div className="capture-tools">
                <button
                  className="button outline"
                  onClick={capture}
                  disabled={!ready || busy}
                >
                  <Camera size={16} />
                  Capture this section
                </button>
                <label>
                  Every{" "}
                  <select
                    aria-label="Capture interval"
                    value={interval}
                    disabled={busy}
                    onChange={(e) => setIntervalValue(Number(e.target.value))}
                  >
                    {[1, 2, 4, 8, 12, 20, 30].map((n) => (
                      <option key={n} value={n}>
                        {n}s
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="button primary"
                  disabled={!ready || busy}
                  onClick={collect}
                >
                  {busy ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <Scissors size={16} />
                  )}
                  Collect sections
                </button>
                {busy && (
                  <button
                    className="button subtle"
                    onClick={() => {
                      cancel.current = true;
                    }}
                  >
                    Stop scan
                  </button>
                )}
              </div>
              {progress && (
                <p className="muted small" role="status">
                  {progress}
                </p>
              )}
              {frames.length > 0 && (
                <>
                  <div className="studio-instruction">
                    <span className="step-number">3</span>
                    <div>
                      <strong>Review your pages · {frames.length}</strong>
                      <p>
                        Keep the useful sections and put them in order. Moving
                        highlights can create duplicates.
                      </p>
                    </div>
                  </div>
                  <div className="frames-grid">
                    {frames.map((a, i) => (
                      <FrameThumb
                        key={a.id}
                        attachment={a}
                        index={i}
                        total={frames.length}
                        move={move}
                        remove={(index) =>
                          setFrames((all) => all.filter((_, i) => i !== index))
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {error && (
            <div className="notice warning" role="alert">
              <AlertCircle size={17} />
              {error}
            </div>
          )}
        </div>
        <footer className="modal-footer">
          <span>
            {frames.length} {frames.length === 1 ? "page" : "pages"} collected
          </span>
          <button
            className="button subtle"
            onClick={() => {
              cancel.current = true;
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={!frames.length || busy || !title.trim()}
            onClick={() => onDone(frames, title)}
          >
            <Check size={16} />
            Add pages to a tab
            <ArrowRight size={16} />
          </button>
        </footer>
      </section>
    </div>
  );
}
