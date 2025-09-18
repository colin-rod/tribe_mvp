import Link from 'next/link'
import PreferenceLayout from '@/components/preferences/PreferenceLayout'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function NotFound() {
  return (
    <PreferenceLayout>
      <div className="text-center">
        {/* Error icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
        </div>

        {/* Error message */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Invalid or Expired Link
          </h1>
          <p className="text-lg text-gray-600">
            This preference link is either invalid or has expired.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-red-800">
              The link you used may be incorrect, expired, or the recipient may have been removed from the updates list.
            </p>
          </div>
        </div>

        {/* Help information */}
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            What can you do?
          </h2>

          <div className="text-left max-w-md mx-auto space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
              <p className="ml-3">
                <strong>Check the link:</strong> Make sure you clicked the complete link from your email
              </p>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
              <p className="ml-3">
                <strong>Contact the sender:</strong> Ask the person who added you to send a new preference link
              </p>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
              <p className="ml-3">
                <strong>Get help:</strong> Reach out to our support team if you continue having issues
              </p>
            </div>
          </div>
        </div>

        {/* Contact support */}
        <div className="mt-8">
          <a
            href="mailto:support@example.com"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Contact Support
          </a>
        </div>

        {/* Go home */}
        <div className="mt-4">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Return to Tribe homepage
          </Link>
        </div>
      </div>
    </PreferenceLayout>
  )
}