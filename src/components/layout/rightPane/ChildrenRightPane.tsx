'use client'

import { useViewSelection } from '@/contexts/ViewSelectionContext'
import { DetailCard, DetailRow } from './shared/DetailCard'
import { StatCard } from './shared/StatCard'
import { Button } from '@/components/ui/Button'

export function ChildrenRightPane() {
  const { selectedId } = useViewSelection()

  // TODO: Replace with actual data from context/API
  const selectedChild = selectedId ? {
    id: selectedId,
    name: 'Emma Rodriguez',
    age: '2 years 3 months',
    birthday: 'July 15, 2023',
    totalUpdates: 145,
    recentMilestones: [
      { id: 1, title: 'First sentence', date: '2025-11-28', description: 'Said "I love you mommy"' },
      { id: 2, title: 'Counting to 10', date: '2025-11-15', description: 'Can count from 1 to 10' },
      { id: 3, title: 'Potty trained', date: '2025-10-20', description: 'Fully potty trained!' }
    ]
  } : null

  if (!selectedChild) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-sm text-neutral-500">Select a child to view details</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">{selectedChild.name}</h2>
      </div>

      {/* Child Details */}
      <DetailCard title="Details">
        <DetailRow label="Age" value={selectedChild.age} />
        <DetailRow label="Birthday" value={selectedChild.birthday} />
        <DetailRow label="Total Updates" value={selectedChild.totalUpdates} />
      </DetailCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Updates"
          value={selectedChild.totalUpdates}
          trend={{ value: '+12 this month', direction: 'up' }}
        />
        <StatCard
          label="Milestones"
          value={selectedChild.recentMilestones.length}
          trend={{ value: '+1 this week', direction: 'up' }}
        />
      </div>

      {/* Milestones Timeline */}
      <DetailCard title="Recent Milestones">
        <div className="space-y-3">
          {selectedChild.recentMilestones.map((milestone) => (
            <div key={milestone.id} className="pb-3 border-b border-neutral-100 last:border-0 last:pb-0">
              <p className="text-sm font-medium text-neutral-900">{milestone.title}</p>
              <p className="text-xs text-neutral-600 mt-1">{milestone.description}</p>
              <p className="text-xs text-neutral-500 mt-1">{milestone.date}</p>
            </div>
          ))}
        </div>
      </DetailCard>

      {/* Quick Actions */}
      <div className="space-y-2">
        <Button variant="primary" className="w-full">
          Add Update
        </Button>
        <Button variant="outline" className="w-full">
          Edit Child
        </Button>
      </div>
    </div>
  )
}
