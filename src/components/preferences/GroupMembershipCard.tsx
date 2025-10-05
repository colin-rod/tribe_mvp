'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { GroupPreferenceSettings } from './GroupPreferenceSettings'
import { getPreferenceOptions } from '@/lib/preference-links'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  BellIcon,
  BellSlashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

const logger = createLogger('GroupMembershipCard')

export interface GroupMembership {
  id: string
  group_id: string
  group: {
    id: string
    name: string
    default_frequency: string
    default_channels: string[]
    is_default_group: boolean
    member_count?: number
  }
  frequency?: string
  preferred_channels?: string[]
  content_types?: string[]
  role: string
  is_active: boolean
  has_custom_settings: boolean
  effective_settings: {
    frequency: string
    channels: string[]
    content_types: string[]
    source: 'member_override' | 'group_default' | 'system_default'
  }
  mute_until?: string
  recent_activity?: {
    update_count: number
    last_update: string | null
  }
}

interface GroupMembershipCardProps {
  membership: GroupMembership
  token: string
  onUpdate: () => void
  onMute: () => void
  onUnmute: () => void
  isProcessing?: boolean
  formatMuteUntil: (date: string) => string
  isInactive?: boolean
}

export function GroupMembershipCard({
  membership,
  token,
  onUpdate,
  onMute,
  onUnmute,
  isProcessing = false,
  formatMuteUntil,
  isInactive = false
}: GroupMembershipCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [localProcessing, setLocalProcessing] = useState<string | null>(null)

  const options = getPreferenceOptions()
  const isMuted = !!membership.mute_until && new Date(membership.mute_until) > new Date()
  const resolvedIsInactive = isInactive || !membership.is_active

  const getFrequencyLabel = (freq: string) => {
    return options.frequencies.find(f => f.value === freq)?.label || freq
  }

  const getChannelLabels = (channels: string[]) => {
    return channels.map(ch =>
      options.channels.find(c => c.value === ch)?.label || ch
    )
  }

  const handleToggleActive = async () => {
    try {
      setLocalProcessing('activation')

      const action = membership.is_active ? 'leave' : 'join'
      const response = await fetch(`/api/recipients/${token}/membership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          group_id: membership.group_id
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} group`)
      }

      onUpdate()
    } catch (error) {
      logger.errorWithStack(`Error toggling group activation:`, error as Error)
    } finally {
      setLocalProcessing(null)
    }
  }

  const handleResetToDefaults = async () => {
    try {
      setLocalProcessing('reset')

      const response = await fetch(`/api/recipients/${token}/group-preferences`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_id: membership.group_id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reset to group defaults')
      }

      onUpdate()
    } catch (error) {
      logger.errorWithStack('Error resetting to defaults:', error as Error)
    } finally {
      setLocalProcessing(null)
    }
  }

  const getGroupIcon = () => {
    if (membership.group.is_default_group) {
      return <UserGroupIcon className="h-5 w-5" />
    }
    return <UserGroupIcon className="h-5 w-5" />
  }

  const getStatusIcon = () => {
    if (isMuted) {
      return <BellSlashIcon className="h-5 w-5 text-orange-500" />
    }
    if (resolvedIsInactive) {
      return <BellSlashIcon className="h-5 w-5 text-gray-400" />
    }
    return <BellIcon className="h-5 w-5 text-green-500" />
  }

  const getStatusText = () => {
    if (isMuted) {
      return `Muted ${formatMuteUntil(membership.mute_until!)}`
    }
    if (resolvedIsInactive) {
      return 'Inactive'
    }
    return 'Active'
  }

  return (
    <div className={cn(
      "bg-white border rounded-lg transition-all duration-200",
      !resolvedIsInactive && !isMuted ? "border-green-200 hover:border-green-300 hover:shadow-md" : "border-gray-200",
      isMuted && "bg-orange-50 border-orange-200",
      resolvedIsInactive && "bg-gray-50 border-gray-200"
    )}>
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          {/* Group Info */}
          <div className="flex items-center gap-4 flex-1">
            <div className={cn(
              "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
              membership.group.is_default_group
                ? "bg-primary-100 text-primary-600"
                : "bg-gray-100 text-gray-600"
            )}>
              {getGroupIcon()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {membership.group.name}
                </h3>

                {membership.group.is_default_group && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                    Default
                  </span>
                )}

                {membership.has_custom_settings && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    Custom Settings
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  {getStatusIcon()}
                  <span className={cn(
                    "font-medium",
                    isMuted ? "text-orange-700" :
                    resolvedIsInactive ? "text-gray-500" : "text-green-700"
                  )}>
                    {getStatusText()}
                  </span>
                </div>

                {membership.group.member_count && (
                  <div className="flex items-center gap-1">
                    <UserGroupIcon className="h-4 w-4 text-gray-400" />
                    <span>{membership.group.member_count} members</span>
                  </div>
                )}

                {membership.recent_activity && (
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span>{membership.recent_activity.update_count} updates this month</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4">
            {isMuted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnmute}
                disabled={isProcessing}
                className="text-orange-700 border-orange-300 hover:bg-orange-50"
              >
                {isProcessing ? (
                  <LoadingSpinner size="sm" className="mr-1" />
                ) : (
                  <BellIcon className="h-4 w-4 mr-1" />
                )}
                Unmute
              </Button>
            ) : membership.is_active ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onMute}
                disabled={isProcessing}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <BellSlashIcon className="h-4 w-4 mr-1" />
                Mute
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              {expanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Quick Settings Preview */}
        {!expanded && membership.is_active && !isMuted && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Frequency:</span>
                <span className={cn(
                  "font-medium",
                  membership.effective_settings.source === 'member_override'
                    ? "text-blue-700"
                    : "text-gray-700"
                )}>
                  {getFrequencyLabel(membership.effective_settings.frequency)}
                </span>
                {membership.effective_settings.source === 'member_override' && (
                  <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-500">Channels:</span>
                <div className="flex gap-1">
                  {getChannelLabels(membership.effective_settings.channels).map((channel, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Settings */}
      {expanded && (
        <div className="border-t border-gray-200">
          <div className="p-4 sm:p-6">
            {/* Status Actions */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {!membership.is_active ? (
                <Button
                  variant="outline"
                  onClick={handleToggleActive}
                  disabled={!!localProcessing}
                  className="text-green-700 border-green-300 hover:bg-green-50"
                >
                  {localProcessing === 'activation' ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <BellIcon className="h-4 w-4 mr-2" />
                  )}
                  Rejoin Group
                </Button>
              ) : (
                <>
                  {membership.has_custom_settings && (
                    <Button
                      variant="outline"
                      onClick={handleResetToDefaults}
                      disabled={!!localProcessing}
                      className="text-blue-700 border-blue-300 hover:bg-blue-50"
                    >
                      {localProcessing === 'reset' ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                      )}
                      Reset to Group Defaults
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-gray-700 border-gray-300 hover:bg-gray-50"
                  >
                    <Cog6ToothIcon className="h-4 w-4 mr-2" />
                    {showSettings ? 'Hide Settings' : 'Customize Settings'}
                  </Button>

                  {!isMuted && (
                    <Button
                      variant="outline"
                      onClick={handleToggleActive}
                      disabled={!!localProcessing}
                      className="text-red-700 border-red-300 hover:bg-red-50"
                    >
                      {localProcessing === 'activation' ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <BellSlashIcon className="h-4 w-4 mr-2" />
                      )}
                      {membership.group.is_default_group ? 'Deactivate' : 'Leave Group'}
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Current Settings Display */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-900">Current Settings</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Frequency</span>
                    {membership.effective_settings.source === 'member_override' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900">
                    {getFrequencyLabel(membership.effective_settings.frequency)}
                  </p>
                  {membership.effective_settings.source === 'group_default' && (
                    <p className="text-xs text-gray-500 mt-1">Using group default</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Channels</span>
                    {membership.preferred_channels && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {getChannelLabels(membership.effective_settings.channels).map((channel, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white text-gray-700 border border-gray-200">
                        {channel}
                      </span>
                    ))}
                  </div>
                  {!membership.preferred_channels && (
                    <p className="text-xs text-gray-500 mt-1">Using group default</p>
                  )}
                </div>
              </div>

              {/* Group Defaults Comparison */}
              {membership.has_custom_settings && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-medium text-blue-900 mb-1">
                        You&apos;re using custom settings for this group
                      </h5>
                      <div className="text-sm text-blue-800">
                        <p className="mb-1">
                          <strong>Group &quot;{membership.group.name}&quot; defaults:</strong>
                        </p>
                        <p>• Frequency: {getFrequencyLabel(membership.group.default_frequency)}</p>
                        <p>• Channels: {getChannelLabels(membership.group.default_channels).join(', ')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Form */}
            {showSettings && membership.is_active && !isMuted && (
              <div className="border-t border-gray-200 pt-6">
                <GroupPreferenceSettings
                  membership={membership}
                  token={token}
                  onUpdate={() => {
                    onUpdate()
                    setShowSettings(false)
                  }}
                  onCancel={() => setShowSettings(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
