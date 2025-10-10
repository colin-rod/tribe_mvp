'use client'

import { useViewSelection } from '@/contexts/ViewSelectionContext'
import { DetailCard, DetailRow } from './shared/DetailCard'
import { Button } from '@/components/ui/Button'

export function DraftsRightPane() {
  const { selectedId } = useViewSelection()

  // TODO: Replace with actual data from context/API
  const selectedDraft = selectedId ? {
    id: selectedId,
    title: 'Weekly Summary - Dec 3',
    createdDate: '2025-11-30',
    lastModified: '2025-12-01 14:30',
    scheduledTime: '2025-12-03 09:00',
    status: 'scheduled',
    recipients: [
      { id: 1, name: 'Sarah Johnson', group: 'Grandparents' },
      { id: 2, name: 'Robert Johnson', group: 'Grandparents' },
      { id: 3, name: 'Maria Rodriguez', group: 'Grandparents' },
      { id: 4, name: 'Close Friends', group: 'Friends' }
    ],
    contentSummary: {
      photos: 8,
      milestones: 2,
      stories: 1
    }
  } : null

  if (!selectedDraft) {
    return (
      <div className="right-pane-section">
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80">
          <p className="text-sm text-neutral-600">Select a draft to view details</p>
        </div>
      </div>
    )
  }

  return (
    <div className="right-pane-section">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Current Draft</p>
        <h2 className="text-lg font-semibold text-neutral-900">{selectedDraft.title}</h2>
      </header>

      {/* Draft Metadata */}
      <DetailCard title="Draft Information">
        <DetailRow label="Created" value={selectedDraft.createdDate} />
        <DetailRow label="Last Modified" value={selectedDraft.lastModified} />
        <DetailRow
          label="Status"
          value={
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              selectedDraft.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
              selectedDraft.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
              'bg-neutral-100 text-neutral-800'
            }`}>
              {selectedDraft.status}
            </span>
          }
        />
      </DetailCard>

      {/* Schedule Info */}
      {selectedDraft.scheduledTime && (
        <DetailCard title="Schedule">
          <DetailRow label="Send Time" value={selectedDraft.scheduledTime} />
          <div className="mt-2 rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-blue-700">
            Scheduled to send in 2 days
          </div>
        </DetailCard>
      )}

      {/* Content Summary */}
      <DetailCard title="Content Summary">
        <DetailRow label="Photos" value={selectedDraft.contentSummary.photos} />
        <DetailRow label="Milestones" value={selectedDraft.contentSummary.milestones} />
        <DetailRow label="Stories" value={selectedDraft.contentSummary.stories} />
      </DetailCard>

      {/* Recipient Preview */}
      <DetailCard title="Recipients ({selectedDraft.recipients.length})">
        <div className="space-y-2">
          {selectedDraft.recipients.map((recipient) => (
            <div key={recipient.id} className="flex items-center justify-between">
              <span className="text-sm text-neutral-900">{recipient.name}</span>
              <span className="text-xs text-neutral-500">{recipient.group}</span>
            </div>
          ))}
        </div>
      </DetailCard>

      {/* Quick Actions */}
      <div className="space-y-2">
        <Button variant="primary" className="w-full">
          Edit Draft
        </Button>
        <Button variant="success" className="w-full">
          Send Now
        </Button>
        <Button variant="outline" className="w-full">
          Reschedule
        </Button>
      </div>
    </div>
  )
}
