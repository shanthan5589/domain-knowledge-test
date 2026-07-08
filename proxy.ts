import { NextResponse } from 'next/server'
import { auth } from '@/auth'

// Protect all routes — NextAuth redirects unauthenticated users to /login.
// Profile completion is enforced in the dashboard server component instead of
// here, to avoid relying on JWT refresh timing after the PATCH.
export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    return NextResponse.redirect(loginUrl)
  }
})

export const config = {
  // `$` in the exclusion list matches the root path (`/`) itself — without it,
  // the empty remainder after the leading slash doesn't start with any of the
  // other excluded prefixes, so `/` was being treated as protected and
  // redirected to /login even though app/page.tsx already handles showing the
  // public landing page vs. redirecting a logged-in user to /dashboard.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|signup|$).*)'],
}
