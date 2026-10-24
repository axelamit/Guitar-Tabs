// A deliberately conservative comparison: changed fret numbers should survive.
export function similarFrames(left, right, threshold = 0.8) {
  if (!left || !right || left.length !== right.length || !left.length)
    return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      const delta = Math.abs(left[i + channel] - right[i + channel]);
      // A single changed fret can occupy very few pixels. Averaging alone
      // would erase it, so keep local changes even when the rest is identical.
      if (delta > 24) return false;
      difference += delta;
    }
  }
  return difference / ((left.length / 4) * 3) <= threshold;
}

export function blankFrame(pixels) {
  let min = 255,
    max = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const value = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return max - min < 12;
}

export function captureSignature(video, rect) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 120;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(
    video,
    rect.x * video.videoWidth,
    rect.y * video.videoHeight,
    rect.w * video.videoWidth,
    rect.h * video.videoHeight,
    0,
    0,
    320,
    120,
  );
  return ctx.getImageData(0, 0, 320, 120).data;
}

export function captureError(error) {
  if (error.name === "NotAllowedError")
    return "Tab sharing was cancelled or blocked. Click Share video tab and allow the YouTube tab when you’re ready.";
  if (error.name === "NotReadableError")
    return "The browser could not read that tab. Check screen-recording permission in your system settings, then try again.";
  if (error.name === "AbortError")
    return "Tab sharing was interrupted. Your collected pages are still here; you can share the video tab again.";
  return (
    error.message || "Could not capture the video tab. Try sharing it again."
  );
}
