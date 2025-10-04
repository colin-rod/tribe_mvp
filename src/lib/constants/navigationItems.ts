/**
 * Navigation Items Configuration
 * CRO-294: Left Navigation Panel - Structure & Toggle
 */

import {
  RectangleStackIcon,
  EnvelopeIcon,
  UserGroupIcon,
  UsersIcon,
  Squares2X2Icon,
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
    id: 'digests',
    label: 'Digests',
    icon: EnvelopeIcon,
    href: '/dashboard/digests',
  },
  {
    id: 'children',
    label: 'Children',
    icon: UserGroupIcon,
    href: '/dashboard/children',
  },
  {
    id: 'recipients',
    label: 'Recipients',
    icon: UsersIcon,
    href: '/dashboard/recipients',
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: Squares2X2Icon,
    href: '/dashboard/groups',
  },
  {
    id: 'drafts',
    label: 'Drafts',
    icon: DocumentTextIcon,
    href: '/dashboard/drafts',
  },
];
