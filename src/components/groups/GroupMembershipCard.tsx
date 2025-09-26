'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { FREQUENCY_OPTIONS, CHANNEL_OPTIONS, CONTENT_TYPE_OPTIONS } from '@/lib/validation/recipients'

export interface GroupMembership {
  id: string
  name: string
  description?: string
  is_admin: boolean
  is_muted: boolean
  mute_until?: string | null
  member_count: number
  last_update?: string | null

  // Group default preferences
  group_defaults: {
    frequency: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'
    channels: Array<'email' | 'sms' | 'whatsapp'>
    content_types: Array<'photos' | 'text' | 'milestones'>
  }

  // User's personal overrides (null means using group defaults)
  personal_preferences: {
    frequency?: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only' | null
    channels?: Array<'email' | 'sms' | 'whatsapp'> | null
    content_types?: Array<'photos' | 'text' | 'milestones'> | null
  }
}

interface GroupMembershipCardProps {
  membership: GroupMembership
  onToggleMute: (groupId: string, mute: boolean) => void
  onUpdatePreferences: (groupId: string, preferences: Partial<GroupMembership['personal_preferences']>) => void
  onResetToDefaults: (groupId: string) => void
  onViewSettings: (groupId: string) => void
  isLoading?: boolean
  className?: string
}

export default function GroupMembershipCard({
  membership,
  onToggleMute,
  onUpdatePreferences: _onUpdatePreferences,
  onResetToDefaults,
  onViewSettings,
  isLoading = false,
  className
}: GroupMembershipCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Determine effective preferences (personal overrides or group defaults)
  const effectiveFrequency = membership.personal_preferences.frequency || membership.group_defaults.frequency
  const effectiveChannels = membership.personal_preferences.channels || membership.group_defaults.channels
  const effectiveContentTypes = membership.personal_preferences.content_types || membership.group_defaults.content_types

  // Check if user has any personal overrides
  const hasPersonalOverrides = !!(
    membership.personal_preferences.frequency ||
    membership.personal_preferences.channels ||
    membership.personal_preferences.content_types
  )

  const frequencyLabel = FREQUENCY_OPTIONS.find(option => option.value === effectiveFrequency)?.label || effectiveFrequency
  const channelLabels = effectiveChannels.map(channel =>
    CHANNEL_OPTIONS.find(option => option.value === channel)?.label || channel
  )

  const formatMuteUntil = (muteUntil: string) => {
    const date = new Date(muteUntil)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  if (isLoading) {
    return (
      <div className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse",
        className
      )}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gray-200" />
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded mb-2 w-32" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 ease-out overflow-hidden",
      membership.is_muted && "opacity-75 bg-gray-50",
      className
    )}>
      {/* Muted indicator banner */}
      {membership.is_muted && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
            <span className="text-yellow-800 font-medium">
              Muted {membership.mute_until ? `until ${formatMuteUntil(membership.mute_until)}` : 'indefinitely'}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Group icon */}
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
              membership.is_admin
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-100 text-gray-600'
            )}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-gray-900 truncate">
                  {membership.name}
                </h3>
                {membership.is_admin && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Admin
                  </span>
                )}
                {hasPersonalOverrides && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Custom
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{membership.member_count} {membership.member_count === 1 ? 'member' : 'members'}</span>
                </div>
                {membership.last_update && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Last update {new Date(membership.last_update).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleMute(membership.id, !membership.is_muted)}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              title={membership.is_muted ? "Unmute group" : "Mute group"}
            >
              {membership.is_muted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewSettings(membership.id)}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              title="View detailed settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Description */}
        {membership.description && (
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            {membership.description}
          </p>
        )}

        {/* Current preferences summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800">
              Your Settings
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? 'Less' : 'More'}
              <svg
                className={cn("w-3 h-3 ml-1 transition-transform", isExpanded && "rotate-180")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </div>

          {/* Frequency display */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Frequency</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md",
                membership.personal_preferences.frequency
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-gray-50 text-gray-700 border border-gray-200'
              )}>
                {membership.personal_preferences.frequency && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {frequencyLabel}
              </span>
            </div>
          </div>

          {/* Channels display */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Channels</span>
            <div className="flex flex-wrap gap-1">
              {channelLabels.map((channel, index) => (
                <span
                  key={index}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded",
                    membership.personal_preferences.channels
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-gray-50 text-gray-700 border border-gray-200'
                  )}
                >
                  <div className="w-1.5 h-1.5 bg-current rounded-full" />
                  {channel}
                </span>
              ))}
            </div>
          </div>

          {/* Expanded view */}
          {isExpanded && (
            <div className="pt-3 border-t border-gray-100 space-y-3">
              {/* Content types */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Content Types</span>
                <div className="flex flex-wrap gap-1">
                  {effectiveContentTypes.map((type, index) => {
                    const typeLabel = CONTENT_TYPE_OPTIONS.find(option => option.value === type)?.label || type
                    return (
                      <span
                        key={index}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded",
                          membership.personal_preferences.content_types
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                        )}
                      >
                        {typeLabel}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Override controls */}
              {hasPersonalOverrides && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Custom Preferences Active</p>
                      <p className="text-xs text-gray-500">You&apos;re using personal settings instead of group defaults</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResetToDefaults(membership.id)}
                      className="text-xs"
                    >
                      Reset to Group Defaults
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
