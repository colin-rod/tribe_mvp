'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { FREQUENCY_OPTIONS, CHANNEL_OPTIONS, CONTENT_TYPE_OPTIONS } from '@/lib/validation/recipients'

export interface BulkAction {
  type: 'mute_all' | 'unmute_all' | 'set_frequency' | 'set_channels' | 'set_content_types' | 'reset_to_defaults'
  label: string
  description: string
  icon: React.ReactNode
  requiresInput?: boolean
  destructive?: boolean
}

export interface BulkPreferences {
  frequency?: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'
  channels?: Array<'email' | 'sms' | 'whatsapp'>
  content_types?: Array<'photos' | 'text' | 'milestones'>
}

interface BulkPreferenceActionsProps {
  selectedGroupIds: string[]
  totalGroups: number
  onBulkAction: (action: BulkAction['type'], preferences?: BulkPreferences) => Promise<void>
  onClearSelection: () => void
  isLoading?: boolean
  className?: string
}

const BULK_ACTIONS: BulkAction[] = [
  {
    type: 'mute_all',
    label: 'Mute All',
    description: 'Mute notifications from selected groups',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
      </svg>
    )
  },
  {
    type: 'unmute_all',
    label: 'Unmute All',
    description: 'Unmute notifications from selected groups',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    )
  },
  {
    type: 'set_frequency',
    label: 'Set Frequency',
    description: 'Apply the same notification frequency to selected groups',
    requiresInput: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    type: 'set_channels',
    label: 'Set Channels',
    description: 'Apply the same notification channels to selected groups',
    requiresInput: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    type: 'reset_to_defaults',
    label: 'Reset to Defaults',
    description: 'Reset selected groups to use their default settings',
    destructive: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    )
  }
]

export default function BulkPreferenceActions({
  selectedGroupIds,
  totalGroups,
  onBulkAction,
  onClearSelection,
  isLoading = false,
  className
}: BulkPreferenceActionsProps) {
  const [activeAction, setActiveAction] = useState<BulkAction | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [bulkPreferences, setBulkPreferences] = useState<BulkPreferences>({
    frequency: 'weekly_digest',
    channels: ['email'],
    content_types: ['photos', 'text']
  })

  const selectedCount = selectedGroupIds.length

  const handleQuickAction = async (action: BulkAction) => {
    if (action.requiresInput) {
      setActiveAction(action)
      return
    }

    setIsProcessing(true)
    try {
      await onBulkAction(action.type)
      onClearSelection()
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkPreferenceAction = async () => {
    if (!activeAction) return

    setIsProcessing(true)
    try {
      const preferences: BulkPreferences = {}

      if (activeAction.type === 'set_frequency') {
        preferences.frequency = bulkPreferences.frequency
      } else if (activeAction.type === 'set_channels') {
        preferences.channels = bulkPreferences.channels
      } else if (activeAction.type === 'set_content_types') {
        preferences.content_types = bulkPreferences.content_types
      }

      await onBulkAction(activeAction.type, preferences)
      setActiveAction(null)
      onClearSelection()
    } catch (error) {
      console.error('Bulk preference action failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleChannelToggle = (channel: 'email' | 'sms' | 'whatsapp') => {
    setBulkPreferences(prev => ({
      ...prev,
      channels: prev.channels?.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...(prev.channels || []), channel]
    }))
  }

  const handleContentTypeToggle = (contentType: 'photos' | 'text' | 'milestones') => {
    setBulkPreferences(prev => ({
      ...prev,
      content_types: prev.content_types?.includes(contentType)
        ? prev.content_types.filter(c => c !== contentType)
        : [...(prev.content_types || []), contentType]
    }))
  }

  if (selectedCount === 0) {
    return (
      <div className={cn(
        "bg-gray-50 border border-gray-200 rounded-lg p-4 text-center",
        className
      )}>
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">Select groups to perform bulk actions</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 bg-primary-50 border-b border-primary-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full" />
            <span className="text-sm font-medium text-primary-900">
              {selectedCount} of {totalGroups} groups selected
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 px-2 text-xs text-primary-700 hover:text-primary-900 hover:bg-primary-100"
            disabled={isProcessing}
          >
            Clear Selection
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      {!activeAction && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BULK_ACTIONS.map((action) => (
              <Button
                key={action.type}
                variant={action.destructive ? "destructive" : "outline"}
                size="sm"
                onClick={() => handleQuickAction(action)}
                disabled={isLoading || isProcessing}
                className="h-auto p-3 flex-col items-start text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  {action.icon}
                  <span className="text-xs font-medium">{action.label}</span>
                </div>
                <span className="text-xs opacity-75 leading-tight">
                  {action.description}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Action Interface */}
      {activeAction && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveAction(null)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              disabled={isProcessing}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <div className="flex items-center gap-2">
              {activeAction.icon}
              <h4 className="text-sm font-medium text-gray-900">{activeAction.label}</h4>
            </div>
          </div>

          <div className="space-y-4">
            {activeAction.type === 'set_frequency' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Frequency
                </label>
                <div className="space-y-2">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="bulk-frequency"
                        value={option.value}
                        checked={bulkPreferences.frequency === option.value}
                        onChange={() => setBulkPreferences(prev => ({ ...prev, frequency: option.value }))}
                        className="text-primary-600 focus:ring-primary-500"
                        disabled={isProcessing}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeAction.type === 'set_channels' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Channels
                </label>
                <div className="space-y-2">
                  {CHANNEL_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={bulkPreferences.channels?.includes(option.value) || false}
                        onChange={() => handleChannelToggle(option.value)}
                        className="text-primary-600 focus:ring-primary-500 rounded"
                        disabled={isProcessing}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeAction.type === 'set_content_types' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Content Types
                </label>
                <div className="space-y-2">
                  {CONTENT_TYPE_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={bulkPreferences.content_types?.includes(option.value) || false}
                        onChange={() => handleContentTypeToggle(option.value)}
                        className="text-primary-600 focus:ring-primary-500 rounded"
                        disabled={isProcessing}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={() => setActiveAction(null)}
                disabled={isProcessing}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkPreferenceAction}
                disabled={isProcessing || (
                  activeAction.type === 'set_channels' && (!bulkPreferences.channels || bulkPreferences.channels.length === 0)
                ) || (
                  activeAction.type === 'set_content_types' && (!bulkPreferences.content_types || bulkPreferences.content_types.length === 0)
                )}
                loading={isProcessing}
                size="sm"
              >
                Apply to {selectedCount} Groups
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}