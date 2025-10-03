/**
 * Navigation Helper Utilities
 * CRO-295: Routing & Navigation State Management
 *
 * Utility functions for routing and navigation operations
 */

import { DashboardRoute, DASHBOARD_ROUTES } from '@/lib/constants/routes';

/**
 * Build URL with search parameters
 */
export function buildUrlWithParams(
  path: DashboardRoute,
  params: Record<string, string | string[] | undefined>
): string {
  const url = new URL(path, 'http://localhost'); // Base URL doesn't matter for pathname + search

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v));
    } else {
      url.searchParams.set(key, value);
    }
  });

  return `${url.pathname}${url.search}`;
}

/**
 * Merge search parameters
 */
export function mergeSearchParams(
  existing: URLSearchParams,
  newParams: Record<string, string>
): URLSearchParams {
  const merged = new URLSearchParams(existing);

  Object.entries(newParams).forEach(([key, value]) => {
    merged.set(key, value);
  });

  return merged;
}

/**
 * Parse search params from URL string
 */
export function parseSearchParams(url: string): Record<string, string> {
  const urlObj = new URL(url, 'http://localhost');
  const params: Record<string, string> = {};

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Check if route requires authentication
 */
export function isProtectedRoute(path: string): boolean {
  // All dashboard routes require authentication
  return path.startsWith('/dashboard');
}

/**
 * Get default dashboard route
 */
export function getDefaultDashboardRoute(): DashboardRoute {
  return DASHBOARD_ROUTES.ACTIVITY;
}

/**
 * Normalize dashboard path
 * Handles /dashboard and /dashboard/activity as the same route
 */
export function normalizeDashboardPath(path: string): string {
  if (path === DASHBOARD_ROUTES.ACTIVITY || path === DASHBOARD_ROUTES.ACTIVITY_ALT) {
    return DASHBOARD_ROUTES.ACTIVITY;
  }
  return path;
}

/**
 * Extract route segment from pathname
 */
export function getRouteSegment(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'activity';
}

/**
 * Prefetch multiple routes
 */
export function prefetchRoutes(
  router: { prefetch: (path: string) => void },
  routes: DashboardRoute[]
): void {
  routes.forEach((route) => {
    router.prefetch(route);
  });
}

/**
 * Create shareable URL with current params
 */
export function createShareableUrl(
  pathname: string,
  searchParams: URLSearchParams
): string {
  const params = searchParams.toString();
  return params ? `${pathname}?${params}` : pathname;
}

/**
 * Validate dashboard route
 */
export function isValidDashboardRoute(path: string): path is DashboardRoute {
  return Object.values(DASHBOARD_ROUTES).includes(path as DashboardRoute);
}
