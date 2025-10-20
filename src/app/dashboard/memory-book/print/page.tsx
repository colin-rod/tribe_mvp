'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSummaries } from '@/lib/services/summaryService'
import type { Summary } from '@/lib/types/summary'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

interface PrintableSummary {
  id: string
  title: string
  dateRange: string
  totalUpdates: number
  intro?: string
  narrative?: string
  closing?: string
}

function formatDateRange(summary: Summary): string {
  const start = new Date(summary.date_range_start)
  const end = new Date(summary.date_range_end)

  const startText = start.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  })

  const endText = end.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return `${startText} – ${endText}`
}

export default function MemoryBookPrintPage() {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await getSummaries()
        const sentSummaries = data.filter(summary => summary.status === 'sent')

        if (sentSummaries.length === 0) {
          throw new Error('No sent summaries available to print')
        }

        setSummaries(sentSummaries)

        // Allow time for layout to render before triggering browser print dialog
        setTimeout(() => {
          window.print()
        }, 500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Memory Book for printing')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const printableSummaries = useMemo<PrintableSummary[]>(() => {
    return summaries.map(summary => ({
      id: summary.id,
      title: summary.parent_narrative?.title || summary.title,
      dateRange: formatDateRange(summary),
      totalUpdates: summary.total_updates,
      intro: summary.parent_narrative?.intro,
      narrative: summary.parent_narrative?.narrative,
      closing: summary.parent_narrative?.closing
    }))
  }, [summaries])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <LoadingState message="Preparing Memory Book for printing..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 p-6">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 print:bg-white">
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .print-page-break {
            page-break-after: always;
          }
        }
      `}</style>

      <header className="no-print bg-white border-b border-neutral-200 px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Memory Book Print Preview</h1>
          <p className="text-sm text-neutral-600">
            A print-friendly layout of your sent summaries.
          </p>
        </div>
        <div className="text-sm text-neutral-500">
          Generated on {new Date().toLocaleString()}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-12 space-y-12">
        {printableSummaries.map((summary, index) => (
          <article
            key={summary.id}
            className="bg-white shadow-sm border border-neutral-200 rounded-2xl overflow-hidden"
          >
            <div className="px-10 py-12 print:p-12">
              <header className="text-center mb-10">
                <p className="text-sm uppercase tracking-[0.25em] text-neutral-500 mb-4">
                  Week {printableSummaries.length - index}
                </p>
                <h2 className="text-4xl font-serif text-neutral-900 mb-3">
                  {summary.title}
                </h2>
                <p className="text-lg text-neutral-600">{summary.dateRange}</p>
                <p className="text-sm text-neutral-500 mt-3">
                  {summary.totalUpdates} memories captured this week
                </p>
              </header>

              {summary.intro && (
                <section className="mb-10 text-lg leading-relaxed text-neutral-700 font-serif">
                  {summary.intro}
                </section>
              )}

              {summary.narrative && (
                <section className="mb-10 text-base leading-loose text-neutral-800 whitespace-pre-line font-serif">
                  {summary.narrative}
                </section>
              )}

              {summary.closing && (
                <section className="text-lg italic text-neutral-700 font-serif">
                  {summary.closing}
                </section>
              )}
            </div>

            {index < printableSummaries.length - 1 && (
              <footer className="print-page-break" aria-hidden="true">
                <div className="h-12 bg-neutral-50 border-t border-neutral-100" />
              </footer>
            )}
          </article>
        ))}
      </main>
    </div>
  )
}
