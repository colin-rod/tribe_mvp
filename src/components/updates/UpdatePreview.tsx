'use client'

import { useState } from 'react'
import Image from 'next/image'
import { calculateAge, formatAgeShort } from '@/lib/age-utils'
import { getMilestoneLabel, getEmotionalToneLabel } from '@/lib/validation/update'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import ChildImage from '@/components/ui/ChildImage'
import type { UpdateFormData } from '@/lib/validation/update'
import type { AIAnalysisResponse } from '@/lib/types/ai-analysis'
import type { Child } from '@/lib/children'
import type { Recipient } from '@/lib/recipients'

interface UpdatePreviewProps {
  formData: Partial<UpdateFormData>
  aiAnalysis: AIAnalysisResponse | null
  child: Child | null
  recipients: Recipient[]
  previewUrls: string[]
  onSend: () => void
  onSchedule?: (scheduledFor: Date) => void
  isLoading?: boolean
  error?: string | null
}

export default function UpdatePreview({
  formData,
  aiAnalysis,
  child,
  recipients,
  previewUrls,
  onSend,
  onSchedule,
  isLoading = false,
  error
}: UpdatePreviewProps) {
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const handleSchedule = () => {
    if (!scheduledDate || !scheduledTime) return

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`)
    onSchedule?.(scheduledFor)
  }

  const selectedRecipients = recipients.filter(r =>
    formData.confirmedRecipients?.includes(r.id)
  )

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

      {/* Update Preview Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Update Preview</h2>
                <p className="text-sm text-gray-600">Review before sending</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Will be sent to {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Update Content */}
        <div className="p-6">
          {/* Child Info */}
          {child && (
            <div className="flex items-center mb-4 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mr-3">
                <ChildImage
                  childId={child.id}
                  photoUrl={child.profile_photo_url}
                  name={child.name}
                  alt={`${child.name}'s profile`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{child.name}</h3>
                <p className="text-sm text-gray-500">
                  {formatAgeShort(calculateAge(child.birth_date))}
                  {formData.milestoneType && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {getMilestoneLabel(formData.milestoneType)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Update Text */}
          <div className="mb-6">
            <div className="prose max-w-none">
              <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                {formData.content}
              </p>
            </div>
          </div>

          {/* Photos */}
          {previewUrls.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Photos ({previewUrls.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={url}
                      alt={`Update photo ${index + 1}`}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover"
                      quality={80}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis Summary */}
          {aiAnalysis?.success && aiAnalysis.analysis && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">AI Analysis</h4>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  {getEmotionalToneLabel(aiAnalysis.analysis.emotional_tone)}
                </span>
                {aiAnalysis.analysis.keywords.slice(0, 3).map((keyword, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recipients List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recipients ({selectedRecipients.length})
        </h3>
        <div className="space-y-3">
          {selectedRecipients.map((recipient) => (
            <div key={recipient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{recipient.name}</p>
                <p className="text-sm text-gray-500">
                  {recipient.relationship}
                  {recipient.group && ` • ${recipient.group.name}`}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                <span className="capitalize">{recipient.frequency.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduling Options */}
      {onSchedule && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Send Options</h3>
            <button
              type="button"
              onClick={() => setIsScheduling(!isScheduling)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isScheduling ? 'Send now instead' : 'Schedule for later'}
            </button>
          </div>

          {isScheduling && (
            <div className="mb-4 p-4 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Schedule for later</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="scheduled-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    id="scheduled-date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                  />
                </div>
                <div>
                  <label htmlFor="scheduled-time" className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    id="scheduled-time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Updates can be scheduled at least 15 minutes from now
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Recipients
        </button>

        <div className="flex space-x-3">
          {isScheduling && onSchedule && (
            <button
              type="button"
              onClick={handleSchedule}
              disabled={!scheduledDate || !scheduledTime || isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Scheduling...
                </>
              ) : (
                <>
                  <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Schedule Update
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onSend}
            disabled={isLoading || selectedRecipients.length === 0}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Sending Update...
              </>
            ) : (
              <>
                <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Update Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {!isLoading && selectedRecipients.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-yellow-700">
              Please select at least one recipient to send this update.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
