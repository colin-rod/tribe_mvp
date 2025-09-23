'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { PasswordStrength } from '@/lib/types/profile'

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength
  className?: string
  showFeedback?: boolean
}

const strengthLabels = {
  0: 'Very Weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong'
} as const

const strengthColors = {
  0: {
    bar: 'bg-red-500',
    text: 'text-red-600',
    bg: 'bg-red-50'
  },
  1: {
    bar: 'bg-orange-500',
    text: 'text-orange-600',
    bg: 'bg-orange-50'
  },
  2: {
    bar: 'bg-yellow-500',
    text: 'text-yellow-600',
    bg: 'bg-yellow-50'
  },
  3: {
    bar: 'bg-blue-500',
    text: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  4: {
    bar: 'bg-green-500',
    text: 'text-green-600',
    bg: 'bg-green-50'
  }
} as const

export function PasswordStrengthIndicator({
  strength,
  className,
  showFeedback = true
}: PasswordStrengthIndicatorProps) {
  const colors = strengthColors[strength.score]
  const label = strengthLabels[strength.score]
  const percentage = (strength.score / 4) * 100

  return (
    <div className={cn('mt-2', className)}>
      {/* Strength Bar */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300 ease-out', colors.bar)}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={strength.score}
            aria-valuemin={0}
            aria-valuemax={4}
            aria-label={`Password strength: ${label}`}
          />
        </div>
        <span className={cn('text-xs font-medium', colors.text)}>
          {label}
        </span>
      </div>

      {/* Feedback */}
      {showFeedback && strength.feedback.length > 0 && (
        <div className={cn('p-2 rounded-md text-xs', colors.bg)}>
          {strength.warning && (
            <p className={cn('font-medium mb-1', colors.text)}>
              {strength.warning}
            </p>
          )}
          {strength.feedback.length > 0 && (
            <ul className={cn('space-y-1', colors.text)}>
              {strength.feedback.map((feedback, index) => (
                <li key={index} className="flex items-center">
                  {strength.score >= 3 ? (
                    <svg
                      className="w-3 h-3 mr-1.5 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="w-1 h-1 bg-current rounded-full mr-2 mt-0.5 shrink-0" aria-hidden="true" />
                  )}
                  {feedback}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Screen reader only description */}
      <div className="sr-only">
        Password strength is {label.toLowerCase()}.
        {strength.feedback.length > 0 && (
          <span> Suggestions: {strength.feedback.join(', ')}</span>
        )}
      </div>
    </div>
  )
}

/* Alternative compact version for inline display */
export function PasswordStrengthCompact({
  strength,
  className
}: {
  strength: PasswordStrength
  className?: string
}) {
  const colors = strengthColors[strength.score]
  const label = strengthLabels[strength.score]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'w-2 h-2 rounded-full transition-colors duration-300',
              level <= strength.score ? colors.bar : 'bg-gray-200'
            )}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className={cn('text-xs font-medium', colors.text)}>
        {label}
      </span>
      <span className="sr-only">
        Password strength: {label}
      </span>
    </div>
  )
}