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
- `/dashboard/fetch_tag_extraction` — KeyBERT tag extraction batch run log viewer
- `/dashboard/fetch_ner` — NER batch run log viewer
- `/dashboard/health` — fetcher service health status

**Next.js API routes** (`app/api/`):
- `/api/health` — health check
- `/api/status` — fetcher status proxy
- `/api/feed-items-count` — returns unread feed item counts
- `/api/search` — semantic search proxy; forwards query to fetcher `/embed/query`, enriches results with per-user read/bookmark state

### Python Fetcher Service (`app/fetcher/`)

Standalone FastAPI service that polls the database and fetches RSS feeds on schedule.

**Stack:** FastAPI + APScheduler + asyncpg + httpx + pydantic-settings

**How it works:**
- A single APScheduler coordinator job runs every `FETCH_COORDINATOR_INTERVAL` seconds (default 60)
- It queries the DB for feeds that are due, then spawns asyncio tasks per feed
- In-flight tracking prevents double-fetching the same feed concurrently
- A separate embedding job runs every `EMBEDDING_COORDINATOR_INTERVAL` seconds; it batch-encodes up to 10 unembedded `feed_items` using `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384-dim) and writes title + content vectors back to the DB; each run is logged to `fetch_embedding_logs`
- A tag extraction job runs every `TAG_EXTRACTION_COORDINATOR_INTERVAL` seconds; it uses KeyBERT (sharing the same SentenceTransformer model) to extract up to 7 topic tags per untagged `feed_item` and writes `tags`, `tagsScores`, `tagsModel`, `tagsExtractedAt` back to the DB; each run is logged to `fetch_tag_extraction_logs`; for zh-TW feeds, CKIP word segmentation is applied before KeyBERT to produce meaningful candidates
- A NER job runs every `NER_COORDINATOR_INTERVAL` seconds; it uses CKIP `CkipNerChunker` (albert-base) for zh-TW items and spaCy `en_core_web_sm` for others; entity labels are normalised to a unified OntoNotes namespace; results are written to `nerEntities`, `nerModel`, `nerExtractedAt` on `feed_items`; each run is logged to `fetch_ner_logs`
- After each NER or tag extraction run, a `display_tags` pass merges NER entities and KeyBERT tags using a scoring formula (NER type weights + title-match bonus) into `displayTags`, `displayTagsMeta`, `displayTagsUpdatedAt` on `feed_items`, and upserts entries into `entity_tag_index`

**Endpoints:**
- `GET /health` — liveness check
- `GET /status` — scheduler state + active feed count
- `POST /fetch/{feed_id}` — manually trigger a fetch for one feed
- `POST /embed/query` — semantic search: accepts `{ query, user_id, limit }`, returns feed items ranked by cosine similarity to the query embedding

**Env vars:** `DATABASE_URL`, `FETCH_COORDINATOR_INTERVAL` (seconds, default 60), `EMBEDDING_COORDINATOR_INTERVAL` (seconds, default 90), `TAG_EXTRACTION_COORDINATOR_INTERVAL` (seconds, default 60), `NER_COORDINATOR_INTERVAL` (seconds, default 60), `EMBEDDING_MODEL` (default `paraphrase-multilingual-MiniLM-L12-v2`), `NER_CKIP_MODEL` (default `albert-base`), `NER_SPACY_MODEL` (default `en_core_web_sm`), `LOG_LEVEL` (default INFO)

**Run with uv:**
```bash
cd app/fetcher
uv run uvicorn main:app --reload
```

### Database schema (`db/schema.ts`)

- `feeds` — RSS feed sources with fetch status, interval, error tracking, and `language` enum (`en` / `zh-TW`)
- `user_subscriptions` — maps Clerk `userId` (text) to feed IDs; has `displayName` and `isActive`
- `feed_items` — individual articles per feed, including `og_image_url` for OG image caching, `content_source` enum (`feed_full` / `extracted` / `jina` / `summary_only`) for tracking extraction success rate, pgvector embedding fields (`embeddingContent`, `embeddingTitle` — 384-dim; `embeddingModel`, `embeddedAt` — null means not yet embedded), KeyBERT tag fields (`tags` text[], `tagsScores` real[], `tagsModel`, `tagsExtractedAt` — null means not yet extracted), NER fields (`nerEntities` jsonb `[{text, type}]` in unified OntoNotes namespace, `nerModel`, `nerExtractedAt`), and merged display tag fields (`displayTags` text[], `displayTagsMeta` jsonb `[{tag, type, score}]`, `displayTagsUpdatedAt`)
- `keywords` — per-user keyword filters; has `isCaseSensitive` flag
- `fetch_logs` — audit log of each fetch run (success/failed/skipped, duration, article count)
- `fetch_embedding_logs` — audit log of each embedding batch run (status, items_fetched/embedded/skipped, duration, model_name)
- `fetch_tag_extraction_logs` — audit log of each KeyBERT tag extraction batch run (status, items_fetched/tagged/skipped, duration, model_name)
- `fetch_ner_logs` — audit log of each NER batch run (status, items_fetched/tagged/skipped, duration, model_name)
- `entity_tag_index` — denormalised index of NER entities and display tags per feed item; supports entity trend queries; unique on `(feedItemId, entityTextLower)`
- `user_read_items` — per-user read tracking; unique on `(userId, feedItemId)`
- `user_bookmarks` — per-user bookmarks; unique on `(userId, feedItemId)`

Drizzle config points to `./db/schema.ts` and outputs migrations to `./drizzle/`.
