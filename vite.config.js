import { defineConfig } from "vite";

// Relative base so the production build is portable (works from any subfolder
// or over `npx serve dist`).
export default defineConfig({
  base: "./",
  build: {
    assetsInlineLimit: 0, // keep bg.mp4 as a real file, never inlined
  },
});
