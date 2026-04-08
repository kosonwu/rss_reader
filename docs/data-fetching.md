# Data Fetching Standards

## Rule: Server Components Only

**ALL data fetching must be done exclusively via Server Components.** No exceptions.

Do NOT fetch data via:
- Route handlers (`app/api/...`)
- Client components (`"use client"`)
- `useEffect` + `fetch`
- SWR, React Query, or any client-side fetching library
- `getServerSideProps` or any Pages Router pattern

If you need data in a Client Component, fetch it in a Server Component parent and pass it down as props.

## Rule: Use `/data` Helper Functions

All database queries must be encapsulated in helper functions inside the `/data` directory.

- One file per domain area (e.g., `data/feeds.ts`, `data/feed-items.ts`, `data/keywords.ts`)
- Server Components import and call these helpers directly — no inline Drizzle queries in component files
- Helper functions must use **Drizzle ORM** to query the database — do **NOT** use raw SQL (`db.execute`, template literals, `sql` tagged queries, etc.)

```ts
// data/feeds.ts — correct
import { db } from "@/db";
import { feeds, userSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getUserFeeds(userId: string) {
  return db
    .select()
    .from(feeds)
    .innerJoin(userSubscriptions, eq(userSubscriptions.feedId, feeds.id))
    .where(eq(userSubscriptions.userId, userId));
}
```

## Rule: User Data Isolation — CRITICAL

A logged-in user must only ever be able to access their own data. This is a strict security requirement.

**Every** helper function that returns user-specific data must:

1. Accept `userId` as a parameter (sourced from `auth()` in the calling Server Component)
2. Filter all queries by that `userId` — never return data for all users
3. Never accept a `userId` from client-supplied input (URL params, request body, etc.) without validating it matches the authenticated user

```ts
// app/dashboard/page.tsx — correct pattern
import { auth } from "@clerk/nextjs/server";
import { getUserFeeds } from "@/data/feeds";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null; // or redirect to sign-in

  const feeds = await getUserFeeds(userId); // userId comes from auth(), never from params
  return <FeedList feeds={feeds} />;
}
```

**Never** do this:

```ts
// WRONG — userId comes from an untrusted source
const feeds = await getUserFeeds(params.userId);

// WRONG — no userId filter, returns all users' data
export async function getAllFeeds() {
  return db.select().from(feeds);
}
```

## Summary

| What | Rule |
|---|---|
| Where to fetch data | Server Components only |
| Where to put DB queries | `/data` helper functions |
| How to query the DB | Drizzle ORM — no raw SQL |
| User data access | Always filter by `userId` from `auth()` |
