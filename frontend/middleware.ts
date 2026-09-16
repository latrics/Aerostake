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
  const clientRoutes = [
    '/dashboard',
    '/projects',
    '/activity-logs',
    '/payments',
    '/documents',
    '/help-desk',
    '/settings',
  ];
  const latricsRoutes = [
    '/requests',
    '/planning',
    '/allocations',
    '/sectors',
    '/my-assignments',
    '/sector-updates',
    '/user-management',
    '/portal-settings',
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

  const isClient = role === 'client' || role === 'client_primary' || role === 'client_sub';
  const isAdmin = role === 'admin';
  const isOps = role === 'operations';
  const isPilot = role === 'pilot';
  const isStaff = isAdmin || isOps;
  const isOnboarded = request.cookies.get('is_onboarded')?.value === 'true';

  // 2. User IS logged in
  if (isAuthRoute || pathname === '/') {
    // Redirect to default dashboard if hitting auth pages or root
    if (isClient) {
      if (!isOnboarded && (role === 'client' || role === 'client_primary')) {
        return NextResponse.redirect(new URL('/company-profile?first_time=true', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else if (isStaff) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else if (isPilot) {
      return NextResponse.redirect(new URL('/my-assignments', request.url));
    }
  }

  // 3. Client Role Guard & First-Time Onboarding Enforcement
  if (isClient) {
    if (isLatricsRoute) {
      // Clients cannot access back-office routes
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // First-time onboarding enforcement for primary clients
    if (!isOnboarded && (role === 'client' || role === 'client_primary') && pathname !== '/company-profile') {
      return NextResponse.redirect(new URL('/company-profile?first_time=true', request.url));
    }
  }

  // 4. Pilot Role Guard
  if (isPilot) {
    const pilotAllowedRoutes = ['/my-assignments', '/sector-updates', '/help-desk'];
    const isAllowed = pilotAllowedRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/my-assignments', request.url));
    }
  }

  // 5. Operations Role Guard (Admin-only routes)
  if (isOps) {
    const adminOnlyRoutes = ['/user-management'];
    if (adminOnlyRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
