#!/usr/bin/env bash
# AdForge — add or remove the  adforge.local  hosts entry.
# Needs sudo.
#
# Usage:
#   sudo bash scripts/set-domain.sh           # adds the entry
#   sudo bash scripts/set-domain.sh remove    # removes the entry

set -e

HOSTS="/etc/hosts"
ENTRY="127.0.0.1   adforge.local   # AdForge local"
ACTION="${1:-add}"

if [ "$EUID" -ne 0 ]; then
  echo
  echo "[ERROR] This script needs root to edit $HOSTS."
  echo "Run again with sudo:"
  echo "   sudo bash scripts/set-domain.sh $1"
  echo
  exit 1
fi

if [ "$ACTION" = "remove" ]; then
  if grep -q "adforge.local" "$HOSTS"; then
    cp "$HOSTS" "$HOSTS.bak"
    sed -i.bak '/adforge\.local/d' "$HOSTS" 2>/dev/null || sed -i '' '/adforge\.local/d' "$HOSTS"
    echo
    echo "Removed adforge.local from $HOSTS (backup: $HOSTS.bak)"
    echo
  else
    echo
    echo "adforge.local is not in $HOSTS. Nothing to do."
    echo
  fi
  exit 0
fi

# Add path
if grep -q "adforge.local" "$HOSTS"; then
  echo
  echo "adforge.local is ALREADY in $HOSTS. Nothing to do."
  echo
  exit 0
fi

echo "" >> "$HOSTS"
echo "$ENTRY" >> "$HOSTS"

echo
echo "Added:  $ENTRY"
echo
echo "Now run AdForge on port 80 to use  http://adforge.local/"
echo "Edit .env.local and set  PORT=80,  then run start.sh with sudo."
echo
echo "Or keep your current port and use  http://adforge.local:<your-port>/"
echo
