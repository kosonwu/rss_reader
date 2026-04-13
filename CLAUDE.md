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
- `/dashboard/bookmarks` — bookmarked articles
- `/dashboard/fetch` — manual fetch trigger UI
- `/dashboard/fetch_embedding` — embedding batch run log viewer
- `/dashboard/health` — fetcher service health status

**Next.js API routes** (`app/api/`):
- `/api/health` — health check
- `/api/status` — fetcher status proxy
- `/api/feed-items-count` — returns unread feed item counts

### Python Fetcher Service (`app/fetcher/`)

Standalone FastAPI service that polls the database and fetches RSS feeds on schedule.

**Stack:** FastAPI + APScheduler + asyncpg + httpx + pydantic-settings

**How it works:**
- A single APScheduler coordinator job runs every `FETCH_COORDINATOR_INTERVAL` seconds (default 60)
- It queries the DB for feeds that are due, then spawns asyncio tasks per feed
- In-flight tracking prevents double-fetching the same feed concurrently
- A separate embedding job runs every `EMBEDDING_COORDINATOR_INTERVAL` seconds; it batch-encodes up to 10 unembedded `feed_items` using `sentence-transformers/all-MiniLM-L6-v2` (384-dim) and writes title + content vectors back to the DB; each run is logged to `fetch_embedding_logs`

**Endpoints:**
- `GET /health` — liveness check
- `GET /status` — scheduler state + active feed count
- `POST /fetch/{feed_id}` — manually trigger a fetch for one feed

**Env vars:** `DATABASE_URL`, `FETCH_COORDINATOR_INTERVAL` (seconds, default 60), `EMBEDDING_COORDINATOR_INTERVAL` (seconds), `LOG_LEVEL` (default INFO)

**Run with uv:**
```bash
cd app/fetcher
uv run uvicorn main:app --reload
```

### Database schema (`db/schema.ts`)

- `feeds` — RSS feed sources with fetch status, interval, error tracking, and `language` enum (`en` / `zh-TW`)
- `user_subscriptions` — maps Clerk `userId` (text) to feed IDs; has `displayName` and `isActive`
- `feed_items` — individual articles per feed, including `og_image_url` for OG image caching, `content_source` enum (`feed_full` / `extracted` / `jina` / `summary_only`) for tracking extraction success rate, and pgvector embedding fields (`embeddingContent`, `embeddingTitle` — 384-dim; `embeddingModel`, `embeddedAt` — null means not yet embedded)
- `keywords` — per-user keyword filters; has `isCaseSensitive` flag
- `fetch_logs` — audit log of each fetch run (success/failed/skipped, duration, article count)
- `fetch_embedding_logs` — audit log of each embedding batch run (status, items_fetched/embedded/skipped, duration, model_name)
- `user_read_items` — per-user read tracking; unique on `(userId, feedItemId)`
- `user_bookmarks` — per-user bookmarks; unique on `(userId, feedItemId)`

Drizzle config points to `./db/schema.ts` and outputs migrations to `./drizzle/`.
