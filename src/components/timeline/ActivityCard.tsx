'use client'

import { memo, useState, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { UpdateCardData } from '@/lib/types/dashboard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

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
  const primaryMedia = update.media?.[0]
  const hasMedia = primaryMedia && !imageError
  const mediaCount = update.media?.length || 0

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
            {getTypeIcon(update.type)}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className={cn(
              'font-semibold text-neutral-900 truncate',
              compact ? 'text-sm' : 'text-base'
            )}>
              {update.title}
            </h3>

            {showMetadata && (
              <div className="flex items-center space-x-2 text-xs text-neutral-500 mt-1">
                <span>{formatTime(update.createdAt)}</span>
                {update.childName && (
                  <>
                    <span>•</span>
                    <span className="text-primary-600 font-medium">
                      {update.childName}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status and actions */}
        <div className="flex items-center space-x-2">
          {update.deliveryStatus && (
            <Badge
              variant={
                update.deliveryStatus === 'sent' ? 'success' :
                update.deliveryStatus === 'pending' ? 'warning' :
                update.deliveryStatus === 'failed' ? 'error' : 'secondary'
              }
              size="sm"
              className="text-xs"
            >
              {update.deliveryStatus}
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
          {primaryMedia.type === 'image' ? (
            <>
              <Image
                src={primaryMedia.url}
                alt={update.title}
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
                  {getTypeIcon(primaryMedia.type)}
                </div>
                <p className="text-xs text-neutral-600">
                  {primaryMedia.type.toUpperCase()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {update.excerpt && (
        <div className="mb-3">
          <p className={cn(
            'text-neutral-700 line-clamp-3',
            compact ? 'text-sm' : 'text-base'
          )}>
            {update.excerpt}
          </p>
        </div>
      )}

      {/* Tags */}
      {update.tags && update.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {update.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              {tag}
            </Badge>
          ))}
          {update.tags.length > 3 && (
            <Badge variant="secondary" size="sm" className="text-xs">
              +{update.tags.length - 3} more
            </Badge>
          )}
        </div>
      )}

      {/* Footer with engagement stats */}
      {showMetadata && (update.stats.views > 0 || update.stats.responses > 0) && (
        <footer className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <div className="flex items-center space-x-4 text-xs text-neutral-500">
            {update.stats.views > 0 && (
              <span className="flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{update.stats.views}</span>
              </span>
            )}

            {update.stats.responses > 0 && (
              <span className="flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{update.stats.responses}</span>
              </span>
            )}
          </div>

          <div className="text-xs text-neutral-400">
            {update.recipientCount > 0 && `Sent to ${update.recipientCount}`}
          </div>
        </footer>
      )}
    </article>
  )
})

ActivityCard.displayName = 'ActivityCard'

export default ActivityCard
