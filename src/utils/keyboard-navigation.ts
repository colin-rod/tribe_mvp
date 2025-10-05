/**
 * Keyboard Navigation Utilities
 * CRO-154: Accessibility - Keyboard Navigation & Focus Management
 *
 * Comprehensive keyboard navigation patterns for WCAG 2.1 AA compliance
 */

import { KeyboardEvent as ReactKeyboardEvent } from 'react'

export const KEYBOARD_KEYS = {
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
  DELETE: 'Delete',
  BACKSPACE: 'Backspace'
} as const

/**
 * Check if key is an activation key (Enter or Space)
 * Used for making non-button elements keyboard accessible
 */
export function isActivationKey(event: ReactKeyboardEvent | KeyboardEvent): boolean {
  return event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE
}

/**
 * Check if key is an arrow key
 */
export function isArrowKey(event: ReactKeyboardEvent | KeyboardEvent): boolean {
  const arrowKeys: string[] = [
    KEYBOARD_KEYS.ARROW_UP,
    KEYBOARD_KEYS.ARROW_DOWN,
    KEYBOARD_KEYS.ARROW_LEFT,
    KEYBOARD_KEYS.ARROW_RIGHT
  ]
  return arrowKeys.includes(event.key)
}

/**
 * Check if key is a navigation key
 */
export function isNavigationKey(event: ReactKeyboardEvent | KeyboardEvent): boolean {
  const navigationKeys: string[] = [
    KEYBOARD_KEYS.ARROW_UP,
    KEYBOARD_KEYS.ARROW_DOWN,
    KEYBOARD_KEYS.ARROW_LEFT,
    KEYBOARD_KEYS.ARROW_RIGHT,
    KEYBOARD_KEYS.HOME,
    KEYBOARD_KEYS.END,
    KEYBOARD_KEYS.PAGE_UP,
    KEYBOARD_KEYS.PAGE_DOWN
  ]
  return navigationKeys.includes(event.key)
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]:not([tabindex="-1"])',
    'area[href]:not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'iframe:not([tabindex="-1"])',
    '[contenteditable]:not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')

  const elements = container.querySelectorAll<HTMLElement>(focusableSelectors)

  return Array.from(elements).filter(el => {
    // Filter out hidden elements
    return (
      !el.hasAttribute('disabled') &&
      el.offsetParent !== null &&
      !el.getAttribute('aria-hidden')
    )
  })
}

/**
 * Focus the first focusable element in a container
 */
export function focusFirstElement(container: HTMLElement): void {
  const elements = getFocusableElements(container)
  if (elements.length > 0) {
    elements[0].focus()
  }
}

/**
 * Focus the last focusable element in a container
 */
export function focusLastElement(container: HTMLElement): void {
  const elements = getFocusableElements(container)
  if (elements.length > 0) {
    elements[elements.length - 1].focus()
  }
}

/**
 * Move focus to next/previous element in a list
 * Implements roving tabindex pattern
 */
export function moveFocus(
  currentElement: HTMLElement,
  container: HTMLElement,
  direction: 'next' | 'previous',
  loop: boolean = true
): void {
  const elements = getFocusableElements(container)
  const currentIndex = elements.indexOf(currentElement)

  if (currentIndex === -1) return

  let nextIndex: number

  if (direction === 'next') {
    nextIndex = currentIndex + 1
    if (nextIndex >= elements.length) {
      nextIndex = loop ? 0 : currentIndex
    }
  } else {
    nextIndex = currentIndex - 1
    if (nextIndex < 0) {
      nextIndex = loop ? elements.length - 1 : currentIndex
    }
  }

  elements[nextIndex]?.focus()
}

/**
 * Handle keyboard navigation for dropdown menus
 * Implements ARIA Authoring Practices for menu pattern
 */
export function handleMenuKeyDown(
  event: ReactKeyboardEvent | KeyboardEvent,
  options: {
    onClose?: () => void
    onSelect?: () => void
    currentIndex?: number
    itemCount?: number
    onNavigate?: (index: number) => void
  }
): void {
  const { onClose, onSelect, currentIndex = 0, itemCount = 0, onNavigate } = options

  switch (event.key) {
    case KEYBOARD_KEYS.ESCAPE:
      event.preventDefault()
      onClose?.()
      break

    case KEYBOARD_KEYS.ENTER:
    case KEYBOARD_KEYS.SPACE:
      event.preventDefault()
      onSelect?.()
      break

    case KEYBOARD_KEYS.ARROW_DOWN:
      event.preventDefault()
      if (onNavigate) {
        const nextIndex = currentIndex >= itemCount - 1 ? 0 : currentIndex + 1
        onNavigate(nextIndex)
      }
      break

    case KEYBOARD_KEYS.ARROW_UP:
      event.preventDefault()
      if (onNavigate) {
        const prevIndex = currentIndex <= 0 ? itemCount - 1 : currentIndex - 1
        onNavigate(prevIndex)
      }
      break

    case KEYBOARD_KEYS.HOME:
      event.preventDefault()
      onNavigate?.(0)
      break

    case KEYBOARD_KEYS.END:
      event.preventDefault()
      onNavigate?.(itemCount - 1)
      break
  }
}

/**
 * Handle keyboard navigation for tabs
 * Implements ARIA Authoring Practices for tabs pattern
 */
export function handleTabKeyDown(
  event: ReactKeyboardEvent | KeyboardEvent,
  options: {
    currentIndex: number
    tabCount: number
    onNavigate: (index: number) => void
    orientation?: 'horizontal' | 'vertical'
  }
): void {
  const { currentIndex, tabCount, onNavigate, orientation = 'horizontal' } = options

  let handled = false

  switch (event.key) {
    case KEYBOARD_KEYS.ARROW_RIGHT:
      if (orientation === 'horizontal') {
        event.preventDefault()
        onNavigate(currentIndex >= tabCount - 1 ? 0 : currentIndex + 1)
        handled = true
      }
      break

    case KEYBOARD_KEYS.ARROW_LEFT:
      if (orientation === 'horizontal') {
        event.preventDefault()
        onNavigate(currentIndex <= 0 ? tabCount - 1 : currentIndex - 1)
        handled = true
      }
      break

    case KEYBOARD_KEYS.ARROW_DOWN:
      if (orientation === 'vertical') {
        event.preventDefault()
        onNavigate(currentIndex >= tabCount - 1 ? 0 : currentIndex + 1)
        handled = true
      }
      break

    case KEYBOARD_KEYS.ARROW_UP:
      if (orientation === 'vertical') {
        event.preventDefault()
        onNavigate(currentIndex <= 0 ? tabCount - 1 : currentIndex - 1)
        handled = true
      }
      break

    case KEYBOARD_KEYS.HOME:
      event.preventDefault()
      onNavigate(0)
      handled = true
      break

    case KEYBOARD_KEYS.END:
      event.preventDefault()
      onNavigate(tabCount - 1)
      handled = true
      break
  }

  if (handled) {
    event.stopPropagation()
  }
}

/**
 * Handle keyboard navigation for dialogs/modals
 * Implements ARIA Authoring Practices for dialog pattern
 */
export function handleDialogKeyDown(
  event: ReactKeyboardEvent | KeyboardEvent,
  options: {
    onClose: () => void
    closeOnEscape?: boolean
  }
): void {
  const { onClose, closeOnEscape = true } = options

  if (event.key === KEYBOARD_KEYS.ESCAPE && closeOnEscape) {
    event.preventDefault()
    event.stopPropagation()
    onClose()
  }
}

/**
 * Create keyboard event handler for clickable elements
 * Makes div/span elements keyboard accessible
 */
export function createKeyboardClickHandler(
  onClick: () => void
): (event: ReactKeyboardEvent) => void {
  return (event: ReactKeyboardEvent) => {
    if (isActivationKey(event)) {
      event.preventDefault()
      onClick()
    }
  }
}

/**
 * Get ARIA props for keyboard-accessible elements
 */
export function getKeyboardAccessibleProps(onClick: () => void, label?: string) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    onClick,
    onKeyDown: createKeyboardClickHandler(onClick)
  }
}

/**
 * Trap focus within an element (for modals/dialogs)
 */
export function trapFocus(
  container: HTMLElement,
  event: ReactKeyboardEvent | KeyboardEvent
): void {
  if (event.key !== KEYBOARD_KEYS.TAB) return

  const elements = getFocusableElements(container)
  if (elements.length === 0) return

  const firstElement = elements[0]
  const lastElement = elements[elements.length - 1]
  const activeElement = document.activeElement as HTMLElement

  if (event.shiftKey) {
    // Shift + Tab (moving backward)
    if (activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    }
  } else {
    // Tab (moving forward)
    if (activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }
}

/**
 * Restore focus to a previously focused element
 */
export class FocusRestoration {
  private previousElement: HTMLElement | null = null

  save(): void {
    this.previousElement = document.activeElement as HTMLElement
  }

  restore(): void {
    if (this.previousElement && typeof this.previousElement.focus === 'function') {
      requestAnimationFrame(() => {
        this.previousElement?.focus()
      })
    }
  }

  clear(): void {
    this.previousElement = null
  }
}
