'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import ChildSelector from '@/components/children/ChildSelector'
import SmartContextualInput from './SmartContextualInput'
import { milestoneTypes, getMilestoneLabel, validateUpdateContent } from '@/lib/validation/update'
import type { UpdateFormData, MilestoneType } from '@/lib/validation/update'

interface UpdateFormProps {
  formData: Partial<UpdateFormData>
  previewUrls: string[]
  onFormDataChange: (data: Partial<UpdateFormData>) => void
  onMediaChange: (files: File[]) => void
  onMediaRemove: (index: number) => void
  onGenerateSuggestions: () => void
  isLoading?: boolean
  isAnalyzing?: boolean
  hasRequestedAnalysis?: boolean
  error?: string | null
  loadChildren: () => Promise<void>
}

export default function UpdateForm({
  formData,
  previewUrls,
  onFormDataChange,
  onMediaChange,
  onMediaRemove,
  onGenerateSuggestions,
  isLoading = false,
  isAnalyzing = false,
  hasRequestedAnalysis = false,
  error,
  loadChildren
}: UpdateFormProps) {
  const [contentError, setContentError] = useState<string | null>(null)

  useEffect(() => {
    loadChildren()
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

  const handleMilestoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onFormDataChange({
      milestoneType: value === 'none' ? undefined : (value as MilestoneType)
    })
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
        <label className="sr-only">Select Child</label>
        <ChildSelector
          selectedChildId={formData.childId}
          onChildSelect={handleChildSelect}
          placeholder="Select child"
          required
        />
      </div>

      {/* Smart Contextual Input - combines text and media */}
      <div>
        <label htmlFor="content" className="sr-only">Update Content</label>
        <SmartContextualInput
          content={formData.content || ''}
          mediaFiles={formData.mediaFiles || []}
          previewUrls={previewUrls}
          onContentChange={handleContentChange}
          onMediaChange={onMediaChange}
          onMediaRemove={onMediaRemove}
          disabled={isLoading}
          placeholder="Share a moment… add photos or video if you like"
          maxCharacters={2000}
          maxFiles={10}
        />
        {contentError && (
          <p className="mt-1 text-sm text-red-600">{contentError}</p>
        )}
        <details className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <summary className="text-xs font-medium text-neutral-700 cursor-pointer">Helpful tips</summary>
          <ul className="mt-2 space-y-1 text-sm text-neutral-700">
            <li>• Share what happened and why it mattered</li>
            <li>• Include how your child felt</li>
            <li>• Add a photo or short video if you like</li>
          </ul>
        </details>
      </div>

      {/* Milestone Selection */}
      <div>
        <label htmlFor="milestone" className="sr-only">Milestone Type (Optional)</label>
        <select
          id="milestone"
          value={formData.milestoneType || 'none'}
          onChange={handleMilestoneChange}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          disabled={isLoading}
        >
          <option value="none">No specific milestone</option>
          {milestoneTypes.map((milestone) => (
            <option key={milestone} value={milestone}>
              {getMilestoneLabel(milestone)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">Optional — helps suggestions be more accurate</p>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <span className="text-xs text-gray-500">Suggestions appear in the panel below.</span>
        <button
          type="submit"
          disabled={!isFormValid || isLoading || isAnalyzing}
          className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Generating suggestions...
            </>
          ) : (
            <>
              {hasRequestedAnalysis ? 'Regenerate Suggestions' : 'Generate Suggestions'}
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
