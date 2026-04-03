# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Spartan Prep AI + Daily Planner

An SJSU exam preparation assistant with AI-powered study tools, plus a personal daily planner app. Two independent applications sharing one repo.

## Running

```bash
# Spartan Prep AI (main app) — Node.js/Express
npm install
OPENAI_API_KEY=sk-... npm start          # http://localhost:3000

# Planner app — Flask/Python
cd planner
source venv/bin/activate
pip install -r requirements.txt
python app.py                             # http://127.0.0.1:5050
# OR use the startup script (creates venv, installs deps, opens browser):
bash planner/start.sh
```

Node binary is at `/opt/homebrew/bin/node` (Homebrew install, not on default PATH for some tools).

## Architecture Overview

### Spartan Prep AI (`server.js` + `spartanstudy.html`)
- **Backend**: Express app in `api/index.js` (Vercel serverless) with `/api/chat` proxy to OpenAI `gpt-4.1-mini` (temperature 0.7, max 4096 tokens, 10MB request limit), `/api/generate-notes` for AI study notes, and a `/health` endpoint. `server.js` is a thin wrapper for local dev only.
- **Frontend**: Single-file React app (`spartanstudy.html`, ~1630 lines) loaded via CDN (React 18, Babel, pdf.js 3.11.174, mammoth.js 1.6.0, jszip 3.10.1). Supports PDF/DOC/PPT upload and AI-driven quiz generation, flashcards, content simplification, and chat.
- **Dependencies**: `express ^5.2.1`, Node >= 18.
- **Styling**: SJSU-branded colors (blue `#0055A2`, gold `#E5A823`).

### Planner (`planner/`)
- **Backend**: Flask app (`app.py`) with REST API for tasks, journaling, and month summaries.
- **Database**: SQLite at `~/.planner-app/planner.db` (WAL mode). Two tables: `tasks` (title, due_time, date, completed, color) and `journal` (date, question, entry). Schema in `database.py`.
- **Frontend**: Vanilla JS (`static/app.js`) + `templates/index.html` + `static/style.css`. Two views: Day view (timeline + journal) and Month view (calendar grid + day detail panel). No build step.
- **API routes**: `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/<id>`, `GET/POST /api/journal`, `GET /api/month?year=&month=`.
- **Journal**: 31 rotating daily prompts assigned by `day_of_year % 31` in `database.py`.
- **Reminders**: Browser Notification API — fires 10 min before and at task due time.
- **Deployment**: `sync-to-launch.sh` copies source to `~/.planner-app/` for the macOS LaunchAgent (`~/Library/LaunchAgents/com.planner.daily.plist`) which runs `start.sh` on login. After editing planner code, run `bash planner/sync-to-launch.sh` to update the deployed copy.
- **Dependencies**: `flask==3.1.0`, Python venv in `planner/venv/`.
- **Styling**: Green monotone theme (`--green-500: #2d6a4f`).

### Other files
- `Spartan_Prep_AI_Process_Documentation.docx` / `Spartan_Prep_AI_Update_1_Documentation.docx` — project documentation.

## Key Config

- `OPENAI_API_KEY` environment variable required for the main app's AI features.
- Planner DB lives at `~/.planner-app/planner.db` — not in the repo directory. A `planner/planner.db` may exist locally but the running app uses the home-directory copy.
- `.gitignore` excludes `node_modules/`, `.DS_Store`, `.env`. Note: `planner/venv/` is not gitignored — avoid committing it.
- Planner LaunchAgent: `launchctl load ~/Library/LaunchAgents/com.planner.daily.plist` (unload to disable).

## Testing

```bash
# Spartan Prep AI health check
curl http://localhost:3000/health

# Planner API smoke test
curl http://127.0.0.1:5050/api/tasks?date=$(date +%Y-%m-%d)
curl http://127.0.0.1:5050/api/month?year=$(date +%Y)\&month=$(date +%m)

# Check planner DB
sqlite3 ~/.planner-app/planner.db ".tables"
```
