#!/bin/bash
# Daily Planner - Startup Script
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Activate venv if it exists, otherwise create it
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Kill any existing planner process on port 5050
lsof -ti:5050 | xargs kill -9 2>/dev/null

# Start the server in the background
python app.py &
SERVER_PID=$!

# Wait for server to be ready
for i in {1..20}; do
    if curl -s http://127.0.0.1:5050/ > /dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

# Open in default browser
open "http://127.0.0.1:5050"

# Keep script alive so launchd doesn't restart it
wait $SERVER_PID
