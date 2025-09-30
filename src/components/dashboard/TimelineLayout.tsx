'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { HeartIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import type { Update } from '@/lib/updates'

export interface UpdateForDisplay extends Update {
  child_name: string
  child_avatar: string | null
  response_count: number
}

interface TimelineLayoutProps {
  updates: UpdateForDisplay[]
  onLike?: (updateId: string) => void
  onComment?: (updateId: string) => void
}

export default function TimelineLayout({
  updates,
  onLike,
  onComment
}: TimelineLayoutProps) {
  const [likedUpdates, setLikedUpdates] = useState<Set<string>>(new Set())

  // Group updates by date
  const groupedUpdates = updates.reduce((acc, update) => {
    const date = new Date(update.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(update)
    return acc
  }, {} as Record<string, UpdateForDisplay[]>)

  const handleLike = (updateId: string) => {
    const newLiked = new Set(likedUpdates)
    if (newLiked.has(updateId)) {
      newLiked.delete(updateId)
    } else {
      newLiked.add(updateId)
    }
    setLikedUpdates(newLiked)
    onLike?.(updateId)
  }

  return (
    <div className="relative">
      {/* Vertical timeline line - soft and minimal */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-neutral-200 via-neutral-100 to-neutral-200 hidden md:block"
        style={{ transform: 'translateX(-50%)' }}
      />

      {/* Timeline items */}
      <div className="space-y-12 md:space-y-16">
        {Object.entries(groupedUpdates).map(([date, dateUpdates]) => (
          <div key={date} className="relative">
            {/* Date marker on timeline - refined styling */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative z-10 px-6 py-2 bg-white rounded-full border border-neutral-200">
                <span className="text-sm font-semibold text-neutral-800">{date}</span>
              </div>
            </div>

            {/* Updates for this date - alternate left/right on desktop */}
            <div className="space-y-12 md:space-y-16">
              {dateUpdates.map((update, updateIndex) => {
                const isLeft = updateIndex % 2 === 0
                const isLiked = likedUpdates.has(update.id)

                return (
                  <div
                    key={update.id}
                    className={`relative ${
                      isLeft
                        ? 'md:pr-[calc(50%+2rem)] md:text-right'
                        : 'md:pl-[calc(50%+2rem)] md:text-left'
                    }`}
                  >
                    {/* Connection dot on timeline - minimal */}
                    <div className="hidden md:block absolute top-4 left-1/2 w-3 h-3 bg-primary-400 rounded-full border-2 border-white z-10"
                      style={{ transform: 'translateX(-50%)' }}
                    />

                    {/* Update card - reduced shadow */}
                    <Card className={`overflow-hidden transition-all duration-300 ${
                      isLeft ? 'md:mr-8' : 'md:ml-8'
                    }`} hover>
                      {/* Media */}
                      {update.media_urls && update.media_urls.length > 0 && (
                        <div className="relative w-full aspect-[4/3] bg-neutral-100">
                          <Image
                            src={update.media_urls[0]}
                            alt={update.content || 'Update image'}
                            fill
                            className="object-cover"
                          />
                          {update.media_urls.length > 1 && (
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-70 rounded-full text-white text-xs font-medium">
                              +{update.media_urls.length - 1} more
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-4">
                        {/* Child info */}
                        <div className={`flex items-center space-x-2 mb-2 ${
                          isLeft ? 'md:justify-end' : 'md:justify-start'
                        } justify-start`}>
                          {update.child_avatar && (
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0">
                              <Image
                                src={update.child_avatar}
                                alt={update.child_name || 'Child'}
                                width={32}
                                height={32}
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className={isLeft ? 'md:text-right' : 'md:text-left'}>
                            <p className="text-sm font-semibold text-neutral-900">
                              {update.child_name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {new Date(update.created_at).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Caption */}
                        <p className={`text-sm text-neutral-700 leading-relaxed mb-3 ${
                          isLeft ? 'md:text-right' : 'md:text-left'
                        } text-left`}>
                          {update.content}
                        </p>

                        {/* Milestone badge */}
                        {update.milestone_type && (
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mb-3 ${
                            isLeft ? 'md:float-right md:ml-2' : 'md:float-left md:mr-2'
                          }`}>
                            🎉 {update.milestone_type.replace(/_/g, ' ')}
                          </div>
                        )}

                        {/* Engagement */}
                        <div className={`flex items-center space-x-4 pt-3 border-t border-neutral-100 ${
                          isLeft ? 'md:justify-end' : 'md:justify-start'
                        } justify-start`}>
                          <button
                            onClick={() => handleLike(update.id)}
                            className="flex items-center space-x-1 text-neutral-600 hover:text-red-500 transition-colors"
                          >
                            {isLiked ? (
                              <HeartIconSolid className="w-5 h-5 text-red-500" />
                            ) : (
                              <HeartIcon className="w-5 h-5" />
                            )}
                            <span className="text-sm">
                              {(update.response_count || 0) + (isLiked ? 1 : 0)}
                            </span>
                          </button>

                          <button
                            onClick={() => onComment?.(update.id)}
                            className="flex items-center space-x-1 text-neutral-600 hover:text-blue-500 transition-colors"
                          >
                            <ChatBubbleLeftIcon className="w-5 h-5" />
                            <span className="text-sm">{update.response_count || 0}</span>
                          </button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {updates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-500">No updates to display</p>
        </div>
      )}
    </div>
  )
}