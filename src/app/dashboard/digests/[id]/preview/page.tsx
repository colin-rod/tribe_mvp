'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useDigestCompilation } from '@/hooks/useDigestCompilation'
import Navigation from '@/components/layout/Navigation'
import RecipientDigestPreview from '@/components/digests/RecipientDigestPreview'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { createLogger } from '@/lib/logger'

const logger = createLogger('DigestPreviewPage')

export default function DigestPreviewPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const digestId = params?.id as string

  const {
    digest,
    previewData,
    loading,
    error,
    loadPreview,
    approve,
    customize
  } = useDigestCompilation()

  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState(0)
  const [approving, setApproving] = useState(false)
  const [scheduleMode, setScheduleMode] = useState(false)

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load digest preview
  useEffect(() => {
    if (!digestId || !user) return

    const load = async () => {
      try {
        await loadPreview(digestId)
      } catch (err) {
        logger.error('Failed to load digest preview', { error: err, digestId })
      }
    }

    load()
  }, [digestId, user, loadPreview])

  const handleBack = () => {
    router.push('/dashboard/drafts')
  }

  const handleApproveAndSend = async () => {
    if (!digest) return

    setApproving(true)
    try {
      const success = await approve({
        digest_id: digest.id,
        send_immediately: true
      })

      if (success) {
        logger.info('Digest approved and sent', { digestId: digest.id })
        router.push('/dashboard?digest_sent=true')
      }
    } catch (err) {
      logger.error('Failed to approve and send digest', { error: err })
    } finally {
      setApproving(false)
    }
  }

  const handleScheduleForLater = () => {
    setScheduleMode(true)
  }

  const handleScheduleSend = async (scheduledFor: Date) => {
    if (!digest) return

    setApproving(true)
    try {
      const success = await approve({
        digest_id: digest.id,
        send_immediately: false,
        scheduled_for: scheduledFor.toISOString()
      })

      if (success) {
        logger.info('Digest scheduled', { digestId: digest.id, scheduledFor })
        router.push('/dashboard?digest_scheduled=true')
      }
    } catch (err) {
      logger.error('Failed to schedule digest', { error: err })
    } finally {
      setApproving(false)
      setScheduleMode(false)
    }
  }

  const handleCustomize = async (
    recipientId: string,
    updateId: string,
    customization: {
      included?: boolean
      display_order?: number
      custom_caption?: string
    }
  ) => {
    if (!digest) return

    try {
      await customize({
        digest_id: digest.id,
        recipient_id: recipientId,
        updates: [{
          update_id: updateId,
          included: customization.included ?? true,
          display_order: customization.display_order,
          custom_caption: customization.custom_caption
        }]
      })

      // Reload preview to show changes
      await loadPreview(digest.id)

      logger.info('Digest customized', { digestId: digest.id, recipientId, updateId })
    } catch (err) {
      logger.error('Failed to customize digest', { error: err })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !digest || !previewData) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="p-12 text-center">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              Digest Not Found
            </h2>
            <p className="text-neutral-600 mb-6">
              {error || 'The digest you are looking for does not exist or could not be loaded.'}
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Drafts
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  const selectedRecipient = previewData.recipients[selectedRecipientIndex]

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />

      <main className="pb-20 md:pb-8">
        {/* Header */}
        <div className="bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Back to Drafts</span>
              </button>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-neutral-500">
                  {digest.total_updates} update{digest.total_updates > 1 ? 's' : ''} • {' '}
                  {digest.total_recipients} recipient{digest.total_recipients > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Digest Info */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              {digest.title}
            </h1>
            <p className="text-sm text-neutral-600">
              {new Date(digest.date_range_start).toLocaleDateString()} - {' '}
              {new Date(digest.date_range_end).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recipient Tabs (Sidebar on desktop) */}
            <div className="lg:col-span-3">
              <Card className="sticky top-6">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">
                    Recipients
                  </h3>
                  <nav className="space-y-1">
                    {previewData.recipients.map((recipient, index) => (
                      <button
                        key={recipient.recipient_id}
                        onClick={() => setSelectedRecipientIndex(index)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          index === selectedRecipientIndex
                            ? 'bg-orange-100 text-orange-700 font-medium'
                            : 'text-neutral-600 hover:bg-neutral-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{recipient.recipient_name}</span>
                          {recipient.customizations_made > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-orange-600">
                              {recipient.customizations_made}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-500">
                          {recipient.updates.length} update{recipient.updates.length > 1 ? 's' : ''}
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>
              </Card>
            </div>

            {/* Preview Content */}
            <div className="lg:col-span-9">
              {selectedRecipient && (
                <RecipientDigestPreview
                  recipient={selectedRecipient}
                  onCustomize={(updateId, customization) =>
                    handleCustomize(selectedRecipient.recipient_id, updateId, customization)
                  }
                />
              )}

              {/* Actions */}
              <Card className="mt-6 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                      Ready to Send?
                    </h3>
                    <p className="text-sm text-neutral-600">
                      Review all recipients and send when ready
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={handleScheduleForLater}
                      variant="outline"
                      disabled={approving}
                    >
                      <CalendarIcon className="w-5 h-5 mr-2" />
                      Schedule
                    </Button>

                    <Button
                      onClick={handleApproveAndSend}
                      variant="success"
                      loading={approving}
                      disabled={approving}
                    >
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      Approve & Send Now
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Schedule Modal */}
      {scheduleMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Schedule Digest
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Choose when to send this digest to your recipients.
            </p>
            {/* Simplified schedule UI - in real implementation would use a date/time picker */}
            <div className="space-y-4">
              <button
                onClick={() => {
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  tomorrow.setHours(9, 0, 0, 0)
                  handleScheduleSend(tomorrow)
                }}
                className="w-full text-left px-4 py-3 border border-neutral-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                <div className="font-medium text-neutral-900">Tomorrow at 9:00 AM</div>
                <div className="text-sm text-neutral-500">Recommended</div>
              </button>
              <button
                onClick={() => {
                  const nextWeek = new Date()
                  nextWeek.setDate(nextWeek.getDate() + 7)
                  nextWeek.setHours(9, 0, 0, 0)
                  handleScheduleSend(nextWeek)
                }}
                className="w-full text-left px-4 py-3 border border-neutral-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                <div className="font-medium text-neutral-900">Next Week</div>
                <div className="text-sm text-neutral-500">Give more time to review</div>
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setScheduleMode(false)} variant="ghost">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}