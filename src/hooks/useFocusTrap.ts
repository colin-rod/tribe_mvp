/**
 * useFocusTrap Hook
 *
 * Traps keyboard focus within a container element (e.g., modal, dialog).
 * Essential for WCAG 2.1 AA compliance and keyboard accessibility.
 *
 * Features:
 * - Prevents Tab/Shift+Tab from leaving the container
 * - Returns focus to triggering element when trap is released
 * - Automatically focuses first focusable element
 * - Handles Escape key to close
 *
 * @param active - Whether the focus trap is active
 * @param onEscape - Optional callback when Escape is pressed
 *
 * @example
 * function Modal({ isOpen, onClose }) {
 *   const trapRef = useFocusTrap(isOpen, onClose)
 *   return <div ref={trapRef}>...</div>
 * }
 */

import { useEffect, useRef, useCallback } from 'react'

const FOCUSABLE_ELEMENTS = [
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
]

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean = true,
  onEscape?: () => void
) {
  const ref = useRef<T>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Get all focusable elements within the trap
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!ref.current) return []
    const elements = ref.current.querySelectorAll<HTMLElement>(
      FOCUSABLE_ELEMENTS.join(',')
    )
    return Array.from(elements).filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
    )
  }, [])

  // Focus first element when trap becomes active
  useEffect(() => {
    if (!active || !ref.current) return

    // Store the element that was focused before trap
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      // Delay to ensure element is rendered
      requestAnimationFrame(() => {
        focusableElements[0]?.focus()
      })
    }

    // Restore focus when trap is deactivated
    return () => {
      if (previousActiveElement.current) {
        requestAnimationFrame(() => {
          previousActiveElement.current?.focus()
        })
      }
    }
  }, [active, getFocusableElements])

  // Handle keyboard navigation
  useEffect(() => {
    if (!active) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
        return
      }

      // Handle Tab key for focus trapping
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements()
        if (focusableElements.length === 0) {
          event.preventDefault()
          return
        }

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]
        const activeElement = document.activeElement as HTMLElement

        // Shift + Tab: Move to previous element
        if (event.shiftKey) {
          if (activeElement === firstElement) {
            event.preventDefault()
            lastElement?.focus()
          }
        }
        // Tab: Move to next element
        else {
          if (activeElement === lastElement) {
            event.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active, onEscape, getFocusableElements])

  return ref
}

/**
 * useFocusReturn Hook
 *
 * Returns focus to a specific element when component unmounts.
 * Useful for temporary overlays that don't need full focus trapping.
 *
 * @param returnTo - Element to return focus to
 *
 * @example
 * function Tooltip() {
 *   const triggerRef = useRef(null)
 *   useFocusReturn(triggerRef.current)
 *   return <div>...</div>
 * }
 */
export function useFocusReturn(returnTo: HTMLElement | null) {
  useEffect(() => {
    return () => {
      if (returnTo) {
        requestAnimationFrame(() => {
          returnTo.focus()
        })
      }
    }
  }, [returnTo])
}

export default useFocusTrap
