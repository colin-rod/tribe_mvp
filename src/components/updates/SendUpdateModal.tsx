'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('SendUpdateModal')
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import { useEmailDistribution } from '@/hooks/useEmailDistribution'
import { getRecipients, type Recipient } from '@/lib/recipients'
import DeliveryStatus from './DeliveryStatus'
import EmailPreview from './EmailPreview'
import { CheckIcon } from '@heroicons/react/24/outline'

interface SendUpdateModalProps {
  updateId: string
  updateContent?: string | null
  milestoneType?: string | null
  mediaUrls?: string[]
  childName: string
  childBirthDate: string
  childPhotoUrl?: string | null
  onClose: () => void
  onSent?: () => void
}

export default function SendUpdateModal({
  updateId,
  updateContent,
  milestoneType,
  mediaUrls = [],
  childName,
  childBirthDate,
  childPhotoUrl,
  onClose,
  onSent
}: SendUpdateModalProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set())
  const [loadingRecipients, setLoadingRecipients] = useState(true)
  const [recipientsError, setRecipientsError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'select' | 'preview' | 'send' | 'sent'>('select')
  const [showDeliveryStatus, setShowDeliveryStatus] = useState(false)

  const { distributeUpdate, loading: sendingEmail, error: emailError } = useEmailDistribution()

  // Load recipients on mount
  useEffect(() => {
    const loadRecipients = async () => {
      try {
        setLoadingRecipients(true)
        setRecipientsError(null)

        const data = await getRecipients({ is_active: true })

        // Filter recipients who have email and have email in preferred channels
        const emailRecipients = data.filter(recipient =>
          recipient.email &&
          recipient.preferred_channels.includes('email')
        )

        setRecipients(emailRecipients)

        // Pre-select all eligible recipients
        const allRecipientIds = new Set(emailRecipients.map(r => r.id))
        setSelectedRecipients(allRecipientIds)
      } catch (error) {
        logger.errorWithStack('Error loading recipients:', error as Error)
        setRecipientsError(error instanceof Error ? error.message : 'Failed to load recipients')
      } finally {
        setLoadingRecipients(false)
      }
    }

    loadRecipients()
  }, [])

  const handleRecipientToggle = (recipientId: string) => {
    setSelectedRecipients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipientId)) {
        newSet.delete(recipientId)
      } else {
        newSet.add(recipientId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const allIds = new Set(recipients.map(r => r.id))
    setSelectedRecipients(allIds)
  }

  const handleDeselectAll = () => {
    setSelectedRecipients(new Set())
  }

  const handleSendUpdate = async () => {
    if (selectedRecipients.size === 0) {
      return
    }

    setCurrentStep('send')

    try {
      const result = await distributeUpdate({
        update_id: updateId,
        recipient_ids: Array.from(selectedRecipients)
      })

      if (result.success) {
        setCurrentStep('sent')
        setShowDeliveryStatus(true)
        onSent?.()
      }
    } catch (error) {
      logger.errorWithStack('Error sending update:', error as Error)
      // Error is handled by the hook
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'select':
        return 'Send Memory'
      case 'preview':
        return 'Preview Email'
      case 'send':
        return 'Sending Memory...'
      case 'sent':
        return 'Memory Sent!'
      default:
        return 'Send Memory'
    }
  }

  const selectedRecipientsList = recipients.filter(r => selectedRecipients.has(r.id))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">{getStepTitle()}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={sendingEmail}
              className="p-2 h-8 w-8"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="mt-4 flex items-center space-x-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              currentStep === 'select' ? 'bg-primary-600 text-white' : 'bg-green-100 text-green-800'
            )}>
              {currentStep === 'select' ? '1' : <CheckIcon className="h-4 w-4" aria-hidden="true" />}
            </div>
            <div className={cn('h-1 flex-1 rounded',
              ['preview', 'send', 'sent'].includes(currentStep) ? 'bg-primary-600' : 'bg-gray-200'
            )} />
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              currentStep === 'preview' ? 'bg-primary-600 text-white' :
              ['send', 'sent'].includes(currentStep) ? 'bg-green-100 text-green-800' :
              'bg-gray-200 text-gray-600'
            )}>
              {['send', 'sent'].includes(currentStep) ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : '2'}
            </div>
            <div className={cn('h-1 flex-1 rounded',
              ['send', 'sent'].includes(currentStep) ? 'bg-primary-600' : 'bg-gray-200'
            )} />
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              currentStep === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
            )}>
              {currentStep === 'sent' ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : '3'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'select' && (
            <div className="p-6 h-full overflow-y-auto">
              {loadingRecipients ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span className="text-sm text-gray-600">Loading recipients...</span>
                </div>
              ) : recipientsError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{recipientsError}</p>
                </div>
              ) : recipients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-2">No recipients with email addresses found.</p>
                  <p className="text-sm text-gray-500">Add recipients with email addresses to send memories.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Select Recipients</h3>
                      <p className="text-sm text-gray-600">
                        Choose who should receive this memory via email ({selectedRecipients.size} of {recipients.length} selected)
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={handleSelectAll}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className={cn(
                          'flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors',
                          selectedRecipients.has(recipient.id)
                            ? 'border-primary-300 bg-primary-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        )}
                        onClick={() => handleRecipientToggle(recipient.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.has(recipient.id)}
                          onChange={() => handleRecipientToggle(recipient.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {recipient.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {recipient.relationship} • {recipient.email}
                          </p>
                          {recipient.group && (
                            <p className="text-xs text-gray-400 truncate">
                              Group: {recipient.group.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'preview' && selectedRecipientsList.length > 0 && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Email Preview</h3>
                <p className="text-sm text-gray-600">
                  Preview shows how the email will look to {selectedRecipientsList[0].name}
                </p>
              </div>

              <EmailPreview
                updateContent={updateContent || null}
                milestoneType={milestoneType}
                mediaUrls={mediaUrls}
                childName={childName}
                childBirthDate={childBirthDate}
                childPhotoUrl={childPhotoUrl}
                recipientName={selectedRecipientsList[0].name}
                recipientRelationship={selectedRecipientsList[0].relationship}
              />
            </div>
          )}

          {currentStep === 'send' && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Sending your update...</h3>
                <p className="text-sm text-gray-600">
                  Sending to {selectedRecipients.size} recipient{selectedRecipients.size !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          {currentStep === 'sent' && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Update sent successfully!</h3>
                <p className="text-sm text-gray-600">
                  Your update has been sent to {selectedRecipients.size} recipient{selectedRecipients.size !== 1 ? 's' : ''}
                </p>
              </div>

              {showDeliveryStatus && (
                <DeliveryStatus updateId={updateId} />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex-shrink-0">
          {emailError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{emailError}</p>
            </div>
          )}

          <div className="flex justify-between">
            <div>
              {currentStep === 'preview' && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('select')}
                  disabled={sendingEmail}
                >
                  Back to Recipients
                </Button>
              )}
            </div>

            <div className="flex space-x-3">
              {currentStep === 'sent' ? (
                <Button onClick={onClose}>Close</Button>
              ) : currentStep === 'send' ? (
                <Button disabled>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Sending...
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={sendingEmail}
                  >
                    Cancel
                  </Button>
                  {currentStep === 'select' && (
                    <Button
                      onClick={() => setCurrentStep('preview')}
                      disabled={selectedRecipients.size === 0 || sendingEmail}
                    >
                      Preview Email ({selectedRecipients.size})
                    </Button>
                  )}
                  {currentStep === 'preview' && (
                    <Button
                      onClick={handleSendUpdate}
                      disabled={selectedRecipients.size === 0 || sendingEmail}
                    >
                      Send Update
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
