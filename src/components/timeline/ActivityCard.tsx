'use client'

import { memo, useState, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { UpdateCardData } from '@/lib/types/dashboard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import LikeButton from '@/components/ui/LikeButton'
import RichTextRenderer from '@/components/ui/RichTextRenderer'

interface ActivityCardProps {
  update: UpdateCardData
  onClick?: (updateId: string) => void
  showActions?: boolean
  showMetadata?: boolean
  compact?: boolean
  className?: string
}

/**
 * Enhanced activity card component for timeline display
 * Features optimistic interactions, media preview, and responsive design
 */
const ActivityCard = memo<ActivityCardProps>(function ActivityCard({
  update,
  onClick,
  showActions = true,
  showMetadata = true,
  compact = false,
  className
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(update.id)
    }
  }, [onClick, update.id])

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
  }, [])

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  // Get primary media for preview
  const primaryMediaUrl = update.media_urls?.[0]
  const hasMedia = primaryMediaUrl && !imageError
  const mediaCount = update.media_urls?.length || 0

  // Determine media type from URL extension
  const getMediaType = (url: string): 'image' | 'video' | 'other' => {
    if (!url) return 'other'
    const extension = url.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image'
    if (['mp4', 'webm', 'ogg', 'mov'].includes(extension || '')) return 'video'
    return 'other'
  }

  const primaryMediaType = primaryMediaUrl ? getMediaType(primaryMediaUrl) : 'other'

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  // Get content type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'video':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )
      case 'milestone':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'text':
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
    }
  }

  return (
    <article
      className={cn(
        'bg-white rounded-lg border border-neutral-200 hover:border-neutral-300',
        'transition-all duration-200 hover:shadow-md',
        'group cursor-pointer',
        compact ? 'p-3' : 'p-4',
        className
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <header className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={cn(
            'flex-shrink-0 rounded-full flex items-center justify-center',
            'bg-primary-50 text-primary-600',
            compact ? 'w-8 h-8' : 'w-10 h-10'
          )}>
            {getTypeIcon(update.milestone_type || 'general')}
          </div>

          <div className="min-w-0 flex-1">
            <div className={cn(
              'font-semibold text-neutral-900',
              compact ? 'text-sm' : 'text-base'
            )}>
              <RichTextRenderer
                content={update.content}
                subject={update.subject}
                richContent={update.rich_content}
                contentFormat={update.content_format}
                preview={true}
                previewLength={compact ? 80 : 120}
                showSubject={true}
                showFormatIndicator={false}
                className="line-clamp-2"
              />
            </div>

            {showMetadata && (
              <div className="flex items-center space-x-2 text-xs text-neutral-500 mt-1">
                <span>{formatTime(update.createdAt.toISOString())}</span>
                {update.child.name && (
                  <>
                    <span>•</span>
                    <span className="text-primary-600 font-medium">
                      {update.child.name}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status and actions */}
        <div className="flex items-center space-x-2">
          {update.distributionStatus && (
            <Badge
              variant={
                update.distributionStatus === 'sent' ? 'success' :
                update.distributionStatus === 'sending' ? 'warning' :
                update.distributionStatus === 'failed' ? 'error' : 'secondary'
              }
              size="sm"
              className="text-xs"
            >
              {update.distributionStatus}
            </Badge>
          )}

          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                // Handle action menu
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </Button>
          )}
        </div>
      </header>

      {/* Media Preview */}
      {hasMedia && (
        <div className={cn(
          'relative rounded-lg overflow-hidden mb-3 bg-neutral-100',
          compact ? 'h-32' : 'h-48'
        )}>
          {primaryMediaType === 'image' ? (
            <>
              <Image
                src={primaryMediaUrl}
                alt={update.contentPreview}
                fill
                className={cn(
                  'object-cover transition-opacity duration-300',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={handleImageLoad}
                onError={handleImageError}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />

              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                </div>
              )}

              {/* Media count indicator */}
              {mediaCount > 1 && (
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                  +{mediaCount - 1}
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-200">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-2 text-neutral-400">
                  {getTypeIcon(primaryMediaType)}
                </div>
                <p className="text-xs text-neutral-600">
                  {primaryMediaType.toUpperCase()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {update.content && (
        <div className="mb-3">
          <RichTextRenderer
            content={update.content}
            subject={update.subject}
            richContent={update.rich_content}
            contentFormat={update.content_format}
            showSubject={false} // Subject already shown in header preview
            showFormatIndicator={false}
            className={cn(
              'text-neutral-700 line-clamp-3',
              compact ? 'text-sm' : 'text-base'
            )}
          />
        </div>
      )}

      {/* Milestone Type */}
      {update.milestone_type && (
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge
            variant="secondary"
            size="sm"
            className="text-xs"
          >
            {update.milestone_type.replace('_', ' ')}
          </Badge>
        </div>
      )}

      {/* Footer with engagement stats */}
      {showMetadata && (update.responseCount > 0 || update.like_count > 0) && (
        <footer className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <div className="flex items-center space-x-4 text-xs text-neutral-500">
            {/* Like button */}
            <LikeButton
              updateId={update.id}
              initialLiked={update.isLiked}
              initialCount={update.like_count}
              size="sm"
              showCount={true}
              className="hover:bg-neutral-50 p-1 rounded-md -m-1"
              onLikeChange={(_isLiked, _count) => {
                // Optional: Update parent component state if needed
                // Like state updated
              }}
            />

            {update.responseCount > 0 && (
              <span className="flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{update.responseCount} responses</span>
              </span>
            )}
          </div>

          <div className="text-xs text-neutral-400">
            {update.distributionStatus === 'sent' && 'Delivered'}
          </div>
        </footer>
      )}
    </article>
  )
})

ActivityCard.displayName = 'ActivityCard'

export default ActivityCard
