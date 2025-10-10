'use client'

import { useViewSelection } from '@/contexts/ViewSelectionContext'
import { DetailCard, DetailRow } from './shared/DetailCard'
import { StatCard } from './shared/StatCard'
import { Button } from '@/components/ui/Button'

export function GroupsRightPane() {
  const { selectedId } = useViewSelection()

  // TODO: Replace with actual data from context/API
  const selectedGroup = selectedId ? {
    id: selectedId,
    name: 'Grandparents',
    description: 'Emma\'s grandparents on both sides',
    memberCount: 4,
    activeMembers: 4,
    members: [
      { id: 1, name: 'Sarah Johnson', email: 'sarah.j@example.com', active: true },
      { id: 2, name: 'Robert Johnson', email: 'rob.j@example.com', active: true },
      { id: 3, name: 'Maria Rodriguez', email: 'maria.r@example.com', active: true },
      { id: 4, name: 'Carlos Rodriguez', email: 'carlos.r@example.com', active: true }
    ],
    preferences: {
      emailFrequency: 'Weekly',
      autoInclude: ['Photos', 'Milestones']
    }
  } : null

  if (!selectedGroup) {
    return (
      <div className="right-pane-section">
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80">
          <p className="text-sm text-neutral-600">Select a group to view details</p>
        </div>
      </div>
    )
  }

  return (
    <div className="right-pane-section">
      <header className="space-y-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Active Group</p>
          <h2 className="text-lg font-semibold text-neutral-900">{selectedGroup.name}</h2>
        </div>
        <p className="text-sm text-neutral-600">{selectedGroup.description}</p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Members"
          value={selectedGroup.memberCount}
        />
        <StatCard
          label="Active Members"
          value={selectedGroup.activeMembers}
          trend={{ value: '100% active', direction: 'up' }}
        />
      </div>

      {/* Group Preferences */}
      <DetailCard title="Group Preferences">
        <DetailRow label="Email Frequency" value={selectedGroup.preferences.emailFrequency} />
        <DetailRow
          label="Auto-Include"
          value={
            <div className="flex flex-wrap gap-1 justify-end">
              {selectedGroup.preferences.autoInclude.map((type) => (
                <span key={type} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  {type}
                </span>
              ))}
            </div>
          }
        />
      </DetailCard>

      {/* Member List */}
      <DetailCard title="Members">
        <div className="space-y-3">
          {selectedGroup.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between pb-3 border-b border-neutral-100 last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-neutral-900">{member.name}</p>
                <p className="text-xs text-neutral-500">{member.email}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                member.active ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-800'
              }`}>
                {member.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      </DetailCard>

      {/* Quick Actions */}
      <div className="space-y-2">
        <Button variant="primary" className="w-full">
          Add Member
        </Button>
        <Button variant="outline" className="w-full">
          Edit Group
        </Button>
      </div>
    </div>
  )
}
