'use client'

import { cn } from '@/lib/utils'
import { ProfileIcon } from './ProfileIcon'
import { LoadingSpinner } from './LoadingSpinner'

export interface ProfileItem {
  id: string
  name: string
  photoUrl?: string
  subtitle?: string
}

export interface ProfileSelectorProps {
  items: ProfileItem[]
  selectedIds: string[]
  onSelect: (ids: string[]) => void
  mode?: 'single' | 'multi'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  placeholder?: string
  emptyMessage?: string
  loading?: boolean
  className?: string
  showSelectAll?: boolean
  maxHeight?: string
}

/**
 * ProfileSelector Component
 *
 * A reusable component for selecting profiles (children, recipients, etc.) using
 * visual profile icons instead of traditional dropdowns.
 *
 * Features:
 * - Single or multi-select modes
 * - Responsive grid layout
 * - Loading and empty states
 * - Keyboard navigation
 * - Full accessibility support
 *
 * @example
 * // Single select
 * <ProfileSelector
 *   items={children}
 *   selectedIds={[childId]}
 *   onSelect={(ids) => setChildId(ids[0])}
 *   mode="single"
 * />
 *
 * @example
 * // Multi select
 * <ProfileSelector
 *   items={recipients}
 *   selectedIds={selectedRecipientIds}
 *   onSelect={setSelectedRecipientIds}
 *   mode="multi"
 *   showSelectAll
 * />
 */
export function ProfileSelector({
  items,
  selectedIds,
  onSelect,
  mode = 'single',
  size = 'md',
  columns = {
    mobile: 2,
    tablet: 3,
    desktop: 4,
  },
  placeholder = 'Select an item',
  emptyMessage = 'No items available',
  loading = false,
  className,
  showSelectAll = false,
  maxHeight,
}: ProfileSelectorProps) {
  const handleItemClick = (itemId: string) => {
    if (mode === 'single') {
      // Single select: replace selection
      onSelect([itemId])
    } else {
      // Multi select: toggle selection
      if (selectedIds.includes(itemId)) {
        onSelect(selectedIds.filter(id => id !== itemId))
      } else {
        onSelect([...selectedIds, itemId])
      }
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      // Deselect all
      onSelect([])
    } else {
      // Select all
      onSelect(items.map(item => item.id))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, index: number) => {
    const gridCols = getGridColumns()

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        handleItemClick(itemId)
        break
      case 'ArrowRight':
        e.preventDefault()
        focusItem(index + 1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        focusItem(index - 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        focusItem(index + gridCols)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusItem(index - gridCols)
        break
      case 'Home':
        e.preventDefault()
        focusItem(0)
        break
      case 'End':
        e.preventDefault()
        focusItem(items.length - 1)
        break
    }
  }

  const focusItem = (index: number) => {
    if (index < 0 || index >= items.length) return

    const item = items[index]
    const element = document.querySelector(`[data-profile-id="${item.id}"]`) as HTMLElement
    element?.focus()
  }

  const getGridColumns = (): number => {
    // This is a simplified version - in production, you'd detect actual screen size
    if (typeof window === 'undefined') return columns.mobile || 2
    if (window.innerWidth >= 1024) return columns.desktop || 4
    if (window.innerWidth >= 640) return columns.tablet || 3
    return columns.mobile || 2
  }

  // Generate grid class based on columns
  const gridClass = cn(
    'grid gap-4',
    `grid-cols-${columns.mobile || 2}`,
    `sm:grid-cols-${columns.tablet || 3}`,
    `lg:grid-cols-${columns.desktop || 4}`
  )

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center p-8 rounded-lg border border-gray-200 bg-gray-50',
          className
        )}
      >
        <LoadingSpinner size="md" />
        <span className="ml-3 text-sm text-gray-600">Loading...</span>
      </div>
    )
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-gray-300 bg-gray-50',
          className
        )}
      >
        <svg
          className="w-12 h-12 text-gray-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="text-sm text-gray-600 text-center">{emptyMessage}</p>
        <p className="text-xs text-gray-500 mt-1">{placeholder}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with select all */}
      {mode === 'multi' && showSelectAll && (
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            {selectedIds.length} of {items.length} selected
          </p>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:underline"
          >
            {selectedIds.length === items.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* Profile grid */}
      <div
        className={cn(gridClass, maxHeight && 'overflow-y-auto')}
        style={maxHeight ? { maxHeight } : undefined}
        role={mode === 'multi' ? 'group' : 'radiogroup'}
        aria-label={placeholder}
      >
        {items.map((item, index) => {
          const isSelected = selectedIds.includes(item.id)

          return (
            <div
              key={item.id}
              onKeyDown={(e) => handleKeyDown(e, item.id, index)}
              role={mode === 'multi' ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              tabIndex={index === 0 ? 0 : -1}
            >
              <ProfileIcon
                id={item.id}
                name={item.name}
                photoUrl={item.photoUrl}
                alt={`${item.name}'s profile`}
                subtitle={item.subtitle}
                size={size}
                isSelected={isSelected}
                onClick={() => handleItemClick(item.id)}
              />
            </div>
          )
        })}
      </div>

      {/* Selection hint */}
      {mode === 'single' && selectedIds.length === 0 && (
        <p className="text-xs text-gray-500 text-center mt-2">
          {placeholder}
        </p>
      )}
    </div>
  )
}
