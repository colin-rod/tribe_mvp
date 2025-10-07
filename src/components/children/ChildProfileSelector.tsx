'use client'

import { useState, useEffect } from 'react'
import { ProfileSelector, type ProfileItem } from '@/components/ui/ProfileSelector'
import { Child, getChildren } from '@/lib/children'
import { calculateAge, formatAgeShort } from '@/lib/age-utils'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ChildProfileSelector')

export interface ChildProfileSelectorProps {
  selectedChildId?: string
  onChildSelect: (childId: string) => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  placeholder?: string
  className?: string
  autoLoad?: boolean
}

/**
 * ChildProfileSelector Component
 *
 * A specialized version of ProfileSelector for selecting children.
 * Automatically loads children data and formats it for display with
 * profile photos and age information.
 *
 * @example
 * <ChildProfileSelector
 *   selectedChildId={childId}
 *   onChildSelect={setChildId}
 *   placeholder="Select a child for this update"
 * />
 */
export function ChildProfileSelector({
  selectedChildId,
  onChildSelect,
  size = 'lg',
  columns = {
    mobile: 2,
    tablet: 3,
    desktop: 4,
  },
  placeholder = 'Select a child',
  className,
  autoLoad = true,
}: ChildProfileSelectorProps) {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (autoLoad) {
      loadChildren()
    }
  }, [autoLoad])

  const loadChildren = async () => {
    try {
      setLoading(true)
      setError(null)
      const childrenData = await getChildren()
      setChildren(childrenData)
    } catch (err) {
      logger.errorWithStack('Error loading children:', err as Error)
      setError('Failed to load children')
    } finally {
      setLoading(false)
    }
  }

  // Convert children to ProfileItem format
  const profileItems: ProfileItem[] = children.map((child) => ({
    id: child.id,
    name: child.name,
    photoUrl: child.profile_photo_url,
    subtitle: formatAgeShort(calculateAge(child.birth_date)),
  }))

  const handleSelect = (ids: string[]) => {
    if (ids.length > 0) {
      onChildSelect(ids[0]) // Always single select for children
    }
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="p-4 border border-red-300 rounded-lg bg-red-50">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              type="button"
              onClick={loadChildren}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ProfileSelector
      items={profileItems}
      selectedIds={selectedChildId ? [selectedChildId] : []}
      onSelect={handleSelect}
      mode="single"
      size={size}
      columns={columns}
      placeholder={placeholder}
      emptyMessage="No children found. Add a child first."
      loading={loading}
      className={className}
    />
  )
}
