import React, { useEffect, useRef, useState } from "react";
import * as alphaTab from "@coderline/alphatab";
import {
  Play,
  Pause,
  Square,
  Repeat2,
  Volume2,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
const clock = (ms) => {
  const s = Math.floor((ms || 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
export function Score({ song, compact = false }) {
  const host = useRef(),
    scroll = useRef(),
    apiRef = useRef();
  const [ready, setReady] = useState(false),
    [rendering, setRendering] = useState(true),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState(""),
    [speed, setSpeed] = useState(100),
    [loop, setLoop] = useState(false),
    [position, setPosition] = useState({ currentTime: 0, endTime: 0 }),
    [tracks, setTracks] = useState([]),
    [track, setTrack] = useState(0),
    [scale, setScale] = useState(1),
    [volume, setVolume] = useState(80);
  const scoreFiles = song.attachments.filter((a) => a.kind === "score");
  const [source, setSource] = useState(
    song.conversion ? "draft" : scoreFiles[0]?.id,
  );
  const file = scoreFiles.find((a) => a.id === source);
  useEffect(() => {
    let alive = true;
    setReady(false);
    setRendering(true);
    setError("");
    setPlaying(false);
    setPosition({ currentTime: 0, endTime: 0 });
    setTrack(0);
    setSpeed(100);
    setLoop(false);
    setScale(1);
    let api;
    try {
      api = new alphaTab.AlphaTabApi(host.current, {
        core: {
          fontDirectory: `${import.meta.env.BASE_URL}font/`,
          logLevel: alphaTab.LogLevel.Error,
        },
        display: { scale: 1, staveProfile: alphaTab.StaveProfile.ScoreTab }, // ScriptProcessor avoids alphaTab’s asynchronous worklet start/pause race.
        player: {
          enablePlayer: true,
          outputMode: alphaTab.PlayerOutputMode.WebAudioScriptProcessor,
          soundFont: `${import.meta.env.BASE_URL}soundfont/sonivox.sf2`,
          enableCursor: true,
          enableUserInteraction: true,
          scrollElement: scroll.current,
        },
      });
      apiRef.current = api;
      api.error.on((e) => {
        if (alive) {
          setError(
            e.message ||
              "This score could not be loaded. Try another file or review the tab text.",
          );
          setRendering(false);
        }
      });
      api.renderFinished.on(() => {
        if (alive) setRendering(false);
      });
      api.playerReady.on(() => {
        if (alive) {
          setReady(true);
          api.masterVolume = 0.8;
        }
      });
      api.playerStateChanged.on((e) => {
        if (alive) setPlaying(e.state === alphaTab.synth.PlayerState.Playing);
      });
      api.playerPositionChanged.on((e) => {
        if (alive) setPosition(e);
      });
      api.scoreLoaded.on((s) => {
        if (alive)
          setTracks(
            s.tracks.map((t) => ({
              name: t.name || `Track ${t.index + 1}`,
              index: t.index,
            })),
          );
      });
      if (source === "draft" && song.conversion) api.tex(song.conversion.tex);
      else if (file?.blob)
        file.blob
          .arrayBuffer()
          .then((b) => {
            if (alive) api.load(new Uint8Array(b));
          })
          .catch((e) => {
            if (alive) setError(e.message);
          });
      else {
        setError("No playable score is attached.");
        setRendering(false);
      }
    } catch (e) {
      setError(e.message);
      setRendering(false);
    }
    return () => {
      alive = false;
      apiRef.current = null;
      api?.destroy();
    };
  }, [source, file?.blob, song.conversion?.tex]);
  return (
    <div className={`score-component ${compact ? "compact" : ""}`}>
      {song.conversion?.approximate && source === "draft" && (
        <div className="rhythm-notice">
          <AlertCircle size={16} />
          <span>
            <strong>Approximate rhythm.</strong> Every note or chord uses the
            same duration.
            {song.conversion.technique
              ? " Techniques need manual review."
              : " Check against the original."}
          </span>
        </div>
      )}
      <div className="score-top-tools">
        <span className="score-instrument">
          <Volume2 size={15} />
          Acoustic guitar
        </span>
        <div>
          {scoreFiles.length > 0 && (
            <select
              aria-label="Interactive source"
              value={source || ""}
              onChange={(e) => setSource(e.target.value)}
            >
              {song.conversion && (
                <option value="draft">Converted text draft</option>
              )}
              {scoreFiles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          {tracks.length > 1 && (
            <select
              aria-label="Score track"
              value={track}
              onChange={(e) => {
                const i = Number(e.target.value);
                setTrack(i);
                const a = apiRef.current;
                if (a?.score) a.renderTracks([a.score.tracks[i]]);
              }}
            >
              {tracks.map((t) => (
                <option key={t.index} value={t.index}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="icon-button"
            aria-label="Make notation smaller"
            disabled={scale <= 0.6}
            onClick={() => {
              const n = Math.max(0.6, scale - 0.1);
              setScale(n);
              if (apiRef.current) {
                apiRef.current.settings.display.scale = n;
                apiRef.current.updateSettings();
                apiRef.current.render();
              }
            }}
          >
            <ZoomOut size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Make notation larger"
            disabled={scale >= 1.6}
            onClick={() => {
              const n = Math.min(1.6, scale + 0.1);
              setScale(n);
              if (apiRef.current) {
                apiRef.current.settings.display.scale = n;
                apiRef.current.updateSettings();
                apiRef.current.render();
              }
            }}
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
      {error && (
        <div className="notice warning" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}
      <div className="score-scroll" ref={scroll}>
        {rendering && !error && (
          <div className="score-loading">
            <Loader2 size={20} className="spin" />
            Preparing your score…
          </div>
        )}
        <div className="alpha-host" ref={host} />
      </div>
      <div className="player">
        <div className="transport">
          <button
            className="play-button"
            aria-label={playing ? "Pause playback" : "Play score"}
            disabled={!ready || !!error}
            onClick={() => apiRef.current?.playPause()}
          >
            {playing ? (
              <Pause size={17} fill="currentColor" />
            ) : (
              <Play size={17} fill="currentColor" />
            )}
          </button>
          <button
            className="icon-button"
            aria-label="Stop playback"
            disabled={!ready}
            onClick={() => apiRef.current?.stop()}
          >
            <Square size={15} />
          </button>
          <button
            className={`icon-button ${loop ? "is-on" : ""}`}
            aria-label="Loop playback"
            aria-pressed={loop}
            disabled={!ready}
            onClick={() => {
              setLoop(!loop);
              if (apiRef.current) apiRef.current.isLooping = !loop;
            }}
          >
            <Repeat2 size={18} />
          </button>
        </div>
        <div className="player-position">
          <span>{clock(position.currentTime)}</span>
          <div className="position-line">
            <span
              style={{
                width: `${position.endTime ? (position.currentTime / position.endTime) * 100 : 0}%`,
              }}
            />
          </div>
          <span>{clock(position.endTime)}</span>
        </div>
        <label className="speed-control">
          Speed
          <select
            aria-label="Playback speed"
            value={speed}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSpeed(v);
              if (apiRef.current) apiRef.current.playbackSpeed = v / 100;
            }}
          >
            {[25, 50, 75, 100, 125, 150].map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </label>
        <label className="volume-control">
          <Volume2 size={16} />
          <input
            aria-label="Playback volume"
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              if (apiRef.current)
                apiRef.current.masterVolume = Number(e.target.value) / 100;
            }}
          />
        </label>
      </div>
      <div className="player-hint">
        {ready
          ? "Click a note to jump. Drag across beats to select a loop."
          : error
            ? "Playback unavailable for this score."
            : "Loading the free instrument soundfont…"}
      </div>
    </div>
  );
}
