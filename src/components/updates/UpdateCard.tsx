'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { UpdateCardProps } from '@/lib/types/dashboard'
import ChildImage from '@/components/ui/ChildImage'
import RichTextRenderer from '@/components/ui/RichTextRenderer'
import { MediaGallery } from '@/components/media/MediaGallery'
import { getStatusDisplayText, getStatusColorClass } from '@/lib/utils/update-formatting'

/**
 * Enhanced UpdateCard component for displaying update previews with timeline styling
 */
const UpdateCard = memo<UpdateCardProps>(({ update, onClick, className }) => {
  const handleClick = () => {
    // Analytics tracking
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'update_card_click', {
        event_category: 'engagement',
        event_label: update.id,
        value: 1
      })
    }
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
        'bg-white rounded-xl shadow-sm border border-neutral-200 p-4 sm:p-5',
        'cursor-pointer transition-all duration-300 ease-out',
        'hover:shadow-lg hover:border-primary-200 hover:-translate-y-0.5',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'group relative overflow-hidden',
        'animate-slide-up',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View memory about ${update.child.name}: ${update.contentPreview}`}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-50/0 via-primary-50/20 to-primary-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      {/* Header with child info and timestamp */}
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Child avatar with enhanced styling */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-200 ring-2 ring-white shadow-sm group-hover:ring-primary-100 transition-all duration-300">
              <ChildImage
                childId={update.child.id}
                photoUrl={update.child.avatar}
                name={update.child.name}
                alt={`${update.child.name}'s photo`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Child name and age */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-neutral-900 truncate group-hover:text-primary-800 transition-colors duration-200">
              {update.child.name}
            </h3>
            <p className="text-sm text-neutral-600 mt-0.5">
              {update.child.age} old
            </p>
          </div>
        </div>

        {/* Timestamp and status */}
        <div className="flex-shrink-0 text-right space-y-1">
          <p className="text-sm text-neutral-500 font-medium">
            {update.timeAgo}
          </p>
          {update.distributionStatus !== 'sent' && (
            <div>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                  'shadow-sm border',
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
      <div className="relative z-10 mb-4">
        <RichTextRenderer
          content={update.content}
          subject={update.subject}
          richContent={update.rich_content}
          contentFormat={update.content_format}
          preview={true}
          previewLength={150}
          showSubject={true}
          showFormatIndicator={false}
          className="text-sm leading-relaxed"
        />
      </div>

      {/* Media preview */}
      {update.media_urls && update.media_urls.length > 0 && (
        <div className="relative z-10 mb-4">
          <MediaGallery
            mediaUrls={update.media_urls}
            maxPreview={3}
            className="grid-cols-3 gap-2"
            aspect="square"
          />
        </div>
      )}

      {/* Footer with enhanced engagement metrics */}
      <div className="relative z-10 flex items-center justify-between pt-3 border-t border-neutral-100">
        <div className="flex items-center space-x-4">
          {/* Response count with icon */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-neutral-100 rounded-full flex items-center justify-center group-hover:bg-primary-100 transition-colors duration-200">
              <svg
                className="w-3.5 h-3.5 text-neutral-500 group-hover:text-primary-600 transition-colors duration-200"
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
            </div>
            <span className="text-sm text-neutral-600 font-medium">
              {update.responseCount === 0 ? 'No responses yet' :
               update.responseCount === 1 ? '1 response' :
               `${update.responseCount} responses`}
            </span>
          </div>

          {/* Media count indicator */}
          {update.media_urls && update.media_urls.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-neutral-100 rounded-full flex items-center justify-center group-hover:bg-primary-100 transition-colors duration-200">
                <svg
                  className="w-3.5 h-3.5 text-neutral-500 group-hover:text-primary-600 transition-colors duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                  />
                </svg>
              </div>
              <span className="text-sm text-neutral-600 font-medium">
                {update.media_urls.length === 1 ? '1 attachment' : `${update.media_urls.length} attachments`}
              </span>
            </div>
          )}

          {/* Unread indicator with pulse */}
          {update.hasUnreadResponses && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              <span className="text-sm text-primary-600 font-semibold">
                New responses
              </span>
            </div>
          )}
        </div>

        {/* Enhanced view arrow */}
        <div className="flex items-center space-x-1 text-neutral-400 group-hover:text-primary-600 transition-all duration-200">
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            View
          </span>
          <svg
            className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform duration-200"
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
