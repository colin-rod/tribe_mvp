'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface FormMessageProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  details?: string
  className?: string
  onDismiss?: () => void
}

const messageConfig = {
  success: {
    icon: CheckCircleIcon,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-400'
  },
  error: {
    icon: XCircleIcon,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-400'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-400'
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-400'
  }
}

export function FormMessage({
  type,
  message,
  details,
  className,
  onDismiss
}: FormMessageProps) {
  const config = messageConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        config.bgColor,
        config.borderColor,
        className
      )}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon
            className={cn('h-5 w-5', config.iconColor)}
            aria-hidden="true"
          />
        </div>
        <div className="ml-3 flex-1">
          <p className={cn('text-sm font-medium', config.textColor)}>
            {message}
          </p>
          {details && (
            <p className={cn('mt-1 text-sm', config.textColor, 'opacity-80')}>
              {details}
            </p>
          )}
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={cn(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  config.textColor,
                  'hover:bg-opacity-20 focus:ring-offset-white',
                  type === 'success' && 'hover:bg-green-100 focus:ring-green-600',
                  type === 'error' && 'hover:bg-red-100 focus:ring-red-600',
                  type === 'warning' && 'hover:bg-yellow-100 focus:ring-yellow-600',
                  type === 'info' && 'hover:bg-blue-100 focus:ring-blue-600'
                )}
                aria-label="Dismiss message"
              >
                <XCircleIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}