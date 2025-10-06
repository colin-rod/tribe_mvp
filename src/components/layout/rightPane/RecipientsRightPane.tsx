'use client'

import { useViewSelection } from '@/contexts/ViewSelectionContext'
import { DetailCard, DetailRow } from './shared/DetailCard'
import { StatCard } from './shared/StatCard'
import { Button } from '@/components/ui/Button'

export function RecipientsRightPane() {
  const { selectedId } = useViewSelection()

  // TODO: Replace with actual data from context/API
  const selectedRecipient = selectedId ? {
    id: selectedId,
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    phone: '+1 (555) 123-4567',
    preferences: {
      emailFrequency: 'Weekly',
      contentTypes: ['Photos', 'Milestones', 'Stories']
    },
    groups: ['Grandparents', 'Extended Family'],
    activity: {
      lastDigestSent: '2025-11-26',
      lastResponse: '2025-11-27',
      totalDigestsReceived: 52
    }
  } : null

  if (!selectedRecipient) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-sm text-neutral-500">Select a recipient to view details</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">{selectedRecipient.name}</h2>
      </div>

      {/* Contact Info */}
      <DetailCard title="Contact Information">
        <DetailRow label="Email" value={selectedRecipient.email} />
        <DetailRow label="Phone" value={selectedRecipient.phone} />
      </DetailCard>

      {/* Preferences */}
      <DetailCard title="Preferences">
        <DetailRow label="Frequency" value={selectedRecipient.preferences.emailFrequency} />
        <DetailRow
          label="Content Types"
          value={
            <div className="flex flex-wrap gap-1 justify-end">
              {selectedRecipient.preferences.contentTypes.map((type) => (
                <span key={type} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {type}
                </span>
              ))}
            </div>
          }
        />
      </DetailCard>

      {/* Group Memberships */}
      <DetailCard title="Group Memberships">
        <div className="flex flex-wrap gap-2">
          {selectedRecipient.groups.map((group) => (
            <span key={group} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              {group}
            </span>
          ))}
        </div>
      </DetailCard>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Digests Sent"
          value={selectedRecipient.activity.totalDigestsReceived}
        />
        <StatCard
          label="Engagement"
          value="High"
        />
      </div>

      {/* Recent Activity */}
      <DetailCard title="Recent Activity">
        <DetailRow label="Last Digest" value={selectedRecipient.activity.lastDigestSent} />
        <DetailRow label="Last Response" value={selectedRecipient.activity.lastResponse} />
      </DetailCard>

      {/* Quick Actions */}
      <div className="space-y-2">
        <Button variant="primary" className="w-full">
          Edit Preferences
        </Button>
        <Button variant="outline" className="w-full">
          View History
        </Button>
      </div>
    </div>
  )
}
