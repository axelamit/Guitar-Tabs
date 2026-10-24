import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { alphaTab } from "@coderline/alphatab-vite";
export default defineConfig({
  // GitHub project sites live under /<repository>/; other hosts can keep /.
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), alphaTab()],
  server: { host: "127.0.0.1" },
});
