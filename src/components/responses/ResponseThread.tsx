'use client'

import { useResponses } from '@/hooks/useResponses'
import type { Response as UpdateResponse } from '@/hooks/useResponses'
import { ResponseCard } from './ResponseCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline'

interface ResponseThreadProps {
  updateId: string
  responses?: UpdateResponse[]
  loading?: boolean
  showNotifications?: boolean
  maxHeight?: string
}

export function ResponseThread({
  updateId,
  responses: externalResponses,
  loading: externalLoading,
  showNotifications = false,
  maxHeight
}: ResponseThreadProps) {
  const {
    responses: hookResponses,
    loading: hookLoading,
    error,
    newResponseCount,
    markResponsesAsRead
  } = useResponses(updateId)

  // Use external responses if provided, otherwise use hook responses
  const responses = externalResponses ?? hookResponses
  const loading = externalLoading ?? hookLoading

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner data-testid="loading-spinner" />
        <span className="ml-2 text-gray-600">Loading responses...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <ChatBubbleLeftIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" data-testid="chat-icon" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          When family members reply to this update via email, their responses will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ChatBubbleLeftIcon className="h-5 w-5" data-testid="chat-icon" />
          Family Responses
          {showNotifications && newResponseCount > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
              {newResponseCount} new
            </span>
          )}
        </h3>
        <span className="text-sm text-gray-500">
          {responses.length} {responses.length === 1 ? 'response' : 'responses'}
        </span>
      </div>

      <div
        data-testid="responses-container"
        className="space-y-3 overflow-y-auto"
        style={maxHeight ? { maxHeight } : undefined}
        onClick={() => {
          if (showNotifications && newResponseCount > 0) {
            markResponsesAsRead()
          }
        }}
      >
        {responses.map((response) => (
          <ResponseCard
            key={response.id}
            response={response}
            showChannel={true}
          />
        ))}
      </div>
    </div>
  )
}
