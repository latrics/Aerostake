import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, internal paths, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const role = request.cookies.get('user_role')?.value;

  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  
  // Define route lists for route guarding
  const clientRoutes = ['/dashboard', '/projects', '/help-desk'];
  const latricsRoutes = [
    '/requests',
    '/planning',
    '/allocations',
    '/sectors',
    '/my-assignments',
    '/sector-updates',
    '/user-management',
    '/settings',
  ];

  const isClientRoute = clientRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
  const isLatricsRoute = latricsRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));

  // 1. User is NOT logged in
  if (!token) {
    // If trying to access protected routes, redirect to login
    if (isClientRoute || isLatricsRoute || pathname === '/') {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. User IS logged in
  if (isAuthRoute || pathname === '/') {
    // Redirect to their default dashboard if they hit auth pages or root
    if (role === 'client') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else if (role === 'admin') {
      return NextResponse.redirect(new URL('/requests', request.url));
    } else if (role === 'operations') {
      return NextResponse.redirect(new URL('/allocations', request.url));
    } else if (role === 'pilot') {
      return NextResponse.redirect(new URL('/my-assignments', request.url));
    }
  }

  // 3. Client Role Guard
  if (role === 'client') {
    if (isLatricsRoute) {
      // Clients cannot access back-office routes
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 4. Back-office Roles Guard
  if (role === 'admin' || role === 'operations' || role === 'pilot') {
    if (isClientRoute) {
      // Latrics employees cannot access client portal routes
      const defaultPath =
        role === 'admin'
          ? '/requests'
          : role === 'operations'
          ? '/allocations'
          : '/my-assignments';
      return NextResponse.redirect(new URL(defaultPath, request.url));
    }

    // Role-specific sub-route guarding within Latrics Portal
    if (role === 'operations') {
      const adminOnlyRoutes = ['/requests', '/planning', '/user-management', '/settings'];
      if (adminOnlyRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
        return NextResponse.redirect(new URL('/allocations', request.url));
      }
    }

    if (role === 'pilot') {
      const nonPilotRoutes = [
        '/requests',
        '/planning',
        '/allocations',
        '/sectors',
        '/user-management',
        '/settings',
      ];
      if (nonPilotRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
        return NextResponse.redirect(new URL('/my-assignments', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
