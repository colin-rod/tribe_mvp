/**
 * Route Configuration for Tribe MVP Dashboard
 * CRO-295: Routing & Navigation State Management
 */

export const DASHBOARD_ROUTES = {
  ACTIVITY: '/dashboard',
  ACTIVITY_ALT: '/dashboard/activity',
  DIGESTS: '/dashboard/digests',
  CHILDREN: '/dashboard/children',
  RECIPIENTS: '/dashboard/recipients',
  GROUPS: '/dashboard/groups',
  DRAFTS: '/dashboard/drafts',
  SETTINGS: '/dashboard/settings',
} as const;

export type DashboardRoute = typeof DASHBOARD_ROUTES[keyof typeof DASHBOARD_ROUTES];

/**
 * Navigation items configuration
 */
/**
 * Check if a path is active
 */
export function isPathActive(
  currentPath: string,
  itemPath: string,
  alternateHrefs?: readonly string[]
): boolean {
  if (currentPath === itemPath) return true;
  if (alternateHrefs?.includes(currentPath)) return true;
  return false;
}
