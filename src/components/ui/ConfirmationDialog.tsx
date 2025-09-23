'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface ConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'warning' | 'info'
  loading?: boolean
  disabled?: boolean
  children?: React.ReactNode
}

const variantConfig = {
  destructive: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    confirmButton: 'destructive' as const
  },
  warning: {
    icon: QuestionMarkCircleIcon,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    confirmButton: 'default' as const
  },
  info: {
    icon: InformationCircleIcon,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    confirmButton: 'default' as const
  }
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  loading = false,
  disabled = false,
  children
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const config = variantConfig[variant]
  const Icon = config.icon

  // Focus management
  useEffect(() => {
    if (open && cancelButtonRef.current) {
      cancelButtonRef.current.focus()
    }
  }, [open])

  // Escape key handler
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open && !loading) {
        onClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, loading, onClose])

  // Focus trap
  useEffect(() => {
    if (!open) return

    const dialog = dialogRef.current
    if (!dialog) return

    const focusableElements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    dialog.addEventListener('keydown', handleTabKey)
    return () => dialog.removeEventListener('keydown', handleTabKey)
  }, [open])

  if (!open) return null

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !loading) {
      onClose()
    }
  }

  const handleConfirm = () => {
    if (!loading && !disabled) {
      onConfirm()
    }
  }

  const handleCancel = () => {
    if (!loading) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
        onClick={handleBackdropClick}
      >
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
        />

        {/* Center the modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        {/* Modal */}
        <div
          ref={dialogRef}
          className={cn(
            'inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6',
            'animate-in fade-in-0 zoom-in-95 duration-200'
          )}
        >
          <div className="sm:flex sm:items-start">
            {/* Icon */}
            <div className={cn('mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10', config.iconBg)}>
              <Icon className={cn('h-6 w-6', config.iconColor)} aria-hidden="true" />
            </div>

            {/* Content */}
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3
                className="text-lg leading-6 font-medium text-gray-900"
                id="modal-title"
              >
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {description}
                </p>
                {children && (
                  <div className="mt-4">
                    {children}
                  </div>
                )}
              </div>
            </div>

            {/* Close button */}
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className={cn(
                  'bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="Close dialog"
              >
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
            <Button
              type="button"
              variant={config.confirmButton}
              onClick={handleConfirm}
              disabled={loading || disabled}
              className="w-full sm:w-auto min-w-[100px]"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </Button>
            <Button
              ref={cancelButtonRef}
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Alternative simple confirmation for inline use */
interface SimpleConfirmProps {
  children: React.ReactNode
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  variant?: 'destructive' | 'warning' | 'info'
  disabled?: boolean
}

export function SimpleConfirm({
  children,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  variant = 'warning',
  disabled = false
}: SimpleConfirmProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={() => !disabled && setOpen(true)}>
        {children}
      </div>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={title}
        description={description}
        confirmText={confirmText}
        variant={variant}
        loading={loading}
      />
    </>
  )
}