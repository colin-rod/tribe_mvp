/**
 * Accessibility Utilities - Central Export
 * CRO-154: Keyboard Navigation & Focus Management
 *
 * Centralized export for all accessibility utilities, hooks, and components
 */

// Core accessibility utilities
export * from '../a11y'

// Keyboard navigation utilities
export * from '../keyboard-navigation'

// Focus management hooks
export { useFocusTrap } from '@/hooks/useFocusTrap'
export { useRovingTabIndex } from '@/hooks/useRovingTabIndex'

// Live region hooks
export {
  useLiveRegion,
  useFormErrorAnnouncer,
  useLoadingAnnouncer,
  useNotificationAnnouncer
} from '@/hooks/useLiveRegion'

// Accessible components
export { Menu, MenuItemComponent } from '@/components/ui/Menu'
export type { MenuItem, MenuProps, MenuItemProps } from '@/components/ui/Menu'

// Re-export commonly used utilities
export { KEYBOARD_KEYS } from '../keyboard-navigation'
