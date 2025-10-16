/**
 * DigestEmailPreview Component
 * CRO-559: Deliver Digests via Email
 *
 * Shows a preview of how the digest email will appear to recipients
 */

'use client';

import { useState } from 'react';
import type { RecipientDigestPreview } from '@/lib/types/digest';

interface DigestEmailPreviewProps {
  recipients: RecipientDigestPreview[];
  digestTitle: string;
  digestDate: string;
}

export default function DigestEmailPreview({
  recipients,
  digestTitle,
  digestDate
}: DigestEmailPreviewProps) {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    recipients[0]?.recipient_id || ''
  );

  const selectedRecipient = recipients.find(r => r.recipient_id === selectedRecipientId);

  if (recipients.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
        <p className="text-neutral-600">No recipients to preview</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recipient Selector */}
      {recipients.length > 1 && (
        <div className="flex items-center gap-3">
          <label htmlFor="recipient-select" className="text-sm font-medium text-neutral-700">
            Preview for:
          </label>
          <select
            id="recipient-select"
            value={selectedRecipientId}
            onChange={(e) => setSelectedRecipientId(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            {recipients.map((recipient) => (
              <option key={recipient.recipient_id} value={recipient.recipient_id}>
                {recipient.recipient_name} ({recipient.relationship}) - {recipient.updates.length} update
                {recipient.updates.length !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Email Preview */}
      {selectedRecipient && (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
          {/* Email Header */}
          <div className="bg-gradient-to-r from-primary-500 to-purple-600 px-6 py-8 text-center text-white">
            <h2 className="text-2xl font-semibold">{digestTitle}</h2>
            <p className="mt-2 text-sm opacity-90">
              {new Date(digestDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* Email Content */}
          <div className="p-6">
            {/* Greeting */}
            <div className="mb-5 text-lg text-neutral-600">
              {getGreeting(selectedRecipient.recipient_name, selectedRecipient.relationship)},
            </div>

            {/* Digest Badge */}
            <div className="mb-6 inline-block rounded-full bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-medium text-amber-900">
              📬 {selectedRecipient.updates.length} Update{selectedRecipient.updates.length !== 1 ? 's' : ''}{' '}
              {selectedRecipient.updates[0] && `for ${selectedRecipient.updates[0].child_name}`}
            </div>

            {/* Narrative or Traditional View */}
            {selectedRecipient.narrative ? (
              <div className="space-y-4">
                {/* AI Narrative */}
                {selectedRecipient.narrative.intro && (
                  <div className="text-base italic text-neutral-600">
                    {selectedRecipient.narrative.intro}
                  </div>
                )}

                <div className="rounded-lg bg-neutral-50 border-l-4 border-primary-500 p-6">
                  <div className="whitespace-pre-wrap text-base leading-relaxed text-neutral-900">
                    {selectedRecipient.narrative.narrative}
                  </div>
                </div>

                {selectedRecipient.narrative.closing && (
                  <div className="text-base text-neutral-600 pt-4 border-t border-neutral-200">
                    {selectedRecipient.narrative.closing}
                  </div>
                )}

                {/* Media Grid */}
                {selectedRecipient.narrative.media_references && selectedRecipient.narrative.media_references.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {selectedRecipient.narrative.media_references.map((media) => (
                      <div key={media.id} className="rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
                        <div className="aspect-video bg-neutral-100 flex items-center justify-center text-neutral-400">
                          {media.type === 'photo' ? '📷' : '🎥'} Media
                        </div>
                        {media.reference_text && (
                          <div className="bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                            {media.reference_text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Traditional Update-by-Update View */
              <div className="space-y-5">
                {selectedRecipient.updates.map((update) => (
                  <div key={update.update_id} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
                    {/* Update Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-xs text-neutral-500">
                        {update.child_name} • {update.child_age} •{' '}
                        {new Date(update.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      {update.milestone_type && (
                        <div className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-900">
                          🎉 {getMilestoneName(update.milestone_type)}
                        </div>
                      )}
                    </div>

                    {/* Subject */}
                    {update.subject && (
                      <div className="mb-2 font-semibold text-base text-neutral-900">
                        {update.subject}
                      </div>
                    )}

                    {/* Content */}
                    <div className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                      {update.content}
                    </div>

                    {/* Custom Caption */}
                    {update.custom_caption && (
                      <div className="mt-3 rounded bg-amber-50 border-l-3 border-amber-400 px-3 py-2 text-sm text-amber-900">
                        ✨ {update.custom_caption}
                      </div>
                    )}

                    {/* Media Preview */}
                    {update.media_urls && update.media_urls.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {update.media_urls.map((url, mediaIndex) => (
                          <div
                            key={mediaIndex}
                            className="aspect-square rounded bg-neutral-100 flex items-center justify-center text-xs text-neutral-400"
                          >
                            📷 Photo
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reply Note */}
            <div className="mt-6 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-900">
              💬 Want to reply? Just hit reply to this email - your message will be shared with the family!
            </div>
          </div>

          {/* Email Footer */}
          <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-5 text-center">
            <p className="text-sm text-neutral-600">Sent with ❤️ from Tribe</p>
            <p className="mt-1 text-xs text-neutral-500">
              This email was sent to you because you&apos;re part of{' '}
              {selectedRecipient.updates[0]?.child_name || 'the'} family circle.
            </p>
            <p className="mt-2 text-xs text-neutral-400">
              <a href="#" className="text-primary-600 hover:underline">
                Manage email preferences
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting(recipientName: string, relationship: string): string {
  const greetings: Record<string, string[]> = {
    grandparent: [`Dear ${recipientName}`, `Hi ${recipientName}`],
    parent: [`Hey ${recipientName}`, `Hi ${recipientName}`],
    sibling: [`Hey ${recipientName}`, `Hi ${recipientName}`],
    friend: [`Hi ${recipientName}`, `Hey ${recipientName}`],
    family: [`Hi ${recipientName}`, `Hello ${recipientName}`],
    colleague: [`Hi ${recipientName}`],
    other: [`Hi ${recipientName}`]
  };

  const options = greetings[relationship] || greetings['other'];
  return options[0];
}

function getMilestoneName(milestoneType: string): string {
  const milestoneMap: Record<string, string> = {
    first_smile: 'First Smile',
    rolling: 'Rolling Over',
    sitting: 'Sitting Up',
    crawling: 'Crawling',
    first_steps: 'First Steps',
    first_words: 'First Words',
    first_tooth: 'First Tooth',
    walking: 'Walking',
    potty_training: 'Potty Training',
    first_day_school: 'First Day of School',
    birthday: 'Birthday',
    other: 'Special Milestone'
  };
  return milestoneMap[milestoneType] || 'Special Milestone';
}
