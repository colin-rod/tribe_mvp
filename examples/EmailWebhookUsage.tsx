// Example usage of Email Webhook System components
// This demonstrates how to integrate the EmailToMemoryGuide and ResponseThread components

'use client'

import { useState } from 'react'
import { EmailToMemoryGuide } from '@/components/updates/EmailToMemoryGuide'
import { ResponseThread } from '@/components/updates/ResponseThread'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card' // Assuming you have this component

interface ExampleEmailWebhookPageProps {
  // In a real app, you'd get this from props or state
  updateId?: string
  domain?: string
}

export function ExampleEmailWebhookPage({
  updateId = "550e8400-e29b-41d4-a716-446655440000",
  domain = "colinrodrigues.com"
}: ExampleEmailWebhookPageProps) {
  const [showGuide, setShowGuide] = useState(false)
  const [showResponses, setShowResponses] = useState(true)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Email Integration Demo
        </h1>
        <p className="text-gray-600">
          Email-to-Memory system and Response Threading
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 justify-center">
        <Button
          onClick={() => setShowGuide(!showGuide)}
          variant={showGuide ? "default" : "outline"}
        >
          {showGuide ? "Hide" : "Show"} Email-to-Memory Guide
        </Button>
        <Button
          onClick={() => setShowResponses(!showResponses)}
          variant={showResponses ? "default" : "outline"}
        >
          {showResponses ? "Hide" : "Show"} Response Thread
        </Button>
      </div>

      {/* Email-to-Memory Guide */}
      {showGuide && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <h2 className="text-xl font-semibold">Create Updates via Email</h2>
            <p className="text-blue-100">Send photos and messages directly to your family platform</p>
          </div>
          <div className="p-6">
            <EmailToMemoryGuide domain={domain} />

            {/* Additional Usage Examples */}
            <div className="mt-6 space-y-4">
              <h4 className="font-semibold text-gray-900">Example Email Subjects:</h4>
              <div className="grid gap-2 text-sm">
                <div className="bg-gray-50 p-3 rounded border-l-4 border-green-500">
                  <code className="text-green-700">"Memory for Emma: First steps today!"</code>
                  <p className="text-gray-600 mt-1">Creates update specifically for Emma</p>
                </div>
                <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                  <code className="text-blue-700">"Amazing day at the park"</code>
                  <p className="text-gray-600 mt-1">Creates update for your first child (default)</p>
                </div>
                <div className="bg-gray-50 p-3 rounded border-l-4 border-purple-500">
                  <code className="text-purple-700">"Memory for Jake: Lost first tooth!"</code>
                  <p className="text-gray-600 mt-1">Creates milestone update for Jake</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Response Thread Example */}
      {showResponses && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-green-500 to-teal-600 text-white">
            <h2 className="text-xl font-semibold">Email Response Thread</h2>
            <p className="text-green-100">See how recipients respond to your updates via email</p>
          </div>
          <div className="p-6">
            <ResponseThread updateId={updateId} />

            {/* Response Instructions */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">How Email Responses Work:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Recipients receive emails with reply-to: <code>update-{updateId}@{domain}</code></li>
                <li>• When they reply, responses are automatically captured</li>
                <li>• Attachments in responses are processed and displayed</li>
                <li>• Parents get notified based on their preferences</li>
                <li>• All responses are threaded under the original update</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Integration Status */}
      <Card className="p-6 bg-gradient-to-r from-gray-50 to-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Status</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Backend Components ✅</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Email webhook handler</li>
              <li>• Attachment processing</li>
              <li>• Database integration</li>
              <li>• Content cleaning</li>
              <li>• Security validation</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Frontend Components ✅</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• EmailToMemoryGuide</li>
              <li>• ResponseThread</li>
              <li>• Real-time updates</li>
              <li>• Media display</li>
              <li>• Error handling</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-semibold text-blue-800 mb-2">Next Steps for Production:</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Configure SendGrid Inbound Parse with your domain</li>
            <li>2. Set up MX records to route emails to SendGrid</li>
            <li>3. Deploy the email-webhook Edge Function</li>
            <li>4. Test with real email addresses</li>
            <li>5. Monitor webhook delivery and processing</li>
          </ol>
        </div>
      </Card>

      {/* Technical Details */}
      <details className="bg-gray-50 rounded-lg p-6">
        <summary className="font-semibold text-gray-900 cursor-pointer">
          Technical Implementation Details
        </summary>
        <div className="mt-4 space-y-4 text-sm text-gray-700">
          <div>
            <h5 className="font-medium">Email Processing Flow:</h5>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Email sent to memory@{domain} or update-*@{domain}</li>
              <li>SendGrid Inbound Parse forwards to webhook</li>
              <li>Email-webhook Edge Function processes content</li>
              <li>Attachments uploaded to Supabase Storage</li>
              <li>Database records created (updates or responses)</li>
              <li>Real-time updates via Supabase realtime</li>
            </ol>
          </div>

          <div>
            <h5 className="font-medium">Security Features:</h5>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>SPF validation for sender authentication</li>
              <li>Webhook signature verification (optional)</li>
              <li>Sender must be registered user</li>
              <li>Content sanitization and length limits</li>
              <li>File type restrictions for attachments</li>
            </ul>
          </div>

          <div>
            <h5 className="font-medium">Error Handling:</h5>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Graceful handling of unknown senders</li>
              <li>Validation of update existence for responses</li>
              <li>Duplicate response prevention</li>
              <li>Comprehensive logging for debugging</li>
              <li>Structured error responses</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  )
}

// Example of how to integrate into an existing update detail page
export function UpdateDetailWithEmailFeatures({ updateId, update }: {
  updateId: string
  update: any
}) {
  return (
    <div className="space-y-6">
      {/* Existing update content */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{update.content}</h2>
        {/* ... existing update display logic ... */}
      </div>

      {/* Email response thread */}
      <div className="bg-white rounded-lg shadow p-6">
        <ResponseThread updateId={updateId} />
      </div>
    </div>
  )
}

// Example of how to add email guide to settings or help section
export function EmailSettingsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Email Features</h2>
        <p className="text-gray-600">
          Learn how to create updates and receive responses via email.
        </p>
      </div>

      <EmailToMemoryGuide />

      {/* Additional settings could go here */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Email Preferences</h3>
        <p className="text-sm text-gray-600">
          Configure how you receive notifications about email responses.
        </p>
        {/* ... notification preference controls ... */}
      </div>
    </div>
  )
}