'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('GroupManager')

import { useState, useEffect } from 'react'
import { RecipientGroup, getUserGroups, deleteGroup } from '@/lib/recipient-groups'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import GroupCard from './GroupCard'
import AddGroupForm from './AddGroupForm'
import GroupEditor from './GroupEditor'

export default function GroupManager() {
  const [groups, setGroups] = useState<(RecipientGroup & { recipient_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<RecipientGroup | null>(null)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    try {
      setLoading(true)
      setError(null)
      const groupsData = await getUserGroups()
      setGroups(groupsData)
    } catch (error) {
      logger.errorWithStack('Error loading groups:', error as Error)
      setError('Failed to load groups. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGroupAdded = (newGroup: RecipientGroup) => {
    // Add the new group with 0 recipient count
    const groupWithCount = { ...newGroup, recipient_count: 0 }
    setGroups(prev => {
      // Insert custom groups after default groups but maintain alphabetical order
      const defaultGroups = prev.filter(g => g.is_default_group)
      const customGroups = prev.filter(g => !g.is_default_group)
      const updatedCustomGroups = [...customGroups, groupWithCount].sort((a, b) => a.name.localeCompare(b.name))
      return [...defaultGroups, ...updatedCustomGroups]
    })
    setShowAddForm(false)
  }

  const handleGroupUpdated = (updatedGroup: RecipientGroup) => {
    setGroups(prev =>
      prev.map(group =>
        group.id === updatedGroup.id
          ? { ...updatedGroup, recipient_count: group.recipient_count }
          : group
      )
    )
    setEditingGroup(null)
  }

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (!group) return

    if (group.is_default_group) {
      alert('Cannot delete default groups.')
      return
    }

    const confirmMessage = group.recipient_count > 0
      ? `Are you sure you want to delete "${group.name}"? Its ${group.recipient_count} recipient(s) will be moved to the "Friends" group.`
      : `Are you sure you want to delete "${group.name}"?`

    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      setDeletingGroupId(groupId)
      await deleteGroup(groupId)
      setGroups(prev => prev.filter(group => group.id !== groupId))
    } catch (error) {
      logger.errorWithStack('Error deleting group:', error as Error)
      alert(error instanceof Error ? error.message : 'Failed to delete group. Please try again.')
    } finally {
      setDeletingGroupId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" className="mr-3" />
        <span className="text-lg text-gray-600">Loading groups...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={loadGroups}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipient Groups</h1>
          <p className="text-gray-600 mt-1">
            Organize your family and friends into groups with custom notification preferences
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            Create Group
          </Button>
        )}
      </div>

      {/* Add Group Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <AddGroupForm
            onGroupAdded={handleGroupAdded}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
          <p className="text-gray-600 mb-6">
            It looks like your default groups haven&apos;t been created yet. This usually happens automatically during signup.
          </p>
          <Button onClick={loadGroups}>
            Refresh Groups
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Default Groups Section */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-3">Default Groups</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups
                .filter(group => group.is_default_group)
                .map((group) => (
                  <div key={group.id} className="relative">
                    {deletingGroupId === group.id && (
                      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                        <LoadingSpinner size="sm" />
                      </div>
                    )}
                    <GroupCard
                      group={group}
                      onEdit={setEditingGroup}
                      onDelete={handleDeleteGroup}
                      showActions={true}
                    />
                  </div>
                ))}
            </div>
          </div>

          {/* Custom Groups Section */}
          {groups.some(group => !group.is_default_group) && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3">Custom Groups</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups
                  .filter(group => !group.is_default_group)
                  .map((group) => (
                    <div key={group.id} className="relative">
                      {deletingGroupId === group.id && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                          <LoadingSpinner size="sm" />
                        </div>
                      )}
                      <GroupCard
                        group={group}
                        onEdit={setEditingGroup}
                        onDelete={handleDeleteGroup}
                        showActions={true}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <GroupEditor
          group={editingGroup}
          onGroupUpdated={handleGroupUpdated}
          onClose={() => setEditingGroup(null)}
        />
      )}
    </div>
  )
}