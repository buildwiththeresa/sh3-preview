import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Project Pages URL: https://<user>.github.io/sh3-preview/
  base: process.env.GITHUB_PAGES === "true" ? "/sh3-preview/" : "/",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
