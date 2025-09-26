'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowUturnUpIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  estimatedTimeMinutes: number
  isRequired: boolean
  isCompleted: boolean
  isSkipped: boolean
  isCurrent: boolean
  completedAt?: Date
}

interface EnhancedOnboardingProgressProps {
  steps: OnboardingStep[]
  currentStepIndex: number
  totalSteps: number
  onStepClick?: (stepId: string) => void
  onCollapse?: (collapsed: boolean) => void
  canCollapse?: boolean
  showCelebration?: boolean
  className?: string
}

export const EnhancedOnboardingProgress: React.FC<EnhancedOnboardingProgressProps> = ({
  steps,
  currentStepIndex,
  totalSteps,
  onStepClick,
  onCollapse,
  canCollapse = true,
  showCelebration = false,
  className
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const completedSteps = steps.filter(step => step.isCompleted).length
  const progress = Math.round((completedSteps / totalSteps) * 100)
  const remainingTime = steps
    .filter(step => !step.isCompleted && !step.isSkipped)
    .reduce((total, step) => total + step.estimatedTimeMinutes, 0)

  const nextSteps = steps
    .filter(step => !step.isCompleted && !step.isSkipped)
    .slice(0, 2)

  // Handle celebration animation
  useEffect(() => {
    if (showCelebration) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showCelebration])

  const handleCollapseToggle = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    onCollapse?.(newCollapsed)
  }

  const handleStepClick = (stepId: string, step: OnboardingStep) => {
    if (step.isCompleted || step.isCurrent) {
      // Analytics tracking
      if (typeof window !== 'undefined') {
        window.gtag?.('event', 'onboarding_step_click', {
          event_category: 'onboarding',
          event_label: stepId,
          value: 1
        })
      }
      onStepClick?.(stepId)
    }
  }

  // Confetti component
  const Confetti = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'absolute w-2 h-2 rounded-full animate-confetti-fall',
            ['bg-primary-400', 'bg-secondary-400', 'bg-accent-400', 'bg-warning-400'][i % 4]
          )}
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  )

  // Collapsed view
  if (isCollapsed && canCollapse) {
    return (
      <div className={cn(
        'bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-xl p-4 relative overflow-hidden',
        className
      )}>
        <button
          onClick={handleCollapseToggle}
          className="w-full flex items-center justify-between text-left group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {progress}%
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900">
                Setup Progress
              </p>
              <p className="text-xs text-neutral-600">
                {completedSteps} of {totalSteps} complete
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {remainingTime > 0 && (
              <span className="text-xs text-neutral-500">
                ~{remainingTime}min left
              </span>
            )}
            <ChevronDownIcon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-700 transition-colors" />
          </div>
        </button>

        {/* Mini progress bar */}
        <div className="mt-3 w-full bg-neutral-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  // Expanded view
  return (
    <div className={cn(
      'bg-gradient-to-br from-primary-50 via-white to-secondary-50 border border-primary-200 rounded-xl overflow-hidden relative',
      showCelebration && 'animate-celebration-bounce',
      className
    )}>
      {showConfetti && <Confetti />}

      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">
              Getting you set up
            </h3>
            <p className="text-sm text-neutral-600">
              {completedSteps} of {totalSteps} steps complete
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-lg font-bold text-primary-600">{progress}%</p>
              {remainingTime > 0 && (
                <p className="text-xs text-neutral-500">
                  ~{remainingTime}min left
                </p>
              )}
            </div>

            {canCollapse && (
              <button
                onClick={handleCollapseToggle}
                className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
                aria-label="Collapse progress"
              >
                <ChevronUpIcon className="w-4 h-4 text-neutral-500" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-6">
          <div className="w-full bg-neutral-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-shimmer" />
            </div>
          </div>

          {/* Milestone markers */}
          <div className="absolute top-0 w-full flex justify-between">
            {[25, 50, 75, 100].map(milestone => (
              <div
                key={milestone}
                className={cn(
                  'w-1 h-3 rounded-full transition-colors',
                  progress >= milestone ? 'bg-white' : 'bg-neutral-300'
                )}
                style={{ marginLeft: `${milestone}%`, transform: 'translateX(-50%)' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="px-4 pb-4 space-y-3">
        {steps.map((step, index) => {
          const StepIcon = step.icon

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center space-x-3 p-3 rounded-lg transition-all duration-200',
                step.isCurrent && 'bg-primary-50 border border-primary-200',
                step.isCompleted && 'bg-success-50/50',
                (step.isCompleted || step.isCurrent) && 'cursor-pointer hover:shadow-sm',
                !step.isCompleted && !step.isCurrent && 'opacity-60'
              )}
              onClick={() => handleStepClick(step.id, step)}
            >
              {/* Step Icon */}
              <div className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-200',
                step.isCompleted && 'bg-success-500 border-success-500 text-white',
                step.isSkipped && 'bg-warning-100 border-warning-400 text-warning-800',
                step.isCurrent && 'bg-primary-100 border-primary-400 text-primary-700 ring-2 ring-primary-200',
                !step.isCompleted && !step.isSkipped && !step.isCurrent && 'bg-neutral-100 border-neutral-300 text-neutral-500'
              )}>
                {step.isCompleted ? (
                  <CheckIcon className="w-5 h-5" aria-hidden="true" />
                ) : step.isSkipped ? (
                  <ArrowUturnUpIcon className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <StepIcon className="w-5 h-5" aria-hidden="true" />
                )}
              </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={cn(
                  'text-sm font-medium truncate',
                  step.isCurrent && 'text-primary-900',
                  step.isCompleted && 'text-success-800',
                  !step.isCompleted && !step.isCurrent && 'text-neutral-700'
                )}>
                  {step.title}
                </h4>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {step.estimatedTimeMinutes > 0 && !step.isCompleted && (
                    <span className="text-xs text-neutral-500">
                      {step.estimatedTimeMinutes}min
                    </span>
                  )}

                  {step.isCompleted && step.completedAt && (
                    <span className="flex items-center text-xs text-success-600">
                      <CheckIcon className="w-3 h-3 mr-1" aria-hidden="true" />
                      Done
                    </span>
                  )}

                  {step.isCurrent && (
                    <ArrowRightIcon className="w-3 h-3 text-primary-500" />
                  )}
                </div>
              </div>

              <p className={cn(
                'text-xs mt-1 leading-relaxed',
                step.isCurrent && 'text-primary-700',
                step.isCompleted && 'text-success-700',
                !step.isCompleted && !step.isCurrent && 'text-neutral-600'
              )}>
                {step.description}
              </p>

              {!step.isRequired && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">
                  Optional
                </span>
              )}
            </div>
          </div>
          )
        })}
      </div>

      {/* Next Steps Preview */}
      {nextSteps.length > 0 && (
        <div className="bg-primary-50/50 border-t border-primary-100 px-4 py-3">
          <h4 className="text-sm font-medium text-primary-900 mb-2">
            Coming up next:
          </h4>
          <div className="space-y-2">
            {nextSteps.map(step => {
              const StepIcon = step.icon
              return (
                <div key={step.id} className="flex items-center space-x-2">
                  <StepIcon className="w-4 h-4 text-primary-600" aria-hidden="true" />
                  <span className="text-sm text-primary-800">{step.title}</span>
                  <span className="text-xs text-primary-600">
                    (~{step.estimatedTimeMinutes}min)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completion State */}
      {progress === 100 && (
        <div
          className="bg-gradient-to-r from-success-50 to-secondary-50 border-t border-success-200 px-4 py-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-center">
            <div className="flex items-center justify-center mb-2 text-success-600">
              <SparklesIcon className="w-7 h-7" aria-hidden="true" />
            </div>
            <h4 className="text-lg font-semibold text-success-800 mb-1">
              Setup Complete!
            </h4>
            <p className="text-sm text-success-700 mb-3">
              You're all ready to start sharing precious moments with your family.
            </p>
            <Button
              variant="success"
              size="sm"
              onClick={() => onStepClick?.('complete')}
              aria-label="Complete onboarding and start creating updates"
            >
              Start Sharing
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedOnboardingProgress
