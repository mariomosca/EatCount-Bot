import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === '/login';
  const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth');

  // Permetti sempre le route auth
  if (isApiAuth) {
    return NextResponse.next();
  }

  // Redirect a dashboard se loggato e sulla login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  // Redirect a login se non loggato
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
