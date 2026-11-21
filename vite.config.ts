import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Prefix root-absolute url(/…) in CSS so GitHub Pages /sh3-preview/ works. */
function prefixCssPublicUrls(base: string): Plugin {
  return {
    name: "prefix-css-public-urls",
    transform(code, id) {
      if (base === "/" || !id.includes(".css")) return null;
      const root = base.replace(/\/$/, "");
      return {
        code: code.replace(/url\(\s*\/(?!\/)/g, `url(${root}/`),
        map: null,
      };
    },
  };
}

const base = process.env.GITHUB_PAGES === "true" ? "/sh3-preview/" : "/";

export default defineConfig({
  base,
  plugins: [react(), prefixCssPublicUrls(base)],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
