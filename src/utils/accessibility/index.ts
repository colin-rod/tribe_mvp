/**
 * Accessibility Utilities - Central Export
 * CRO-154: Keyboard Navigation & Focus Management
 *
 * Centralized export for all accessibility utilities, hooks, and components
 */

// Core accessibility utilities
export {
  announceToScreenReader,
  isElementVisible,
  getContrastRatio,
  meetsWCAGStandard,
  generateAriaLabel
} from '../a11y'

// Keyboard navigation utilities (takes precedence for duplicates)
export {
  KEYBOARD_KEYS,
  isActivationKey,
  isArrowKey,
  isNavigationKey,
  handleArrowKeyNavigation,
  getFocusableElements,
  trapFocus,
  restoreFocus
} from '../keyboard-navigation'

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
