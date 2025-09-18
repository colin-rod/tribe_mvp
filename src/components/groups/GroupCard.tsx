'use client'

import { RecipientGroup } from '@/lib/recipient-groups'
import { FREQUENCY_OPTIONS, CHANNEL_OPTIONS } from '@/lib/validation/recipients'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface GroupCardProps {
  group: RecipientGroup & { recipient_count: number }
  onEdit: (group: RecipientGroup) => void
  onDelete: (groupId: string) => void
  showActions?: boolean
  className?: string
  isLoading?: boolean
  error?: string | null
}

export default function GroupCard({
  group,
  onEdit,
  onDelete,
  showActions = true,
  className,
  isLoading = false,
  error = null
}: GroupCardProps) {
  const frequencyLabel = FREQUENCY_OPTIONS.find(
    option => option.value === group.default_frequency
  )?.label || group.default_frequency

  const channelLabels = group.default_channels.map(channel =>
    CHANNEL_OPTIONS.find(option => option.value === channel)?.label || channel
  )

  const getGroupDescription = (groupName: string) => {
    const descriptions = {
      'Close Family': 'Immediate family members who want frequent updates',
      'Extended Family': 'Extended family members like aunts, uncles, and cousins',
      'Friends': 'Friends and others who want to stay updated'
    }
    return descriptions[groupName as keyof typeof descriptions] || ''
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse",
        className
      )}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gray-200"></div>
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded mb-2 w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
          <div className="space-y-4 py-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 rounded w-12"></div>
                <div className="h-6 bg-gray-200 rounded w-10"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 overflow-hidden",
      error && "border-red-200 bg-red-50",
      className
    )}>
      {/* Header with badge */}
      <div className="flex items-start justify-between p-4 sm:p-6 pb-2">
        {/* Default group badge */}
        {group.is_default_group && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Default
            </span>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        {/* Group header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-shrink-0">
            <div className={cn(
              "w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center transition-colors",
              group.is_default_group
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-100 text-gray-600'
            )}>
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {group.name}
              </h3>
              {/* Action buttons - better positioned next to title */}
              {showActions && (
                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(group)}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                    title="Edit group"
                    aria-label={`Edit ${group.name} group`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  {!group.is_default_group && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(group.id)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      title="Delete group"
                      aria-label={`Delete ${group.name} group`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-medium text-gray-700">{group.recipient_count}</span>
              <span className="text-gray-500">{group.recipient_count === 1 ? 'recipient' : 'recipients'}</span>
            </div>
          </div>
        </div>

        {/* Default preferences */}
        <div className="space-y-4 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800">
              Frequency
            </h4>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded-md border border-primary-200">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {frequencyLabel}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800">
              Channels
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {channelLabels.map((channel, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md border border-gray-200"
                >
                  <div className="w-1.5 h-1.5 bg-current rounded-full" aria-hidden="true" />
                  {channel}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Group description for default groups */}
        {group.is_default_group && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed">
              {getGroupDescription(group.name)}
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}