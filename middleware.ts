import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const session = req.auth
  const { pathname } = req.nextUrl

  // Not logged in — NextAuth will redirect to /login via the signIn page config
  if (!session) return

  // Logged in but profile not yet completed → force to /profile/complete
  if (!session.user?.profileCompleted && !pathname.startsWith('/profile/complete')) {
    return NextResponse.redirect(new URL('/profile/complete', req.url))
  }
})

export const config = {
  // Protect all routes except public assets, auth pages, and the API
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)'],
}
