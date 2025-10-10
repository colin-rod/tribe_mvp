'use client'

import { DetailCard, DetailRow } from './shared/DetailCard'
import { StatCard } from './shared/StatCard'
import { Button } from '@/components/ui/Button'

export function SummaryRightPane() {
  // TODO: Replace with actual data from context/API
  const summaryData = {
    currentSummary: {
      title: 'Weekly Summary - Dec 3',
      status: 'draft',
      recipientCount: 12,
      scheduledFor: '2025-12-03 09:00'
    },
    recentSummaries: [
      { id: 1, title: 'Weekly Summary - Nov 26', sentDate: '2025-11-26', recipients: 12 },
      { id: 2, title: 'Weekly Summary - Nov 19', sentDate: '2025-11-19', recipients: 11 },
      { id: 3, title: 'Weekly Summary - Nov 12', sentDate: '2025-11-12', recipients: 10 },
      { id: 4, title: 'Weekly Summary - Nov 5', sentDate: '2025-11-05', recipients: 10 },
      { id: 5, title: 'Weekly Summary - Oct 29', sentDate: '2025-10-29', recipients: 9 }
    ]
  }

  return (
    <div className="right-pane-section">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Digest Tools</p>
        <h2 className="text-lg font-semibold text-neutral-900">Summary Overview</h2>
      </header>

      {/* Current Summary Preview */}
      <DetailCard title="Current Summary">
        <DetailRow label="Title" value={summaryData.currentSummary.title} />
        <DetailRow
          label="Status"
          value={
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {summaryData.currentSummary.status}
            </span>
          }
        />
        <DetailRow label="Recipients" value={summaryData.currentSummary.recipientCount} />
        <DetailRow label="Scheduled" value={summaryData.currentSummary.scheduledFor} />
      </DetailCard>

      {/* Recipient Count Stat */}
      <StatCard
        label="Total Recipients"
        value={summaryData.currentSummary.recipientCount}
        trend={{ value: '+2 from last week', direction: 'up' }}
      />

      {/* Schedule Controls */}
      <div className="space-y-2">
        <Button variant="primary" className="w-full">
          Send Now
        </Button>
        <Button variant="outline" className="w-full">
          Edit Schedule
        </Button>
      </div>

      {/* Recent Summaries */}
      <DetailCard title="Recent Summaries">
        <div className="space-y-3">
          {summaryData.recentSummaries.map((summary) => (
            <div key={summary.id} className="pb-3 border-b border-neutral-100 last:border-0 last:pb-0">
              <p className="text-sm font-medium text-neutral-900">{summary.title}</p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-neutral-500">{summary.sentDate}</span>
                <span className="text-xs text-neutral-500">{summary.recipients} recipients</span>
              </div>
            </div>
          ))}
        </div>
      </DetailCard>
    </div>
  )
}
