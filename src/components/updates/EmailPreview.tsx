'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { calculateAge } from '@/lib/utils'
import { SparklesIcon, HeartIcon } from '@heroicons/react/24/outline'

interface EmailPreviewProps {
  updateContent: string | null
  milestoneType?: string | null
  mediaUrls?: string[]
  childName: string
  childBirthDate: string
  childPhotoUrl?: string | null
  recipientName: string
  recipientRelationship: string
  className?: string
}

const milestoneMap: Record<string, string> = {
  'first_smile': 'First Smile',
  'rolling': 'Rolling Over',
  'sitting': 'Sitting Up',
  'crawling': 'Crawling',
  'first_steps': 'First Steps',
  'first_words': 'First Words',
  'first_tooth': 'First Tooth',
  'walking': 'Walking',
  'potty_training': 'Potty Training',
  'first_day_school': 'First Day of School',
  'birthday': 'Birthday',
  'other': 'Special Milestone'
}

export default function EmailPreview({
  updateContent,
  milestoneType,
  mediaUrls = [],
  childName,
  childBirthDate,
  childPhotoUrl,
  recipientName,
  recipientRelationship: _recipientRelationship,
  className
}: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

  const childAge = calculateAge(childBirthDate)
  const milestoneName = milestoneType ? milestoneMap[milestoneType] || 'Special Milestone' : null

  const getSubject = () => {
    if (milestoneName) {
      return `${childName}'s ${milestoneName}!`
    }
    return `Update about ${childName}`
  }

  const getGreeting = () => {
    const timeOfDay = new Date().getHours()
    let greeting = 'Hello'

    if (timeOfDay < 12) {
      greeting = 'Good morning'
    } else if (timeOfDay < 17) {
      greeting = 'Good afternoon'
    } else {
      greeting = 'Good evening'
    }

    return `${greeting} ${recipientName},`
  }

  const containerClasses = viewMode === 'mobile'
    ? 'max-w-sm mx-auto'
    : 'max-w-2xl mx-auto'

  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg overflow-hidden', className)}>
      {/* Preview Controls */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Email Preview</h3>
          <div className="flex space-x-2">
            <Button
              variant={viewMode === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('desktop')}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Desktop
            </Button>
            <Button
              variant={viewMode === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('mobile')}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Mobile
            </Button>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="p-4 bg-gray-100 min-h-96">
        <div className={cn('bg-white rounded shadow-sm', containerClasses)}>
          {/* Email Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="space-y-2">
              <p className="text-xs text-gray-500">To: {recipientName}</p>
              <p className="text-xs text-gray-500">From: Tribe Updates</p>
              <h1 className="text-lg font-semibold text-gray-900">{getSubject()}</h1>
            </div>
          </div>

          {/* Email Body */}
          <div className="p-6 space-y-6">
            {/* Greeting */}
            <div>
              <p className="text-gray-900">{getGreeting()}</p>
            </div>

            {/* Child Info */}
            <div className="flex items-start space-x-4">
              {childPhotoUrl && (
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  <Image
                    src={childPhotoUrl}
                    alt={childName}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div>
                <h2 className="text-lg font-medium text-gray-900">{childName}</h2>
                <p className="text-sm text-gray-600">{childAge}</p>
                {milestoneName && (
                  <p className="text-sm font-medium text-primary-600 mt-1 flex items-center gap-1">
                    <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                    {milestoneName}
                  </p>
                )}
              </div>
            </div>

            {/* Update Content */}
            {updateContent && (
              <div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-900 whitespace-pre-wrap">{updateContent}</p>
                </div>
              </div>
            )}

            {/* Media */}
            {mediaUrls.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Photos & Videos</h3>
                <div className="grid grid-cols-1 gap-4">
                  {mediaUrls.map((url, index) => (
                    <div key={index} className="rounded-lg overflow-hidden bg-gray-100">
                      {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <Image
                          src={url}
                          alt={`Update media ${index + 1}`}
                          width={800}
                          height={600}
                          className="h-auto w-full"
                          sizes="100vw"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center">
                          <div className="text-center">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm text-gray-500">Video Attachment</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-6 border-t border-gray-200 space-y-3">
              <p className="text-sm text-gray-600">
                Hope you enjoyed this update about {childName}! Reply to this email to share your thoughts with the family.
              </p>

              <div className="text-xs text-gray-500 space-y-1">
                <p className="flex items-center gap-1">
                  <HeartIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Sent with care via Tribe
                </p>
                <p>
                  You&apos;re receiving this because you&apos;re part of {childName}&apos;s family updates.
                  <a href="#" className="text-primary-600 hover:text-primary-700 underline ml-1">
                    Manage preferences
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
