/**
 * Navigation Items Configuration
 * CRO-294: Left Navigation Panel - Structure & Toggle
 * CRO-534: Memory Book Experience - Unified Dashboard Navigation
 * Updated for Memory Book Experience (Updates → Memories, Digests → Summaries)
 */

import {
  RectangleStackIcon,
  BookOpenIcon,
  UsersIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number; // For notification counts
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
