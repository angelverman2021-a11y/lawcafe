import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = ['/dashboard']
const AUTH_ONLY = ['/login', '/register']  // redirect away if already logged in

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const refreshToken = request.cookies.get('refreshToken')?.value

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))
  const isAuthPage  = AUTH_ONLY.some((p) => pathname.startsWith(p))

  if (isProtected && !refreshToken) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthPage && refreshToken) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register']
}
