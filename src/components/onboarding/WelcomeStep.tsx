'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getPrivacyMessageForStep, getTotalEstimatedTime } from '@/lib/onboarding'
import {
  HandRaisedIcon,
  LockClosedIcon,
  BoltIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface WelcomeStepProps {
  onNext: () => void
  className?: string
}

export function WelcomeStep({ onNext, className }: WelcomeStepProps) {
  const totalTime = getTotalEstimatedTime()
  const privacyMessage = getPrivacyMessageForStep('welcome')

  return (
    <div className={cn('max-w-2xl mx-auto space-y-8', className)}>
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <HandRaisedIcon className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to Tribe
        </h1>
        <p className="text-lg text-gray-600">
          Share moments with family
        </p>
      </div>

      {/* Key features - simplified */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center space-x-3">
          <BoltIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <span className="text-primary-800">Smart recipient suggestions</span>
        </div>
        <div className="flex items-center space-x-3">
          <LockClosedIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <span className="text-primary-800">Private & secure</span>
        </div>
        <div className="flex items-center space-x-3">
          <ClockIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <span className="text-primary-800">3 minute setup</span>
        </div>
      </div>

      {/* Quick setup info */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Free • {Math.ceil(totalTime)} minutes
        </p>
      </div>

      {/* CTA section */}
      <div className="text-center space-y-3">
        <Button
          onClick={onNext}
          size="lg"
          className="w-full px-8 py-3 text-lg"
        >
          Get Started
        </Button>
      </div>
    </div>
  )
}

// Alternative compact version for smaller screens or quicker flow
interface WelcomeStepCompactProps {
  onNext: () => void
  className?: string
}

export function WelcomeStepCompact({ onNext, className }: WelcomeStepCompactProps) {
  const totalTime = getTotalEstimatedTime()

  return (
    <div className={cn('max-w-md mx-auto text-center space-y-6', className)}>
      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
        <HandRaisedIcon className="w-6 h-6 text-primary-600" />
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome to Tribe
        </h1>
        <p className="text-gray-600">
          Family updates in {Math.ceil(totalTime)} minutes
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={onNext}
          size="lg"
          className="w-full"
        >
          Get Started
        </Button>

        <div className="text-xs text-gray-500">
          Free & Private
        </div>
      </div>
    </div>
  )
}