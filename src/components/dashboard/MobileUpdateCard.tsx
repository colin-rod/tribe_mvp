'use client'

import React, { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRightIcon, ChatBubbleOvalLeftIcon, HeartIcon, ShareIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import ChildImage from '@/components/ui/ChildImage'

interface Child {
  id: string
  name: string
  avatar?: string
  age: string
}

interface Update {
  id: string
  child: Child
  content: string
  contentPreview: string
  createdAt: Date
  timeAgo: string
  mediaUrls?: string[]
  mediaCount?: number
  responseCount: number
  hasUnreadResponses: boolean
  distributionStatus: 'draft' | 'sending' | 'sent' | 'failed'
  isLiked?: boolean
  likeCount?: number
}

interface MobileUpdateCardProps {
  update: Update
  onClick: (updateId: string) => void
  onLike?: (updateId: string) => void
  onShare?: (updateId: string) => void
  onResponse?: (updateId: string) => void
  className?: string
  showMediaPreview?: boolean
}

const STATUS_CONFIG = {
  draft: {
    text: 'Draft',
    className: 'bg-neutral-100 text-neutral-600 border-neutral-200'
  },
  sending: {
    text: 'Sending...',
    className: 'bg-blue-100 text-blue-600 border-blue-200'
  },
  sent: {
    text: 'Sent',
    className: 'bg-success-100 text-success-600 border-success-200'
  },
  failed: {
    text: 'Failed',
    className: 'bg-error-100 text-error-600 border-error-200'
  }
}

export const MobileUpdateCard: React.FC<MobileUpdateCardProps> = ({
  update,
  onClick,
  onLike,
  onShare,
  onResponse,
  className,
  showMediaPreview = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const contentRef = useRef<HTMLParagraphElement>(null)

  const handleCardClick = () => {
    onClick(update.id)
  }

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLike?.(update.id)
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    onShare?.(update.id)
  }

  const handleResponse = (e: React.MouseEvent) => {
    e.stopPropagation()
    onResponse?.(update.id)
  }

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const needsExpansion = update.content.length > 150

  return (
    <article
      className={cn(
        'bg-white rounded-xl shadow-sm border border-neutral-200',
        'mx-4 mb-3 overflow-hidden transition-all duration-200',
        'hover:shadow-md hover:border-neutral-300 active:scale-98',
        'cursor-pointer group',
        className
      )}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
      aria-label={`Update about ${update.child.name}: ${update.contentPreview}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Child Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 ring-2 ring-transparent group-hover:ring-primary-200 transition-all">
              <ChildImage
                childId={update.child.id}
                photoUrl={update.child.avatar}
                name={update.child.name}
                alt={`${update.child.name}'s photo`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>

            {/* Unread indicator on avatar */}
            {update.hasUnreadResponses && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-white" />
            )}
          </div>

          {/* Child Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-neutral-900 truncate">
              {update.child.name}
            </h3>
            <p className="text-xs text-neutral-500">
              {update.child.age} • {update.timeAgo}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          {update.distributionStatus !== 'sent' && (
            <span className={cn(
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
              STATUS_CONFIG[update.distributionStatus].className
            )}>
              {STATUS_CONFIG[update.distributionStatus].text}
            </span>
          )}

          <ChevronRightIcon className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <div className="relative">
          <p
            ref={contentRef}
            className={cn(
              'text-sm text-neutral-700 leading-relaxed',
              !isExpanded && needsExpansion && 'line-clamp-3'
            )}
          >
            {update.content}
          </p>

          {needsExpansion && (
            <button
              onClick={handleExpandToggle}
              className="mt-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>

      {/* Media Preview */}
      {showMediaPreview && update.mediaUrls && update.mediaUrls.length > 0 && (
        <div className="px-4 pb-3">
          <div className="relative bg-neutral-100 rounded-lg overflow-hidden">
            <img
              src={update.mediaUrls[0]}
              alt={`Photo from ${update.child.name}'s update`}
              className="w-full h-40 object-cover"
              onError={() => setImageError(true)}
            />

            {/* Multiple media indicator */}
            {update.mediaCount && update.mediaCount > 1 && (
              <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium">
                +{update.mediaCount - 1}
              </div>
            )}

            {/* Play button for videos */}
            {update.mediaUrls[0].includes('.mp4') && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                  <div className="w-0 h-0 border-l-4 border-t-2 border-b-2 border-l-white border-t-transparent border-b-transparent ml-1" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-neutral-50/50 border-t border-neutral-100">
        <div className="flex items-center justify-between">
          {/* Left Side - Response Info */}
          <button
            onClick={handleResponse}
            className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            <ChatBubbleOvalLeftIcon className="w-4 h-4" />
            <span className="text-xs">
              {update.responseCount === 0 ? 'No responses' :
               update.responseCount === 1 ? '1 response' :
               `${update.responseCount} responses`}
            </span>

            {/* New responses indicator */}
            {update.hasUnreadResponses && (
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
                <span className="text-xs text-primary-600 font-medium">New</span>
              </div>
            )}
          </button>

          {/* Right Side - Action Buttons */}
          <div className="flex items-center space-x-1">
            {/* Like Button */}
            <button
              onClick={handleLike}
              className={cn(
                'p-2 rounded-full transition-all duration-200',
                'hover:bg-neutral-100 active:scale-95',
                update.isLiked ? 'text-red-500' : 'text-neutral-500 hover:text-red-500'
              )}
              aria-label={update.isLiked ? 'Unlike update' : 'Like update'}
            >
              {update.isLiked ? (
                <HeartSolidIcon className="w-4 h-4" />
              ) : (
                <HeartIcon className="w-4 h-4" />
              )}
            </button>

            {/* Like Count */}
            {update.likeCount && update.likeCount > 0 && (
              <span className="text-xs text-neutral-500 min-w-4 text-center">
                {update.likeCount}
              </span>
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-2 rounded-full text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-all duration-200 active:scale-95"
              aria-label="Share update"
            >
              <ShareIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Focus indicator for accessibility */}
      <div className="absolute inset-0 rounded-xl ring-2 ring-transparent focus-within:ring-primary-500 pointer-events-none" />
    </article>
  )
}

export default MobileUpdateCard
