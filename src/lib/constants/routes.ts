/**
 * Route Configuration for Tribe MVP Dashboard
 * CRO-295: Routing & Navigation State Management
 */

export const DASHBOARD_ROUTES = {
  ACTIVITY: '/dashboard',
  ACTIVITY_ALT: '/dashboard/activity',
  MEMORY_BOOK: '/dashboard/memory-book',
  SUMMARIES: '/dashboard/digests', // Pending summaries (formerly "digests")
  CHILDREN: '/dashboard/children',
  RECIPIENTS: '/dashboard/recipients',
  GROUPS: '/dashboard/groups',
  DRAFTS: '/dashboard/drafts', // Kept for backward compatibility
  SETTINGS: '/dashboard/settings',
} as const;

export type DashboardRoute = typeof DASHBOARD_ROUTES[keyof typeof DASHBOARD_ROUTES];

/**
 * Navigation items configuration
 */
export const NAVIGATION_ITEMS = [
  {
    id: 'activity',
    label: 'Activity',
    icon: 'Home',
    href: DASHBOARD_ROUTES.ACTIVITY,
    alternateHrefs: [DASHBOARD_ROUTES.ACTIVITY_ALT],
  },
  {
    id: 'memory-book',
    label: 'Memory Book',
    icon: 'Mail',
    href: DASHBOARD_ROUTES.MEMORY_BOOK,
  },
  {
    id: 'children',
    label: 'Children',
    icon: 'Users',
    href: DASHBOARD_ROUTES.CHILDREN,
  },
  {
    id: 'recipients',
    label: 'Recipients',
    icon: 'UserPlus',
    href: DASHBOARD_ROUTES.RECIPIENTS,
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: 'Users',
    href: DASHBOARD_ROUTES.GROUPS,
  },
  {
    id: 'drafts',
    label: 'Drafts',
    icon: 'FileText',
    href: DASHBOARD_ROUTES.DRAFTS,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    href: DASHBOARD_ROUTES.SETTINGS,
  },
] as const;

/**
 * Get navigation item by pathname
 */
export function getNavigationItemByPath(pathname: string) {
  return NAVIGATION_ITEMS.find(
    (item) =>
      item.href === pathname ||
      ('alternateHrefs' in item && item.alternateHrefs?.includes(pathname as DashboardRoute))
  );
}

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
