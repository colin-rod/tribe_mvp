/**
 * Navigation Items Configuration
 * CRO-294: Left Navigation Panel - Structure & Toggle
 * CRO-534: Memory Book Experience - Unified Dashboard Navigation
 * Updated for Memory Book Experience (Updates → Memories, Digests → Summaries)
 */

import type { ComponentType } from 'react';

import {
  RectangleStackIcon,
  BookOpenIcon,
  UsersIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

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
    id: 'recipients',
    label: 'Recipients',
    icon: UsersIcon,
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

export const mobileNavigationSections: NavigationSection[] = [
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
];
