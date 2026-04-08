# Data Mutations Standards

## Rule: Use `/data` Helper Functions

**ALL data mutations must be encapsulated in helper functions inside the `/data` directory.** No inline Drizzle calls in Server Actions or components.

- One file per domain area (e.g., `data/feeds.ts`, `data/keywords.ts`)
- Helper functions must use **Drizzle ORM** — do **NOT** use raw SQL (`db.execute`, template literals, `sql` tagged queries, etc.)
- Helper functions accept typed parameters — never raw `FormData` or untyped input

```ts
// data/feeds.ts — correct
import { db } from "@/db";
import { feeds, userSubscriptions } from "@/db/schema";

export async function subscribeUserToFeed(userId: string, feedId: string) {
  return db.insert(userSubscriptions).values({ userId, feedId });
}

export async function unsubscribeUserFromFeed(userId: string, feedId: string) {
  return db
    .delete(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.feedId, feedId),
      ),
    );
}
```

## Rule: Server Actions Only

**ALL data mutations must be performed via Server Actions.** Do not mutate data via:

- Route handlers (`app/api/...`)
- Client-side `fetch` / `axios` calls
- `useEffect` or event handlers that call an API directly

## Rule: Colocated `actions.ts` Files

Server Actions must live in a file named `actions.ts` colocated with the route or feature that uses them.

```
app/
  dashboard/
    _components/
      add-feed-dialog.tsx
    actions.ts        ← Server Actions for the dashboard
    page.tsx
  keywords/
    actions.ts        ← Server Actions for keywords
    page.tsx
```

Do not put all Server Actions in a single top-level file. Keep them scoped to the feature they belong to.

## Rule: Typed Parameters — No `FormData`

Server Action parameters must be explicitly typed. **Do NOT use `FormData` as a parameter type.**

```ts
// actions.ts — correct
"use server";

export async function subscribeFeed(params: { feedUrl: string }) { ... }
export async function deleteKeyword(params: { keywordId: string }) { ... }

// WRONG — untyped FormData
export async function subscribeFeed(formData: FormData) { ... }
```

## Rule: Validate All Arguments with Zod

**Every Server Action must validate its arguments using Zod** before doing anything else. Never trust input passed to a Server Action.

```ts
// actions.ts
"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { subscribeUserToFeed } from "@/data/feeds";

const SubscribeFeedSchema = z.object({
  feedUrl: z.string().url(),
});

export async function subscribeFeed(params: { feedUrl: string }) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const parsed = SubscribeFeedSchema.safeParse(params);
  if (!parsed.success) return { error: "Invalid input" };

  const { feedUrl } = parsed.data;
  // ... call /data helper
  await subscribeUserToFeed(userId, feedUrl);
}
```

## Rule: User Data Isolation — CRITICAL

Server Actions must always source `userId` from `auth()`. Never accept `userId` as a parameter from the caller.

```ts
// CORRECT — userId from auth()
export async function deleteKeyword(params: { keywordId: string }) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  await removeKeyword(userId, params.keywordId);
}

// WRONG — userId from the caller (untrusted)
export async function deleteKeyword(params: { userId: string; keywordId: string }) {
  await removeKeyword(params.userId, params.keywordId);
}
```

## Summary

| What | Rule |
|---|---|
| Where to put DB mutation logic | `/data` helper functions |
| How to query the DB | Drizzle ORM — no raw SQL |
| How to trigger mutations | Server Actions only |
| Where to put Server Actions | Colocated `actions.ts` next to the feature |
| Server Action parameter types | Explicit TypeScript types — no `FormData` |
| Input validation | Zod — every Server Action, always |
| User identity | Always from `auth()` — never from caller params |
