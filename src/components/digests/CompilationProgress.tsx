'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface CompilationProgressProps {
  progress: number
  isComplete: boolean
  error?: string
  onRetry?: () => void
}

export default function CompilationProgress({
  progress,
  isComplete
}: CompilationProgressProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [animatedProgress, setAnimatedProgress] = useState(0)

  const steps = useMemo(() => [
    {
      id: 1,
      label: 'Analyzing Memories',
      description: 'Reading your approved memories...',
      minProgress: 0,
      maxProgress: 25
    },
    {
      id: 2,
      label: 'Analyzing Recipients',
      description: 'Understanding recipient preferences...',
      minProgress: 25,
      maxProgress: 40
    },
    {
      id: 3,
      label: 'AI Personalization',
      description: 'Creating personalized summaries...',
      minProgress: 40,
      maxProgress: 80
    },
    {
      id: 4,
      label: 'Processing Results',
      description: 'Finalizing your summary...',
      minProgress: 80,
      maxProgress: 100
    }
  ], [])

  // Determine current step based on progress
  useEffect(() => {
    const step = steps.findIndex(
      s => progress >= s.minProgress && progress < s.maxProgress
    )
    if (step >= 0) {
      setCurrentStep(step)
    } else if (progress >= 100 || isComplete) {
      setCurrentStep(steps.length - 1)
    }
  }, [progress, isComplete, steps])

  // Animate progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedProgress(prev => {
        if (prev >= progress) return progress
        return Math.min(prev + 1, progress)
      })
    }, 20)

    return () => clearInterval(interval)
  }, [progress])

  if (isComplete) {
    return (
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto">
          {/* Success animation */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircleIcon className="w-12 h-12 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Summary Ready!
          </h2>
          <p className="text-neutral-600 mb-6">
            Your personalized summary has been compiled. Redirecting to preview...
          </p>

          <div className="flex items-center justify-center space-x-2 text-sm text-neutral-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Redirecting...</span>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="w-8 h-8 text-orange-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Compiling Your Summary
          </h2>
          <p className="text-neutral-600">
            AI is personalizing memories for each recipient...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700">
              {steps[currentStep]?.label}
            </span>
            <span className="text-sm font-medium text-neutral-700">
              {Math.round(animatedProgress)}%
            </span>
          </div>
          <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${animatedProgress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            {steps[currentStep]?.description}
          </p>
        </div>

        {/* Step Indicators */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isComplete = index < currentStep || (index === currentStep && progress >= step.maxProgress)
            const isActive = index === currentStep
            const isPending = index > currentStep

            return (
              <div
                key={step.id}
                className={`flex items-start space-x-4 transition-opacity duration-300 ${
                  isPending ? 'opacity-40' : 'opacity-100'
                }`}
              >
                {/* Step indicator */}
                <div className="flex-shrink-0">
                  {isComplete ? (
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircleIcon className="w-5 h-5 text-white" />
                    </div>
                  ) : isActive ? (
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-neutral-400 rounded-full" />
                    </div>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 pt-1">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-orange-700' : isComplete ? 'text-green-700' : 'text-neutral-600'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* AI Animation */}
        <div className="mt-8 pt-8 border-t border-neutral-200">
          <div className="flex items-center justify-center space-x-2 text-sm text-neutral-600">
            <SparklesIcon className="w-5 h-5 text-orange-500 animate-pulse" />
            <span className="font-medium">AI is working its magic...</span>
          </div>
        </div>
      </div>
    </Card>
  )
}