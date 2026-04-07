# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Documentation First

**Before generating any code, Claude Code MUST first check the `/docs` directory for relevant documentation.** This includes design specs, API contracts, component guidelines, feature plans, or any other docs that apply to the task at hand. Code must align with what is documented there. If a relevant doc exists, follow it — do not infer or invent behavior that contradicts it.

- /docs/ui.md

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

This is a Next.js 16 App Router project (TypeScript) for an RSS reader, currently in early development.

**Stack:**
- **Framework:** Next.js 16 with App Router (`app/` directory)
- **Auth:** Clerk (`@clerk/nextjs`) — `ClerkProvider` wraps the app in `app/layout.tsx`; auth state drives `Show when="signed-in/out"` in the header
- **Database:** Neon (serverless PostgreSQL) via `@neondatabase/serverless`, accessed through Drizzle ORM
- **ORM:** Drizzle — schema defined in `db/schema.ts`, client singleton exported from `db/index.ts`
- **UI:** Tailwind CSS v4 + shadcn/ui (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`)

**Database schema** (`db/schema.ts`):
- `feeds` — RSS feed sources with fetch status, interval, and error tracking
- `user_subscriptions` — maps Clerk `userId` (text) to feed IDs
- `feed_items` — individual articles per feed, including `og_image_url` for OG image caching
- `keywords` — per-user keyword filters for article matching
- `fetch_logs` — audit log of each fetch run (success/failed/skipped, duration, article count)

Drizzle config points to `./db/schema.ts` and outputs migrations to `./drizzle/`.
