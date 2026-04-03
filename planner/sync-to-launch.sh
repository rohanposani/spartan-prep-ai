#!/bin/bash
# Sync planner source to ~/.planner-app (used by LaunchAgent)
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.planner-app"
mkdir -p "$DEST"
cp "$SRC/app.py" "$SRC/database.py" "$DEST/"
cp -R "$SRC/templates" "$SRC/static" "$DEST/"
echo "Synced planner to $DEST"
