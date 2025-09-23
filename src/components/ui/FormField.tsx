'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  children: React.ReactNode
  required?: boolean
  optional?: boolean
  error?: string
  description?: string
  className?: string
}

export function FormField({
  label,
  children,
  required = false,
  optional = false,
  error,
  description,
  className
}: FormFieldProps) {
  // Generate unique IDs for accessibility
  const fieldId = React.useId()
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-900"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
        {optional && (
          <span className="text-gray-500 ml-2 font-normal text-xs">
            (optional)
          </span>
        )}
      </label>

      {description && (
        <p
          id={descriptionId}
          className="text-sm text-gray-600"
        >
          {description}
        </p>
      )}

      {/* Clone the child element and add accessibility props */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, {
            id: fieldId,
            'aria-describedby': [
              error ? errorId : '',
              description ? descriptionId : ''
            ].filter(Boolean).join(' ') || undefined,
            'aria-invalid': !!error,
            ...(child.props as any)
          })
        }
        return child
      })}

      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
}