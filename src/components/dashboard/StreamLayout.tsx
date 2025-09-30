'use client'

import { useState } from 'react'
import Image from 'next/image'
import { HeartIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import type { UpdateForDisplay } from './TimelineLayout'

interface StreamLayoutProps {
  updates: UpdateForDisplay[]
  onLike?: (updateId: string) => void
  onComment?: (updateId: string) => void
}

export default function StreamLayout({
  updates,
  onLike,
  onComment
}: StreamLayoutProps) {
  const [likedUpdates, setLikedUpdates] = useState<Set<string>>(new Set())

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
    <div className="space-y-px">
      {updates.map((update) => {
        const isLiked = likedUpdates.has(update.id)

        return (
          <div
            key={update.id}
            className="relative group bg-white hover:bg-neutral-50 transition-colors"
          >
            {/* Media - edge to edge */}
            {update.media_urls && update.media_urls.length > 0 && (
              <div className="relative w-full aspect-[16/9] bg-neutral-900">
                <Image
                  src={update.media_urls[0]}
                  alt={update.content || 'Update image'}
                  fill
                  className="object-cover"
                />

                {/* Overlay content - softer gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Text overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  {/* Child info */}
                  <div className="flex items-center space-x-3 mb-3">
                    {update.child_avatar && (
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 bg-neutral-800">
                        <Image
                          src={update.child_avatar}
                          alt={update.child_name || 'Child'}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white text-shadow">
                        {update.child_name}
                      </p>
                      <p className="text-xs text-white/90 text-shadow">
                        {new Date(update.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Caption */}
                  {update.content && (
                    <p className="text-sm leading-relaxed text-white text-shadow mb-3 line-clamp-3">
                      {update.content}
                    </p>
                  )}

                  {/* Milestone badge */}
                  {update.milestone_type && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 text-purple-700 backdrop-blur-sm">
                      🎉 {update.milestone_type.replace(/_/g, ' ')}
                    </span>
                  )}

                  {/* Engagement overlay */}
                  <div className="flex items-center space-x-4 mt-4">
                    <button
                      onClick={() => handleLike(update.id)}
                      className="flex items-center space-x-1.5 text-white/90 hover:text-white transition-colors"
                    >
                      {isLiked ? (
                        <HeartIconSolid className="w-5 h-5 text-red-500" />
                      ) : (
                        <HeartIcon className="w-5 h-5" />
                      )}
                      <span className="text-sm font-medium">
                        {(update.response_count || 0) + (isLiked ? 1 : 0)}
                      </span>
                    </button>

                    <button
                      onClick={() => onComment?.(update.id)}
                      className="flex items-center space-x-1.5 text-white/90 hover:text-white transition-colors"
                    >
                      <ChatBubbleLeftIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {update.response_count || 0}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Media count indicator */}
                {update.media_urls.length > 1 && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                    1/{update.media_urls.length}
                  </div>
                )}
              </div>
            )}

            {/* Text-only updates */}
            {(!update.media_urls || update.media_urls.length === 0) && (
              <div className="p-6 border-b border-neutral-100">
                {/* Child info */}
                <div className="flex items-center space-x-3 mb-4">
                  {update.child_avatar && (
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200">
                      <Image
                        src={update.child_avatar}
                        alt={update.child_name || 'Child'}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {update.child_name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(update.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Caption */}
                <p className="text-sm text-neutral-700 leading-relaxed mb-4">
                  {update.content}
                </p>

                {/* Milestone badge */}
                {update.milestone_type && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mb-4">
                    🎉 {update.milestone_type.replace(/_/g, ' ')}
                  </span>
                )}

                {/* Engagement */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleLike(update.id)}
                    className="flex items-center space-x-1.5 text-neutral-600 hover:text-red-500 transition-colors"
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
                    className="flex items-center space-x-1.5 text-neutral-600 hover:text-blue-500 transition-colors"
                  >
                    <ChatBubbleLeftIcon className="w-5 h-5" />
                    <span className="text-sm">{update.response_count || 0}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Empty state */}
      {updates.length === 0 && (
        <div className="text-center py-12 bg-white">
          <p className="text-neutral-500">No updates to display</p>
        </div>
      )}

      <style jsx>{`
        .text-shadow {
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  )
}