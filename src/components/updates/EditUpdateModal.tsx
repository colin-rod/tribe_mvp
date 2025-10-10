'use client'

import { useState, useEffect } from 'react'
import { createLogger } from '@/lib/logger'
import { useUpdateEditor } from '@/hooks/useUpdateEditor'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ChildProfileSelector } from '@/components/children/ChildProfileSelector'
import SmartContextualInput from './SmartContextualInput'
import { validateUpdateContent } from '@/lib/validation/update'
import type { DraftUpdate } from '@/lib/types/digest'

const logger = createLogger('EditUpdateModal')

export interface EditUpdateModalProps {
  open: boolean
  update: DraftUpdate
  onClose: () => void
  onSaveSuccess?: () => void
}

export default function EditUpdateModal({
  open,
  update,
  onClose,
  onSaveSuccess
}: EditUpdateModalProps) {
  const [contentError, setContentError] = useState<string | null>(null)

  const {
    formData,
    isSaving,
    error,
    previewUrls,
    hasUnsavedChanges,
    setFormData,
    processMediaFiles,
    removeMediaFile,
    saveChanges,
    reset
  } = useUpdateEditor({
    updateId: update.id,
    initialData: update,
    onSaveSuccess: () => {
      logger.info('Update saved successfully', { updateId: update.id })
      onSaveSuccess?.()
      onClose()
    },
    onSaveError: (error) => {
      logger.error('Failed to save update', { error, updateId: update.id })
    }
  })

  // Reset when modal is closed
  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const handleContentChange = (content: string) => {
    setFormData({ content })

    // Real-time validation
    const error = validateUpdateContent(content)
    setContentError(error)
  }

  const handleChildSelect = (childId: string) => {
    setFormData({ childId })
  }

  const handleSave = async () => {
    // Validation
    const contentValidationError = validateUpdateContent(formData.content || '')
    if (contentValidationError) {
      setContentError(contentValidationError)
      return
    }

    const success = await saveChanges()
    if (!success) {
      // Error is already logged and displayed
      return
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      )
      if (!confirmed) return
    }
    onClose()
  }

  if (!open) return null

  const canSave = Boolean(
    formData.childId &&
    formData.content?.trim() &&
    !contentError &&
    hasUnsavedChanges
  )

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-update-title"
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div>
            <h2 id="edit-update-title" className="text-lg font-semibold text-neutral-900">
              Edit Memory
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              Make changes to your memory before sending
            </p>
          </div>
          <button
            aria-label="Close"
            onClick={handleClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Child Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-3">
                Who is this memory about?
              </label>
              <ChildProfileSelector
                selectedChildId={formData.childId}
                onChildSelect={handleChildSelect}
                placeholder="Select a child for this memory"
                size="lg"
              />
            </div>

            {/* Subject Line (Optional) */}
            <div>
              <label htmlFor="edit-subject" className="block text-sm font-medium text-neutral-900 mb-2">
                Subject Line (Optional)
              </label>
              <input
                id="edit-subject"
                type="text"
                value={formData.subject || ''}
                onChange={(e) => setFormData({ subject: e.target.value })}
                placeholder="Add a catchy subject line..."
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                disabled={isSaving}
              />
            </div>

            {/* Content and Media Input */}
            <div>
              <label htmlFor="edit-content" className="sr-only">Memory Content</label>
              <SmartContextualInput
                content={formData.content || ''}
                mediaFiles={formData.mediaFiles || []}
                previewUrls={previewUrls}
                onContentChange={handleContentChange}
                onMediaChange={processMediaFiles}
                onMediaRemove={removeMediaFile}
                disabled={isSaving}
                placeholder="Share a moment... add photos or video if you like"
                maxCharacters={2000}
                maxFiles={10}
              />
              {contentError && (
                <p className="mt-1 text-sm text-red-600">{contentError}</p>
              )}
            </div>

            {/* Milestone Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-3">
                Is this a milestone? (Optional)
              </label>
              <div className="grid grid-cols-4 gap-3">
                {/* First Smile */}
                <button
                  type="button"
                  onClick={() => setFormData({ milestoneType: formData.milestoneType === 'first_smile' ? undefined : 'first_smile' })}
                  disabled={isSaving}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    formData.milestoneType === 'first_smile'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-center font-medium">First Smile</span>
                </button>

                {/* First Steps */}
                <button
                  type="button"
                  onClick={() => setFormData({ milestoneType: formData.milestoneType === 'first_steps' ? undefined : 'first_steps' })}
                  disabled={isSaving}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    formData.milestoneType === 'first_steps'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-xs text-center font-medium">First Steps</span>
                </button>

                {/* First Words */}
                <button
                  type="button"
                  onClick={() => setFormData({ milestoneType: formData.milestoneType === 'first_words' ? undefined : 'first_words' })}
                  disabled={isSaving}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    formData.milestoneType === 'first_words'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="text-xs text-center font-medium">First Words</span>
                </button>

                {/* Birthday */}
                <button
                  type="button"
                  onClick={() => setFormData({ milestoneType: formData.milestoneType === 'birthday' ? undefined : 'birthday' })}
                  disabled={isSaving}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    formData.milestoneType === 'birthday'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  <span className="text-xs text-center font-medium">Birthday</span>
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">Click to select or deselect a milestone</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center space-x-2 text-sm text-neutral-600">
            {hasUnsavedChanges && (
              <span className="flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse" />
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
