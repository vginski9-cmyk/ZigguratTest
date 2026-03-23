# Ziggurat Setup Guide

Everything you need to get Ziggurat running locally and deploy it.

---

## Prerequisites

- **Node.js** 18+ (recommended: 20 LTS or later)
- **npm** 9+ (comes with Node.js)
- **Anthropic API key** — Get one at [console.anthropic.com](https://console.anthropic.com/)

---

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd ZigguratTest/ziggurat
npm install
```

### 2. Create Environment File

Create a `.env.local` file in the `ziggurat/` directory:

```bash
# Required — your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Optional — password for review queue access
REVIEWER_PASSWORD=your-password-here
```

**How to create `.env.local` on Windows:**
1. Open Notepad
2. Type the contents above (with your real API key)
3. File → Save As
4. Navigate to the `ziggurat/` folder
5. Change "Save as type" to **All Files (*.\*)**
6. Type `.env.local` as the filename
7. Click Save

**How to create `.env.local` on Mac/Linux:**
```bash
cd ziggurat
echo "ANTHROPIC_API_KEY=sk-ant-api03-your-key-here" > .env.local
echo "REVIEWER_PASSWORD=your-password-here" >> .env.local
```

### 3. Initialize the Database

```bash
npm run db:push
```

This creates `ziggurat.db` in the project root with all required tables. The database is SQLite — no server setup needed.

### 4. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Starts Next.js in development mode with hot reload |
| Production build | `npm run build` | Compiles the application for production |
| Production server | `npm start` | Runs the compiled production build |
| Lint | `npm run lint` | Runs ESLint on the codebase |
| Generate migrations | `npm run db:generate` | Creates SQL migration files from schema changes |
| Apply migrations | `npm run db:push` | Applies schema changes directly to the database |

---

## Database Management

### Location

The SQLite database lives at `ziggurat/ziggurat.db`. It is created automatically when you run `npm run db:push` or when the app first starts.

### WAL Mode

The database runs in WAL (Write-Ahead Logging) mode, which enables concurrent reads during long-running agent calls. This is configured automatically in `src/lib/db/index.ts`.

You may see additional files alongside the database:
- `ziggurat.db-wal` — Write-ahead log
- `ziggurat.db-shm` — Shared memory file

These are normal and should not be deleted while the app is running.

### Resetting the Database

To start fresh:

```bash
cd ziggurat
rm ziggurat.db ziggurat.db-wal ziggurat.db-shm
npm run db:push
```

### Modifying the Schema

1. Edit `src/lib/db/schema.ts`
2. Run `npm run db:generate` to create migration files
3. Run `npm run db:push` to apply changes

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for Claude access |
| `REVIEWER_PASSWORD` | No | Static password for review queue access |

---

## API Cost Considerations

The app uses **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) which is the most cost-effective Claude model. Approximate costs per job description processed:

- **Agent 1** (context classification): ~$0.01-0.03 per run
- **Agent 2** (skill profiling): ~$0.02-0.05 per run

These are estimates. Actual costs depend on JD length and response complexity. Monitor your usage at [console.anthropic.com](https://console.anthropic.com/).

To use a higher-quality (and more expensive) model, change the `MODEL` constant in `src/lib/agents/invoke.ts`.

---

## Troubleshooting

### "ANTHROPIC_API_KEY is not set"

Your `.env.local` file is missing or not in the right directory. It must be at `ziggurat/.env.local` (same level as `package.json`).

### Agent calls timing out

Agent 1 has a 120-second timeout, Agent 2 has 180 seconds. If you're consistently hitting timeouts:
- Check your internet connection
- The Anthropic API may be experiencing high load
- Try a shorter job description to test

### "SQLITE_BUSY" errors

This can happen if multiple write operations compete. The WAL mode should prevent most cases. If persistent:
- Restart the dev server
- Delete the `.db-wal` and `.db-shm` files (only when the server is stopped)

### JSON parse errors from agents

Agent responses are sometimes truncated, especially from Agent 2 which produces large outputs. The system has built-in JSON repair logic. If it still fails:
- The retry logic will attempt Agent 2 again with fewer skills (6 instead of 10)
- If both attempts fail, check the server console for the raw response

### Build errors with better-sqlite3

`better-sqlite3` is a native Node.js module. If you get build errors:
```bash
npm rebuild better-sqlite3
```

On some systems you may need build tools:
- **macOS:** `xcode-select --install`
- **Ubuntu/Debian:** `sudo apt install build-essential python3`
- **Windows:** Install [windows-build-tools](https://github.com/nicedoc/windows-build-tools) or use WSL

---

## Production Deployment

### Build and Run

```bash
cd ziggurat
npm run build
npm start
```

The production server runs on port 3000 by default. Set the `PORT` environment variable to change it.

### Deployment Considerations

- **SQLite is single-server only.** If you need horizontal scaling, migrate to PostgreSQL (see Developer Guide).
- **The database file must persist.** Use a persistent volume if deploying to containers.
- **Set environment variables** in your hosting platform's dashboard rather than committing `.env.local`.
- **The `.env.local` file is gitignored** — it will not be committed to version control.

### Deploying to Vercel

Vercel does not support SQLite in production (serverless functions have ephemeral storage). Options:
1. Use [Turso](https://turso.tech/) (SQLite-compatible edge database) — requires changing the Drizzle driver
2. Migrate to PostgreSQL (Vercel Postgres, Neon, Supabase)
3. Use a traditional VPS (DigitalOcean, Railway, Render) where SQLite works fine

### Deploying to Railway / Render / Fly.io

These platforms support persistent storage and work well with SQLite:

1. Push your code to GitHub
2. Connect the repository to your platform
3. Set environment variables (`ANTHROPIC_API_KEY`, etc.)
4. Set the build command: `cd ziggurat && npm install && npm run db:push && npm run build`
5. Set the start command: `cd ziggurat && npm start`
6. Ensure persistent storage is attached for `ziggurat.db`
