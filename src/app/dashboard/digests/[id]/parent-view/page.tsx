'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useDigestCompilation } from '@/hooks/useDigestCompilation'
import Navigation from '@/components/layout/Navigation'
import ParentNarrativeView from '@/components/digests/ParentNarrativeView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ParentViewPage')

export default function ParentViewPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const digestId = params?.id as string

  const {
    digest,
    loading,
    error,
    loadDigest
  } = useDigestCompilation()

  const [childName, setChildName] = useState<string>('')
  const [dateRange, setDateRange] = useState<string>('')

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load digest
  useEffect(() => {
    if (!digestId || !user) return

    const load = async () => {
      try {
        await loadDigest(digestId)
      } catch (err) {
        logger.error('Failed to load digest', { error: err, digestId })
      }
    }

    load()
  }, [digestId, user, loadDigest])

  // Extract child name and date range from digest
  useEffect(() => {
    if (digest) {
      // Extract child name from recipient breakdown or AI data
      const firstRecipient = Object.values(digest.recipient_breakdown || {})[0]
      const name = digest.ai_compilation_data?.digest_theme?.split("'s")[0] || 'Your Child'
      setChildName(name)

      // Format date range
      const start = new Date(digest.date_range_start).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
      const end = new Date(digest.date_range_end).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
      setDateRange(`${start} - ${end}`)
    }
  }, [digest])

  const handleBack = () => {
    router.push(`/dashboard/digests/${digestId}/preview`)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !digest) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="p-12 text-center">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              Digest Not Found
            </h2>
            <p className="text-neutral-600 mb-6">
              {error || 'The digest you are looking for does not exist or could not be loaded.'}
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Preview
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  if (!digest.parent_narrative) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="p-12 text-center">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              Parent Narrative Not Available
            </h2>
            <p className="text-neutral-600 mb-6">
              This digest does not have a parent narrative yet. It may be processing or was created before this feature was added.
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Preview
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 print:bg-white">
      <Navigation />

      <main className="pb-20 md:pb-8 print:pb-0">
        {/* Header - Hidden when printing */}
        <div className="bg-white border-b border-neutral-200 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={handleBack}
              className="flex items-center text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Back to Digest Preview</span>
            </button>
          </div>
        </div>

        {/* Digest Info - Hidden when printing */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              {digest.title}
            </h1>
            <p className="text-sm text-neutral-600">
              Parent Archival Narrative • {dateRange}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-0 print:px-0">
          <ParentNarrativeView
            narrative={digest.parent_narrative}
            childName={childName}
            dateRange={dateRange}
          />
        </div>
      </main>
    </div>
  )
}
