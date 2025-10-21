/**
 * Navigation Items Configuration
 * CRO-294: Left Navigation Panel - Structure & Toggle
 * CRO-295: Routing & Navigation State Management
 * CRO-534: Memory Book Experience - Unified Dashboard Navigation
 *
 * Centralized navigation configuration shared by all dashboard surfaces.
 * Updated for Memory Book Experience (Updates → Memories, Digests → Summaries)
 */

import type { ComponentType } from 'react';

import {
  RectangleStackIcon,
  BookOpenIcon,
  UserPlusIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { DASHBOARD_ROUTES, type DashboardRoute } from './routes';

export type NavigationIcon = ComponentType<{ className?: string }>;

export interface DashboardNavigationItem {
  id: 'activity' | 'summaries' | 'recipients' | 'drafts' | 'settings';
  label: string;
  icon: NavigationIcon;
  href: DashboardRoute;
  alternateHrefs?: readonly DashboardRoute[];
  badge?: number; // For notification counts
}

export interface DashboardNavigationSection {
  id: string;
  label?: string;
  items: readonly DashboardNavigationItem[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  badge?: number; // For notification counts
}

export interface NavigationSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const navigationItems: NavItem[] = [
  {
    id: 'activity',
    label: 'Activity',
    icon: RectangleStackIcon,
    href: '/dashboard/activity',
  },
  {
    id: 'memory-book',
    label: 'Memory Book',
    icon: BookOpenIcon,
    href: '/dashboard/memory-book',
  },
  {
    id: 'summaries',
    label: 'Summaries',
    icon: DocumentTextIcon,
    href: '/dashboard/digests',
  },
];

export const DASHBOARD_NAVIGATION_SECTIONS = [
  {
    id: 'overview',
    items: [
      {
        id: 'activity',
        label: 'Activity',
        icon: RectangleStackIcon,
        href: DASHBOARD_ROUTES.ACTIVITY,
        alternateHrefs: [DASHBOARD_ROUTES.ACTIVITY_ALT],
      },
      {
        id: 'summaries',
        label: 'Memory Book',
        icon: BookOpenIcon,
        href: DASHBOARD_ROUTES.MEMORY_BOOK,
      },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    items: [
      {
        id: 'recipients',
        label: 'Recipients',
        icon: UserPlusIcon,
        href: DASHBOARD_ROUTES.RECIPIENTS,
      },
      {
        id: 'drafts',
        label: 'Drafts',
        icon: DocumentTextIcon,
        href: DASHBOARD_ROUTES.DRAFTS,
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Cog6ToothIcon,
        href: DASHBOARD_ROUTES.SETTINGS,
      },
    ],
  },
] as const;

export type DashboardNavigationItemId =
  (typeof DASHBOARD_NAVIGATION_SECTIONS)[number]['items'][number]['id'];

export const DASHBOARD_NAVIGATION_ITEMS = DASHBOARD_NAVIGATION_SECTIONS.flatMap(
  (section) => section.items
);

export function getNavigationItemByPath(pathname: string) {
  return DASHBOARD_NAVIGATION_ITEMS.find(
    (item) =>
      item.href === pathname ||
      item.alternateHrefs?.includes(pathname as DashboardRoute)
  );
}

// Legacy navigation items for mobile menu
export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

export interface NavigationSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const navigationItems: NavItem[] = [
  {
    id: 'activity',
    label: 'Activity',
    icon: RectangleStackIcon,
    href: '/dashboard/activity',
  },
  {
    id: 'memory-book',
    label: 'Memory Book',
    icon: BookOpenIcon,
    href: '/dashboard/memory-book',
  },
  {
    id: 'recipients',
    label: 'Recipients',
    icon: UserPlusIcon,
    href: '/dashboard/recipients',
  },
  {
    id: 'summaries',
    label: 'Summaries',
    icon: DocumentTextIcon,
    href: '/dashboard/digests',
  },
];

export const accountNavigationItems: NavItem[] = [
  {
    id: 'profile-settings',
    label: 'Profile Settings',
    icon: UserCircleIcon,
    href: '/dashboard/profile',
  },
  {
    id: 'profile-security',
    label: 'Security',
    icon: ShieldCheckIcon,
    href: '/dashboard/profile?tab=security',
  },
  {
    id: 'profile-notifications',
    label: 'Notifications',
    icon: BellAlertIcon,
    href: '/dashboard/profile?tab=notifications',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Cog6ToothIcon,
    href: '/dashboard/settings',
  },
];

export const mobileNavigationSections: readonly NavigationSection[] = [
  {
    id: 'primary',
    label: 'Main navigation',
    items: navigationItems,
  },
  {
    id: 'account',
    label: 'Account',
    items: accountNavigationItems,
  },
] as const;

export type DashboardNavigationItemId =
  (typeof DASHBOARD_NAVIGATION_SECTIONS)[number]['items'][number]['id'];

export const DASHBOARD_NAVIGATION_ITEMS: readonly DashboardNavigationItem[] = DASHBOARD_NAVIGATION_SECTIONS.flatMap(
  (section) => section.items
) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

export function getNavigationItemByPath(pathname: string) {
  return DASHBOARD_NAVIGATION_ITEMS.find(
    (item) =>
      item.href === pathname ||
      item.alternateHrefs?.includes(pathname as DashboardRoute)
  );
}
