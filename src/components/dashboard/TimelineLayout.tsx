'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { HeartIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import type { Update } from '@/lib/updates'
import { Skeleton } from '@/components/ui/SkeletonLoader'

export interface UpdateForDisplay extends Update {
  child_name: string
  child_avatar: string | null
  response_count: number
}

type TimelineLayoutState = 'loading' | 'empty' | 'ready'

interface TimelineLayoutProps {
  updates: UpdateForDisplay[]
  onLike?: (memoryId: string) => void
  onComment?: (memoryId: string) => void
  state?: TimelineLayoutState
  skeletonGroupCount?: number
}

export default function TimelineLayout({
  updates,
  onLike,
  onComment,
  state,
  skeletonGroupCount = 3
}: TimelineLayoutProps) {
  const [likedUpdates, setLikedUpdates] = useState<Set<string>>(new Set())

  const safeSkeletonGroupCount = Math.max(1, skeletonGroupCount)
  const isEmpty = updates.length === 0
  const resolvedState: TimelineLayoutState = state ?? (isEmpty ? 'empty' : 'ready')
  const showSkeleton =
    resolvedState === 'loading' || (resolvedState === 'empty' && isEmpty)
  const showTimelineContent = resolvedState === 'ready' && updates.length > 0
  const showEmptyMessage = isEmpty && resolvedState !== 'loading'
  const animateSkeletons = resolvedState === 'loading'

  // Group memories by date
  const groupedUpdates = updates.reduce((acc, update) => {
    const createdAtDate = update.created_at ? new Date(update.created_at) : null
    const dateLabel = createdAtDate ? createdAtDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Unknown Date'

    if (!acc[dateLabel]) {
      acc[dateLabel] = []
    }
    acc[dateLabel].push(update)
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

  const skeletonProps = { animate: animateSkeletons } as const

  const renderSkeletonCard = (isLeft: boolean, key: number) => (
    <div
      key={key}
      className={`relative ${
        isLeft
          ? 'md:pr-[calc(50%+2rem)] md:text-right'
          : 'md:pl-[calc(50%+2rem)] md:text-left'
      }`}
    >
      <div
        className="hidden md:block absolute top-4 left-1/2 w-3 h-3 bg-primary-200 rounded-full border-2 border-white z-10"
        style={{ transform: 'translateX(-50%)' }}
      />
      <Card
        className={`overflow-hidden transition-all duration-300 ${
          isLeft ? 'md:mr-8' : 'md:ml-8'
        }`}
      >
        <div className="relative w-full aspect-[4/3] bg-neutral-100">
          <Skeleton
            {...skeletonProps}
            className="absolute inset-0 h-full w-full rounded-none"
          />
        </div>
        <div className="p-4">
          <div
            className={`flex items-center space-x-2 mb-2 ${
              isLeft ? 'md:justify-end' : 'md:justify-start'
            } justify-start`}
          >
            <Skeleton {...skeletonProps} className="w-8 h-8 rounded-full" />
            <div
              className={`${
                isLeft ? 'md:text-right' : 'md:text-left'
              } text-left space-y-1`}
            >
              <Skeleton {...skeletonProps} className="h-4 w-28" />
              <Skeleton {...skeletonProps} className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-2 mb-3">
            <Skeleton {...skeletonProps} className="h-4 w-full" />
            <Skeleton {...skeletonProps} className="h-4 w-3/4" />
            <Skeleton {...skeletonProps} className="h-4 w-2/3" />
          </div>
          <div
            className={`flex ${
              isLeft ? 'md:justify-end' : 'md:justify-start'
            } justify-start mb-3`}
          >
            <Skeleton
              {...skeletonProps}
              className="h-6 w-24 rounded-full"
            />
          </div>
          <div
            className={`flex items-center space-x-4 pt-3 border-t border-neutral-100 ${
              isLeft ? 'md:justify-end' : 'md:justify-start'
            } justify-start`}
          >
            <Skeleton {...skeletonProps} className="h-5 w-16 rounded-full" />
            <Skeleton {...skeletonProps} className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </Card>
    </div>
  )

  return (
    <div className="relative">
      {/* Vertical timeline line - soft and minimal */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-neutral-200 via-neutral-100 to-neutral-200 hidden md:block"
        style={{ transform: 'translateX(-50%)' }}
      />

      {showSkeleton && (
        <div className="space-y-12 md:space-y-16">
          {Array.from({ length: safeSkeletonGroupCount }, (_, groupIndex) => {
            const totalIndexStart = groupIndex * 2
            return (
              <div key={groupIndex} className="relative">
                <div className="flex items-center justify-center mb-8">
                  <div className="relative z-10 px-6 py-2 bg-white rounded-full border border-neutral-200">
                    <Skeleton
                      {...skeletonProps}
                      className="h-4 w-32 rounded-full"
                    />
                  </div>
                </div>
                <div className="space-y-12 md:space-y-16">
                  {Array.from({ length: 2 }, (_, cardIndex) =>
                    renderSkeletonCard((totalIndexStart + cardIndex) % 2 === 0, cardIndex)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

            {/* Memories for this date - alternate left/right on desktop */}
            <ul className="space-y-12 md:space-y-16">
              {dateUpdates.map((update, updateIndex) => {
                const isLeft = updateIndex % 2 === 0
                const isLiked = likedUpdates.has(update.id)

                return (
                  <li
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
                      <div
                        className="hidden md:block absolute top-4 left-1/2 w-3 h-3 bg-primary-400 rounded-full border-2 border-white z-10"
                        style={{ transform: 'translateX(-50%)' }}
                      />

                      <Card
                        className={`overflow-hidden transition-all duration-300 ${
                          isLeft ? 'md:mr-8' : 'md:ml-8'
                        }`}
                        hover
                      >
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

                        {/* Engagement */}
                        <div className={`flex items-center space-x-4 pt-3 border-t border-neutral-100 ${
                          isLeft ? 'md:justify-end' : 'md:justify-start'
                        } justify-start`}>
                          <button
                            onClick={() => handleLike(update.id)}
                            aria-pressed={isLiked}
                            aria-label={`${isLiked ? 'Unlike' : 'Like'} update from ${update.child_name}`}
                            className="flex items-center space-x-1 text-neutral-600 hover:text-red-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                          >
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
                            <span className="sr-only">
                              {isLiked ? 'Liked' : 'Not liked'}
                            </span>
                            <span className="text-sm">
                              {(update.response_count || 0) + (isLiked ? 1 : 0)}
                            </span>
                          </button>

                          <button
                            onClick={() => onComment?.(update.id)}
                            aria-label={`Comment on update from ${update.child_name}`}
                            className="flex items-center space-x-1 text-neutral-600 hover:text-blue-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                          >
                            <ChatBubbleLeftIcon className="w-5 h-5" />
                            <span className="sr-only">Comments</span>
                            <span className="text-sm">{update.response_count || 0}</span>
                          </button>
                        </div>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {showEmptyMessage && (
        <div className="text-center py-12">
          <p className="text-neutral-500">No updates to display</p>
        </div>
      )}
    </div>
  )
}
