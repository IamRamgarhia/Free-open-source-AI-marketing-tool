/**
 * Runtime environment helpers.
 *
 * OpenAdKit ships two deployment modes:
 *
 *   1. **Local** — user installs and runs the Next dev/start server +
 *      `scripts/local-sync.cjs` sidecar on 127.0.0.1. Sidecar provides
 *      `/ingest` (CORS-free URL reader), `/snapshot` (disk persistence),
 *      `/diagnostics`, etc.
 *
 *   2. **Hosted** — same Next app deployed to Vercel/Cloudflare/Netlify
 *      with no sidecar. URL is something like openadkit.example.com.
 *      Storage is IndexedDB-only. URL ingest falls back to the Next API
 *      route /api/ingest (server-side fetch) plus jina + allorigins.
 *
 * `isHostedMode()` returns true when running from a non-loopback host.
 * Every sidecar-dependent code path checks this so the hosted version
 * never makes pointless 127.0.0.1 fetches (which would slow down every
 * URL ingest and leak "is the launcher running?" errors into the UI).
 *
 * The `.localhost` suffix check matches the custom-domain pattern
 * documented in docs/CUSTOM_DOMAIN.md so dev users on e.g.
 * `openadkit.localhost` still get sidecar features.
 */

export function isHostedMode(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h !== "localhost" && h !== "127.0.0.1" && !h.endsWith(".localhost");
}

export function isLocalMode(): boolean {
  return !isHostedMode();
}
