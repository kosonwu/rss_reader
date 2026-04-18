# Auth Coding Standards

## Provider

**This app uses Clerk for all authentication.** Do not use any other auth library (NextAuth, Auth.js, custom sessions, etc.).

- `ClerkProvider` wraps the app in `app/layout.tsx` — do not add or move it
- All auth state, user identity, and session management is handled exclusively by Clerk

## Getting the Current User

**In Server Components and Server Actions**, use `auth()` from `@clerk/nextjs/server`:

```ts
import { auth } from "@clerk/nextjs/server";

const { userId } = await auth();
if (!userId) return null; // or redirect("/sign-in")
```

**In Client Components**, use the `useAuth` or `useUser` hooks from `@clerk/nextjs`:

```ts
import { useAuth } from "@clerk/nextjs";

const { userId, isSignedIn } = useAuth();
```

Never access the user ID from URL params, cookies, request bodies, or any client-supplied source. Always source it from Clerk.

## Route Protection

Use Clerk middleware (`proxy.ts`) to protect routes. Do not implement custom session checks or redirect logic outside of middleware for route-level protection.

> **Note:** Next.js 16 renamed `middleware.ts` to `proxy.ts`. Use `proxy.ts` — `middleware.ts` is deprecated.

Protected routes should be defined in the proxy matcher config. Publicly accessible routes (e.g., sign-in, sign-up, landing page) must be explicitly allowed.

```ts
// proxy.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});
```

## UI — Conditional Rendering by Auth State

Use Clerk's `<SignedIn>` and `<SignedOut>` components to conditionally render UI based on auth state. Do not use manual boolean checks like `isSignedIn ? ... : ...` in JSX for this purpose.

```tsx
import { SignedIn, SignedOut } from "@clerk/nextjs";

<SignedIn>
  <UserButton />
</SignedIn>
<SignedOut>
  <SignInButton />
</SignedOut>
```

## Sign In / Sign Up Pages

Use Clerk's hosted components. Mount them via the `<SignIn />` and `<SignUp />` components from `@clerk/nextjs` inside dedicated route files:

- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/sign-up/[[...sign-up]]/page.tsx`

## Summary

| What | Rule |
|---|---|
| Auth provider | Clerk only |
| User ID in Server Components | `auth()` from `@clerk/nextjs/server` |
| User ID in Client Components | `useAuth()` from `@clerk/nextjs` |
| Route protection | Clerk middleware |
| Conditional auth UI | `<SignedIn>` / `<SignedOut>` components |
| User ID source | Always Clerk — never URL params or request body |
