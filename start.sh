#!/usr/bin/env bash
# AdForge start — launches the local-sync sidecar + Next.js dev server.
# Reads PORT + ADFORGE_SYNC_PORT from .env.local (configured by install.sh).

set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "node_modules missing. Running install first..."
  bash install.sh
fi

mkdir -p data

# Load env defaults
PORT=3005
SYNC_PORT=3006

if [ -f .env.local ]; then
  P=$(grep -E '^PORT=' .env.local | head -1 | cut -d= -f2)
  [ -n "$P" ] && PORT="$P"
  SP=$(grep -E '^ADFORGE_SYNC_PORT=' .env.local | head -1 | cut -d= -f2)
  [ -n "$SP" ] && SYNC_PORT="$SP"
fi

echo "Starting AdForge..."
echo
echo "  Sidecar:  http://127.0.0.1:$SYNC_PORT             (local data sync to data/snapshot.json)"
echo "  Web app:  http://localhost:$PORT                  (open this in your browser)"
echo "            http://adforge.localhost:$PORT          (works in modern browsers, no setup)"
echo

# Start the sidecar in the background, capture PID
ADFORGE_SYNC_PORT="$SYNC_PORT" node scripts/local-sync.cjs >data/sync.log 2>&1 &
SYNC_PID=$!
echo "$SYNC_PID" > .adforge-sync.pid

# Brief pause so the sidecar is up before the app probes it
sleep 1

trap 'echo; echo "Stopping AdForge..."; kill $SYNC_PID 2>/dev/null || true; rm -f .adforge-sync.pid; exit 0' INT TERM

npx next dev -p "$PORT"

# If next exits cleanly, also kill the sidecar
kill $SYNC_PID 2>/dev/null || true
rm -f .adforge-sync.pid
