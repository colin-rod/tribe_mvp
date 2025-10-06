/**
 * Navigation Items Configuration
 * CRO-294: Left Navigation Panel - Structure & Toggle
 */

import {
  RectangleStackIcon,
  EnvelopeIcon,
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
    id: 'digests',
    label: 'Digests',
    icon: EnvelopeIcon,
    href: '/dashboard/digests',
  },
  {
    id: 'recipients',
    label: 'Recipients',
    icon: UsersIcon,
    href: '/dashboard/recipients',
  },
  {
    id: 'drafts',
    label: 'Drafts',
    icon: DocumentTextIcon,
    href: '/dashboard/drafts',
  },
];
