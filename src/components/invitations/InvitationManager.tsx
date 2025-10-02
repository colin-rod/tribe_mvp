'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import SendInvitationForm from './SendInvitationForm'
import ReusableLinkManager from './ReusableLinkManager'
import InvitationHistory from './InvitationHistory'

/**
 * InvitationManager
 *
 * Main component for managing all invitation-related functionality.
 * Provides a tabbed interface for:
 * 1. Sending single-use invitations
 * 2. Managing reusable links and QR codes
 * 3. Viewing invitation history and analytics
 */
export default function InvitationManager() {
  const [activeTab, setActiveTab] = useState<string>('send')
  const [refreshHistory, setRefreshHistory] = useState<number>(0)

  // Callback to refresh invitation history when new invitations are created
  const handleInvitationCreated = () => {
    setRefreshHistory(prev => prev + 1)
  }

  const tabs = [
    { id: 'send', label: 'Send Invitation' },
    { id: 'links', label: 'Reusable Links' },
    { id: 'history', label: 'History' }
  ]

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Invite Recipients</h2>
        <p className="text-sm text-gray-600 mt-1">
          Send personalized invitations or create shareable links for people to join your updates
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'send' && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Send Personal Invitation
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Send a one-time invitation link via email, SMS, or WhatsApp
            </p>
          </div>
          <SendInvitationForm onSuccess={handleInvitationCreated} />
        </Card>
      )}

      {activeTab === 'links' && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Reusable Links & QR Codes
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Create shareable links and QR codes that anyone can use to join
            </p>
          </div>
          <ReusableLinkManager onLinkCreated={handleInvitationCreated} />
        </Card>
      )}

      {activeTab === 'history' && (
        <InvitationHistory key={refreshHistory} />
      )}
    </div>
  )
}
