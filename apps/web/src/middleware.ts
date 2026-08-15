import { NextRequest, NextResponse } from 'next/server';
import { authCookieName } from './lib/auth-cookie';

const publicRoutes = new Set(['/login']);

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(authCookieName)?.value);

  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!publicRoutes.has(pathname) && !hasSession) {
    const loginUrl = new URL('/login', request.url);

    loginUrl.searchParams.set('next', pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
