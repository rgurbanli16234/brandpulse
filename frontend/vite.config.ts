// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Local dev runs two processes: Vite on :8080 and the FastAPI backend on :8001.
// The frontend calls the API with a same-origin base ("/api/v1"), so in dev every
// request would otherwise hit Vite and 404. Proxy /api to the backend here; set
// VITE_API_PROXY_TARGET to point at a different backend host/port.
const API_PROXY_TARGET = process.env["VITE_API_PROXY_TARGET"] ?? "http://127.0.0.1:8001";

export default defineConfig({
  vite: {
    server: {
      proxy: {
        "/api": { target: API_PROXY_TARGET, changeOrigin: true },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Static SPA build: prerender a single shell to index.html so the app can be served
    // as plain static files (by FastAPI in production) instead of a Node SSR server.
    spa: {
      enabled: true,
      maskPath: "/",
      prerender: { outputPath: "/index" },
    },
  },
});
