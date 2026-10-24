import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ExternalLink,
  Monitor,
  Camera,
  Scissors,
  Pause,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useDialog } from "./dialog.js";
import { youtubeId } from "./tabs.js";
import { CropSurface, FrameThumb, cropBlob } from "./studio.jsx";
import {
  similarFrames,
  blankFrame,
  captureSignature,
  captureError,
} from "./capture.js";

const LIMIT = 100,
  MAX_BYTES = 100 * 1024 * 1024;

export function YouTubeExtractor({
  initialUrl = "",
  initialTitle = "",
  onClose,
  onDone,
  onLocalVideo,
}) {
  const dialogRef = useDialog(onClose);
  const [url, setUrl] = useState(initialUrl),
    [title, setTitle] = useState(initialTitle),
    [sharing, setSharing] = useState(false),
    [connecting, setConnecting] = useState(false),
    [snapshot, setSnapshot] = useState(""),
    [rect, setRect] = useState({ x: 0, y: 0.63, w: 1, h: 0.37 }),
    [confirmed, setConfirmed] = useState(false),
    [frames, setFrames] = useState([]),
    [interval, setIntervalValue] = useState(2),
    [collecting, setCollecting] = useState(false),
    [skipped, setSkipped] = useState(0),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [supported] = useState(() => !!navigator.mediaDevices?.getDisplayMedia);
  const video = useRef(),
    stream = useRef(),
    alive = useRef(true),
    timer = useRef(),
    generation = useRef(0),
    collectingRef = useRef(false),
    sampling = useRef(false),
    signatures = useRef([]),
    frameCount = useRef(0),
    serial = useRef(0),
    bytes = useRef(0),
    dimensions = useRef(null),
    connection = useRef(0),
    rectRef = useRef(rect);
  rectRef.current = rect;
  const id = youtubeId(url);
  const canonical = id ? `https://www.youtube.com/watch?v=${id}` : "";

  function pauseCollection() {
    collectingRef.current = false;
    generation.current++;
    clearTimeout(timer.current);
    if (alive.current) setCollecting(false);
  }
  function releaseStream() {
    connection.current++;
    pauseCollection();
    const current = stream.current;
    stream.current = null;
    current?.getTracks().forEach((track) => track.stop());
    if (video.current) video.current.srcObject = null;
    if (alive.current) {
      setSharing(false);
      setConnecting(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      connection.current++;
      generation.current++;
      collectingRef.current = false;
      clearTimeout(timer.current);
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function takeSnapshot() {
    const source = video.current;
    if (!source?.videoWidth || source.readyState < 2)
      throw new Error(
        "The shared tab is still loading. Wait a moment and try Refresh preview.",
      );
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(source.videoWidth, 1400);
    canvas.height = Math.round(
      (source.videoHeight * canvas.width) / source.videoWidth,
    );
    canvas
      .getContext("2d")
      .drawImage(source, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL("image/png"));
    dimensions.current = {
      width: source.videoWidth,
      height: source.videoHeight,
    };
    setConfirmed(false);
  }

  async function connect() {
    if (!id) {
      setError("Paste a valid YouTube video link first.");
      return;
    }
    setError("");
    setMessage("");
    setConnecting(true);
    const attempt = ++connection.current;
    let next;
    try {
      // This call must happen directly in the click handler: browsers require a user gesture.
      next = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser", frameRate: 5 },
        audio: false,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "exclude",
        monitorTypeSurfaces: "exclude",
        systemAudio: "exclude",
      });
      if (!alive.current || attempt !== connection.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      const track = next.getVideoTracks()[0];
      if (!track) throw new Error("No video tab was shared. Please try again.");
      if (track.getSettings().displaySurface === "monitor")
        throw new Error(
          "Choose the YouTube browser tab instead of your entire screen.",
        );
      stream.current = next;
      track.addEventListener("ended", () => {
        if (!alive.current || stream.current !== next) return;
        releaseStream();
        setMessage(
          "Sharing stopped. Your collected pages are ready to review or save.",
        );
      });
      const source = video.current;
      source.srcObject = next;
      await source.play();
      if (!source.videoWidth)
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(
              new Error(
                "The shared tab did not provide a video frame. Please share it again.",
              ),
            );
          }, 10000);
          const cleanup = () => {
            clearTimeout(timeout);
            source.removeEventListener("loadeddata", done);
          };
          const done = () => {
            cleanup();
            resolve();
          };
          source.addEventListener("loadeddata", done, { once: true });
        });
      if (!alive.current || attempt !== connection.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      takeSnapshot();
      setSharing(true);
    } catch (e) {
      next?.getTracks().forEach((t) => t.stop());
      if (alive.current && attempt === connection.current) {
        stream.current = null;
        if (video.current) video.current.srcObject = null;
        setSharing(false);
        setError(captureError(e));
      }
    } finally {
      if (alive.current && attempt === connection.current) setConnecting(false);
    }
  }

  async function captureOne(deduplicate = true) {
    if (sampling.current || !stream.current?.active) return false;
    sampling.current = true;
    const sourceStream = stream.current;
    try {
      const source = video.current;
      if (!source?.videoWidth || source.readyState < 2)
        throw new Error(
          "The shared tab is not ready. Refresh its preview and try again.",
        );
      const size = dimensions.current;
      if (
        size &&
        (source.videoWidth !== size.width || source.videoHeight !== size.height)
      ) {
        pauseCollection();
        takeSnapshot();
        setMessage(
          "The video tab changed size. Select and confirm the tab area again before collecting more pages.",
        );
        return false;
      }
      if (frameCount.current >= LIMIT) {
        pauseCollection();
        setMessage(
          "100 pages collected. Save these pages before starting another collection.",
        );
        return false;
      }
      const region = rectRef.current,
        signature = captureSignature(source, region);
      if (
        blankFrame(signature) ||
        (deduplicate &&
          signatures.current.some((previous) =>
            similarFrames(previous, signature),
          ))
      ) {
        if (alive.current) setSkipped((n) => n + 1);
        return false;
      }
      const blob = await cropBlob(
        source,
        region,
        source.videoWidth,
        source.videoHeight,
      );
      if (
        !alive.current ||
        !sourceStream.active ||
        stream.current !== sourceStream ||
        rectRef.current !== region
      )
        return false;
      if (bytes.current + blob.size > MAX_BYTES) {
        pauseCollection();
        setMessage(
          "This collection has reached 100 MB. Save these pages before capturing more.",
        );
        return false;
      }
      const attachment = {
        id: crypto.randomUUID(),
        name: `YouTube section ${String(++serial.current).padStart(3, "0")}.png`,
        kind: "image",
        blob,
      };
      frameCount.current++;
      bytes.current += blob.size;
      signatures.current.push(new Uint8ClampedArray(signature));
      setFrames((all) => [...all, attachment]);
      if (frameCount.current >= LIMIT) {
        pauseCollection();
        setMessage(
          "100 pages collected. Save these pages before starting another collection.",
        );
      }
      return true;
    } catch (e) {
      pauseCollection();
      if (alive.current) setError(captureError(e));
      return false;
    } finally {
      sampling.current = false;
    }
  }

  function startCollection() {
    setError("");
    setMessage("");
    collectingRef.current = true;
    setCollecting(true);
    const run = ++generation.current;
    const tick = async () => {
      if (
        !alive.current ||
        !collectingRef.current ||
        generation.current !== run
      )
        return;
      await captureOne();
      if (alive.current && collectingRef.current && generation.current === run)
        timer.current = setTimeout(tick, interval * 1000);
    };
    tick();
  }
  function finish() {
    releaseStream();
    onDone(frames, title.trim() || "YouTube tabs", canonical);
  }
  function changeRect(value) {
    setRect(value);
    setConfirmed(false);
  }
  function remove(index) {
    if (collectingRef.current) return;
    const next = [...frames];
    bytes.current -= next[index].blob.size;
    next.splice(index, 1);
    frameCount.current = next.length;
    signatures.current.splice(index, 1);
    setFrames(next);
  }
  function move(index, direction) {
    if (collectingRef.current) return;
    const next = [...frames];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    [signatures.current[index], signatures.current[index + direction]] = [
      signatures.current[index + direction],
      signatures.current[index],
    ];
    setFrames(next);
  }

  return (
    <div className="modal-backdrop youtube-backdrop">
      <section
        ref={dialogRef}
        className="modal youtube-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="youtube-title"
      >
        <header className="modal-header">
          <div>
            <div className="eyebrow">FROM YOUR SCREEN TO YOUR STRINGS</div>
            <h2 id="youtube-title">YouTube to tab pages</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close YouTube capture"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        <div className="modal-body">
          <div className="notice">
            <ShieldCheck size={18} />
            <span>
              Collect the tabs shown in a YouTube video, free on your device.
              You’ll share just its browser tab; only your cropped images are
              saved.
            </span>
          </div>
          <label className="field">
            YouTube video link
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              disabled={sharing || connecting || frames.length > 0}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label className="field">
            Song title
            <input
              placeholder="Name this arrangement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="youtube-steps">
            <div>
              <span className="step-number">1</span>
              <div>
                <strong>Open the video and find the tabs</strong>
                <p>
                  Start playback, skip any intro or ads, and use theatre mode
                  for larger tabs. Keep the video tab’s size and zoom steady.
                </p>
              </div>
            </div>
            <div>
              <span className="step-number">2</span>
              <div>
                <strong>Share the YouTube tab with Fretbook</strong>
                <p>
                  Return here, click Share video tab, then select the YouTube
                  tab in your browser’s picker.
                </p>
              </div>
            </div>
          </div>
          <div className="youtube-connect">
            <a
              className={`button outline ${!id ? "disabled-link" : ""}`}
              href={canonical || undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!id}
              onClick={(e) => !id && e.preventDefault()}
            >
              Open YouTube video
              <ExternalLink size={15} />
            </a>
            <button
              className="button primary"
              disabled={!id || !supported || sharing || connecting}
              onClick={connect}
            >
              {connecting ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Monitor size={16} />
              )}
              Share video tab
            </button>
            {sharing && (
              <span className="sharing-badge">
                <span className="status-dot" />
                Sharing video tab
                <button
                  onClick={() => {
                    releaseStream();
                    setMessage(
                      "Sharing stopped. Your collected pages are ready to save.",
                    );
                  }}
                >
                  Stop sharing
                </button>
              </span>
            )}
          </div>
          {!supported && (
            <div className="notice warning">
              <AlertCircle size={17} />
              <span>
                This browser doesn’t support tab sharing. Open Fretbook in
                desktop Chrome or Edge, or use the local video tool.
              </span>
            </div>
          )}
          <video
            className="capture-source"
            ref={video}
            muted
            playsInline
            aria-hidden="true"
          />
          {sharing && snapshot && (
            <>
              <div className="studio-instruction">
                <span className="step-number">3</span>
                <div>
                  <strong>Select only the tabs</strong>
                  <p>
                    Drag a rectangle around the tab area in this still preview.
                    Your crop is applied to every captured section.
                  </p>
                </div>
                <button
                  className="text-button"
                  disabled={collecting}
                  onClick={() => {
                    try {
                      takeSnapshot();
                      setError("");
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  <RefreshCw size={12} />
                  Refresh preview
                </button>
              </div>
              <CropSurface
                className="youtube-crop"
                rect={rect}
                setRect={collecting ? () => {} : changeRect}
              >
                <img
                  src={snapshot}
                  alt="Shared YouTube tab: drag to select the tab area"
                  draggable="false"
                />
              </CropSurface>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={collecting}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                The selected area contains only the tabs I want to save.
              </label>
              <div className="studio-instruction">
                <span className="step-number">4</span>
                <div>
                  <strong>Collect while the video plays</strong>
                  <p>
                    This runs in real time. Repeated and blank images are
                    skipped. Pause collection to review or reorder pages.
                  </p>
                </div>
              </div>
              <div className="capture-tools">
                <button
                  className="button outline"
                  disabled={!confirmed || collecting}
                  onClick={() => {
                    setError("");
                    captureOne(false);
                  }}
                >
                  <Camera size={16} />
                  Capture this section
                </button>
                <label>
                  Every{" "}
                  <select
                    aria-label="YouTube capture interval"
                    disabled={collecting}
                    value={interval}
                    onChange={(e) => setIntervalValue(Number(e.target.value))}
                  >
                    {[1, 2, 4, 8, 12].map((n) => (
                      <option key={n} value={n}>
                        {n}s
                      </option>
                    ))}
                  </select>
                </label>
                {collecting ? (
                  <button className="button primary" onClick={pauseCollection}>
                    <Pause size={16} />
                    Pause collection
                  </button>
                ) : (
                  <button
                    className="button primary"
                    disabled={!confirmed || frameCount.current >= LIMIT}
                    onClick={startCollection}
                  >
                    <Scissors size={16} />
                    Collect tab sections
                  </button>
                )}
              </div>
            </>
          )}
          {(collecting || skipped > 0) && (
            <p className="capture-progress" role="status">
              {collecting && <Loader2 size={14} className="spin" />}
              {frames.length} pages collected · {skipped} repeated or blank
              frames skipped{collecting ? " · collecting…" : ""}
            </p>
          )}
          {message && (
            <p className="capture-progress" role="status">
              {message}
            </p>
          )}
          {error && (
            <div className="notice warning" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}
          {frames.length > 0 && (
            <div className="youtube-results">
              <div className="panel-title">
                <h3>Your tab pages · {frames.length}</h3>
                <span>Review the crop and remove anything you don’t need.</span>
              </div>
              <div className="frames-grid">
                {frames.map((a, index) => (
                  <FrameThumb
                    key={a.id}
                    attachment={a}
                    index={index}
                    total={frames.length}
                    remove={remove}
                    move={move}
                    disabled={collecting}
                  />
                ))}
              </div>
            </div>
          )}
          <p className="youtube-footnote">
            These are tab images, not editable notation. Desktop tab sharing is
            required. No video file, audio, or screen recording is uploaded.
          </p>
        </div>
        <footer className="modal-footer">
          {onLocalVideo && (
            <button
              className="text-button local-video-option"
              onClick={() => {
                releaseStream();
                onLocalVideo();
              }}
            >
              Use a local video instead
            </button>
          )}
          <button className="button subtle" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={!frames.length || collecting}
            onClick={finish}
          >
            <Check size={16} />
            Add {frames.length || ""} {frames.length === 1 ? "page" : "pages"}{" "}
            to tab
          </button>
        </footer>
      </section>
    </div>
  );
}
