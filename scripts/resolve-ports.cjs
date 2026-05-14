#!/usr/bin/env node
/**
 * AdForge port resolver — runs before the sidecar starts to figure out which
 * ports THIS install should use, given that other AdForge installs (or
 * unrelated processes) may already occupy the default ports.
 *
 * Decision logic:
 *   1. Read PORT + ADFORGE_SYNC_PORT from .env.local (or default 3005/3006).
 *   2. Probe ADFORGE_SYNC_PORT for /health.
 *        - Responds AND has "ingest" AND cwd matches this install   → "reuse"
 *        - Responds AND has "ingest" AND cwd is a different folder  → shift to a free port pair
 *        - Responds AND missing "ingest" AND cwd matches this folder → "restart_stale"
 *        - Responds AND missing "ingest" AND cwd differs            → shift (it's some other install's stale sidecar — leave it alone)
 *        - No response BUT port is socket-bound by something else   → shift
 *        - No response AND port is free                             → "start"
 *
 * When shifting, .env.local is updated atomically with the new port pair so
 * downstream code (AdForge.bat / launcher / web app) all read the same values.
 *
 * Stdout is a single line: ACTION=<verb>  (reuse | restart_stale | start | shifted | error)
 * The caller (AdForge.bat / AdForge.command) parses that one token and reacts.
 *
 * Zero dependencies — Node stdlib only.
 */
const net = require("net");
const fs = require("fs");
const path = require("path");
const http = require("http");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const ENV_LOCAL = path.join(PROJECT_ROOT, ".env.local");

function readEnv() {
  const out = { PORT: "3005", ADFORGE_SYNC_PORT: "3006" };
  if (!fs.existsSync(ENV_LOCAL)) return out;
  for (const line of fs.readFileSync(ENV_LOCAL, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function writeEnv(updates) {
  const cur = readEnv();
  const next = { ...cur, ...updates };
  const body = [
    "# AdForge configuration (auto-resolved by scripts/resolve-ports.cjs)",
    `PORT=${next.PORT}`,
    `ADFORGE_SYNC_PORT=${next.ADFORGE_SYNC_PORT}`,
  ].join("\n") + "\n";
  fs.writeFileSync(ENV_LOCAL, body, "utf8");
}

function probeHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port, path: "/health", timeout: 1500 },
      (res) => {
        let body = "";
        res.on("data", (c) => { body += c; });
        res.on("end", () => {
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { try { req.destroy(); } catch {} resolve(null); });
  });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "127.0.0.1");
  });
}

async function findFreePair(startFrom) {
  // Start at startFrom (rounded up to even), walk in pairs. The web port is
  // even, the sync port is odd — keeps the relationship obvious.
  let p = startFrom + (startFrom % 2 === 0 ? 0 : 1);
  const max = p + 2000;
  while (p < max) {
    if ((await isPortFree(p)) && (await isPortFree(p + 1))) {
      return { web: p, sync: p + 1 };
    }
    p += 2;
  }
  return null;
}

function normalize(p) {
  return path.normalize(p).replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "");
}

(async () => {
  try {
    const env = readEnv();
    const desiredWeb = Number(env.PORT) || 3005;
    const desiredSync = Number(env.ADFORGE_SYNC_PORT) || 3006;

    const health = await probeHealth(desiredSync);
    const ourCwd = normalize(PROJECT_ROOT);

    if (health) {
      const caps = Array.isArray(health.capabilities) ? health.capabilities : [];
      const hasIngest = caps.includes("ingest");
      const theirCwd = health.cwd ? normalize(health.cwd) : null;
      const sameCwd = theirCwd && theirCwd === ourCwd;

      if (hasIngest && sameCwd) {
        // It's MY sidecar with the right code already running.
        process.stdout.write(`ACTION=reuse PORT=${desiredWeb} SYNC=${desiredSync}\n`);
        return;
      }
      if (!hasIngest && sameCwd) {
        // It's MY sidecar but it's stale (predates /ingest). Caller will quit + restart.
        process.stdout.write(`ACTION=restart_stale PORT=${desiredWeb} SYNC=${desiredSync}\n`);
        return;
      }
      // It's SOMEONE ELSE'S sidecar on the port we wanted (theirCwd mismatch,
      // OR theirCwd missing because they're running an older sidecar that
      // doesn't return cwd). Either way, leave them alone and pick a new pair.
      const pair = await findFreePair(Math.max(3010, desiredSync + 2));
      if (!pair) {
        process.stdout.write(`ACTION=error REASON=no_free_port_pair\n`);
        return;
      }
      writeEnv({ PORT: String(pair.web), ADFORGE_SYNC_PORT: String(pair.sync) });
      process.stdout.write(`ACTION=shifted PORT=${pair.web} SYNC=${pair.sync} REASON=another_install_on_${desiredSync}\n`);
      return;
    }

    // No response. Check whether the port is genuinely free.
    const syncFree = await isPortFree(desiredSync);
    const webFree = await isPortFree(desiredWeb);
    if (syncFree && webFree) {
      process.stdout.write(`ACTION=start PORT=${desiredWeb} SYNC=${desiredSync}\n`);
      return;
    }

    // One or both ports are bound by something non-AdForge (a different web app,
    // a stalled process, etc.). Shift to the next free pair.
    const pair = await findFreePair(Math.max(3010, desiredSync + 2));
    if (!pair) {
      process.stdout.write(`ACTION=error REASON=no_free_port_pair\n`);
      return;
    }
    writeEnv({ PORT: String(pair.web), ADFORGE_SYNC_PORT: String(pair.sync) });
    process.stdout.write(`ACTION=shifted PORT=${pair.web} SYNC=${pair.sync} REASON=ports_bound_by_other_process\n`);
  } catch (e) {
    process.stdout.write(`ACTION=error REASON=${(e && e.message ? e.message : "unknown").replace(/\s+/g, "_")}\n`);
  }
})();
