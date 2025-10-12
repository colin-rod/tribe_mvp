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
  UserIcon,
  UserPlusIcon,
  UserGroupIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { DASHBOARD_ROUTES, type DashboardRoute } from './routes';

export type NavigationIcon = ComponentType<{ className?: string }>;

export interface DashboardNavigationItem {
  id: 'activity' | 'digests' | 'children' | 'recipients' | 'groups' | 'drafts' | 'settings';
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
        id: 'digests',
        label: 'Memory Book',
        icon: BookOpenIcon,
        href: DASHBOARD_ROUTES.DIGESTS,
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

export type DashboardNavigationItemId =
  (typeof DASHBOARD_NAVIGATION_SECTIONS)[number]['items'][number]['id'];

export const DASHBOARD_NAVIGATION_ITEMS = DASHBOARD_NAVIGATION_SECTIONS.flatMap(
  (section) => section.items
) as readonly DashboardNavigationItem[];

export function getNavigationItemByPath(pathname: string) {
  return DASHBOARD_NAVIGATION_ITEMS.find(
    (item) =>
      item.href === pathname ||
      item.alternateHrefs?.includes(pathname as DashboardRoute)
  );
}
