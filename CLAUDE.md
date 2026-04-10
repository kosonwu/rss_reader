# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Documentation First

**Before generating any code, Claude Code MUST first check the `/docs` directory for relevant documentation.** This includes design specs, API contracts, component guidelines, feature plans, or any other docs that apply to the task at hand. Code must align with what is documented there. If a relevant doc exists, follow it — do not infer or invent behavior that contradicts it.

- /docs/ui.md
- /docs/data-fetching.md
- /docs/auth.md
- /docs/data-mutations.md

## Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

### Database (Drizzle + Neon)

```bash
npx drizzle-kit generate   # Generate migrations from schema changes
npx drizzle-kit migrate    # Apply migrations to the database
npx drizzle-kit studio     # Open Drizzle Studio (DB browser)
```

Requires `DATABASE_URL` environment variable pointing to a Neon PostgreSQL instance.

## Architecture

This project has two services:
1. **Next.js web app** — the main frontend + API
2. **Python fetcher service** (`app/fetcher/`) — background RSS fetch worker

### Next.js Web App

**Stack:**
- **Framework:** Next.js 16 with App Router (`app/` directory)
- **Auth:** Clerk (`@clerk/nextjs`) — `ClerkProvider` wraps the app in `app/layout.tsx`; auth state drives `Show when="signed-in/out"` in the header
- **Database:** Neon (serverless PostgreSQL) via `@neondatabase/serverless`, accessed through Drizzle ORM
- **ORM:** Drizzle — schema defined in `db/schema.ts`, client singleton exported from `db/index.ts`
- **UI:** Tailwind CSS v4 + shadcn/ui (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`)

**Dashboard pages** (`app/dashboard/`):
- `/dashboard` — main feed reader
- `/dashboard/feeds` — manage RSS feeds
- `/dashboard/subscriptions` — manage subscriptions
- `/dashboard/keywords` — keyword filters
- `/dashboard/fetch` — manual fetch trigger UI
- `/dashboard/health` — fetcher service health status

**Next.js API routes** (`app/api/`):
- `/api/health` — health check
- `/api/status` — fetcher status proxy

### Python Fetcher Service (`app/fetcher/`)

Standalone FastAPI service that polls the database and fetches RSS feeds on schedule.

**Stack:** FastAPI + APScheduler + asyncpg + httpx + pydantic-settings

**How it works:**
- A single APScheduler coordinator job runs every `FETCH_COORDINATOR_INTERVAL` seconds (default 60)
- It queries the DB for feeds that are due, then spawns asyncio tasks per feed
- In-flight tracking prevents double-fetching the same feed concurrently

**Endpoints:**
- `GET /health` — liveness check
- `GET /status` — scheduler state + active feed count
- `POST /fetch/{feed_id}` — manually trigger a fetch for one feed

**Env vars:** `DATABASE_URL`, `FETCH_COORDINATOR_INTERVAL` (seconds, default 60), `LOG_LEVEL` (default INFO)

**Run with uv:**
```bash
cd app/fetcher
uv run uvicorn main:app --reload
```

### Database schema (`db/schema.ts`)

- `feeds` — RSS feed sources with fetch status, interval, and error tracking
- `user_subscriptions` — maps Clerk `userId` (text) to feed IDs; has `displayName` and `isActive`
- `feed_items` — individual articles per feed, including `og_image_url` for OG image caching
- `keywords` — per-user keyword filters; has `isCaseSensitive` flag
- `fetch_logs` — audit log of each fetch run (success/failed/skipped, duration, article count)

Drizzle config points to `./db/schema.ts` and outputs migrations to `./drizzle/`.
