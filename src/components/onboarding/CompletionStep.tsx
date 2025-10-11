'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { cn } from '@/lib/utils'
import type { OnboardingData } from '@/hooks/useOnboarding'
import {
  CheckCircleIcon,
  PencilSquareIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'

interface CompletionStepProps {
  data: OnboardingData
  onComplete: () => void
  isLoading?: boolean
  className?: string
}

export function CompletionStep({
  data,
  onComplete,
  isLoading = false,
  className
}: CompletionStepProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  // Trigger confetti animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Calculate brief accomplishment summary
  const accomplishments = []
  if (data.profile?.name) accomplishments.push('profile')
  if (data.child?.name) accomplishments.push(`${data.child.name}`)
  if (data.recipients?.recipients?.length) accomplishments.push(`${data.recipients.recipients.length} recipient${data.recipients.recipients.length !== 1 ? 's' : ''}`)
  const accomplishmentSummary = accomplishments.length > 0 ? accomplishments.join(', ') : 'your account basics'
  const childDisplayName = data.child?.name ?? 'your child'

  return (
    <div className={cn('max-w-lg mx-auto text-center space-y-8', className)}>
      {/* Subtle confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute opacity-30"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${10 + Math.random() * 30}%`,
                  animationDelay: `${Math.random() * 1}s`,
                }}
              >
                <div className="w-2 h-2 bg-primary-300 rounded-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircleIcon className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          You&apos;re All Set!
        </h1>
        <p className="text-lg text-gray-600">
          Welcome to Tribe. Your family sharing platform is ready.
        </p>
      </div>

      {/* Brief Accomplishment */}
      <Alert
        variant="success"
        title="Setup complete"
        icon={<CheckCircleIcon className="h-5 w-5" aria-hidden="true" />}
        className="text-left sm:text-center sm:[&>div]:items-center sm:[&>div]:justify-center"
      >
        <p className="text-sm">
          You&apos;ve set up {accomplishmentSummary}. Everything is ready for your first memory.
        </p>
      </Alert>

      {/* Single Primary CTA */}
      <div className="space-y-4">
        <Button
          onClick={onComplete}
          disabled={isLoading}
          size="lg"
          className="w-full px-8 py-4 text-lg"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Setting up your dashboard...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <PencilSquareIcon className="w-5 h-5" />
              <span>Create Your First Memory</span>
            </div>
          )}
        </Button>

        <p className="text-sm text-gray-500">
          Start sharing {childDisplayName}&rsquo;s moments with your family
        </p>
      </div>

      {/* Minimal Support */}
      <div className="pt-4 border-t">
        <a
          href="/help"
          className="text-sm text-gray-500 hover:text-primary-600 flex items-center justify-center space-x-1"
        >
          <QuestionMarkCircleIcon className="w-4 h-4" />
          <span>Need help?</span>
        </a>
      </div>
    </div>
  )
}

// Compact version for mobile
interface CompletionStepCompactProps {
  data: OnboardingData
  onComplete: () => void
  isLoading?: boolean
  className?: string
}

export function CompletionStepCompact({
  data,
  onComplete,
  isLoading = false,
  className
}: CompletionStepCompactProps) {
  const childDisplayName = data.child?.name ?? 'your child'

  return (
    <div className={cn('max-w-sm mx-auto text-center space-y-6', className)}>
      {/* Hero Section */}
      <div className="space-y-3">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircleIcon className="w-6 h-6 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          You&apos;re All Set!
        </h1>
        <p className="text-gray-600">
          Welcome to Tribe. Start sharing {childDisplayName}&rsquo;s moments.
        </p>
      </div>

      {/* Primary CTA */}
      <Button
        onClick={onComplete}
        disabled={isLoading}
        size="lg"
        className="w-full"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Setting up...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <PencilSquareIcon className="w-4 h-4" />
            <span>Create First Memory</span>
          </div>
        )}
      </Button>

      {/* Help link */}
      <a
        href="/help"
        className="text-xs text-gray-500 hover:text-primary-600 flex items-center justify-center space-x-1"
      >
        <QuestionMarkCircleIcon className="w-3 h-3" />
        <span>Need help?</span>
      </a>
    </div>
  )
}
