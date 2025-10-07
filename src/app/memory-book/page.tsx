'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSummaries } from '@/lib/services/summaryService'
import type { Summary } from '@/lib/types/summary'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

/**
 * Memory Book Timeline Page
 * Shows weekly summaries as browsable timeline pages
 */
export default function MemoryBookPage() {
  const router = useRouter()
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSummaries()
  }, [])

  async function loadSummaries() {
    try {
      setLoading(true)
      const data = await getSummaries()
      setSummaries(data.filter(s => s.status === 'sent')) // Only show sent summaries
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Memory Book')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingState message="Loading Memory Book..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState message={error} retry={loadSummaries} />
      </div>
    )
  }

  if (summaries.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <svg
            className="mx-auto h-16 w-16 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-neutral-900">Your Memory Book is Empty</h3>
          <p className="mt-2 text-sm text-neutral-500">
            Create and approve summaries to build your Memory Book timeline.
          </p>
          <div className="mt-6">
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Memory Book</h1>
              <p className="text-sm text-neutral-600 mt-1">
                Your collection of weekly memory summaries
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Print/Export Placeholder CTA */}
              <Button variant="outline" disabled className="opacity-50">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print (Coming Soon)
              </Button>
              <Button variant="outline" disabled className="opacity-50">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export (Coming Soon)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Timeline line */}
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-neutral-200" />

            {/* Summary cards */}
            <div className="space-y-8">
              {summaries.map((summary, index) => (
                <SummaryTimelineCard
                  key={summary.id}
                  summary={summary}
                  isFirst={index === 0}
                  onClick={() => router.push(`/memory-book/${summary.id}`)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Individual summary card in timeline
 */
function SummaryTimelineCard({
  summary,
  isFirst,
  onClick
}: {
  summary: Summary
  isFirst: boolean
  onClick: () => void
}) {
  const dateRange = `${new Date(summary.date_range_start).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })} - ${new Date(summary.date_range_end).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}`

  return (
    <div className="relative pl-20">
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute left-[30px] -translate-x-1/2 w-4 h-4 rounded-full border-4 border-white',
          isFirst ? 'bg-primary-500' : 'bg-neutral-300'
        )}
      />

      {/* Card */}
      <div
        onClick={onClick}
        className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary-200 hover:-translate-y-1 group"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-neutral-900 group-hover:text-primary-700 transition-colors">
              {summary.title}
            </h3>
            <p className="text-sm text-neutral-500 mt-1">{dateRange}</p>
          </div>
          {isFirst && (
            <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">
              Latest
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-6 text-sm text-neutral-600 mb-4">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{summary.total_updates} memories</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{summary.total_recipients} recipients</span>
          </div>
        </div>

        {/* Parent narrative preview */}
        {summary.parent_narrative && (
          <div className="text-sm text-neutral-700 leading-relaxed line-clamp-3 mb-4">
            {summary.parent_narrative.intro}
          </div>
        )}

        {/* View arrow */}
        <div className="flex items-center text-primary-600 group-hover:text-primary-700 text-sm font-medium">
          <span>View Full Summary</span>
          <svg
            className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
