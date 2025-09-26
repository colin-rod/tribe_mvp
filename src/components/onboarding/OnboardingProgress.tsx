'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { getAllSteps, getStepInfo, getRemainingEstimatedTime } from '@/lib/onboarding'
import type { OnboardingStep } from '@/hooks/useOnboarding'
import { CheckIcon, ArrowUturnUpIcon } from '@heroicons/react/24/outline'

interface OnboardingProgressProps {
  currentStep: OnboardingStep
  currentStepIndex: number
  completedSteps: Set<OnboardingStep>
  skippedSteps: Set<OnboardingStep>
  totalSteps: number
  className?: string
  showTimeEstimate?: boolean
  showStepNames?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

export function OnboardingProgress({
  currentStep,
  currentStepIndex,
  completedSteps,
  skippedSteps,
  totalSteps,
  className,
  showTimeEstimate = true,
  showStepNames = false,
  variant = 'default'
}: OnboardingProgressProps) {
  const steps = getAllSteps()
  const progress = Math.round((currentStepIndex / (totalSteps - 1)) * 100)
  const remainingTime = getRemainingEstimatedTime(currentStepIndex)

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-600 min-w-0">
          {currentStepIndex + 1} of {totalSteps}
        </span>
        {showTimeEstimate && remainingTime > 0 && (
          <span className="text-xs text-gray-500 whitespace-nowrap">
            ~{remainingTime} min left
          </span>
        )}
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Setup Progress</h3>
            <p className="text-sm text-gray-600">
              Step {currentStepIndex + 1} of {totalSteps}
            </p>
          </div>
          {showTimeEstimate && remainingTime > 0 && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{progress}% Complete</p>
              <p className="text-xs text-gray-500">~{remainingTime} minutes remaining</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id)
            const isSkipped = skippedSteps.has(step.id)
            const isCurrent = step.id === currentStep
            const isPast = index < currentStepIndex

            return (
              <div key={step.id} className="flex flex-col items-center space-y-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all duration-200',
                    {
                      'bg-primary-600 border-primary-600 text-white': isCompleted,
                      'bg-yellow-100 border-yellow-400 text-yellow-800': isSkipped,
                      'bg-primary-100 border-primary-400 text-primary-700': isCurrent,
                      'bg-gray-100 border-gray-300 text-gray-500': !isCompleted && !isSkipped && !isCurrent && !isPast,
                      'bg-gray-200 border-gray-400 text-gray-600': isPast && !isCompleted && !isSkipped
                    }
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-4 h-4" aria-hidden="true" />
                  ) : isSkipped ? (
                    <ArrowUturnUpIcon className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </div>
                {showStepNames && (
                  <span className={cn(
                    'text-xs text-center max-w-16 leading-tight',
                    {
                      'text-primary-700 font-medium': isCurrent,
                      'text-gray-600': isCompleted || isPast,
                      'text-gray-500': !isCompleted && !isCurrent && !isPast
                    }
                  )}>
                    {step.title}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with progress info */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">
            Step {currentStepIndex + 1} of {totalSteps}
          </h4>
          {showTimeEstimate && remainingTime > 0 && (
            <p className="text-xs text-gray-500">About {remainingTime} minutes remaining</p>
          )}
        </div>
        <span className="text-sm font-semibold text-primary-600">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between items-center">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id)
          const isSkipped = skippedSteps.has(step.id)
          const isCurrent = step.id === currentStep

          return (
            <div
              key={step.id}
              className={cn(
                'flex flex-col items-center space-y-1 group cursor-pointer',
                {
                  'opacity-60': !isCompleted && !isCurrent && index > currentStepIndex
                }
              )}
              title={`${step.title}${isCompleted ? ' (Completed)' : isSkipped ? ' (Skipped)' : isCurrent ? ' (Current)' : ''}`}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200',
                  {
                    'bg-primary-600 text-white': isCompleted,
                    'bg-yellow-400 text-yellow-900': isSkipped,
                    'bg-primary-100 text-primary-700 ring-2 ring-primary-400': isCurrent,
                    'bg-gray-300 text-gray-600': !isCompleted && !isSkipped && !isCurrent
                  }
                )}
              >
                {isCompleted ? (
                  <CheckIcon className="w-4 h-4" aria-hidden="true" />
                ) : isSkipped ? (
                  <ArrowUturnUpIcon className="w-4 h-4" aria-hidden="true" />
                ) : (
                  step.icon
                )}
              </div>
              {showStepNames && (
                <span className={cn(
                  'text-xs text-center max-w-12 leading-tight',
                  {
                    'text-primary-700 font-medium': isCurrent,
                    'text-gray-600': isCompleted,
                    'text-gray-500': !isCompleted && !isCurrent
                  }
                )}>
                  {step.title.split(' ')[0]}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Utility component for showing current step info
interface CurrentStepInfoProps {
  currentStep: OnboardingStep
  className?: string
}

export function CurrentStepInfo({ currentStep, className }: CurrentStepInfoProps) {
  const stepInfo = getStepInfo(currentStep)

  if (!stepInfo) return null

  return (
    <div className={cn('bg-primary-50 border border-primary-200 rounded-lg p-4', className)}>
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{stepInfo.icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-primary-900 mb-1">
            {stepInfo.title}
          </h3>
          <p className="text-primary-700 mb-3">
            {stepInfo.description}
          </p>
          {stepInfo.tips.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-primary-800 mb-2">Tips:</h4>
              <ul className="text-sm text-primary-700 space-y-1">
                {stepInfo.tips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-primary-500 mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-3 flex items-center space-x-4 text-xs text-primary-600">
            <span>⏱ ~{stepInfo.estimatedTimeMinutes} minutes</span>
            {stepInfo.isRequired ? (
              <span className="px-2 py-1 bg-primary-100 rounded">Required</span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">Optional</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
