'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('CreateUpdateWizard')
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateCreation } from '@/hooks/useUpdateCreation'
import { getRecipients } from '@/lib/recipients'
import UpdateForm from '@/components/updates/UpdateForm'
import AISuggestionsPanel from '@/components/updates/AISuggestionsPanel'
import UpdatePreview from '@/components/updates/UpdatePreview'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Recipient } from '@/lib/recipients'
import type { Child } from '@/lib/children'

export type CreateUpdateWizardVariant = 'page' | 'modal'

export interface CreateUpdateWizardProps {
  onCancel: () => void
  onSent?: () => void
  onScheduled?: () => void
  onDraftSaved?: (updateId: string) => void
  variant?: CreateUpdateWizardVariant
  initialContent?: string
}

export default function CreateUpdateWizard({
  onCancel,
  onSent,
  onScheduled,
  onDraftSaved,
  variant = 'page',
  initialContent
}: CreateUpdateWizardProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const {
    currentStep,
    steps,
    formData,
    aiAnalysis,
    children,
    isLoading,
    isAnalyzing,
    error,
    // uploadProgress, // Removed: unused variable
    previewUrls,
    hasRequestedAnalysis,
    setFormData,
    setCurrentStep,
    processMediaFiles,
    removeMediaFile,
    runAIAnalysis,
    updateRecipients,
    createUpdateDraft,
    finalizeUpdate,
    reset,
    loadChildren
  } = useUpdateCreation()

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(true)
  const [recipientsError, setRecipientsError] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)

  const isModal = variant === 'modal'

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load recipients on mount
  useEffect(() => {
    loadRecipientsData()
  }, [])

  // Prefill content when provided
  useEffect(() => {
    if (initialContent && !formData.content) {
      setFormData({ content: initialContent })
    }
  }, [initialContent, formData.content, setFormData])

  // Load children when component mounts
  useEffect(() => {
    loadChildren()
  }, [loadChildren])

  // Find selected child when formData changes
  useEffect(() => {
    if (formData.childId) {
      const child = children.find(c => c.id === formData.childId)
      setSelectedChild(child || null)
    }
  }, [formData.childId, children])

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      reset()
    }
  }, [reset])

  const loadRecipientsData = async () => {
    setRecipientsLoading(true)
    try {
      setRecipientsError(null)
      const recipientData = await getRecipients()
      setRecipients(recipientData)
    } catch (err) {
      logger.error('Failed to load recipients:', { error: err })
      setRecipientsError(err instanceof Error ? err.message : 'Failed to load recipients')
    }
    setRecipientsLoading(false)
  }

  const handleFormSubmit = async () => {
    await runAIAnalysis()
  }

  const handleContinueToPreview = async () => {
    try {
      const draftId = await createUpdateDraft()
      onDraftSaved?.(draftId)
      setCurrentStep('preview')
    } catch (err) {
      logger.error('Failed to create update draft:', { error: err })
    }
  }

  const handleSendUpdate = async () => {
    try {
      await finalizeUpdate()
      onSent?.()
      reset()
    } catch (err) {
      logger.error('Failed to send update:', { error: err })
    }
  }

  const handleScheduleUpdate = async (scheduledFor: Date) => {
    try {
      setFormData({ scheduledFor })
      await finalizeUpdate()
      onScheduled?.()
      reset()
    } catch (err) {
      logger.error('Failed to schedule update:', { error: err })
    }
  }

  const getStepNumber = useCallback((stepId: string) => {
    return steps.findIndex(s => s.id === stepId) + 1
  }, [steps])

  const containerClassName = isModal
    ? 'flex flex-col h-full'
    : 'min-h-screen bg-gray-50'

  const contentWrapperClassName = isModal
    ? 'flex-1 flex flex-col overflow-hidden'
    : 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'

  const headerContent = (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Update</h1>
          <p className="mt-2 text-gray-600">
            {"Share what's happening with your little one"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset()
            onCancel()
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  const progressContent = (
    <div className="mb-8">
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
              {/* Step connector line */}
              {index !== steps.length - 1 && (
                <div
                  className={`absolute top-4 left-4 -ml-px h-0.5 w-full sm:w-16 ${
                    step.isComplete ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                  style={{ left: '2rem' }}
                />
              )}

              <div className="relative flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    currentStep === step.id
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : step.isComplete
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : step.isAccessible
                      ? 'border-gray-300 bg-white text-gray-500 hover:border-gray-400'
                      : 'border-gray-200 bg-gray-50 text-gray-300'
                  }`}
                >
                  {step.isComplete ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{getStepNumber(step.id)}</span>
                  )}
                </div>
                <div className="ml-4 min-w-0 flex flex-col">
                  <span
                    className={`text-sm font-medium ${
                      currentStep === step.id || step.isComplete ? 'text-primary-600' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-xs text-gray-500">{step.description}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const showGlobalOverlay = isLoading && !(currentStep === 'create' && isAnalyzing)

  return (
    <div className={containerClassName}>
      <div className={contentWrapperClassName}>
        {headerContent}
        {progressContent}

        <div className={`bg-white rounded-xl shadow-sm relative ${isModal ? 'flex-1 overflow-hidden flex flex-col' : ''}`}>
          {showGlobalOverlay && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center">
                <LoadingSpinner size="sm" className="mb-2" />
                <span className="text-sm text-gray-600">Processing your update...</span>
              </div>
            </div>
          )}

          <div className={`p-6 ${isModal ? 'flex-1 overflow-y-auto' : ''}`}>
            {currentStep === 'create' && (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="space-y-8">
                  <UpdateForm
                    formData={formData}
                    previewUrls={previewUrls}
                    onFormDataChange={setFormData}
                    onMediaChange={processMediaFiles}
                    onMediaRemove={removeMediaFile}
                    onGenerateSuggestions={handleFormSubmit}
                    error={error ?? undefined}
                    loadChildren={loadChildren}
                    isLoading={isLoading}
                    isAnalyzing={isAnalyzing}
                    hasRequestedAnalysis={hasRequestedAnalysis}
                  />
                </div>

                <AISuggestionsPanel
                  analysis={aiAnalysis}
                  isAnalyzing={isAnalyzing}
                  hasRequestedAnalysis={hasRequestedAnalysis}
                  recipients={recipients}
                  recipientsLoading={recipientsLoading}
                  recipientsError={recipientsError}
                  selectedRecipientIds={formData.confirmedRecipients || []}
                  onRecipientsChange={updateRecipients}
                  onRegenerate={handleFormSubmit}
                  onContinue={handleContinueToPreview}
                  canContinue={Boolean(aiAnalysis?.success && (formData.confirmedRecipients?.length || 0) > 0)}
                  globalError={error}
                />
              </div>
            )}

            {currentStep === 'preview' && (
              <UpdatePreview
                formData={formData}
                aiAnalysis={aiAnalysis}
                child={selectedChild}
                recipients={recipients}
                previewUrls={previewUrls}
                onSend={handleSendUpdate}
                onSchedule={handleScheduleUpdate}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
