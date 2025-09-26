'use client'

/**
 * Example usage of Email Distribution Components
 *
 * This demonstrates how to integrate the email distribution system
 * into your update creation workflow.
 */

import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  SendUpdateModal,
  DeliveryStatus,
  EmailPreview
} from '@/components/updates'
import { useEmailDistribution } from '@/hooks/useEmailDistribution'
import { logger } from '@/lib/logger'

// Example update data structure
interface ExampleUpdate {
  id: string
  content: string
  milestone_type?: string
  media_urls: string[]
  child: {
    id: string
    name: string
    birth_date: string
    profile_photo_url?: string
  }
}

export default function EmailDistributionUsage() {
  const [showSendModal, setShowSendModal] = useState(false)
  const [showDeliveryStatus, setShowDeliveryStatus] = useState(false)
  const [lastUpdateId, setLastUpdateId] = useState<string | null>(null)

  // Example update data
  const exampleUpdate: ExampleUpdate = {
    id: 'update_123',
    content: 'Look at how much Emma has grown! She\'s been practicing walking all week and finally took her first unassisted steps today. We\'re so proud of our little walker!',
    milestone_type: 'first_steps',
    media_urls: [
      'https://example.com/emma-walking.jpg',
      'https://example.com/emma-steps.mp4'
    ],
    child: {
      id: 'child_123',
      name: 'Emma',
      birth_date: '2022-12-15',
      profile_photo_url: 'https://example.com/emma-profile.jpg'
    }
  }

  const handleSendUpdate = () => {
    setShowSendModal(true)
  }

  const handleUpdateSent = () => {
    setLastUpdateId(exampleUpdate.id)
    setShowDeliveryStatus(true)
    setShowSendModal(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Email Distribution System
        </h1>
        <p className="text-gray-600">
          Complete email distribution system for baby updates with real-time tracking
        </p>
      </div>

      {/* Update Card Example */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-start space-x-4 mb-4">
          {exampleUpdate.child.profile_photo_url && (
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
              <Image
                src={exampleUpdate.child.profile_photo_url}
                alt={exampleUpdate.child.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {exampleUpdate.child.name}&apos;s First Steps! 🎉
            </h2>
            <p className="text-sm text-gray-500">Milestone Update</p>
          </div>
        </div>

        <p className="text-gray-700 mb-4">{exampleUpdate.content}</p>

        <div className="flex space-x-3">
          <Button onClick={handleSendUpdate}>
            📧 Send Update
          </Button>

          {lastUpdateId && (
            <Button
              variant="outline"
              onClick={() => setShowDeliveryStatus(!showDeliveryStatus)}
            >
              📊 View Delivery Status
            </Button>
          )}
        </div>
      </div>

      {/* Email Preview Example */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Email Preview</h3>
        <EmailPreview
          updateContent={exampleUpdate.content}
          milestoneType={exampleUpdate.milestone_type}
          mediaUrls={exampleUpdate.media_urls}
          childName={exampleUpdate.child.name}
          childBirthDate={exampleUpdate.child.birth_date}
          childPhotoUrl={exampleUpdate.child.profile_photo_url}
          recipientName="Grandma Mary"
          recipientRelationship="grandmother"
        />
      </div>

      {/* Delivery Status Example */}
      {showDeliveryStatus && lastUpdateId && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Real-time Delivery Tracking
          </h3>
          <DeliveryStatus
            updateId={lastUpdateId}
            onStatusChange={(jobs) => {
              logger.info('Delivery status updated', { jobs })
            }}
          />
        </div>
      )}

      {/* Send Update Modal */}
      {showSendModal && (
        <SendUpdateModal
          updateId={exampleUpdate.id}
          updateContent={exampleUpdate.content}
          milestoneType={exampleUpdate.milestone_type}
          mediaUrls={exampleUpdate.media_urls}
          childName={exampleUpdate.child.name}
          childBirthDate={exampleUpdate.child.birth_date}
          childPhotoUrl={exampleUpdate.child.profile_photo_url}
          onClose={() => setShowSendModal(false)}
          onSent={handleUpdateSent}
        />
      )}

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">
          🔧 Integration Guide
        </h3>
        <div className="space-y-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium">1. useEmailDistribution Hook</h4>
            <p>Use this hook to send email updates and track sending state.</p>
            <pre className="mt-2 p-2 bg-blue-100 rounded text-xs overflow-x-auto">
{`const { distributeUpdate, loading, error, success } = useEmailDistribution()

await distributeUpdate({
  update_id: 'update_123',
  recipient_ids: ['recipient_1', 'recipient_2']
})`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium">2. SendUpdateModal Component</h4>
            <p>Complete modal workflow for recipient selection, preview, and sending.</p>
            <pre className="mt-2 p-2 bg-blue-100 rounded text-xs overflow-x-auto">
{`<SendUpdateModal
  updateId="update_123"
  updateContent="Update content..."
  childName="Emma"
  childBirthDate="2022-12-15"
  onClose={() => setShowModal(false)}
  onSent={() => logger.info('Update sent')}
/>`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium">3. DeliveryStatus Component</h4>
            <p>Real-time tracking of email delivery status with Supabase subscriptions.</p>
            <pre className="mt-2 p-2 bg-blue-100 rounded text-xs overflow-x-auto">
{`<DeliveryStatus
  updateId="update_123"
          onStatusChange={(jobs) => logger.info('Status updated', { jobs })}
/>`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium">4. EmailPreview Component</h4>
            <p>Preview how emails will look to recipients with mobile/desktop views.</p>
            <pre className="mt-2 p-2 bg-blue-100 rounded text-xs overflow-x-auto">
{`<EmailPreview
  updateContent="Content..."
  childName="Emma"
  childBirthDate="2022-12-15"
  recipientName="Grandma"
  recipientRelationship="grandmother"
/>`}
            </pre>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-green-900 mb-3">
          ✅ Features Implemented
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-800">
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>Email distribution via Supabase Edge Functions</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>Real-time delivery status tracking</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>Recipient selection with preferences</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>Email preview with mobile/desktop views</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>Step-by-step sending workflow</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>Error handling and loading states</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>TypeScript interfaces and types</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span>Accessibility considerations</span>
          </div>
        </div>
      </div>
    </div>
  )
}
