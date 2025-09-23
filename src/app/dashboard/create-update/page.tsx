'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('Page')
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateCreation } from '@/hooks/useUpdateCreation'
import { getRecipients } from '@/lib/recipients'
import UpdateForm from '@/components/updates/UpdateForm'
import MediaUpload from '@/components/updates/MediaUpload'
import AIReview from '@/components/updates/AIReview'
import UpdatePreview from '@/components/updates/UpdatePreview'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Recipient } from '@/lib/recipients'
import type { Child } from '@/lib/children'

export default function CreateUpdatePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const {
    currentStep,
    steps,
    formData,
    aiAnalysis,
    children,
    isLoading,
    error,
    uploadProgress,
    previewUrls,
    setFormData,
    setCurrentStep,
    processMediaFiles,
    removeMediaFile,
    runAIAnalysis,
    updateRecipients,
    createUpdateDraft,
    finalizeUpdate,
    loadChildren
  } = useUpdateCreation()

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load recipients
  useEffect(() => {
    loadRecipientsData()
  }, [])

  // Find selected child when formData changes
  useEffect(() => {
    if (formData.childId) {
      const child = children.find(c => c.id === formData.childId)
      setSelectedChild(child || null)
    }
  }, [formData.childId, children])

  const loadRecipientsData = async () => {
    try {
      const recipientData = await getRecipients()
      setRecipients(recipientData)
    } catch (err) {
      logger.error('Failed to load recipients:', { error: err })
    }
  }

  const handleFormSubmit = async () => {
    await runAIAnalysis()
  }

  const handleAIReviewNext = async () => {
    try {
      await createUpdateDraft()
      setCurrentStep('preview')
    } catch (err) {
      logger.error('Failed to create update draft:', { error: err })
    }
  }

  const handleSendUpdate = async () => {
    try {
      await finalizeUpdate()

      // Show success and redirect
      router.push('/dashboard?updated=true')
    } catch (err) {
      logger.error('Failed to send update:', { error: err })
    }
  }

  const handleScheduleUpdate = async (scheduledFor: Date) => {
    try {
      setFormData({ scheduledFor })
      await finalizeUpdate()

      // Show success and redirect
      router.push('/dashboard?scheduled=true')
    } catch (err) {
      logger.error('Failed to schedule update:', { error: err })
    }
  }

  const getStepNumber = (stepId: string) => {
    return steps.findIndex(s => s.id === stepId) + 1
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Update</h1>
              <p className="mt-2 text-gray-600">
                Share what&apos;s happening with your little one
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Progress Steps */}
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

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {currentStep === 'create' && (
            <div className="p-6">
              <div className="space-y-8">
                {/* Update Form */}
                <UpdateForm
                  formData={formData}
                  onFormDataChange={setFormData}
                  onSubmit={handleFormSubmit}
                  isLoading={isLoading}
                  error={error}
                  childrenData={children}
                  loadChildren={loadChildren}
                />

                {/* Media Upload */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Photos (Optional)</h3>
                  <MediaUpload
                    files={formData.mediaFiles || []}
                    previewUrls={previewUrls}
                    onFilesChange={processMediaFiles}
                    onFileRemove={removeMediaFile}
                    disabled={isLoading}
                    error={error}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 'ai-review' && aiAnalysis && (
            <div className="p-6">
              <AIReview
                aiAnalysis={aiAnalysis}
                confirmedRecipients={formData.confirmedRecipients || []}
                onRecipientsChange={(recipients) => updateRecipients(recipients)}
                onNext={handleAIReviewNext}
                onBack={() => setCurrentStep('create')}
                isLoading={isLoading}
                error={error}
              />
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="p-6">
              <UpdatePreview
                formData={formData}
                aiAnalysis={aiAnalysis}
                child={selectedChild}
                recipients={recipients}
                previewUrls={previewUrls}
                onSend={handleSendUpdate}
                onSchedule={handleScheduleUpdate}
                isLoading={isLoading}
                error={error}
              />
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80">
            <div className="flex items-center mb-2">
              <LoadingSpinner size="sm" className="mr-2" />
              <span className="text-sm font-medium text-gray-900">Uploading photos...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{uploadProgress}% complete</p>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Check out our{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
              guide to creating great updates
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}