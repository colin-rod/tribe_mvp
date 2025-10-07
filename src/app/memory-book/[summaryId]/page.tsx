'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSummaryById, getSummaryPreview } from '@/lib/services/summaryService'
import type { Summary, SummaryPreviewData } from '@/lib/types/summary'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Button } from '@/components/ui/Button'
import { MediaGallery } from '@/components/media/MediaGallery'
import { cn } from '@/lib/utils'

/**
 * Individual Memory Book Summary Page
 * Shows the full parent-facing narrative with all memories
 */
export default function MemoryBookSummaryPage() {
  const router = useRouter()
  const params = useParams()
  const summaryId = params.summaryId as string

  const [summary, setSummary] = useState<Summary | null>(null)
  const [previewData, setPreviewData] = useState<SummaryPreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSummary()
  }, [summaryId])

  async function loadSummary() {
    try {
      setLoading(true)
      const [summaryData, preview] = await Promise.all([
        getSummaryById(summaryId),
        getSummaryPreview(summaryId)
      ])

      if (!summaryData) {
        throw new Error('Summary not found')
      }

      setSummary(summaryData)
      setPreviewData(preview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingState message="Loading summary..." />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState message={error || 'Summary not found'} retry={loadSummary} />
      </div>
    )
  }

  const narrative = summary.parent_narrative
  const allMedia = previewData?.recipients.flatMap(r => r.memories.flatMap(m => m.media_urls)) || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push('/memory-book')}
              className="flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Memory Book</span>
            </Button>

            <div className="flex items-center space-x-3">
              <Button variant="outline" disabled className="opacity-50">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </Button>
              <Button variant="outline" disabled className="opacity-50">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">
              {narrative?.title || summary.title}
            </h1>
            <div className="flex items-center space-x-6 text-sm text-neutral-600">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  {new Date(summary.date_range_start).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric'
                  })} - {new Date(summary.date_range_end).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{summary.total_updates} memories</span>
              </div>
            </div>
          </div>

          {/* Introduction */}
          {narrative?.intro && (
            <div className="mb-8 p-6 bg-primary-50 rounded-xl border border-primary-100">
              <p className="text-lg leading-relaxed text-neutral-800">{narrative.intro}</p>
            </div>
          )}

          {/* Hero Media Gallery */}
          {allMedia.length > 0 && (
            <div className="mb-12">
              <MediaGallery
                mediaUrls={allMedia.slice(0, 6)}
                className="grid-cols-2 md:grid-cols-3 gap-4"
                aspect="video"
              />
            </div>
          )}

          {/* Main Narrative */}
          {narrative?.narrative && (
            <div className="mb-12 prose prose-lg max-w-none">
              <div className="text-neutral-700 leading-relaxed whitespace-pre-line">
                {narrative.narrative}
              </div>
            </div>
          )}

          {/* Media References */}
          {narrative?.media_references && narrative.media_references.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Memory Highlights</h2>
              <div className="space-y-6">
                {narrative.media_references.map((ref, index) => (
                  <div
                    key={ref.id}
                    className="flex gap-4 p-4 bg-white rounded-lg border border-neutral-200"
                  >
                    <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-neutral-100">
                      <img
                        src={ref.url}
                        alt={ref.reference_text}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-neutral-700">{ref.reference_text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Closing */}
          {narrative?.closing && (
            <div className="mb-12 p-6 bg-neutral-50 rounded-xl border border-neutral-200">
              <p className="text-lg leading-relaxed text-neutral-800 italic">
                {narrative.closing}
              </p>
            </div>
          )}

          {/* Footer Stats */}
          <div className="pt-8 border-t border-neutral-200">
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <div>
                <span>Shared with {summary.total_recipients} recipients</span>
              </div>
              <div>
                <span>
                  Sent {new Date(summary.sent_at || '').toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
