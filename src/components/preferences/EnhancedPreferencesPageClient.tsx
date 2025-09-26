'use client'

import { useState, useEffect } from 'react'
import PreferenceLayout from '@/components/preferences/PreferenceLayout'
import PreferenceForm from '@/components/preferences/PreferenceForm'
import { GroupOverviewDashboard } from './GroupOverviewDashboard'
import { type RecipientWithGroup } from '@/lib/preference-server'
import { CheckCircleIcon, ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { createLogger } from '@/lib/logger'

const logger = createLogger('EnhancedPreferencesPageClient')

interface EnhancedPreferencesPageClientProps {
  recipient: RecipientWithGroup
  token: string
}

type ViewMode = 'legacy' | 'groups' | 'loading'

export default function EnhancedPreferencesPageClient({
  recipient,
  token
}: EnhancedPreferencesPageClientProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('loading')
  const [hasMultipleGroups, setHasMultipleGroups] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

  // Check if user has multiple groups to determine UI mode
  useEffect(() => {
    checkGroupMembership()
  }, [token])

  const checkGroupMembership = async () => {
    try {
      setError(null)

      const response = await fetch(`/api/recipients/${token}/membership`)

      if (!response.ok) {
        // Fallback to legacy mode if group API fails
        logger.info('Group membership API not available, using legacy mode')
        setViewMode('legacy')
        return
      }

      const data = await response.json()
      const totalGroups = data.summary?.total_groups || 0

      setHasMultipleGroups(totalGroups > 1)
      setViewMode(totalGroups > 1 ? 'groups' : 'legacy')

    } catch (error) {
      logger.errorWithStack('Error checking group membership:', error as Error)
      // Fallback to legacy mode on error
      setViewMode('legacy')
    }
  }

  const handleSuccess = () => {
    setShowSuccess(true)
    setLastUpdateTime(new Date())
    // Scroll to top to show success message
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleTryAgain = () => {
    setShowSuccess(false)
    setError(null)
    checkGroupMembership()
  }

  const getSuccessMessage = () => {
    if (hasMultipleGroups) {
      return "Your group preferences have been updated successfully!"
    }
    return "Your preferences have been updated successfully!"
  }

  const getSuccessDescription = () => {
    if (hasMultipleGroups) {
      return "Your notification settings for all groups have been saved and will take effect immediately."
    }
    return "You'll now receive baby updates according to your preferences."
  }

  // Success state
  if (showSuccess) {
    return (
      <PreferenceLayout>
        <div className="text-center">
          {/* Success icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>

          {/* Success message */}
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {getSuccessMessage()}
            </h1>
            <p className="text-lg text-gray-600">
              Thank you, {recipient.name}! {getSuccessDescription()}
            </p>

            {lastUpdateTime && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-green-800">
                  <strong>Updated:</strong> {lastUpdateTime.toLocaleString()}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  You can update your preferences anytime by visiting this link again.
                </p>
              </div>
            )}
          </div>

          {/* Additional information */}
          <div className="mt-8 space-y-4 text-sm text-gray-500">
            <p>
              Your preferences are automatically saved and will take effect immediately.
            </p>
            {hasMultipleGroups && (
              <p>
                You can manage individual group settings or global preferences as needed.
              </p>
            )}
            <p>
              If you have any questions, feel free to reach out to the person who added you.
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowSuccess(false)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Update Preferences Again
            </button>

            {hasMultipleGroups && (
              <button
                onClick={() => {
                  setShowSuccess(false)
                  setViewMode('groups')
                }}
                className="inline-flex items-center px-4 py-2 border border-primary-300 shadow-sm text-sm font-medium rounded-md text-primary-700 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Manage Group Settings
              </button>
            )}
          </div>
        </div>
      </PreferenceLayout>
    )
  }

  // Loading state
  if (viewMode === 'loading') {
    return (
      <PreferenceLayout>
        <div className="space-y-8">
          {/* Header skeleton */}
          <div className="text-center animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-72 mx-auto"></div>
          </div>

          {/* Content skeleton */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </PreferenceLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <PreferenceLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading preferences
              </h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTryAgain}
                  className="text-red-700 border-red-300 hover:bg-red-50"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PreferenceLayout>
    )
  }

  // Multi-group view
  if (viewMode === 'groups') {
    return (
      <PreferenceLayout>
        <GroupOverviewDashboard
          token={token}
          onSuccess={handleSuccess}
        />
      </PreferenceLayout>
    )
  }

  // Legacy single-group view
  return (
    <PreferenceLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Hi {recipient.name}!
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Set your preferences for receiving baby updates
          </p>
        </div>

        {/* Welcome message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Welcome to the family updates!
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  You've been added to receive baby updates. Use this page to customize
                  how often you want to receive notifications and what types of content
                  you'd like to see.
                </p>
                <p className="mt-2">
                  No account needed - your preferences are securely linked to this personalized link.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Your Information
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p><span className="font-medium">Name:</span> {recipient.name}</p>
            {recipient.email && (
              <p><span className="font-medium">Email:</span> {recipient.email}</p>
            )}
            {recipient.phone && (
              <p><span className="font-medium">Phone:</span> {recipient.phone}</p>
            )}
          </div>
        </div>

        {/* Preference form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <PreferenceForm
            recipient={recipient}
            token={token}
            onSuccess={handleSuccess}
          />
        </div>

        {/* View mode toggle for testing */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              Development Mode
            </h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('legacy')}
                className={viewMode === 'legacy' ? 'bg-yellow-100' : ''}
              >
                Legacy View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('groups')}
                className={viewMode === 'groups' ? 'bg-yellow-100' : ''}
              >
                Groups View
              </Button>
            </div>
          </div>
        )}

        {/* Security note */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>
            This is a secure, personalized link. Don't share it with others as
            it allows access to modify your preferences.
          </p>
          <p>
            Your privacy is important to us. We only use your information to send
            the updates you've requested.
          </p>
        </div>
      </div>
    </PreferenceLayout>
  )
}