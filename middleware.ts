import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/webhooks', '/api/hotels/confirm', '/confirm']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public pages and API routes guard themselves
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.startsWith('/api/')) return NextResponse.next()

  const session = await getSessionFromRequest(request)
  if (session) return NextResponse.next()

  // No session. RSC/prefetch requests must NOT be redirected — the client router
  // caches the redirect and bounces later real navigations to /login.
  // Return 401 instead so the router falls back to a full page load.
  const isRsc =
    request.headers.get('rsc') === '1' ||
    request.headers.get('next-router-prefetch') === '1' ||
    request.nextUrl.searchParams.has('_rsc')

  if (isRsc) {
    return new NextResponse(null, { status: 401 })
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
