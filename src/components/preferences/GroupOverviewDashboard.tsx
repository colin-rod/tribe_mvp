'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { GroupMembershipCard } from './GroupMembershipCard'
import { TemporaryMuteModal } from './TemporaryMuteModal'
import { createLogger } from '@/lib/logger'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  BellIcon,
  BellSlashIcon
} from '@heroicons/react/24/outline'

const logger = createLogger('GroupOverviewDashboard')

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

export interface RecipientData {
  id: string
  name: string
  email?: string
  relationship: string
  member_since: string
  last_seen?: string
  preferences: Record<string, unknown>
}

export interface GroupOverviewData {
  recipient: RecipientData
  memberships: GroupMembership[]
  grouped_memberships: {
    default_groups: GroupMembership[]
    custom_groups: GroupMembership[]
    active_memberships: GroupMembership[]
    inactive_memberships: GroupMembership[]
  }
  summary: {
    total_groups: number
    active_groups: number
    inactive_groups: number
    default_groups: number
    custom_groups: number
    groups_with_custom_settings: number
    admin_roles: number
    preferences: Record<string, unknown>
  }
}

interface GroupOverviewDashboardProps {
  token: string
  onSuccess?: () => void
}

export function GroupOverviewDashboard({ token, onSuccess }: GroupOverviewDashboardProps) {
  const [data, setData] = useState<GroupOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    activeGroups: true,
    inactiveGroups: false,
    globalSettings: false
  })
  const [muteModalOpen, setMuteModalOpen] = useState(false)
  const [selectedMembership, setSelectedMembership] = useState<GroupMembership | null>(null)
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  // Fetch membership data
  const fetchMembershipData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/recipients/${token}/membership?show_activity=true&show_other_members=true`)

      if (!response.ok) {
        throw new Error('Failed to fetch membership data')
      }

      const membershipData = await response.json()
      setData(membershipData)

    } catch (error) {
      logger.errorWithStack('Error fetching membership data:', error as Error)
      setError(error instanceof Error ? error.message : 'Failed to load group information')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void fetchMembershipData()
  }, [fetchMembershipData])

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleMuteGroup = (membership: GroupMembership) => {
    setSelectedMembership(membership)
    setMuteModalOpen(true)
  }

  const handleUnmuteGroup = async (membership: GroupMembership) => {
    try {
      setProcessingAction(membership.id)

      const response = await fetch(`/api/recipients/${token}/mute`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ group_id: membership.group_id })
      })

      if (!response.ok) {
        throw new Error('Failed to unmute group')
      }

      // Refresh data
      await fetchMembershipData()
      onSuccess?.()

    } catch (error) {
      logger.errorWithStack('Error unmuting group:', error as Error)
      setError(error instanceof Error ? error.message : 'Failed to unmute group')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleMuteConfirm = async (duration: string, preserveUrgent: boolean) => {
    if (!selectedMembership) return

    try {
      setProcessingAction(selectedMembership.id)

      const response = await fetch(`/api/recipients/${token}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_id: selectedMembership.group_id,
          duration,
          preserve_urgent: preserveUrgent
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mute group')
      }

      setMuteModalOpen(false)
      setSelectedMembership(null)

      // Refresh data
      await fetchMembershipData()
      onSuccess?.()

    } catch (error) {
      logger.errorWithStack('Error muting group:', error as Error)
      setError(error instanceof Error ? error.message : 'Failed to mute group')
    } finally {
      setProcessingAction(null)
    }
  }

  const formatMuteUntil = (muteUntil: string): string => {
    const date = new Date(muteUntil)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return 'Expiring soon'
    if (diffDays === 1) return 'Until tomorrow'
    if (diffDays <= 7) return `For ${diffDays} days`
    if (diffDays <= 30) return `For ${Math.ceil(diffDays / 7)} weeks`
    return `For ${Math.ceil(diffDays / 30)} months`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>

          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading group information
            </h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMembershipData}
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No group information available</p>
      </div>
    )
  }

  const { recipient, grouped_memberships, summary } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Hi {recipient.name}!
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Manage your group preferences and notification settings
        </p>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <UserGroupIcon className="h-6 w-6 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Your Group Memberships</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">{summary.active_groups}</div>
            <div className="text-sm text-gray-600">Active Groups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{summary.groups_with_custom_settings}</div>
            <div className="text-sm text-gray-600">Custom Settings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.default_groups}</div>
            <div className="text-sm text-gray-600">Default Groups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.custom_groups}</div>
            <div className="text-sm text-gray-600">Custom Groups</div>
          </div>
        </div>
      </div>

      {/* Active Groups Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection('activeGroups')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BellIcon className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Active Groups ({grouped_memberships.active_memberships.length})
            </h3>
          </div>
          {expandedSections.activeGroups ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {expandedSections.activeGroups && (
          <div className="px-6 pb-6">
            <p className="text-sm text-gray-600 mb-4">
              These groups will send you notifications based on your preferences.
              You can adjust settings for each group independently.
            </p>

            <div className="space-y-4">
              {grouped_memberships.active_memberships.map((membership) => (
                <GroupMembershipCard
                  key={membership.id}
                  membership={membership}
                  token={token}
                  onUpdate={fetchMembershipData}
                  onMute={() => handleMuteGroup(membership)}
                  onUnmute={() => handleUnmuteGroup(membership)}
                  isProcessing={processingAction === membership.id}
                  formatMuteUntil={formatMuteUntil}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Inactive Groups Section */}
      {grouped_memberships.inactive_memberships.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => toggleSection('inactiveGroups')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BellSlashIcon className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">
                Inactive Groups ({grouped_memberships.inactive_memberships.length})
              </h3>
            </div>
            {expandedSections.inactiveGroups ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {expandedSections.inactiveGroups && (
            <div className="px-6 pb-6">
              <p className="text-sm text-gray-600 mb-4">
                These groups are inactive. You won&apos;t receive notifications but can rejoin anytime.
              </p>

              <div className="space-y-4">
                {grouped_memberships.inactive_memberships.map((membership) => (
                  <GroupMembershipCard
                    key={membership.id}
                    membership={membership}
                    token={token}
                    onUpdate={fetchMembershipData}
                    onMute={() => handleMuteGroup(membership)}
                    onUnmute={() => handleUnmuteGroup(membership)}
                    isProcessing={processingAction === membership.id}
                    formatMuteUntil={formatMuteUntil}
                    isInactive
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Settings Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection('globalSettings')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Cog6ToothIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Global Preferences
            </h3>
          </div>
          {expandedSections.globalSettings ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {expandedSections.globalSettings && (
          <div className="px-6 pb-6">
            <p className="text-sm text-gray-600 mb-4">
              These settings affect how you view and interact with all groups.
            </p>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Global preference management will be available in a future update.
                For now, you can manage preferences for each group individually.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Need help managing your preferences?
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Group Defaults:</strong> Settings automatically applied to new groups you join</li>
                <li><strong>Custom Settings:</strong> Your personal overrides for specific groups</li>
                <li><strong>Mute Options:</strong> Temporarily pause notifications while staying in the group</li>
                <li><strong>Override Indicators:</strong> Blue badges show when you&apos;re using custom settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Temporary Mute Modal */}
      <TemporaryMuteModal
        isOpen={muteModalOpen}
        onClose={() => {
          setMuteModalOpen(false)
          setSelectedMembership(null)
        }}
        onConfirm={handleMuteConfirm}
        groupName={selectedMembership?.group.name || ''}
        isProcessing={!!processingAction}
      />
    </div>
  )
}
