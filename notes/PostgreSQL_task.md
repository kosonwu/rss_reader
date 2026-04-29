And make this plan and PostgreSQL_task.md in notes/ to track the changes.                                                                              
# PostgreSQL Migration Task: Neon → Local Docker

## Goal
Replace Neon (serverless PostgreSQL) with a local PostgreSQL container (`pgvector/pgvector:pg17`) while keeping all features intact.

## Local DB Info
- Container: `rss_postgres`
- Host: `localhost:5432`
- User: `rss_user` / Password: `rss_password`
- Database: `rss_db`
- Compose file: `C:\Users\ZZ01M3858\postgres\docker-compose.yml`
- Container runtime: **Podman** (binary at `C:\Program Files\RedHat\Podman\podman.exe`)

---

## Checklist

- [x] **Step 1** — Start Docker/Podman container (`docker-compose up -d` in `C:\Users\ZZ01M3858\postgres`)
- [x] **Step 2** — Enable pgvector extension (was already enabled; confirmed with `CREATE EXTENSION IF NOT EXISTS vector`)
- [x] **Step 3** — Updated root `.env` → `DATABASE_URL=postgresql://rss_user:rss_password@localhost:5432/rss_db`
- [x] **Step 4** — Updated `app/fetcher/.env` → same `DATABASE_URL`
- [x] **Step 5** — Removed `@neondatabase/serverless`; added `pg@^8.20.0` + `@types/pg@^8.20.0`
- [x] **Step 6** — Updated `db/index.ts`: switched from `drizzle-orm/neon-http` → `drizzle-orm/node-postgres` with `pg.Pool`
- [x] **Step 7** — Ran `npx drizzle-kit migrate` → all 15 migrations applied successfully
- [x] **Step 8** — Migrated data from Neon: 15 feeds, 6,122 feed items, 21 subscriptions, 30,017 entity tags
- [x] **Step 9** — Created this tracking file

---

## Data Migration Notes (Step 8)
- Used `pg_dump` from inside the `rss_postgres` Podman container to dump Neon data
- Stripped Neon-specific `\restrict` header line before restoring
- Restored with `podman exec -i rss_postgres psql ...` via stdin pipe
- Only expected error: `__drizzle_migrations` duplicate key (already populated by Step 7) — harmless

---

## Key File Changes
| File | Change |
|---|---|
| `db/index.ts` | `drizzle-orm/neon-http` → `drizzle-orm/node-postgres` with `pg.Pool` |
| `package.json` | Removed `@neondatabase/serverless`, added `pg` + `@types/pg` |
| `.env` | Updated `DATABASE_URL` to local connection string |
| `app/fetcher/.env` | Updated `DATABASE_URL` to local connection string |

---

## New DATABASE_URL
```
postgresql://rss_user:rss_password@localhost:5432/rss_db
```

---

## Verification Commands
```bash
# Start the container (if not already running)
cd C:\Users\ZZ01M3858\postgres && docker-compose up -d

# Check row counts
podman exec rss_postgres psql -U rss_user -d rss_db -c "SELECT COUNT(*) FROM feeds; SELECT COUNT(*) FROM feed_items;"

# Start Next.js
npm run dev

# Browse local DB tables
npx drizzle-kit studio

# Start Python fetcher
cd app/fetcher && uv run uvicorn main:app --reload
```

## Container Management
```bash
# Stop container
podman stop rss_postgres

# Start container
podman start rss_postgres

# Or via compose
cd C:\Users\ZZ01M3858\postgres
docker-compose up -d    # start
docker-compose down     # stop (data preserved in volume)
```
