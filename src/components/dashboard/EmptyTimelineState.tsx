'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  CameraIcon,
  PencilIcon,
  SparklesIcon,
  VideoCameraIcon,
  GiftIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  UserIcon
} from '@heroicons/react/24/outline'

interface EmptyTimelineStateProps {
  hasCompletedOnboarding?: boolean
  userName?: string
  onCreateUpdate?: (type: 'photo' | 'text' | 'video' | 'milestone') => void
  onViewExamples?: () => void
  className?: string
}

const DAILY_PROMPTS = [
  'Share what made you smile today',
  'Capture a quiet moment together',
  "What's new with your little one?",
  "Share a recent milestone or first",
  "What would grandparents love to see?",
  "How did they surprise you today?",
  "What are they learning right now?",
  "Share a sweet interaction you had",
  "What's their latest favorite thing?",
  "Capture their personality in a moment"
]

const EXAMPLE_UPDATES = [
  {
    icon: CameraIcon,
    title: 'First Steps',
    description: 'Share milestone moments with photos'
  },
  {
    icon: PencilIcon,
    title: 'Daily Adventures',
    description: 'Write about your day together'
  },
  {
    icon: VideoCameraIcon,
    title: 'Funny Moments',
    description: 'Record those precious giggles'
  },
  {
    icon: GiftIcon,
    title: 'Special Occasions',
    description: 'Mark birthdays and celebrations'
  }
]

export const EmptyTimelineState: React.FC<EmptyTimelineStateProps> = ({
  hasCompletedOnboarding = false,
  userName,
  onCreateUpdate,
  onViewExamples,
  className
}) => {
  const [currentPrompt, setCurrentPrompt] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  // Rotate prompts every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrompt(prev => (prev + 1) % DAILY_PROMPTS.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fade in animation
  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleCreateUpdate = (type: 'photo' | 'text' | 'video' | 'milestone' = 'photo') => {
    // Analytics tracking
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'empty_timeline_create_click', {
        event_category: 'engagement',
        event_label: type,
        value: 1
      })
    }
    onCreateUpdate?.(type)
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-96 px-6 py-12',
      'transition-all duration-700 ease-out',
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      className
    )}>
      {/* Illustration */}
      <div className="relative mb-8">
        {/* Main circle */}
        <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent" />

          {/* Main icon */}
          <div className="relative z-10">
            <CameraIcon className="w-10 h-10 text-primary-600 animate-bounce-gentle" aria-hidden="true" />
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary-200 rounded-full flex items-center justify-center animate-bounce-gentle" style={{ animationDelay: '0.5s' }}>
          <UserIcon className="w-4 h-4 text-secondary-700" aria-hidden="true" />
        </div>

        <div className="absolute -bottom-1 -left-3 w-6 h-6 bg-accent-200 rounded-full flex items-center justify-center animate-bounce-gentle" style={{ animationDelay: '1s' }}>
          <HeartIcon className="w-3 h-3 text-accent-600" aria-hidden="true" />
        </div>

        <div className="absolute top-8 -right-6 w-4 h-4 bg-warning-200 rounded-full flex items-center justify-center animate-bounce-gentle" style={{ animationDelay: '1.5s' }}>
          <SparklesIcon className="w-3 h-3 text-warning-600" aria-hidden="true" />
        </div>

        {/* Sparkle effects */}
        <div className="absolute top-0 left-0 w-2 h-2 bg-primary-400 rounded-full opacity-60 animate-ping" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-2 right-8 w-1 h-1 bg-secondary-400 rounded-full opacity-60 animate-ping" style={{ animationDelay: '2.5s' }} />
      </div>

      {/* Content */}
      <div className="text-center max-w-sm">
        {/* Title */}
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          {hasCompletedOnboarding ? (
            <>Ready to share{userName ? `, ${userName}` : ''}?</>
          ) : (
            'Your story starts here'
          )}
        </h2>

        {/* Rotating prompt with live region for screen readers */}
        <div className="relative h-12 mb-8 flex items-center justify-center">
          <div
            className="absolute inset-0 flex items-center justify-center"
            role="region"
            aria-live="polite"
            aria-label="Daily inspiration prompt"
          >
            <p
              key={currentPrompt}
              className="text-base text-neutral-600 leading-relaxed transition-all duration-500 animate-fade-in px-4 text-center"
            >
              {DAILY_PROMPTS[currentPrompt]}
            </p>
          </div>
        </div>

        {/* Primary Action */}
        <div className="space-y-4 mb-8">
          <Button
            variant="default"
            size="lg"
            onClick={() => handleCreateUpdate('photo')}
            className="w-full h-14 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <CameraIcon className="w-5 h-5 mr-3" />
            Share Your First Update
          </Button>

          {/* Quick alternatives */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => handleCreateUpdate('text')}
              className="flex-1 h-12"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Write
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateUpdate('milestone')}
              className="flex-1 h-12"
            >
              <SparklesIcon className="w-4 h-4 mr-2" />
              Milestone
            </Button>
          </div>
        </div>

        {/* Secondary action */}
        {onViewExamples && (
          <button
            onClick={onViewExamples}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md px-2 py-1"
            aria-label="View examples of different update types to get inspiration"
          >
            See example updates
          </button>
        )}
      </div>

      {/* Example Updates Preview (when viewing examples) */}
      {onViewExamples && (
        <div className="mt-12 w-full max-w-sm opacity-0 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
          <h3 className="text-sm font-medium text-neutral-700 mb-4 text-center">
            Ideas to get you started:
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {EXAMPLE_UPDATES.map((example, index) => {
              const Icon = example.icon
              return (
                <div
                  key={example.title}
                  className={cn(
                    'bg-white rounded-lg border border-neutral-200 p-4 text-center',
                    'hover:border-primary-200 hover:shadow-sm transition-all duration-200',
                    'opacity-0 animate-slide-up'
                  )}
                  style={{
                    animationDelay: `${(index + 1) * 150}ms`,
                    animationFillMode: 'forwards'
                  }}
                >
                  <div className="flex justify-center mb-2">
                    <Icon className="w-7 h-7 text-primary-600" aria-hidden="true" />
                  </div>
                  <h4 className="text-xs font-medium text-neutral-900 mb-1">
                    {example.title}
                  </h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {example.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Encouraging footer message */}
      <div className="mt-8 text-center">
        <p className="text-xs text-neutral-500 leading-relaxed max-w-xs">
          Every moment is worth sharing. Your family is waiting to celebrate these precious times with you.
        </p>
      </div>
    </div>
  )
}

// No results state for search
interface NoSearchResultsProps {
  searchQuery: string
  onClearSearch: () => void
  className?: string
}

export const NoSearchResultsState: React.FC<NoSearchResultsProps> = ({
  searchQuery,
  onClearSearch,
  className
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-6',
      className
    )}>
      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
        <MagnifyingGlassIcon className="w-8 h-8 text-neutral-500" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
        No updates found
      </h3>

      <p className="text-sm text-neutral-600 text-center mb-6 max-w-xs">
        We couldn't find any updates matching <span className="font-medium">"{searchQuery}"</span>
      </p>

      <Button variant="outline" onClick={onClearSearch}>
        Clear search
      </Button>
    </div>
  )
}

export default EmptyTimelineState
