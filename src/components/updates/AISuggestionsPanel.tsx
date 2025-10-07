'use client'

import { useMemo } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { RecipientProfileSelector } from '@/components/recipients/RecipientProfileSelector'
import { getEmotionalToneLabel, getImportanceLevelLabel } from '@/lib/validation/update'
import type { AIAnalysisResponse } from '@/lib/types/ai-analysis'
import type { Recipient } from '@/lib/recipients'

interface AISuggestionsPanelProps {
  analysis: AIAnalysisResponse | null
  isAnalyzing: boolean
  hasRequestedAnalysis: boolean
  recipients: Recipient[]
  recipientsLoading: boolean
  recipientsError: string | null
  selectedRecipientIds: string[]
  onRecipientsChange: (recipients: string[]) => void
  onRegenerate: () => void
  onContinue: () => void
  canContinue: boolean
  globalError?: string | null
}

export default function AISuggestionsPanel({
  analysis,
  isAnalyzing,
  hasRequestedAnalysis,
  recipients,
  recipientsLoading,
  recipientsError,
  selectedRecipientIds,
  onRecipientsChange,
  onRegenerate,
  onContinue,
  canContinue,
  globalError
}: AISuggestionsPanelProps) {
  const suggestedRecipientIds = analysis?.suggested_recipients ?? []

  const statusLabel = useMemo(() => {
    if (isAnalyzing) {
      return 'Analyzing your update...'
    }

    if (!hasRequestedAnalysis) {
      return 'Generate suggestions to see AI highlights.'
    }

    if (!analysis) {
      return globalError || 'Unable to fetch suggestions right now.'
    }

    if (!analysis.success) {
      return analysis.error || 'AI analysis failed. Try again.'
    }

    return 'Suggestions ready.'
  }, [analysis, globalError, hasRequestedAnalysis, isAnalyzing])

  const recipientCount = selectedRecipientIds.length

  return (
    <aside className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-5 lg:sticky lg:top-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary-600">AI Review</p>
          <h2 className="text-lg font-semibold text-gray-900">Suggestions & Recipients</h2>
          <p className="text-sm text-gray-600">{statusLabel}</p>
        </div>

        {hasRequestedAnalysis && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isAnalyzing}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <LoadingSpinner size="sm" className="mr-2 h-3 w-3" />
                Working...
              </>
            ) : (
              <>
                <svg className="mr-2 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 9a7.5 7.5 0 0113.36-3.36m2.14 4.86a7.5 7.5 0 01-13.36 3.36" />
                </svg>
                Regenerate
              </>
            )}
          </button>
        )}
      </div>

      {globalError && !isAnalyzing && (!analysis || !analysis.success) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      {isAnalyzing ? (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white p-4 text-sm text-blue-700">
          <LoadingSpinner size="sm" />
          <span>Analyzing your update...</span>
        </div>
      ) : !hasRequestedAnalysis ? (
        <div className="rounded-lg border border-dashed border-blue-200 bg-white p-4 text-sm text-blue-700">
          Click <span className="font-medium">Generate Suggestions</span> to see AI highlights and recommended recipients.
        </div>
      ) : !analysis ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          {globalError || 'We could not load suggestions. Try again in a moment.'}
        </div>
      ) : !analysis.success || !analysis.analysis ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {analysis.error || 'AI analysis failed. Try again.'}
        </div>
      ) : (
        <div className="space-y-5">
          <section className="space-y-3 rounded-lg border border-white bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800">Highlights</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Keywords</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.analysis.keywords.map((keyword, index) => (
                    <span
                      key={`${keyword}-${index}`}
                      className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Emotional Tone</p>
                  <span className="mt-1 inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-800">
                    {getEmotionalToneLabel(analysis.analysis.emotional_tone)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Importance</p>
                  <span className="mt-1 inline-flex items-center rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-medium text-indigo-800">
                    {getImportanceLevelLabel(analysis.analysis.importance_level)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-white bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Recipients</h3>
              <p className="text-xs text-gray-500">Select who should receive this update.</p>
            </div>

            <RecipientProfileSelector
              recipients={recipients}
              selectedRecipientIds={selectedRecipientIds}
              onRecipientsChange={onRecipientsChange}
              loading={recipientsLoading}
              error={recipientsError}
              size="md"
              columns={{
                mobile: 2,
                tablet: 3,
                desktop: 3,
              }}
              placeholder="Select recipients to send this update"
              emptyMessage="Add recipients to send this update."
              showSelectAll
              maxHeight="400px"
              highlightSuggested
              suggestedIds={suggestedRecipientIds}
            />

            <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              {recipientCount > 0 ? (
                <span>
                  <strong>{recipientCount}</strong> recipient{recipientCount === 1 ? '' : 's'} selected
                </span>
              ) : (
                <span>Select at least one recipient to continue.</span>
              )}
            </div>
          </section>
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue || isAnalyzing || recipientsLoading}
        className="flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue to Preview
      </button>
    </aside>
  )
}
