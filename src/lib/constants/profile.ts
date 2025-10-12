import type { ProfileTab } from '@/lib/types/profile'

export const PROFILE_TABS = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Personal information and preferences',
    icon: 'user',
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Manage your sign-in email',
    icon: 'cog',
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Update your password',
    icon: 'shield',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Email and push notification preferences',
    icon: 'bell',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    description: 'Data privacy and sharing controls',
    icon: 'lock',
  },
  {
    id: 'children',
    label: 'Children',
    description: "Manage your children's profiles",
    icon: 'users',
  },
] as const satisfies ReadonlyArray<ProfileTab>;

export type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];
