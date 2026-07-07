import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/auth'

// Shared session type returned to callers once we've confirmed the user is
// signed in with a usable email address (every route that reads/writes data
// keyed by user identity relies on `user.email` being present). Built from
// the (app-augmented, see auth.ts) `Session` type directly rather than
// `ReturnType<typeof auth>` — NextAuth's `auth` export is overloaded (it also
// doubles as middleware), so `ReturnType` can resolve to the wrong overload.
export type AuthedSession = Session & {
  user: { email: string }
}

// Discriminated union (rather than two independently-nullable fields) so
// TypeScript narrows `unauthorizedResponse` to non-null in the `!session`
// branch, and `session` to non-null everywhere else.
type RequireSessionResult =
  | { session: AuthedSession; unauthorizedResponse: null }
  | {
      session: null
      // Pre-built 401 response to return as-is when `session` is null. Kept as
      // a single shared shape so every route returns the exact same
      // `{ error: 'Unauthorized' }` (status 401) body that they each
      // hand-rolled individually before this helper existed.
      unauthorizedResponse: NextResponse
    }

// Resolves the current NextAuth session for a route handler and enforces the
// baseline "must be logged in with an email" check shared by every API route
// in this app. Callers should short-circuit with `unauthorizedResponse` when
// `session` comes back null:
//
//   const { session, unauthorizedResponse } = await requireSession()
//   if (!session) return unauthorizedResponse
//
export async function requireSession(): Promise<RequireSessionResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return {
      session: null,
      unauthorizedResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { session: session as AuthedSession, unauthorizedResponse: null }
}
