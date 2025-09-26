'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import GroupMembershipCard, { type GroupMembership } from './GroupMembershipCard'
import GroupPreferenceManager from './GroupPreferenceManager'
import MuteControls from './MuteControls'
import BulkPreferenceActions, { type BulkPreferences } from './BulkPreferenceActions'

export interface GroupOverviewDashboardProps {
  memberships: GroupMembership[]
  recipientName: string
  onUpdatePreferences: (groupId: string, preferences: Partial<GroupMembership['personal_preferences']>) => Promise<void>
  onResetToDefaults: (groupId: string) => Promise<void>
  onMuteGroup: (groupId: string, duration?: number) => Promise<void>
  onUnmuteGroup: (groupId: string) => Promise<void>
  onBulkAction: (action: string, preferences?: BulkPreferences, groupIds?: string[]) => Promise<void>
  isLoading?: boolean
  className?: string
}

type DashboardView = 'overview' | 'preferences' | 'mute'

interface ViewState {
  view: DashboardView
  selectedGroupId?: string
}

export default function GroupOverviewDashboard({
  memberships,
  recipientName,
  onUpdatePreferences,
  onResetToDefaults,
  onMuteGroup,
  onUnmuteGroup,
  onBulkAction,
  isLoading = false,
  className
}: GroupOverviewDashboardProps) {
  const [viewState, setViewState] = useState<ViewState>({ view: 'overview' })
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'muted'>('all')

  // Memoized filtered memberships
  const filteredMemberships = useMemo(() => {
    let filtered = memberships

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(membership =>
        membership.name.toLowerCase().includes(query) ||
        (membership.description && membership.description.toLowerCase().includes(query))
      )
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(membership => {
        if (filterStatus === 'muted') return membership.is_muted
        if (filterStatus === 'active') return !membership.is_muted
        return true
      })
    }

    return filtered
  }, [memberships, searchQuery, filterStatus])

  // Statistics
  const stats = useMemo(() => {
    const total = memberships.length
    const muted = memberships.filter(m => m.is_muted).length
    const withCustomPrefs = memberships.filter(m =>
      m.personal_preferences.frequency ||
      m.personal_preferences.channels ||
      m.personal_preferences.content_types
    ).length

    return { total, muted, active: total - muted, withCustomPrefs }
  }, [memberships])

  const handleViewSettings = useCallback((groupId: string) => {
    setViewState({ view: 'preferences', selectedGroupId: groupId })
  }, [])

  const handleToggleMute = useCallback((groupId: string, mute: boolean) => {
    if (mute) {
      setViewState({ view: 'mute', selectedGroupId: groupId })
    } else {
      onUnmuteGroup(groupId)
    }
  }, [onUnmuteGroup])

  const handleCloseModal = useCallback(() => {
    setViewState({ view: 'overview' })
  }, [])

  const handleGroupSelection = useCallback((groupId: string, selected: boolean) => {
    setSelectedGroupIds(prev =>
      selected
        ? [...prev, groupId]
        : prev.filter(id => id !== groupId)
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    const allIds = filteredMemberships.map(m => m.id)
    setSelectedGroupIds(allIds)
  }, [filteredMemberships])

  const handleClearSelection = useCallback(() => {
    setSelectedGroupIds([])
  }, [])

  const handleBulkAction = useCallback(async (action: string, preferences?: BulkPreferences) => {
    await onBulkAction(action, preferences, selectedGroupIds)
    setSelectedGroupIds([])
  }, [onBulkAction, selectedGroupIds])

  const currentMembership = useMemo(() =>
    memberships.find(m => m.id === viewState.selectedGroupId),
    [memberships, viewState.selectedGroupId]
  )

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Header skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-white p-4 rounded-lg border border-gray-200">
              <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-8" />
            </div>
          ))}
        </div>

        {/* Cards skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900">
          Hi {recipientName}!
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Manage your notification preferences for {stats.total} group{stats.total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Total Groups</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Muted</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.muted}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Custom Settings</div>
          <div className="text-2xl font-bold text-purple-600">{stats.withCustomPrefs}</div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filter Buttons */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'muted', label: 'Muted' }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterStatus(filter.id as typeof filterStatus)}
                  className={cn(
                    "px-3 py-1 text-sm font-medium rounded transition-all duration-200",
                    filterStatus === filter.id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Bulk Selection */}
            {filteredMemberships.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectedGroupIds.length === filteredMemberships.length ? handleClearSelection : handleSelectAll}
                >
                  {selectedGroupIds.length === filteredMemberships.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedGroupIds.length > 0 && (
        <BulkPreferenceActions
          selectedGroupIds={selectedGroupIds}
          totalGroups={filteredMemberships.length}
          onBulkAction={handleBulkAction}
          onClearSelection={handleClearSelection}
        />
      )}

      {/* Group Cards */}
      <div className="space-y-4">
        {filteredMemberships.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No groups found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? 'Try adjusting your search criteria.' : 'You are not a member of any groups yet.'}
            </p>
          </div>
        ) : (
          filteredMemberships.map((membership) => (
            <div key={membership.id} className="relative">
              {/* Selection checkbox for bulk actions */}
              {filteredMemberships.length > 1 && (
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(membership.id)}
                    onChange={(e) => handleGroupSelection(membership.id, e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500 shadow-sm"
                  />
                </div>
              )}

              <GroupMembershipCard
                membership={membership}
                onToggleMute={handleToggleMute}
                onUpdatePreferences={onUpdatePreferences}
                onResetToDefaults={onResetToDefaults}
                onViewSettings={handleViewSettings}
                className={cn(
                  "transition-all duration-200",
                  selectedGroupIds.includes(membership.id) && "ring-2 ring-primary-500 ring-offset-2",
                  filteredMemberships.length > 1 && "pl-12"
                )}
              />
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {viewState.view === 'preferences' && currentMembership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <GroupPreferenceManager
              membership={currentMembership}
              onUpdatePreferences={onUpdatePreferences}
              onResetToDefaults={onResetToDefaults}
              onClose={handleCloseModal}
            />
          </div>
        </div>
      )}

      {viewState.view === 'mute' && currentMembership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <MuteControls
              groupId={currentMembership.id}
              groupName={currentMembership.name}
              isMuted={currentMembership.is_muted}
              muteUntil={currentMembership.mute_until}
              onMute={onMuteGroup}
              onUnmute={onUnmuteGroup}
              onClose={handleCloseModal}
            />
          </div>
        </div>
      )}
    </div>
  )
}