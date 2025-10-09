'use client'

import { useState, useEffect } from 'react'
import { getRecipients } from '@/lib/recipients'
import { getEmotionalToneLabel, getImportanceLevelLabel } from '@/lib/validation/update'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { AIAnalysisResponse } from '@/lib/types/ai-analysis'
import type { Recipient } from '@/lib/recipients'

interface AIReviewProps {
  aiAnalysis: AIAnalysisResponse
  confirmedRecipients: string[]
  onRecipientsChange: (recipients: string[]) => void
  onNext: () => void
  onBack?: () => void
  isLoading?: boolean
  error?: string | null
}

export default function AIReview({
  aiAnalysis,
  confirmedRecipients,
  onRecipientsChange,
  onNext,
  onBack,
  isLoading = false,
  error
}: AIReviewProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(true)
  const [recipientError, setRecipientError] = useState<string | null>(null)

  useEffect(() => {
    loadRecipients()
  }, [])

  const loadRecipients = async () => {
    try {
      setLoadingRecipients(true)
      const recipientData = await getRecipients()
      setRecipients(recipientData)
    } catch (err) {
      setRecipientError(err instanceof Error ? err.message : 'Failed to load recipients')
    } finally {
      setLoadingRecipients(false)
    }
  }

  const handleRecipientToggle = (recipientId: string) => {
    const isSelected = confirmedRecipients.includes(recipientId)
    if (isSelected) {
      onRecipientsChange(confirmedRecipients.filter(id => id !== recipientId))
    } else {
      onRecipientsChange([...confirmedRecipients, recipientId])
    }
  }

  const handleSelectAll = () => {
    onRecipientsChange(recipients.map(r => r.id))
  }

  const handleDeselectAll = () => {
    onRecipientsChange([])
  }

  const handleApplyAISuggestions = () => {
    if (aiAnalysis.suggested_recipients) {
      onRecipientsChange([...aiAnalysis.suggested_recipients])
    }
  }

  if (!aiAnalysis.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
        <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-lg font-medium text-red-800 mb-2">AI Analysis Failed</h3>
        <p className="text-red-700">{aiAnalysis.error || 'Unknown error occurred'}</p>
      </div>
    )
  }

  const analysis = aiAnalysis.analysis
  if (!analysis) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
        <p className="text-yellow-700">No analysis data available</p>
      </div>
    )
  }

  return (
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

      {/* AI Analysis Results */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Analysis Results</h3>
            <p className="text-sm text-gray-600">Our AI has analyzed your memory</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Keywords */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          {/* Emotional Tone */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Emotional Tone</h4>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {getEmotionalToneLabel(analysis.emotional_tone)}
            </span>
          </div>

          {/* Importance Level */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Importance Level</h4>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                <div
                  className={`h-2 rounded-full ${
                    analysis.importance_level >= 8 ? 'bg-red-500' :
                    analysis.importance_level >= 6 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${analysis.importance_level * 10}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {getImportanceLevelLabel(analysis.importance_level)} ({analysis.importance_level}/10)
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Recipient Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select Recipients</h3>
            <p className="text-sm text-gray-600">
              Choose who should receive this memory
              {aiAnalysis.suggested_recipients && aiAnalysis.suggested_recipients.length > 0 && (
                <span className="text-blue-600"> • AI has made suggestions</span>
              )}
            </p>
          </div>
          <div className="flex space-x-2">
            {aiAnalysis.suggested_recipients && aiAnalysis.suggested_recipients.length > 0 && (
              <button
                type="button"
                onClick={handleApplyAISuggestions}
                className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Apply AI Suggestions
              </button>
            )}
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>

        {loadingRecipients ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="sm" className="mr-2" />
            <span className="text-sm text-gray-600">Loading recipients...</span>
          </div>
        ) : recipientError ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-700">{recipientError}</p>
          </div>
        ) : recipients.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-center">
            <p className="text-sm text-yellow-700">
              No recipients found. You need to add recipients before sending memories.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recipients.map((recipient) => {
              const isSelected = confirmedRecipients.includes(recipient.id)
              const isAISuggested = aiAnalysis.suggested_recipients?.includes(recipient.id)

              return (
                <div
                  key={recipient.id}
                  className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50'
                      : isAISuggested
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`recipient-${recipient.id}`}
                      checked={isSelected}
                      onChange={() => handleRecipientToggle(recipient.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <div className="flex items-center">
                        <label
                          htmlFor={`recipient-${recipient.id}`}
                          className="text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          {recipient.name}
                        </label>
                        {isAISuggested && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            AI Suggested
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {recipient.relationship}
                        {recipient.group && ` • ${recipient.group.name}`}
                        {recipient.email && ` • ${recipient.email}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-gray-500">
                    <span className="capitalize">
                      {recipient.frequency === 'every_update' ? 'Wants every memory' : recipient.frequency.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {confirmedRecipients.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>{confirmedRecipients.length}</strong> recipient{confirmedRecipients.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Edit
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={confirmedRecipients.length === 0 || isLoading}
          className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Creating Memory...
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
    </div>
  )
}