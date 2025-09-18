import Link from 'next/link'

interface PreferenceLayoutProps {
  children: React.ReactNode
}

export default function PreferenceLayout({ children }: PreferenceLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header without navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary-600">
                Tribe
              </Link>
              <span className="ml-4 text-sm text-gray-500">
                Update Preferences
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Simple footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>
              Need help? Contact the person who added you or{' '}
              <a
                href="mailto:support@example.com"
                className="text-primary-600 hover:text-primary-700"
              >
                reach out to support
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}