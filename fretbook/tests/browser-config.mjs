import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const macChrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const browserOptions = {
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : existsSync(macChrome)
      ? { executablePath: macChrome }
      : {}),
  args: ["--autoplay-policy=no-user-gesture-required"],
};
export const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:5173/";
export const artifact = (name) => join(tmpdir(), name);
