#!/usr/bin/env bash
# OpenAdKit start — starts sidecar + web app, opens browser to the app
# (NOT the control panel). The sidecar auto-spawns Next dev on boot, so
# this script just waits for both to be reachable then opens one tab.

set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "node_modules missing. Running install first..."
  bash install.sh
fi

mkdir -p data

# Resolve ports — prefer values that were already picked by the launcher
# (passed in env), fall back to .env.local, then to legacy defaults.
SYNC_PORT="${ADFORGE_SYNC_PORT:-}"
WEB_PORT="${PORT:-}"
if [ -z "$SYNC_PORT" ] && [ -f .env.local ]; then
  SP=$(grep -E '^ADFORGE_SYNC_PORT=' .env.local | head -1 | cut -d= -f2)
  [ -n "$SP" ] && SYNC_PORT="$SP"
fi
if [ -z "$WEB_PORT" ] && [ -f .env.local ]; then
  WP=$(grep -E '^PORT=' .env.local | head -1 | cut -d= -f2)
  [ -n "$WP" ] && WEB_PORT="$WP"
fi
SYNC_PORT="${SYNC_PORT:-41574}"
WEB_PORT="${WEB_PORT:-41573}"

echo
echo "=================================================="
echo " Starting OpenAdKit (first run takes 20-40s for Next compile)"
echo "=================================================="
echo
echo "  Web app (your tools):  http://127.0.0.1:$WEB_PORT/"
echo "  Control panel:         http://127.0.0.1:$SYNC_PORT/"
echo
echo "  Press Ctrl+C to shut down."
echo

# Cross-platform "open URL in default browser"
open_url() {
  local url="$1"
  if   command -v open       >/dev/null 2>&1; then open "$url" &       # macOS
  elif command -v xdg-open   >/dev/null 2>&1; then xdg-open "$url" &   # Linux
  elif command -v wslview    >/dev/null 2>&1; then wslview "$url" &    # WSL
  else echo "(open this URL manually: $url)"; fi
}

# Background watcher: wait for the WEB app (not just the sidecar) to be
# reachable, then open the browser to it directly. First-run Next dev
# compile can take 30-40s; we wait up to 90s. If it doesn't come up in
# that window, fall back to the control panel so the user can see logs.
(
  for i in $(seq 1 30); do
    if curl -sf -o /dev/null --max-time 1 "http://127.0.0.1:$SYNC_PORT/health"; then break; fi
    sleep 0.5
  done
  for i in $(seq 1 120); do
    if curl -sf -o /dev/null --max-time 1 "http://127.0.0.1:$WEB_PORT/"; then
      echo "[openadkit] web app ready at http://127.0.0.1:$WEB_PORT/"
      open_url "http://127.0.0.1:$WEB_PORT/"
      exit 0
    fi
    sleep 0.75
  done
  echo "[openadkit] web app didn't respond within 90s — opening control panel"
  open_url "http://127.0.0.1:$SYNC_PORT/"
) &

# Run the sidecar in the foreground (it serves the launcher + auto-spawns Next)
trap 'echo; echo "Stopping OpenAdKit..."; exit 0' INT TERM
ADFORGE_SYNC_PORT="$SYNC_PORT" PORT="$WEB_PORT" node scripts/local-sync.cjs
