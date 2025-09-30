/**
 * Accessibility Utilities
 *
 * Helper functions for implementing WCAG 2.1 AA compliant accessibility features.
 */

/**
 * Announces a message to screen readers using an ARIA live region
 *
 * @param message - The message to announce
 * @param priority - 'polite' (default) or 'assertive'
 *
 * @example
 * announceToScreenReader('Form submitted successfully')
 * announceToScreenReader('Error: Invalid email', 'assertive')
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  // Create or get existing live region
  let liveRegion = document.getElementById('a11y-live-region')

  if (!liveRegion) {
    liveRegion = document.createElement('div')
    liveRegion.id = 'a11y-live-region'
    liveRegion.setAttribute('role', 'status')
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    document.body.appendChild(liveRegion)
  } else {
    liveRegion.setAttribute('aria-live', priority)
  }

  // Clear previous message
  liveRegion.textContent = ''

  // Announce new message after a brief delay (ensures screen readers pick it up)
  setTimeout(() => {
    liveRegion!.textContent = message
  }, 100)
}

/**
 * Gets all focusable elements within a container
 *
 * @param container - The container element to search within
 * @returns Array of focusable HTML elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex^="-"])',
  ].join(',')

  const elements = container.querySelectorAll<HTMLElement>(focusableSelectors)

  return Array.from(elements).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  )
}

/**
 * Checks if an element is currently visible
 *
 * @param element - The element to check
 * @returns true if element is visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  if (!element) return false

  const style = window.getComputedStyle(element)
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetParent !== null
  )
}

/**
 * Calculates contrast ratio between two colors
 * Used to ensure WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
 *
 * @param color1 - First color in hex format (#RRGGBB)
 * @param color2 - Second color in hex format (#RRGGBB)
 * @returns Contrast ratio
 *
 * @example
 * const ratio = getContrastRatio('#ffffff', '#000000')
 * console.log(ratio) // 21 (perfect contrast)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getRelativeLuminance(color1)
  const luminance2 = getRelativeLuminance(color2)

  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Calculates relative luminance of a color
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 *
 * @param color - Color in hex format (#RRGGBB)
 * @returns Relative luminance (0-1)
 */
function getRelativeLuminance(color: string): number {
  // Remove # if present
  const hex = color.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  // Apply sRGB gamma correction
  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

  // Calculate luminance
  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB
}

/**
 * Checks if color combination meets WCAG AA standards
 *
 * @param foreground - Foreground color in hex
 * @param background - Background color in hex
 * @param isLargeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns Object with pass/fail status and contrast ratio
 */
export function meetsWCAGStandard(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): { passes: boolean; ratio: number; standard: string } {
  const ratio = getContrastRatio(foreground, background)
  const requiredRatio = isLargeText ? 3 : 4.5 // WCAG AA standards

  return {
    passes: ratio >= requiredRatio,
    ratio: Math.round(ratio * 100) / 100,
    standard: `WCAG AA ${isLargeText ? '(large text)' : '(normal text)'}`,
  }
}

/**
 * Generates a unique ID for accessibility purposes
 * Useful for aria-describedby, aria-labelledby, etc.
 *
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Manages focus for modals and dialogs
 * Stores the previously focused element and returns focus when closed
 */
export class FocusManager {
  private previousElement: HTMLElement | null = null

  /**
   * Saves the currently focused element
   */
  saveFocus(): void {
    this.previousElement = document.activeElement as HTMLElement
  }

  /**
   * Returns focus to the previously focused element
   */
  restoreFocus(): void {
    if (this.previousElement && typeof this.previousElement.focus === 'function') {
      requestAnimationFrame(() => {
        this.previousElement?.focus()
      })
    }
  }

  /**
   * Focuses the first focusable element in a container
   */
  focusFirst(container: HTMLElement): void {
    const focusableElements = getFocusableElements(container)
    if (focusableElements.length > 0) {
      requestAnimationFrame(() => {
        focusableElements[0]?.focus()
      })
    }
  }
}

/**
 * Keyboard event helper - checks if Enter or Space was pressed
 * Useful for making non-button elements interactive
 *
 * @param event - Keyboard event
 * @returns true if Enter or Space was pressed
 */
export function isActivationKey(event: React.KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' '
}

/**
 * ARIA role constants for common patterns
 */
export const ARIA_ROLES = {
  ALERT: 'alert',
  ALERTDIALOG: 'alertdialog',
  BUTTON: 'button',
  CHECKBOX: 'checkbox',
  DIALOG: 'dialog',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  NAVIGATION: 'navigation',
  RADIO: 'radio',
  RADIOGROUP: 'radiogroup',
  STATUS: 'status',
  TAB: 'tab',
  TABLIST: 'tablist',
  TABPANEL: 'tabpanel',
  TOOLTIP: 'tooltip',
} as const

/**
 * ARIA live region priority levels
 */
export const ARIA_LIVE = {
  OFF: 'off',
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
} as const

/**
 * Common keyboard keys for navigation
 */
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const

export default {
  announceToScreenReader,
  getFocusableElements,
  isElementVisible,
  getContrastRatio,
  meetsWCAGStandard,
  generateA11yId,
  FocusManager,
  isActivationKey,
  ARIA_ROLES,
  ARIA_LIVE,
  KEYS,
}
