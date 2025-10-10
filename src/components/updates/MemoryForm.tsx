'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ChildProfileSelector } from '@/components/children/ChildProfileSelector'
import SmartContextualInput from './SmartContextualInput'
import { validateUpdateContent, getMilestoneLabel, milestoneTypes } from '@/lib/validation/update'
import type { UpdateFormData, MilestoneType } from '@/lib/validation/update'
import { detectMilestone, type MilestoneCandidate } from '@/lib/milestones/detectMilestone'

interface MilestoneOption {
  value: MilestoneType
  label: string
  emoji: string
}

const milestoneEmojis: Record<MilestoneType, string> = {
  first_smile: '😊',
  rolling: '🔄',
  sitting: '🧘',
  crawling: '🐾',
  first_steps: '👣',
  first_words: '🗣️',
  first_tooth: '🦷',
  walking: '🚶',
  potty_training: '🚽',
  first_day_school: '🎒',
  birthday: '🎂',
  other: '✨'
}

const milestoneOptions: MilestoneOption[] = milestoneTypes.map((type) => ({
  value: type,
  label: getMilestoneLabel(type),
  emoji: milestoneEmojis[type] ?? '✨'
}))

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
  const [suggestedMilestone, setSuggestedMilestone] = useState<MilestoneCandidate | null>(null)
  const [autoAppliedMilestone, setAutoAppliedMilestone] = useState<MilestoneType | null>(null)
  const [dismissedMilestoneType, setDismissedMilestoneType] = useState<MilestoneType | null>(null)
  const [isMilestonePickerOpen, setIsMilestonePickerOpen] = useState(false)
  const rawPickerId = useId()
  const milestonePickerId = `milestone-picker-${rawPickerId.replace(/:/g, '')}`

  const evaluateMilestoneSuggestion = useCallback((content: string) => {
    const trimmed = content.trim()

    if (!trimmed) {
      setSuggestedMilestone(null)
      if (dismissedMilestoneType) {
        setDismissedMilestoneType(null)
      }
      if (autoAppliedMilestone && formData.milestoneType === autoAppliedMilestone) {
        onFormDataChange({ milestoneType: undefined })
      }
      if (autoAppliedMilestone !== null) {
        setAutoAppliedMilestone(null)
      }
      return
    }

    const detection = detectMilestone(trimmed)
    const candidate = detection.bestMatch

    if (!candidate || candidate.confidence !== 'high') {
      setSuggestedMilestone(null)
      if (autoAppliedMilestone && formData.milestoneType === autoAppliedMilestone) {
        onFormDataChange({ milestoneType: undefined })
        setAutoAppliedMilestone(null)
      }
      return
    }

    if (dismissedMilestoneType && dismissedMilestoneType !== candidate.type) {
      setDismissedMilestoneType(null)
    }

    const manualSelectionActive = Boolean(
      formData.milestoneType && formData.milestoneType !== autoAppliedMilestone
    )

    if (manualSelectionActive || dismissedMilestoneType === candidate.type) {
      setSuggestedMilestone(null)
      return
    }

    setSuggestedMilestone(prev =>
      prev?.type === candidate.type && prev.confidence === candidate.confidence
        ? prev
        : candidate
    )

    if (formData.milestoneType !== candidate.type) {
      onFormDataChange({ milestoneType: candidate.type })
    }

    if (autoAppliedMilestone !== candidate.type) {
      setAutoAppliedMilestone(candidate.type)
    }
  }, [autoAppliedMilestone, dismissedMilestoneType, formData.milestoneType, onFormDataChange])

  // Note: ChildProfileSelector now handles loading children internally
  useEffect(() => {
    if (loadChildren) {
      loadChildren()
    }
  }, [loadChildren])

  useEffect(() => {
    evaluateMilestoneSuggestion(formData.content || '')
  }, [formData.content, evaluateMilestoneSuggestion])

  const handleContentChange = (content: string) => {
    onFormDataChange({ content })

    // Real-time validation
    const error = validateUpdateContent(content)
    setContentError(error)
    evaluateMilestoneSuggestion(content)
  }

  const handleMilestoneOptionSelect = (milestone: MilestoneType) => {
    setSuggestedMilestone(null)
    setAutoAppliedMilestone(null)
    setDismissedMilestoneType(null)

    if (formData.milestoneType === milestone) {
      onFormDataChange({ milestoneType: undefined })
    } else {
      onFormDataChange({ milestoneType: milestone })
    }
  }

  const handleClearMilestone = () => {
    setSuggestedMilestone(null)
    setAutoAppliedMilestone(null)
    setDismissedMilestoneType(null)
    onFormDataChange({ milestoneType: undefined })
  }

  const handleDismissSuggestion = () => {
    if (!suggestedMilestone) {
      return
    }

    setDismissedMilestoneType(suggestedMilestone.type)
    setSuggestedMilestone(null)
    setAutoAppliedMilestone(null)

    if (formData.milestoneType === suggestedMilestone.type) {
      onFormDataChange({ milestoneType: undefined })
    }

    setIsMilestonePickerOpen(false)
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

  const selectedMilestoneLabel = formData.milestoneType
    ? getMilestoneLabel(formData.milestoneType)
    : null
  const selectedMilestoneEmoji = formData.milestoneType
    ? milestoneEmojis[formData.milestoneType] ?? '✨'
    : null
  const suggestionLabel = suggestedMilestone
    ? getMilestoneLabel(suggestedMilestone.type)
    : null

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
        <div className="space-y-3">
          {suggestedMilestone && suggestionLabel ? (
            <div className="flex flex-wrap items-center gap-3" role="status" aria-live="polite">
              <div className="inline-flex flex-col gap-1 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700 sm:flex-row sm:items-center sm:gap-2">
                <span className="inline-flex items-center gap-2 font-medium">
                  <span aria-hidden="true">🎉</span>
                  <span>Detected milestone:</span>
                  <span className="font-semibold">{suggestionLabel}</span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                  High confidence
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMilestonePickerOpen(prev => !prev)}
                  className="inline-flex items-center rounded-md border border-primary-200 bg-white px-3 py-2 text-sm font-medium text-primary-700 shadow-sm transition hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-expanded={isMilestonePickerOpen}
                  aria-controls={milestonePickerId}
                  disabled={isLoading}
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleDismissSuggestion}
                  className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : selectedMilestoneLabel ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                {selectedMilestoneEmoji && (
                  <span aria-hidden="true" className="text-lg">
                    {selectedMilestoneEmoji}
                  </span>
                )}
                <span>Selected milestone:</span>
                <span className="font-semibold">{selectedMilestoneLabel}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMilestonePickerOpen(prev => !prev)}
                  className="inline-flex items-center rounded-md border border-primary-200 bg-white px-3 py-2 text-sm font-medium text-primary-700 shadow-sm transition hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-expanded={isMilestonePickerOpen}
                  aria-controls={milestonePickerId}
                  disabled={isLoading}
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleClearMilestone}
                  className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-600">No milestone selected yet.</span>
              <button
                type="button"
                onClick={() => setIsMilestonePickerOpen(true)}
                className="inline-flex items-center rounded-md border border-primary-200 bg-white px-3 py-2 text-sm font-medium text-primary-700 shadow-sm transition hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                aria-expanded={isMilestonePickerOpen}
                aria-controls={milestonePickerId}
                disabled={isLoading}
              >
                Choose milestone
              </button>
            </div>
          )}

          {isMilestonePickerOpen && (
            <div
              id={milestonePickerId}
              className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {milestoneOptions.map((option) => {
                  const isSelected = formData.milestoneType === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleMilestoneOptionSelect(option.value)}
                      className={`flex h-full flex-col items-center justify-center rounded-lg border-2 p-3 text-center transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      aria-pressed={isSelected}
                      disabled={isLoading}
                    >
                      <span className="text-xl" aria-hidden="true">
                        {option.emoji}
                      </span>
                      <span className="mt-1 text-xs font-medium">{option.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {formData.milestoneType && (
                  <button
                    type="button"
                    onClick={handleClearMilestone}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading}
                  >
                    Clear selection
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMilestonePickerOpen(false)}
                  className="inline-flex items-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          We'll suggest a milestone automatically when your memory sounds like one, or you can pick it manually.
        </p>
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
