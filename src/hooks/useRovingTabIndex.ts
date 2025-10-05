/**
 * useRovingTabIndex Hook
 * CRO-154: Accessibility - Keyboard Navigation & Focus Management
 *
 * Implements roving tabindex pattern for keyboard navigation in lists/grids
 * Only one element is tabbable at a time, others navigable via arrow keys
 *
 * WCAG 2.1 Level AA: 2.1.1 Keyboard (A)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface RovingTabIndexOptions {
  /** Direction of navigation */
  direction?: 'horizontal' | 'vertical' | 'both'
  /** Whether to loop when reaching the end */
  loop?: boolean
  /** Custom selector for focusable items */
  itemSelector?: string
}

export function useRovingTabIndex<T extends HTMLElement = HTMLElement>(
  options: RovingTabIndexOptions = {}
) {
  const {
    direction = 'vertical',
    loop = true,
    itemSelector = '[role="option"], [role="tab"], [role="menuitem"], button:not([disabled]), a[href]'
  } = options

  const containerRef = useRef<T>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const getItems = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return []

    const items = containerRef.current.querySelectorAll<HTMLElement>(itemSelector)
    return Array.from(items).filter(
      item => !item.hasAttribute('disabled') && item.offsetParent !== null
    )
  }, [itemSelector])

  const focusItem = useCallback((index: number) => {
    const items = getItems()
    if (items.length === 0) return

    const targetIndex = loop
      ? (index + items.length) % items.length
      : Math.max(0, Math.min(index, items.length - 1))

    items[targetIndex]?.focus()
    setCurrentIndex(targetIndex)
  }, [getItems, loop])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const items = getItems()
    if (items.length === 0) return

    const currentItem = document.activeElement as HTMLElement
    const currentIdx = items.indexOf(currentItem)

    if (currentIdx === -1) return

    let handled = false

    switch (event.key) {
      case 'ArrowDown':
        if (direction === 'vertical' || direction === 'both') {
          event.preventDefault()
          focusItem(currentIdx + 1)
          handled = true
        }
        break

      case 'ArrowUp':
        if (direction === 'vertical' || direction === 'both') {
          event.preventDefault()
          focusItem(currentIdx - 1)
          handled = true
        }
        break

      case 'ArrowRight':
        if (direction === 'horizontal' || direction === 'both') {
          event.preventDefault()
          focusItem(currentIdx + 1)
          handled = true
        }
        break

      case 'ArrowLeft':
        if (direction === 'horizontal' || direction === 'both') {
          event.preventDefault()
          focusItem(currentIdx - 1)
          handled = true
        }
        break

      case 'Home':
        event.preventDefault()
        focusItem(0)
        handled = true
        break

      case 'End':
        event.preventDefault()
        focusItem(items.length - 1)
        handled = true
        break
    }

    if (handled) {
      event.stopPropagation()
    }
  }, [direction, focusItem, getItems])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown)

    // Set initial tabindex values
    const items = getItems()
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === currentIndex ? '0' : '-1')
    })

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, getItems, currentIndex])

  return {
    containerRef,
    currentIndex,
    focusItem,
    getItems
  }
}
