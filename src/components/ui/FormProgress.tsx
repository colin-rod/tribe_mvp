import { cn } from '@/lib/utils'
import { CheckIcon } from '@heroicons/react/24/solid'

export interface FormStep {
  id: string
  label: string
  description?: string
}

interface FormProgressProps {
  steps: FormStep[]
  currentStep: number
  className?: string
  variant?: 'horizontal' | 'vertical'
  showStepNumbers?: boolean
}

export function FormProgress({
  steps,
  currentStep,
  className,
  variant = 'horizontal',
  showStepNumbers = true,
}: FormProgressProps) {
  if (variant === 'vertical') {
    return (
      <nav aria-label="Progress" className={className}>
        <ol role="list" className="space-y-4">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const isComplete = stepNumber < currentStep
            const isCurrent = stepNumber === currentStep
            const isUpcoming = stepNumber > currentStep

            return (
              <li key={step.id} className="relative">
                <div className={cn('flex items-start group', isCurrent && 'pb-4')}>
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'absolute left-4 top-10 -ml-px h-full w-0.5',
                        isComplete || isCurrent
                          ? 'bg-primary-600'
                          : 'bg-neutral-300'
                      )}
                      aria-hidden="true"
                    />
                  )}

                  {/* Step Indicator */}
                  <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
                    {isComplete ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600">
                        <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                        <span className="sr-only">{step.label} - Completed</span>
                      </div>
                    ) : isCurrent ? (
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary-600 bg-white">
                        <span className="text-sm font-semibold text-primary-600" aria-hidden="true">
                          {showStepNumbers && stepNumber}
                        </span>
                        <span className="sr-only">{step.label} - Current step</span>
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-neutral-300 bg-white">
                        <span className="text-sm font-medium text-neutral-500" aria-hidden="true">
                          {showStepNumbers && stepNumber}
                        </span>
                        <span className="sr-only">{step.label} - Upcoming</span>
                      </div>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="ml-4 min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isCurrent
                          ? 'text-primary-600'
                          : isComplete
                          ? 'text-neutral-900'
                          : 'text-neutral-500'
                      )}
                    >
                      {step.label}
                    </p>
                    {step.description && (
                      <p className="text-sm text-neutral-500 mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>
    )
  }

  // Horizontal variant
  return (
    <nav aria-label="Progress" className={className}>
      <ol
        role="list"
        className="flex items-center justify-between gap-2 sm:gap-4"
      >
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isComplete = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isUpcoming = stepNumber > currentStep

          return (
            <li key={step.id} className="flex-1">
              <div className="flex flex-col items-center">
                {/* Step Indicator */}
                <div className="relative flex items-center justify-center">
                  {isComplete ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600">
                      <CheckIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      <span className="sr-only">{step.label} - Completed</span>
                    </div>
                  ) : isCurrent ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary-600 bg-white ring-4 ring-primary-100">
                      <span className="text-sm font-semibold text-primary-600" aria-hidden="true">
                        {showStepNumbers && stepNumber}
                      </span>
                      <span className="sr-only">{step.label} - Current step</span>
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-neutral-300 bg-white">
                      <span className="text-sm font-medium text-neutral-500" aria-hidden="true">
                        {showStepNumbers && stepNumber}
                      </span>
                      <span className="sr-only">{step.label} - Upcoming</span>
                    </div>
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-3 text-center">
                  <p
                    className={cn(
                      'text-xs sm:text-sm font-medium',
                      isCurrent
                        ? 'text-primary-600'
                        : isComplete
                        ? 'text-neutral-900'
                        : 'text-neutral-500'
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-neutral-500 mt-1 hidden sm:block">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'hidden sm:block absolute top-5 h-0.5 w-full',
                    isComplete || isCurrent
                      ? 'bg-primary-600'
                      : 'bg-neutral-300'
                  )}
                  style={{
                    left: 'calc(50% + 20px)',
                    width: 'calc(100% - 40px)',
                  }}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>

      {/* Progress Bar for Mobile */}
      <div className="mt-4 sm:hidden">
        <div className="flex items-center justify-between text-xs font-medium text-neutral-600 mb-2">
          <span>Step {currentStep} of {steps.length}</span>
          <span>{Math.round((currentStep / steps.length) * 100)}% complete</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={steps.length}
          />
        </div>
      </div>
    </nav>
  )
}

interface FormProgressSimpleProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export function FormProgressSimple({
  currentStep,
  totalSteps,
  className,
}: FormProgressSimpleProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between text-sm font-medium text-neutral-600 mb-2">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{percentage}% complete</span>
      </div>
      <div className="w-full bg-neutral-200 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Progress: ${percentage}% complete`}
        />
      </div>
    </div>
  )
}
