'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import UpdateInDigest from '@/components/digests/UpdateInDigest'
import SafeHtml from '@/components/ui/SafeHtml'
import { SparklesIcon, UserIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import type { RecipientDigestPreview } from '@/lib/types/digest'

interface RecipientDigestPreviewProps {
  recipient: RecipientDigestPreview
  onCustomize: (
    updateId: string,
    customization: {
      included?: boolean
      display_order?: number
      custom_caption?: string
    }
  ) => void
}

export default function RecipientDigestPreview({
  recipient,
  onCustomize
}: RecipientDigestPreviewProps) {
  const [showAIRationale, setShowAIRationale] = useState(false)

  const handleRemoveUpdate = (updateId: string) => {
    onCustomize(updateId, { included: false })
  }

  const handleReorderUpdate = (updateId: string, newOrder: number) => {
    onCustomize(updateId, { display_order: newOrder })
  }

  const handleEditCaption = (updateId: string, newCaption: string) => {
    onCustomize(updateId, { custom_caption: newCaption })
  }

  return (
    <div className="space-y-6">
      {/* Recipient Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <CardTitle>{recipient.recipient_name}</CardTitle>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-neutral-600">
                    <EnvelopeIcon className="w-4 h-4 inline mr-1" />
                    {recipient.recipient_email}
                  </p>
                  <div className="flex items-center space-x-3 text-sm text-neutral-500">
                    <span className="inline-flex items-center">
                      <span className="font-medium">{recipient.relationship}</span>
                    </span>
                    <span>•</span>
                    <span>{recipient.frequency_preference} updates</span>
                  </div>
                </div>
              </div>
            </div>

            {recipient.customizations_made > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                {recipient.customizations_made} customization{recipient.customizations_made > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Email Subject */}
          <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1">
              Email Subject
            </label>
            <p className="text-sm font-medium text-neutral-900">
              {recipient.email_subject}
            </p>
          </div>

          {/* AI Rationale */}
          <button
            onClick={() => setShowAIRationale(!showAIRationale)}
            className="flex items-center space-x-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <SparklesIcon className="w-4 h-4 text-orange-500" />
            <span className="font-medium">
              {showAIRationale ? 'Hide' : 'Show'} AI Rationale
            </span>
          </button>

          {showAIRationale && (
            <div className="mt-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-100">
              <p className="text-sm text-neutral-700 leading-relaxed">
                {recipient.ai_rationale}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Updates Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">
            Updates ({recipient.updates.length})
          </h3>
          <span className="text-sm text-neutral-500">
            Drag to reorder
          </span>
        </div>

        {recipient.updates.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <EnvelopeIcon className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                No Updates Selected
              </h3>
              <p className="text-sm text-neutral-600">
                AI determined no updates match this recipient&apos;s preferences for this time period.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {recipient.updates
              .sort((a, b) => a.display_order - b.display_order)
              .map((update, index) => (
                <UpdateInDigest
                  key={update.update_id}
                  update={update}
                  index={index}
                  totalUpdates={recipient.updates.length}
                  onRemove={() => handleRemoveUpdate(update.update_id)}
                  onReorder={(newIndex) => handleReorderUpdate(update.update_id, newIndex)}
                  onEditCaption={(newCaption) => handleEditCaption(update.update_id, newCaption)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Email Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Email Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <SafeHtml
            html={recipient.email_preview_html}
            prose
            aria-label="Email preview content"
          />
        </CardContent>
      </Card>
    </div>
  )
}