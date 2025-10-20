'use client'

import React, { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowUturnUpIcon,
  XMarkIcon
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
  onDismiss?: () => void
  canCollapse?: boolean
  canDismiss?: boolean
  className?: string
}

export const EnhancedOnboardingProgress: React.FC<EnhancedOnboardingProgressProps> = ({
  steps,
  currentStepIndex: _currentStepIndex,
  totalSteps,
  onStepClick,
  onCollapse,
  onDismiss,
  canCollapse = true,
  canDismiss = true,
  className
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const reflectionStep = useMemo(() => {
    return steps.find(step => {
      const id = step.id.toLowerCase()
      const title = step.title.toLowerCase()
      return id.includes('reflection') ||
        id.includes('memory') ||
        title.includes('reflection') ||
        title.includes('memory')
    })
  }, [steps])

  const currentChapterNumber = useMemo(() => {
    const currentStep = steps[_currentStepIndex]
    if (!currentStep) return null
    const index = steps.findIndex(step => step.id === currentStep.id)
    if (index === -1) return null
    return index + 1
  }, [steps, _currentStepIndex])

  const handleCollapseToggle = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    onCollapse?.(newCollapsed)
  }

  const handleStepClick = (stepId: string, step: OnboardingStep) => {
    if (typeof window !== 'undefined' && reflectionStep && step.id === reflectionStep.id) {
      window.gtag?.('event', 'reflection_entry_opened', {
        event_category: 'reflection',
        event_label: stepId
      })
    }
    onStepClick?.(stepId)
  }

  if (isCollapsed && canCollapse) {
    return (
      <div
        className={cn(
          'bg-gradient-to-r from-primary-50/70 to-secondary-50/70 border border-primary-200 rounded-xl p-4 relative overflow-hidden',
          className
        )}
      >
        <button
          onClick={handleCollapseToggle}
          className="w-full flex items-center justify-between text-left group"
        >
          <div className="flex flex-col text-left">
            <p className="text-sm font-semibold text-neutral-900">
              A mindful welcome
            </p>
            <p className="text-xs text-neutral-600">
              Our chapters wait patiently until you&apos;re ready.
            </p>
          </div>

          <ChevronDownIcon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-700 transition-colors" />
        </button>

        {reflectionStep && (
          <div className="mt-4">
            <Button
              size="sm"
              variant="primary"
              className="w-full"
              onClick={() => handleStepClick(reflectionStep.id, reflectionStep)}
            >
              Start your first reflection
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-primary-50 via-white to-secondary-50 border border-primary-200 rounded-xl overflow-hidden relative',
        className
      )}
    >
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="max-w-xl text-left">
            <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold">
              Our mindful beginning
            </p>
            <h3 className="mt-2 text-xl font-semibold text-neutral-900">
              A community built on presence and privacy
            </h3>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              Take a breath and move at your own pace. Each chapter invites you to settle in, honour privacy, and share when the moment feels right. Nothing here is urgent—your reflections are cherished precisely because they arrive gently.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {canDismiss && (
              <button
                onClick={() => onDismiss?.()}
                className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
                aria-label="Dismiss onboarding"
                title="Don&apos;t show this again"
              >
                <XMarkIcon className="w-4 h-4 text-neutral-500" />
              </button>
            )}
            {canCollapse && (
              <button
                onClick={handleCollapseToggle}
                className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
                aria-label="Collapse onboarding overview"
              >
                <ChevronUpIcon className="w-4 h-4 text-neutral-500" />
              </button>
            )}
          </div>
        </div>

        {reflectionStep && (
          <div className="mt-5 bg-white/80 border border-primary-100 rounded-lg p-4 text-center">
            <h4 className="text-sm font-semibold text-primary-900">
              Ready for a deeper pause?
            </h4>
            <p className="mt-2 text-sm text-neutral-700">
              When inspiration stirs, jump straight into your first reflection. We&apos;ll keep the other chapters cozy for later.
            </p>
            <Button
              className="mt-4"
              variant="primary"
              onClick={() => handleStepClick(reflectionStep.id, reflectionStep)}
            >
              Start your first reflection
            </Button>
          </div>
        )}

        <div className="mt-6 text-sm text-neutral-600 text-center">
          Take your time—mindful sharing begins with feeling at ease.
          {currentChapterNumber && (
            <span className="ml-1 text-neutral-500">
              (You&apos;re resting near chapter {currentChapterNumber} of {totalSteps})
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {steps.map((step, index) => {
          const StepIcon = step.icon
          const isReflection = reflectionStep && step.id === reflectionStep.id
          const chapterLabel = step.isRequired ? `Chapter ${index + 1}` : 'Optional Chapter'

          return (
            <article
              key={step.id}
              className={cn(
                'rounded-xl border border-primary-100/60 bg-white/70 backdrop-blur-sm p-4 transition-shadow',
                step.isCurrent && 'shadow-lg shadow-primary-100',
                step.isCompleted && 'border-success-200 bg-success-50/40',
                step.isSkipped && 'border-warning-200 bg-warning-50/30'
              )}
            >
              <button
                type="button"
                onClick={() => handleStepClick(step.id, step)}
                className="w-full text-left"
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={cn(
                      'flex-shrink-0 w-12 h-12 rounded-full border flex items-center justify-center',
                      step.isCompleted && 'bg-success-500 border-success-500 text-white',
                      step.isSkipped && 'bg-warning-100 border-warning-300 text-warning-800',
                      step.isCurrent && 'bg-primary-100 border-primary-300 text-primary-700',
                      !step.isCompleted && !step.isSkipped && !step.isCurrent && 'bg-white border-primary-200 text-primary-500'
                    )}
                  >
                    {step.isCompleted ? (
                      <CheckIcon className="w-5 h-5" aria-hidden="true" />
                    ) : step.isSkipped ? (
                      <ArrowUturnUpIcon className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <StepIcon className="w-5 h-5" aria-hidden="true" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary-500">
                          {chapterLabel}
                        </span>
                        <h4 className="mt-1 text-base font-semibold text-neutral-900">
                          {step.title}
                        </h4>
                      </div>

                      <div className="flex items-center space-x-2">
                        {step.isCompleted && (
                          <span className="text-xs font-medium text-success-700">Completed</span>
                        )}
                        {step.isSkipped && (
                          <span className="text-xs font-medium text-warning-700">Skipped</span>
                        )}
                        {isReflection && (
                          <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                            Reflection
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                      {step.description}
                    </p>

                    {!step.isRequired && (
                      <p className="mt-2 text-xs text-neutral-500">
                        Pause-friendly and entirely optional—visit when curiosity calls.
                      </p>
                    )}
                  </div>
                </div>
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default EnhancedOnboardingProgress
