'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useDigestCompilation } from '@/hooks/useDigestCompilation'
import Navigation from '@/components/layout/Navigation'
import CompilationProgress from '@/components/digests/CompilationProgress'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { createLogger } from '@/lib/logger'

const logger = createLogger('DigestCompilePage')

function DigestCompileContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    compile,
    error,
    compilationProgress
  } = useDigestCompilation()

  const [compilationStarted, setCompilationStarted] = useState(false)
  const [compilationComplete, setCompilationComplete] = useState(false)
  const [compilationError, setCompilationError] = useState<string | null>(null)

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Start compilation on mount
  useEffect(() => {
    if (!user || compilationStarted) return

    const startCompilation = async () => {
      setCompilationStarted(true)
      logger.info('Starting digest compilation')

      try {
        // Get date range from query params or use defaults (last 7 days)
        const endDate = searchParams?.get('endDate') || new Date().toISOString().split('T')[0]
        const startDate = searchParams?.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const result = await compile({
          date_range_start: startDate,
          date_range_end: endDate,
          auto_approve: false
        })

        if (result.success && result.digestId) {
          logger.info('Compilation complete', { digestId: result.digestId })
          setCompilationComplete(true)

          // Redirect to preview after a short delay
          setTimeout(() => {
            router.push(`/dashboard/digests/${result.digestId}/preview`)
          }, 2000)
        } else {
          setCompilationError('Unknown compilation error')
          logger.error('Compilation failed')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Compilation failed'
        setCompilationError(message)
        logger.error('Compilation exception', { error: err })
      }
    }

    startCompilation()
  }, [user, compilationStarted, compile, searchParams, router])

  const handleBack = () => {
    router.push('/dashboard/drafts')
  }

  const handleRetry = () => {
    setCompilationStarted(false)
    setCompilationComplete(false)
    setCompilationError(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />

      <main className="pb-20 md:pb-8">
        {/* Header */}
        <div className="bg-white border-b border-neutral-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={handleBack}
              className="flex items-center text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Back to Drafts</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {compilationError ? (
            <Card className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                  Compilation Failed
                </h2>
                <p className="text-neutral-600 mb-6">
                  {compilationError}
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <Button onClick={handleRetry} variant="primary">
                    Try Again
                  </Button>
                  <Button onClick={handleBack} variant="outline">
                    Back to Drafts
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <CompilationProgress
              progress={compilationProgress}
              isComplete={compilationComplete}
              error={error || undefined}
              onRetry={handleRetry}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default function DigestCompilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <DigestCompileContent />
    </Suspense>
  )
}