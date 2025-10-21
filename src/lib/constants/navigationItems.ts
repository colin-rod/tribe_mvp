/**
 * Navigation Items Configuration
 * CRO-294: Left Navigation Panel - Structure & Toggle
 * CRO-295: Routing & Navigation State Management
 *
 * Centralized navigation configuration shared by all dashboard surfaces.
 */

import type { ComponentType } from 'react';
import {
  RectangleStackIcon,
  BookOpenIcon,
  DocumentTextIcon,
  UserIcon,
  UserPlusIcon,
  UserGroupIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

import { DASHBOARD_ROUTES, type DashboardRoute } from './routes';

export type NavigationIcon = ComponentType<{ className?: string }>;

interface BaseNavigationItem {
  id: string;
  label: string;
  icon: NavigationIcon;
  href: string;
  alternateHrefs?: readonly string[];
  badge?: number;
}

export interface DashboardNavigationItem extends BaseNavigationItem {
  id:
    | 'activity'
    | 'memory-book'
    | 'summaries'
    | 'children'
    | 'recipients'
    | 'groups'
    | 'drafts'
    | 'settings';
  href: DashboardRoute;
  alternateHrefs?: readonly DashboardRoute[];
}

export interface DashboardNavigationSection {
  id: string;
  label?: string;
  items: readonly DashboardNavigationItem[];
}

export interface NavigationSection<TItem extends BaseNavigationItem = BaseNavigationItem> {
  id: string;
  label: string;
  items: readonly TItem[];
}

export const DASHBOARD_NAVIGATION_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'activity',
        label: 'Activity',
        icon: RectangleStackIcon,
        href: DASHBOARD_ROUTES.ACTIVITY,
        alternateHrefs: [DASHBOARD_ROUTES.ACTIVITY_ALT],
      },
      {
        id: 'memory-book',
        label: 'Memory Book',
        icon: BookOpenIcon,
        href: DASHBOARD_ROUTES.MEMORY_BOOK,
      },
      {
        id: 'summaries',
        label: 'Summaries',
        icon: DocumentTextIcon,
        href: DASHBOARD_ROUTES.SUMMARIES,
      },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    items: [
      {
        id: 'children',
        label: 'Children',
        icon: UserIcon,
        href: DASHBOARD_ROUTES.CHILDREN,
      },
      {
        id: 'recipients',
        label: 'Recipients',
        icon: UserPlusIcon,
        href: DASHBOARD_ROUTES.RECIPIENTS,
      },
      {
        id: 'groups',
        label: 'Groups',
        icon: UserGroupIcon,
        href: DASHBOARD_ROUTES.GROUPS,
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
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
] as const satisfies readonly DashboardNavigationSection[];

export const DASHBOARD_NAVIGATION_ITEMS = DASHBOARD_NAVIGATION_SECTIONS.flatMap(
  (section) => section.items,
) as readonly DashboardNavigationItem[];

export const accountNavigationItems = [
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
] as const satisfies readonly BaseNavigationItem[];

export const mobileNavigationSections = [
  {
    id: 'primary',
    label: 'Main navigation',
    items: DASHBOARD_NAVIGATION_ITEMS,
  },
  {
    id: 'account',
    label: 'Account',
    items: accountNavigationItems,
  },
] as const satisfies readonly NavigationSection[];

export type DashboardNavigationItemId =
  (typeof DASHBOARD_NAVIGATION_SECTIONS)[number]['items'][number]['id'];

export function getNavigationItemByPath(pathname: string) {
  return DASHBOARD_NAVIGATION_ITEMS.find(
    (item) =>
      item.href === pathname ||
      item.alternateHrefs?.some((alternate) => alternate === pathname),
  );
}
