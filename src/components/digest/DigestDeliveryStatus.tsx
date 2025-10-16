/**
 * DigestDeliveryStatus Component
 * CRO-559: Deliver Digests via Email
 *
 * Shows the delivery status of a sent digest with per-recipient tracking
 */

'use client';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';

interface DigestDeliveryStatusProps {
  _digestId: string;
  status: 'preparing' | 'sending' | 'complete' | 'failed';
  sentCount: number;
  failedCount: number;
  totalCount: number;
  errors?: Array<{
    recipient_id: string;
    recipient_name: string;
    error: string;
  }>;
}

export default function DigestDeliveryStatus({
  _digestId,
  status,
  sentCount,
  failedCount,
  totalCount,
  errors
}: DigestDeliveryStatusProps) {
  const progress = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className="rounded-lg border p-6">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {status === 'sending' || status === 'preparing' ? (
              <LoadingSpinner size="md" />
            ) : status === 'complete' ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
                ✓
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">
                ✗
              </div>
            )}
          </div>

          {/* Status Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900">
              {status === 'preparing' && 'Preparing Digest...'}
              {status === 'sending' && 'Sending Emails...'}
              {status === 'complete' && failedCount === 0 && 'All Emails Sent Successfully'}
              {status === 'complete' && failedCount > 0 && 'Digest Sent with Some Failures'}
              {status === 'failed' && 'Digest Sending Failed'}
            </h3>

            <p className="mt-1 text-sm text-neutral-600">
              {status === 'preparing' && 'Generating personalized emails for each recipient...'}
              {status === 'sending' && 'Sending emails to recipients...'}
              {status === 'complete' && `Sent ${sentCount} of ${totalCount} emails successfully`}
              {status === 'failed' && 'An error occurred while sending the digest'}
            </p>

            {/* Progress Bar */}
            {(status === 'sending' || status === 'preparing') && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-neutral-600 mb-1">
                  <span>
                    {sentCount} / {totalCount} sent
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300 ease-in-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Summary Stats */}
            {status === 'complete' && (
              <div className="mt-4 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-neutral-700">{sentCount} sent</span>
                </div>
                {failedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-red-600">✗</span>
                    <span className="text-neutral-700">{failedCount} failed</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Details */}
      {errors && errors.length > 0 && (
        <Alert variant="warning" title="Some emails failed to send">
          <div className="mt-3 space-y-2">
            {errors.map((error, index) => (
              <div
                key={`${error.recipient_id}-${index}`}
                className="flex items-start gap-2 text-sm"
              >
                <span className="text-orange-600">•</span>
                <div className="flex-1">
                  <span className="font-medium text-neutral-900">{error.recipient_name}:</span>{' '}
                  <span className="text-neutral-700">{error.error}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-neutral-600">
            You can retry sending to failed recipients from the digest details page.
          </p>
        </Alert>
      )}

      {/* Delivery Jobs Info */}
      {status === 'complete' && (
        <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4 text-sm text-neutral-600">
          <p>
            📊 Delivery tracking records have been created. You can monitor delivery status (delivered,
            bounced, etc.) in the delivery jobs dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
