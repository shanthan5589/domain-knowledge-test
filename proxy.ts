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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)'],
}
