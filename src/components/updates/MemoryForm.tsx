'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ChildProfileSelector } from '@/components/children/ChildProfileSelector'
import SmartContextualInput from './SmartContextualInput'
import { validateUpdateContent } from '@/lib/validation/update'
import type { UpdateFormData } from '@/lib/validation/update'

interface MemoryFormProps {
  formData: Partial<UpdateFormData>
  previewUrls: string[]
  onFormDataChange: (data: Partial<UpdateFormData>) => void
  onMediaChange: (files: File[]) => void
  onMediaRemove: (index: number) => void
  onGenerateSuggestions: () => void
  isLoading?: boolean
  error?: string | null
  loadChildren: () => Promise<void>
}

export default function MemoryForm({
  formData,
  previewUrls,
  onFormDataChange,
  onMediaChange,
  onMediaRemove,
  onGenerateSuggestions,
  isLoading = false,
  error,
  loadChildren
}: MemoryFormProps) {
  const [contentError, setContentError] = useState<string | null>(null)

  // Note: ChildProfileSelector now handles loading children internally
  useEffect(() => {
    if (loadChildren) {
      loadChildren()
    }
  }, [loadChildren])

  const handleContentChange = (content: string) => {
    onFormDataChange({ content })

    // Real-time validation
    const error = validateUpdateContent(content)
    setContentError(error)
  }

  const handleChildSelect = (childId: string) => {
    onFormDataChange({ childId })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.childId) {
      return
    }

    const contentValidationError = validateUpdateContent(formData.content || '')
    if (contentValidationError) {
      setContentError(contentValidationError)
      return
    }
    await onGenerateSuggestions()
  }

  const isFormValid = Boolean(
    formData.childId &&
    formData.content?.trim() &&
    !contentError
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Who is this memory about?
        </label>
        <ChildProfileSelector
          selectedChildId={formData.childId}
          onChildSelect={handleChildSelect}
          placeholder="Select a child for this memory"
          size="lg"
        />
      </div>

      {/* Smart Contextual Input - combines text and media */}
      <div>
        <label htmlFor="content" className="sr-only">Memory Content</label>
        <SmartContextualInput
          content={formData.content || ''}
          mediaFiles={formData.mediaFiles || []}
          previewUrls={previewUrls}
          onContentChange={handleContentChange}
          onMediaChange={onMediaChange}
          onMediaRemove={onMediaRemove}
          disabled={isLoading}
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
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Is this a milestone? (Optional)
        </label>
        <div className="grid grid-cols-4 gap-3">
          {/* First Smile */}
          <button
            type="button"
            onClick={() => onFormDataChange({ milestoneType: formData.milestoneType === 'first_smile' ? undefined : 'first_smile' })}
            disabled={isLoading}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
              formData.milestoneType === 'first_smile'
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
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
            onClick={() => onFormDataChange({ milestoneType: formData.milestoneType === 'first_steps' ? undefined : 'first_steps' })}
            disabled={isLoading}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
              formData.milestoneType === 'first_steps'
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
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
            onClick={() => onFormDataChange({ milestoneType: formData.milestoneType === 'first_words' ? undefined : 'first_words' })}
            disabled={isLoading}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
              formData.milestoneType === 'first_words'
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-xs text-center font-medium">First Words</span>
          </button>

          {/* First Tooth */}
          <button
            type="button"
            onClick={() => onFormDataChange({ milestoneType: formData.milestoneType === 'first_tooth' ? undefined : 'first_tooth' })}
            disabled={isLoading}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
              formData.milestoneType === 'first_tooth'
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs text-center font-medium">First Tooth</span>
          </button>

          {/* Crawling */}
          <button
            type="button"
            onClick={() => onFormDataChange({ milestoneType: formData.milestoneType === 'crawling' ? undefined : 'crawling' })}
            disabled={isLoading}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
              formData.milestoneType === 'crawling'
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs text-center font-medium">Crawling</span>
          </button>

          {/* Walking */}
          <button
            type="button"
            onClick={() => onFormDataChange({ milestoneType: formData.milestoneType === 'walking' ? undefined : 'walking' })}
            disabled={isLoading}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
              formData.milestoneType === 'walking'
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <span className="text-xs text-center font-medium">Walking</span>
          </button>

          {/* Birthday */}
          <button
            type="button"
            onClick={() => onFormDataChange({ milestoneType: formData.milestoneType === 'birthday' ? undefined : 'birthday' })}
            disabled={isLoading}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
              formData.milestoneType === 'birthday'
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            <span className="text-xs text-center font-medium">Birthday</span>
          </button>

          {/* First Day School */}
          <button
            type="button"
            onClick={() => onFormDataChange({ milestoneType: formData.milestoneType === 'first_day_school' ? undefined : 'first_day_school' })}
            disabled={isLoading}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
              formData.milestoneType === 'first_day_school'
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-xs text-center font-medium">School</span>
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Click to select or deselect a milestone</p>
      </div>


      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Creating update...
            </>
          ) : (
            <>
              Continue to Preview
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
