'use client'

import { useViewSelection } from '@/contexts/ViewSelectionContext'
import { DetailCard, DetailRow } from './shared/DetailCard'

export function DraftsRightPane() {
  const { selectedId } = useViewSelection()

  // TODO: Replace with actual data from context/API
  const selectedDraft = selectedId ? {
    id: selectedId,
    title: 'Weekly Update - Dec 3',
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
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">Select a draft to view details</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{selectedDraft.title}</h2>
      </div>

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
              'bg-gray-100 text-gray-800'
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
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
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
              <span className="text-sm text-gray-900">{recipient.name}</span>
              <span className="text-xs text-gray-500">{recipient.group}</span>
            </div>
          ))}
        </div>
      </DetailCard>

      {/* Quick Actions */}
      <div className="space-y-2">
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          Edit Draft
        </button>
        <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
          Send Now
        </button>
        <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
          Reschedule
        </button>
      </div>
    </div>
  )
}
