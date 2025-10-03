'use client'

import { DetailCard, DetailRow } from './shared/DetailCard'
import { StatCard } from './shared/StatCard'

export function DigestsRightPane() {
  // TODO: Replace with actual data from context/API
  const digestData = {
    currentDigest: {
      title: 'Weekly Update - Dec 3',
      status: 'draft',
      recipientCount: 12,
      scheduledFor: '2025-12-03 09:00'
    },
    recentDigests: [
      { id: 1, title: 'Weekly Update - Nov 26', sentDate: '2025-11-26', recipients: 12 },
      { id: 2, title: 'Weekly Update - Nov 19', sentDate: '2025-11-19', recipients: 11 },
      { id: 3, title: 'Weekly Update - Nov 12', sentDate: '2025-11-12', recipients: 10 },
      { id: 4, title: 'Weekly Update - Nov 5', sentDate: '2025-11-05', recipients: 10 },
      { id: 5, title: 'Weekly Update - Oct 29', sentDate: '2025-10-29', recipients: 9 }
    ]
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Digest Overview</h2>
      </div>

      {/* Current Digest Preview */}
      <DetailCard title="Current Digest">
        <DetailRow label="Title" value={digestData.currentDigest.title} />
        <DetailRow
          label="Status"
          value={
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {digestData.currentDigest.status}
            </span>
          }
        />
        <DetailRow label="Recipients" value={digestData.currentDigest.recipientCount} />
        <DetailRow label="Scheduled" value={digestData.currentDigest.scheduledFor} />
      </DetailCard>

      {/* Recipient Count Stat */}
      <StatCard
        label="Total Recipients"
        value={digestData.currentDigest.recipientCount}
        trend={{ value: '+2 from last week', direction: 'up' }}
      />

      {/* Schedule Controls */}
      <div className="space-y-2">
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          Send Now
        </button>
        <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
          Edit Schedule
        </button>
      </div>

      {/* Recent Digests */}
      <DetailCard title="Recent Digests">
        <div className="space-y-3">
          {digestData.recentDigests.map((digest) => (
            <div key={digest.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
              <p className="text-sm font-medium text-gray-900">{digest.title}</p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">{digest.sentDate}</span>
                <span className="text-xs text-gray-500">{digest.recipients} recipients</span>
              </div>
            </div>
          ))}
        </div>
      </DetailCard>
    </div>
  )
}
