/**
 * Accessible Menu Component
 * CRO-154: Accessibility - Keyboard Navigation & Focus Management
 *
 * Implements ARIA Authoring Practices for menu pattern
 * Supports full keyboard navigation and screen reader accessibility
 *
 * WCAG 2.1 Level AA:
 * - 2.1.1 Keyboard (A)
 * - 4.1.2 Name, Role, Value (A)
 */

'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { handleMenuKeyDown as handleMenuKeyDownUtil, getFocusableElements } from '@/utils/keyboard-navigation'
import { useFocusTrap } from '@/hooks/useFocusTrap'

export interface MenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  destructive?: boolean
  divider?: boolean
}

export interface MenuProps {
  /** Trigger button content */
  trigger: React.ReactNode
  /** Menu items */
  items: MenuItem[]
  /** Alignment of menu */
  align?: 'left' | 'right'
  /** Custom trigger button class */
  triggerClassName?: string
  /** Custom menu class */
  menuClassName?: string
  /** Controlled open state */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** ARIA label for menu */
  ariaLabel?: string
}

export function Menu({
  trigger,
  items,
  align = 'left',
  triggerClassName,
  menuClassName,
  open: controlledOpen,
  onOpenChange,
  ariaLabel = 'Menu'
}: MenuProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useFocusTrap<HTMLDivElement>(internalOpen)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const setIsOpen = useCallback((open: boolean) => {
    if (isControlled) {
      onOpenChange?.(open)
    } else {
      setInternalOpen(open)
    }
  }, [isControlled, onOpenChange])

  // Filter out dividers for keyboard navigation
  const navigableItems = items.filter(item => !item.divider && !item.disabled)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, setIsOpen, menuRef])

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const focusableElements = getFocusableElements(menuRef.current)
      if (focusableElements.length > 0) {
        setFocusedIndex(0)
        focusableElements[0]?.focus()
      }
    }
  }, [isOpen, menuRef])

  const handleTriggerClick = () => {
    setIsOpen(!isOpen)
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault()
        setIsOpen(true)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        setIsOpen(true)
        break
    }
  }

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.disabled) return

    item.onClick?.()
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const currentItemCount = navigableItems.length

    handleMenuKeyDownUtil(event, {
      onClose: () => {
        setIsOpen(false)
        triggerRef.current?.focus()
      },
      currentIndex: focusedIndex,
      itemCount: currentItemCount,
      onNavigate: (index: number) => {
        setFocusedIndex(index)
        const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')
        if (menuItems) {
          (menuItems[index] as HTMLElement)?.focus()
        }
      }
    })
  }

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-center',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'transition-colors',
          triggerClassName
        )}
      >
        {trigger}
      </button>

      {/* Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={ariaLabel}
          onKeyDown={handleKeyDown}
          className={cn(
            'absolute z-50 mt-2 min-w-[200px]',
            'bg-white rounded-lg shadow-lg border border-neutral-200',
            'py-1',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName
          )}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={item.id || `divider-${index}`}
                  role="separator"
                  className="my-1 border-t border-neutral-200"
                />
              )
            }

            const isDisabled = item.disabled
            const isFocused = navigableItems.indexOf(item) === focusedIndex

            return (
              <button
                key={item.id}
                role="menuitem"
                tabIndex={isFocused ? 0 : -1}
                disabled={isDisabled}
                aria-disabled={isDisabled}
                onClick={() => handleMenuItemClick(item)}
                className={cn(
                  'w-full text-left px-4 py-2',
                  'flex items-center gap-3',
                  'text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:bg-primary-50',
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : cn(
                        'hover:bg-neutral-50 active:bg-neutral-100',
                        item.destructive
                          ? 'text-error-600 hover:bg-error-50'
                          : 'text-neutral-700'
                      )
                )}
              >
                {item.icon && (
                  <span className="flex-shrink-0 w-5 h-5" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Simple Menu Item component for custom menu implementations
 */
export interface MenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  destructive?: boolean
  icon?: React.ReactNode
  className?: string
}

export function MenuItemComponent({
  children,
  onClick,
  disabled = false,
  destructive = false,
  icon,
  className
}: MenuItemProps) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-2',
        'flex items-center gap-3',
        'text-sm transition-colors',
        'focus-visible:outline-none focus-visible:bg-primary-50',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : cn(
              'hover:bg-neutral-50 active:bg-neutral-100',
              destructive
                ? 'text-error-600 hover:bg-error-50'
                : 'text-neutral-700'
            ),
        className
      )}
    >
      {icon && (
        <span className="flex-shrink-0 w-5 h-5" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="flex-1">{children}</span>
    </button>
  )
}
