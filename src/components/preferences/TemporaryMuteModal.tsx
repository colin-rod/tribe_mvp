'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import {
  XMarkIcon,
  BellSlashIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface TemporaryMuteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (duration: string, preserveUrgent: boolean) => void
  groupName: string
  isProcessing?: boolean
}

const MUTE_DURATIONS = [
  {
    value: '1_hour',
    label: '1 Hour',
    description: 'Until one hour from now'
  },
  {
    value: '4_hours',
    label: '4 Hours',
    description: 'Until later today'
  },
  {
    value: '1_day',
    label: '1 Day',
    description: 'Until tomorrow'
  },
  {
    value: '3_days',
    label: '3 Days',
    description: 'Until this weekend'
  },
  {
    value: '1_week',
    label: '1 Week',
    description: 'For one week'
  },
  {
    value: '2_weeks',
    label: '2 Weeks',
    description: 'For two weeks'
  },
  {
    value: '1_month',
    label: '1 Month',
    description: 'For one month'
  },
  {
    value: '3_months',
    label: '3 Months',
    description: 'For three months'
  }
]

export function TemporaryMuteModal({
  isOpen,
  onClose,
  onConfirm,
  groupName,
  isProcessing = false
}: TemporaryMuteModalProps) {
  const [selectedDuration, setSelectedDuration] = useState('1_day')
  const [preserveUrgent, setPreserveUrgent] = useState(true)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)

  const handleConfirm = () => {
    onConfirm(selectedDuration, preserveUrgent)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null

    const dialogEl = dialogRef.current
    if (dialogEl) {
      const focusableElements = dialogEl.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      const focusable = Array.from(focusableElements).filter(
        element => !element.hasAttribute('data-focus-guard')
      )
      const firstFocusable = focusable[0]

      if (firstFocusable) {
        firstFocusable.focus()
      } else {
        dialogEl.focus()
      }
    }

    return () => {
      if (previouslyFocusedElementRef.current) {
        previouslyFocusedElementRef.current.focus()
        previouslyFocusedElementRef.current = null
      }
    }
  }, [isOpen])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') {
      return
    }

    const dialogEl = dialogRef.current
    if (!dialogEl) {
      return
    }

    const focusableElements = dialogEl.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
    const focusable = Array.from(focusableElements).filter(element => !element.hasAttribute('data-focus-guard'))

    if (focusable.length === 0) {
      event.preventDefault()
      dialogEl.focus()
      return
    }

    const firstElement = focusable[0]
    const lastElement = focusable[focusable.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else if (document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  const calculateMuteEnd = (duration: string): string => {
    const now = new Date()
    const end = new Date(now)

    switch (duration) {
      case '1_hour':
        end.setHours(end.getHours() + 1)
        break
      case '4_hours':
        end.setHours(end.getHours() + 4)
        break
      case '1_day':
        end.setDate(end.getDate() + 1)
        break
      case '3_days':
        end.setDate(end.getDate() + 3)
        break
      case '1_week':
        end.setDate(end.getDate() + 7)
        break
      case '2_weeks':
        end.setDate(end.getDate() + 14)
        break
      case '1_month':
        end.setMonth(end.getMonth() + 1)
        break
      case '3_months':
        end.setMonth(end.getMonth() + 3)
        break
      default:
        end.setDate(end.getDate() + 1)
    }

    return end.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="temporary-mute-modal-title"
          aria-describedby="temporary-mute-modal-description"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="relative bg-white rounded-lg shadow-xl w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <BellSlashIcon className="h-5 w-5 text-orange-600" />
              </div>
              <h3
                id="temporary-mute-modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                Temporarily Mute Group
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              aria-label="Close temporary mute dialog"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <p
                id="temporary-mute-modal-description"
                className="text-sm text-gray-600"
              >
                Temporarily pause notifications from <strong className="text-gray-900">&quot;{groupName}&quot;</strong>.
                You&apos;ll remain in the group and can unmute anytime.
              </p>
            </div>

            {/* Duration Selection */}
            <div>
              <label className="text-sm font-medium text-gray-900 block mb-3">
                How long would you like to mute this group?
              </label>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {MUTE_DURATIONS.map((duration) => (
                  <div key={duration.value} className={cn(
                    "flex items-center p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedDuration === duration.value
                      ? "bg-orange-50 border-orange-200"
                      : "border-gray-200 hover:bg-gray-50"
                  )}>
                    <input
                      id={`duration-${duration.value}`}
                      type="radio"
                      name="duration"
                      value={duration.value}
                      checked={selectedDuration === duration.value}
                      onChange={(e) => setSelectedDuration(e.target.value)}
                      className="h-4 w-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                    />
                    <div className="ml-3 flex-1">
                      <label
                        htmlFor={`duration-${duration.value}`}
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        {duration.label}
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {duration.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mute End Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <ClockIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Notifications will resume on:
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {calculateMuteEnd(selectedDuration)}
                  </p>
                </div>
              </div>
            </div>

            {/* Urgent Notifications Option */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input
                  id="preserve-urgent"
                  type="checkbox"
                  checked={preserveUrgent}
                  onChange={(e) => setPreserveUrgent(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label
                    htmlFor="preserve-urgent"
                    className="text-sm font-medium text-blue-900 cursor-pointer"
                  >
                    Still receive urgent notifications
                  </label>
                  <p className="text-sm text-blue-700 mt-1">
                    Allow important notifications (like emergencies) to come through even while muted.
                    This ensures you don&apos;t miss critical updates.
                  </p>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-900">
                    You&apos;ll miss regular updates
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    While muted, you won&apos;t receive any regular notifications from this group.
                    You can check for updates manually or unmute at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-gray-200">
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Muting Group...
                </>
              ) : (
                <>
                  <BellSlashIcon className="h-4 w-4 mr-2" />
                  Mute for {MUTE_DURATIONS.find(d => d.value === selectedDuration)?.label}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
