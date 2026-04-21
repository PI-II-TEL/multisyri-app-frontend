import { NextRequest, NextResponse } from 'next/server'

const COORDINATOR_HOME = '/buildings'
const MONITOR_HOME = '/home'

const SHIFTS_PREFIXES = ['/home', '/map', '/handover']
const DASHBOARD_PREFIXES = ['/buildings']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const role = request.cookies.get('role')?.value

  if (!role) return NextResponse.next()

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
  matcher: ['/home', '/map', '/handover/:path*', '/buildings', '/buildings/:path*'],
}
