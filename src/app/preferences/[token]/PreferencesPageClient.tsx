'use client'

import { useEffect, useRef, useState } from 'react'
import PreferenceLayout from '@/components/preferences/PreferenceLayout'
import PreferenceForm from '@/components/preferences/PreferenceForm'
import { type RecipientWithGroup } from '@/lib/preference-server'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

interface PreferencesPageClientProps {
  recipient: RecipientWithGroup
  token: string
}

export default function PreferencesPageClient({ recipient, token }: PreferencesPageClientProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const successHeadingRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    if (showSuccess && successHeadingRef.current) {
      successHeadingRef.current.focus()
    }
  }, [showSuccess])

  const handleSuccess = () => {
    setShowSuccess(true)
    // Scroll to top to show success message
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
            <h1
              ref={successHeadingRef}
              tabIndex={-1}
              className="text-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Preferences Updated Successfully!
            </h1>
            <p className="text-lg text-gray-600">
              Thank you, {recipient.name}! Your update preferences have been saved.
            </p>
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto"
            >
              <p className="text-sm text-green-800">
                You&apos;ll now receive baby updates according to your preferences.
                You can update them anytime by visiting this link again.
              </p>
            </div>
          </div>

          {/* Additional information */}
          <div className="mt-8 space-y-4 text-sm text-gray-500">
            <p>
              Your preferences are automatically saved and will take effect immediately.
            </p>
            <p>
              If you have any questions, feel free to reach out to the person who added you.
            </p>
          </div>

          {/* Update again button */}
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Update Preferences Again
            </button>
          </div>
        </div>
      </PreferenceLayout>
    )
  }

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
                  You&apos;ve been added to receive baby updates. Use this page to customize
                  how often you want to receive notifications and what types of content
                  you&apos;d like to see.
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

        {/* Security note */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>
            This is a secure, personalized link. Don&apos;t share it with others as
            it allows access to modify your preferences.
          </p>
          <p>
            Your privacy is important to us. We only use your information to send
            the updates you&apos;ve requested.
          </p>
        </div>
      </div>
    </PreferenceLayout>
  )
}