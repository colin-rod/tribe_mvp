'use client'

import { useMemo } from 'react'
import { ProfileSelector, type ProfileItem } from '@/components/ui/ProfileSelector'
import { Recipient } from '@/lib/recipients'
import { RELATIONSHIP_OPTIONS } from '@/lib/validation/recipients'

export interface RecipientProfileSelectorProps {
  recipients: Recipient[]
  selectedRecipientIds: string[]
  onRecipientsChange: (recipientIds: string[]) => void
  loading?: boolean
  error?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  placeholder?: string
  emptyMessage?: string
  className?: string
  showSelectAll?: boolean
  maxHeight?: string
  highlightSuggested?: boolean
  suggestedIds?: string[]
}

/**
 * RecipientProfileSelector Component
 *
 * A specialized version of ProfileSelector for selecting recipients.
 * Supports multi-select mode and displays recipient relationships.
 * Can highlight AI-suggested recipients.
 *
 * @example
 * <RecipientProfileSelector
 *   recipients={recipients}
 *   selectedRecipientIds={selectedIds}
 *   onRecipientsChange={setSelectedIds}
 *   showSelectAll
 *   highlightSuggested
 *   suggestedIds={aiSuggestedIds}
 * />
 */
export function RecipientProfileSelector({
  recipients,
  selectedRecipientIds,
  onRecipientsChange,
  loading = false,
  error = null,
  size = 'md',
  columns = {
    mobile: 2,
    tablet: 3,
    desktop: 4,
  },
  placeholder = 'Select recipients',
  emptyMessage = 'No recipients found. Add recipients first.',
  className,
  showSelectAll = true,
  maxHeight,
  highlightSuggested = false,
  suggestedIds = [],
}: RecipientProfileSelectorProps) {
  // Convert recipients to ProfileItem format
  const profileItems: ProfileItem[] = useMemo(() => {
    return recipients.map((recipient) => {
      // Get relationship label
      const relationshipLabel = RELATIONSHIP_OPTIONS.find(
        (option) => option.value === recipient.relationship
      )?.label || recipient.relationship

      return {
        id: recipient.id,
        name: recipient.name,
        photoUrl: undefined, // Recipients don't have photos yet
        subtitle: relationshipLabel,
      }
    })
  }, [recipients])

  // Apply suggested recipients highlighting if enabled
  const handleApplySuggestions = () => {
    if (highlightSuggested && suggestedIds.length > 0) {
      onRecipientsChange(Array.from(new Set([...suggestedIds])))
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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* AI Suggestions hint */}
      {highlightSuggested && suggestedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">
                AI suggested {suggestedIds.length} {suggestedIds.length === 1 ? 'recipient' : 'recipients'}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Based on your update content and recipient preferences
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplySuggestions}
            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Apply suggestions
          </button>
        </div>
      )}

      {/* Profile selector */}
      <ProfileSelector
        items={profileItems}
        selectedIds={selectedRecipientIds}
        onSelect={onRecipientsChange}
        mode="multi"
        size={size}
        columns={columns}
        placeholder={placeholder}
        emptyMessage={emptyMessage}
        loading={loading}
        className={className}
        showSelectAll={showSelectAll}
        maxHeight={maxHeight}
      />
    </div>
  )
}
