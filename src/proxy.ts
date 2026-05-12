import { NextRequest, NextResponse } from 'next/server'

const COORDINATOR_HOME = '/buildings'
const MONITOR_HOME = '/home'

const PUBLIC_PATHS = ['/login']
const SHIFTS_PREFIXES = ['/home', '/map', '/handover']
const DASHBOARD_PREFIXES = ['/buildings', '/users', '/coordinator-map']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const role = request.cookies.get('role')?.value

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  // Unauthenticated: only allow public paths
  if (!role) {
    if (isPublic) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Already logged in, redirect away from login page
  if (isPublic) {
    const home = role === 'COORDINADOR' ? COORDINATOR_HOME : MONITOR_HOME
    return NextResponse.redirect(new URL(home, request.url))
  }

  // Role-based routing
  const isCoordinator = role === 'COORDINADOR'

  if (isCoordinator && SHIFTS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL(COORDINATOR_HOME, request.url))
  }

  if (!isCoordinator && DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL(MONITOR_HOME, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/home', '/map', '/handover/:path*', '/buildings', '/buildings/:path*', '/users', '/users/:path*', '/coordinator-map', '/coordinator-map/:path*'],
}
