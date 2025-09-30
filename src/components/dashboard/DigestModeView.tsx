'use client'

import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { SparklesIcon } from '@heroicons/react/24/outline'
import type { UpdateForDisplay } from './TimelineLayout'

interface DigestModeViewProps {
  updates: UpdateForDisplay[]
}

export default function DigestModeView({ updates }: DigestModeViewProps) {
  // Group updates by day
  const groupedByDay = updates.reduce((acc, update) => {
    const day = new Date(update.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })

    if (!acc[day]) {
      acc[day] = []
    }
    acc[day].push(update)
    return acc
  }, {} as Record<string, UpdateForDisplay[]>)

  // Calculate week summary
  const totalUpdates = updates.length
  const uniqueChildren = new Set(updates.map(u => u.child_name)).size
  const milestones = updates.filter(u => u.milestone_type).length

  return (
    <div className="space-y-6">
      {/* Digest Header - refined styling */}
      <Card className="overflow-hidden bg-gradient-to-br from-primary-50/50 to-white border-primary-100">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <SparklesIcon className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-bold text-neutral-900">
                  This Week&apos;s Highlights
                </h2>
              </div>
              <p className="text-sm text-neutral-600">
                {new Date(updates[updates.length - 1]?.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric'
                })} - {new Date(updates[0]?.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">{totalUpdates}</p>
              <p className="text-xs text-neutral-600">updates</p>
            </div>
          </div>

          {/* AI Summary - refined */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-neutral-200">
            <p className="text-sm text-neutral-700 leading-relaxed">
              <span className="font-semibold text-primary-700">AI Summary:</span>{' '}
              {totalUpdates} new update{totalUpdates > 1 ? 's' : ''} from{' '}
              {uniqueChildren} child{uniqueChildren > 1 ? 'ren' : ''} this week
              {milestones > 0 && (
                <>, including {milestones} milestone{milestones > 1 ? 's' : ''} 🎉</>
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* Daily groupings */}
      {Object.entries(groupedByDay).map(([day, dayUpdates]) => (
        <Card key={day} className="overflow-hidden">
          <div className="bg-neutral-50 px-6 py-3 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">{day}</h3>
              <span className="text-xs text-neutral-500">
                {dayUpdates.length} update{dayUpdates.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="divide-y divide-neutral-100">
            {dayUpdates.map((update) => (
              <div key={update.id} className="p-4 hover:bg-neutral-50 transition-colors">
                <div className="flex gap-4">
                  {/* Media thumbnail */}
                  {update.media_urls && update.media_urls.length > 0 && (
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-neutral-100 relative">
                      <Image
                        src={update.media_urls[0]}
                        alt={update.content || 'Update'}
                        fill
                        className="object-cover"
                      />
                      {update.media_urls.length > 1 && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-white text-xs">
                          +{update.media_urls.length - 1}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center space-x-2 mb-2">
                      {update.child_avatar && (
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0">
                          <Image
                            src={update.child_avatar}
                            alt={update.child_name || 'Child'}
                            width={24}
                            height={24}
                            className="object-cover"
                          />
                        </div>
                      )}
                      <span className="text-sm font-medium text-neutral-900">
                        {update.child_name}
                      </span>
                      <span className="text-xs text-neutral-400">•</span>
                      <span className="text-xs text-neutral-500">
                        {new Date(update.created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Caption */}
                    <p className="text-sm text-neutral-700 leading-relaxed line-clamp-2 mb-2">
                      {update.content}
                    </p>

                    {/* Milestone */}
                    {update.milestone_type && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        🎉 {update.milestone_type.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Footer note */}
      <div className="text-center p-4">
        <p className="text-xs text-neutral-500 italic">
          This is how your updates would appear in a weekly digest
        </p>
      </div>

      {/* Empty state */}
      {updates.length === 0 && (
        <Card className="p-12 text-center">
          <SparklesIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">No updates this week</p>
        </Card>
      )}
    </div>
  )
}