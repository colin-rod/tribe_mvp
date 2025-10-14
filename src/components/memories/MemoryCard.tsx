'use client'

import { memo, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { MemoryCardProps } from '@/lib/types/memory'
import ChildImage from '@/components/ui/ChildImage'
import RichTextRenderer from '@/components/ui/RichTextRenderer'
import { MediaGallery } from '@/components/media/MediaGallery'
import {
  getStatusDisplayText,
  getStatusColorClass,
  shouldShowNewBadge,
  canApproveMemory
} from '@/lib/utils/memory-formatting'
import { approveMemory } from '@/lib/memories'
import { toast } from 'sonner'
import { MetadataBadge } from '@/components/metadata'

/**
 * Enhanced MemoryCard component for displaying memory previews with timeline styling
 */
const MemoryCard = memo<MemoryCardProps>(({ memory, onClick, className }) => {
  const [isApproving, setIsApproving] = useState(false)
  const [localStatus, setLocalStatus] = useState(memory.distributionStatus)
  const [showNewBadge, setShowNewBadge] = useState(memory.isNew)
  const [showDetails, setShowDetails] = useState(false)

  const insightCopy = useMemo(() => buildInsightCopy(memory), [memory])

  const handleClick = () => {
    // Analytics tracking
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'memory_card_click', {
        event_category: 'engagement',
        event_label: memory.id,
        value: 1
      })
    }
    onClick(memory.id)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(memory.id)
    }
  }

  const handleApprove = async (event: React.MouseEvent) => {
    event.stopPropagation() // Prevent card click

    setIsApproving(true)
    try {
      await approveMemory(memory.id)
      setLocalStatus('approved')
      setShowNewBadge(false)
      toast.success('Memory marked as ready for compilation!')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to approve memory:', error)
      toast.error('Failed to mark memory as ready')
    } finally {
      setIsApproving(false)
    }
  }

  const handleToggleDetails = (event: React.MouseEvent) => {
    event.stopPropagation()
    setShowDetails((prev) => !prev)
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
      aria-label={`View memory about ${memory.child.name}: ${memory.contentPreview}`}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-50/0 via-primary-50/20 to-primary-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* New Badge - Top left corner */}
      {shouldShowNewBadge(showNewBadge, localStatus) && (
        <div className="absolute top-3 left-3 z-20">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg animate-pulse">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            New
          </span>
        </div>
      )}

      {/* Header with child info and timestamp */}
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Child avatar with enhanced styling */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-200 ring-2 ring-white shadow-sm group-hover:ring-primary-100 transition-all duration-300">
              <ChildImage
                childId={memory.child.id}
                photoUrl={memory.child.avatar}
                name={memory.child.name}
                alt={`${memory.child.name}'s photo`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Child name and age */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-neutral-900 truncate group-hover:text-primary-800 transition-colors duration-200">
              {memory.child.name}
            </h3>
            <p className="text-sm text-neutral-600 mt-0.5">
              {memory.child.age} old
            </p>
          </div>
        </div>

        {/* Timestamp and status */}
        <div className="flex-shrink-0 text-right space-y-1">
          <p className="text-sm text-neutral-500 font-medium">
            {memory.timeAgo}
          </p>
        </div>
      </div>

      {/* Content preview */}
      <div className="relative z-10 mb-4">
        {insightCopy && (
          <p className="text-sm text-primary-700 font-medium mb-3 leading-relaxed">
            {insightCopy}
          </p>
        )}
        <RichTextRenderer
          content={memory.content}
          subject={memory.subject ?? undefined}
          richContent={memory.rich_content ?? undefined}
          contentFormat={memory.content_format ?? undefined}
          preview={true}
          previewLength={220}
          showSubject={true}
          showFormatIndicator={false}
          className="text-base leading-7 text-neutral-700"
        />
      </div>

      {/* Media preview */}
      {memory.media_urls && memory.media_urls.length > 0 && (
        <div className="relative z-10 mb-4">
          <MediaGallery
            mediaUrls={memory.media_urls}
            maxPreview={3}
            className="grid-cols-3 gap-2"
            aspect="square"
          />
        </div>
      )}

      {/* Details affordance */}
      <div className="relative z-10 pt-4 border-t border-neutral-100">
        <button
          type="button"
          onClick={handleToggleDetails}
          className="flex items-center justify-between w-full text-sm font-medium text-neutral-600 hover:text-neutral-900"
          aria-expanded={showDetails}
        >
          <span>Details</span>
          <svg
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              showDetails ? 'transform rotate-180' : 'transform rotate-0'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showDetails && (
          <div className="mt-3 space-y-4 text-sm text-neutral-600">
            {localStatus !== 'sent' && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Status</span>
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                    'shadow-sm border',
                    getStatusColorClass(localStatus)
                  )}
                >
                  {getStatusDisplayText(localStatus)}
                </span>
              </div>
            )}

            {memory.metadata && (
              <div className="space-y-2">
                <span className="block text-neutral-500">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {memory.metadata.milestones?.map((milestone) => (
                    <MetadataBadge
                      key={milestone}
                      value={milestone}
                      category="milestones"
                      size="sm"
                    />
                  ))}
                  {memory.metadata.locations?.map((location) => (
                    <MetadataBadge
                      key={location}
                      value={location}
                      category="locations"
                      size="sm"
                    />
                  ))}
                  {memory.metadata.people?.map((person) => (
                    <MetadataBadge
                      key={person}
                      value={person}
                      category="people"
                      size="sm"
                    />
                  ))}
                  {memory.metadata.dates?.map((date) => (
                    <MetadataBadge
                      key={date}
                      value={date}
                      category="dates"
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="block text-neutral-500">Engagement</span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>Responses</span>
                  <span className="font-medium text-neutral-700">
                    {memory.responseCount === 0 ? 'No responses yet' :
                     memory.responseCount === 1 ? '1 response' :
                     `${memory.responseCount} responses`}
                  </span>
                </div>
                {memory.media_urls && memory.media_urls.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Attachments</span>
                    <span className="font-medium text-neutral-700">
                      {memory.media_urls.length === 1 ? '1 attachment' : `${memory.media_urls.length} attachments`}
                    </span>
                  </div>
                )}
                {memory.hasUnreadResponses && (
                  <div className="flex items-center justify-between text-primary-600 font-semibold">
                    <span>Unread replies</span>
                    <span className="flex items-center space-x-2">
                      <span>New responses</span>
                      <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end">
              {canApproveMemory(localStatus) && (
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium',
                    'bg-primary-600 text-white',
                    'hover:bg-primary-700 active:bg-primary-800',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'flex items-center space-x-2'
                  )}
                  aria-label="Mark memory as ready for compilation"
                >
                  {isApproving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Marking...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Mark as Ready</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

MemoryCard.displayName = 'MemoryCard'

export default MemoryCard

function buildInsightCopy(memory: MemoryCardProps['memory']): string | null {
  const metadata = memory.metadata
  if (!metadata) return null

  const fragments: string[] = []

  if (metadata.milestones?.length) {
    fragments.push(`celebrated ${formatList(metadata.milestones)}`)
  }

  if (metadata.locations?.length) {
    fragments.push(`at ${formatList(metadata.locations)}`)
  }

  if (metadata.people?.length) {
    fragments.push(`with ${formatList(metadata.people)}`)
  }

  if (fragments.length === 0) {
    return null
  }

  return `${memory.child.name} ${fragments.join(', ')}.`
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}
