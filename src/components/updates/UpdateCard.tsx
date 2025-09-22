'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { UpdateCardProps } from '@/lib/types/dashboard'
import ChildImage from '@/components/ui/ChildImage'
import { getStatusDisplayText, getStatusColorClass } from '@/lib/utils/update-formatting'

/**
 * UpdateCard component for displaying update previews in the dashboard
 */
const UpdateCard = memo<UpdateCardProps>(({ update, onClick, className }) => {
  const handleClick = () => {
    onClick(update.id)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(update.id)
    }
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200 p-4',
        'cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-gray-300 hover:bg-gray-50',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'group',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View update about ${update.child.name}: ${update.contentPreview}`}
    >
      {/* Header with child info and timestamp */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Child avatar */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
              <ChildImage
                childId={update.child.id}
                photoUrl={update.child.avatar}
                alt={`${update.child.name}'s photo`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Child name and age */}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {update.child.name}
            </h3>
            <p className="text-xs text-gray-500">
              {update.child.age} old
            </p>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-gray-500">
            {update.timeAgo}
          </p>
          {update.distributionStatus !== 'sent' && (
            <div className="mt-1">
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  getStatusColorClass(update.distributionStatus)
                )}
              >
                {getStatusDisplayText(update.distributionStatus)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content preview */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 leading-relaxed">
          {update.contentPreview}
        </p>
      </div>

      {/* Footer with response info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Response count */}
          <div className="flex items-center space-x-1">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-xs text-gray-500">
              {update.responseCount === 0 ? 'No responses' :
               update.responseCount === 1 ? '1 response' :
               `${update.responseCount} responses`}
            </span>
          </div>

          {/* Unread indicator */}
          {update.hasUnreadResponses && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary-500 rounded-full" />
              <span className="text-xs text-primary-600 font-medium">
                New
              </span>
            </div>
          )}
        </div>

        {/* View arrow */}
        <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </div>
  )
})

UpdateCard.displayName = 'UpdateCard'

export default UpdateCard