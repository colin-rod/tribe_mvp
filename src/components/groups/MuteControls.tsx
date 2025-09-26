'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface MuteOption {
  id: string
  label: string
  description: string
  duration?: number // Duration in hours, null for indefinite
}

const MUTE_OPTIONS: MuteOption[] = [
  {
    id: 'hour',
    label: '1 Hour',
    description: 'Mute for the next hour',
    duration: 1
  },
  {
    id: 'day',
    label: '1 Day',
    description: 'Mute for the next 24 hours',
    duration: 24
  },
  {
    id: 'week',
    label: '1 Week',
    description: 'Mute for the next 7 days',
    duration: 24 * 7
  },
  {
    id: 'month',
    label: '1 Month',
    description: 'Mute for the next 30 days',
    duration: 24 * 30
  },
  {
    id: 'indefinite',
    label: 'Indefinitely',
    description: 'Mute until manually unmuted'
  }
]

interface MuteControlsProps {
  groupId: string
  groupName: string
  isMuted: boolean
  muteUntil?: string | null
  onMute: (groupId: string, duration?: number) => Promise<void>
  onUnmute: (groupId: string) => Promise<void>
  onClose: () => void
  isLoading?: boolean
  className?: string
}

export default function MuteControls({
  groupId,
  groupName,
  isMuted,
  muteUntil,
  onMute,
  onUnmute,
  onClose,
  isLoading = false,
  className
}: MuteControlsProps) {
  const [selectedOption, setSelectedOption] = useState<MuteOption | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleMute = async (option: MuteOption) => {
    if (isProcessing) return

    setIsProcessing(true)
    setErrorMessage(null)
    try {
      await onMute(groupId, option.duration)
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mute group'
      setErrorMessage(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnmute = async () => {
    if (isProcessing) return

    setIsProcessing(true)
    setErrorMessage(null)
    try {
      await onUnmute(groupId)
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unmute group'
      setErrorMessage(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatMuteUntil = (muteUntil: string) => {
    const date = new Date(muteUntil)
    const now = new Date()
    const diffInHours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return `for ${diffInHours} more ${diffInHours === 1 ? 'hour' : 'hours'}`
    } else if (diffInHours < 24 * 7) {
      const days = Math.ceil(diffInHours / 24)
      return `for ${days} more ${days === 1 ? 'day' : 'days'}`
    } else {
      return `until ${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })}`
    }
  }

  if (isLoading) {
    return (
      <div className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-lg p-6 animate-pulse",
        className
      )}>
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isMuted ? 'Unmute Group' : 'Mute Notifications'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {groupName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
            disabled={isProcessing}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        {isMuted ? (
          // Unmute interface
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  This group is currently muted
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  {muteUntil
                    ? `Muted ${formatMuteUntil(muteUntil)}`
                    : 'Muted indefinitely'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm text-gray-600">
                  You won&apos;t receive any notifications from this group while it&apos;s muted.
                </p>
              </div>
              <Button
                onClick={handleUnmute}
                loading={isProcessing}
                className="ml-4"
              >
                Unmute Group
              </Button>
            </div>
          </div>
        ) : (
          // Mute interface
          <div className="space-y-4">
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Choose how long you&apos;d like to mute notifications from this group:
              </p>
            </div>

            <div className="space-y-2">
              {MUTE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option)}
                  disabled={isProcessing}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border transition-all duration-200",
                    "hover:border-primary-300 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                    selectedOption?.id === option.id
                      ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500"
                      : "border-gray-200 bg-white",
                    isProcessing && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {option.label}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {option.description}
                      </p>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all duration-200",
                      selectedOption?.id === option.id
                        ? "border-primary-500 bg-primary-500"
                        : "border-gray-300"
                    )}>
                      {selectedOption?.id === option.id && (
                        <div className="w-full h-full rounded-full bg-white scale-50" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedOption && handleMute(selectedOption)}
                disabled={!selectedOption || isProcessing}
                loading={isProcessing}
              >
                Mute Group
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
