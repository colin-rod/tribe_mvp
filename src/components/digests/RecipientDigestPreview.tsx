'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import UpdateInDigest from '@/components/digests/UpdateInDigest'
import DigestNarrativeView from '@/components/digests/DigestNarrativeView'
import EmailPreview from '@/components/digests/EmailPreview'
import { SparklesIcon, UserIcon, EnvelopeIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { renderRecipientDigestEmail } from '@/lib/utils/emailTemplates'
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
  const [showIndividualUpdates, setShowIndividualUpdates] = useState(false)
  const [viewMode, setViewMode] = useState<'narrative' | 'list'>('narrative')

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
                    <span>{recipient.frequency_preference} memories</span>
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

      {/* View Mode Toggle */}
      {recipient.narrative && recipient.updates.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">
                Preview Mode
              </span>
              <div className="flex items-center space-x-2 bg-neutral-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('narrative')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'narrative'
                      ? 'bg-white text-orange-700 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <SparklesIcon className="w-4 h-4 inline mr-1" />
                  Narrative
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-orange-700 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Memory List
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Narrative View */}
      {viewMode === 'narrative' && recipient.narrative && (
        <div className="space-y-6">
          <DigestNarrativeView
            narrative={recipient.narrative}
            recipientName={recipient.recipient_name}
            childName={recipient.updates[0]?.child_name || 'your child'}
          />

          {/* Collapsible Individual Updates */}
          <Card>
            <button
              onClick={() => setShowIndividualUpdates(!showIndividualUpdates)}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-neutral-700">
                  Individual Memories ({recipient.updates.length})
                </span>
                <span className="text-xs text-neutral-500">
                  See the source memories for this narrative
                </span>
              </div>
              {showIndividualUpdates ? (
                <ChevronUpIcon className="w-5 h-5 text-neutral-400" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-neutral-400" />
              )}
            </button>

            {showIndividualUpdates && (
              <div className="border-t border-neutral-200 p-4">
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
              </div>
            )}
          </Card>
        </div>
      )}

      {/* List View (Original) */}
      {(viewMode === 'list' || !recipient.narrative) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900">
              Memories ({recipient.updates.length})
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
                  No Memories Selected
                </h3>
                <p className="text-sm text-neutral-600">
                  AI determined no memories match this recipient&apos;s preferences for this time period.
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
      )}

      {/* Email Preview */}
      {recipient.narrative && (
        <EmailPreview
          htmlContent={renderRecipientDigestEmail({
            narrative: recipient.narrative,
            recipient_name: recipient.recipient_name,
            child_name: recipient.updates[0]?.child_name || 'your child',
            date_range: `Memories from the past week`
          })}
          subject={recipient.email_subject}
        />
      )}
    </div>
  )
}