'use client'

import { useCallback, useEffect, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { DetailCard, DetailRow } from './shared/DetailCard'
import { StatCard } from './shared/StatCard'
import { Button } from '@/components/ui/Button'
import { useViewSelection } from '@/contexts/ViewSelectionContext'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { getSummaryById, getRecentSummaries, type SummaryListItem } from '@/lib/services/summaryService'
import type { Summary } from '@/lib/types/summary'

export function SummaryRightPane() {
  const { selectedId } = useViewSelection()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [recentSummaries, setRecentSummaries] = useState<SummaryListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)

  const loadSummary = useCallback(async (id: string, signal: { cancelled: boolean }) => {
    setLoading(true)
    setError(null)

    try {
      const [summaryResult, recent] = await Promise.all([
        getSummaryById(id),
        getRecentSummaries()
      ])

      if (signal.cancelled) return

      if (!summaryResult) {
        setSummary(null)
        setError('We could not find this summary.')
        return
      }

      setSummary(summaryResult)
      setRecentSummaries(recent)
    } catch (err) {
      if (signal.cancelled) return
      const message = err instanceof Error ? err.message : 'Failed to load summary details.'
      setError(message)
      setSummary(null)
    } finally {
      if (!signal.cancelled) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    setRetryCount(0)
  }, [selectedId])

  useEffect(() => {
    let cancelled = false

    if (!selectedId) {
      setSummary(null)
      setRecentSummaries([])
      setError(null)
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    loadSummary(selectedId, { cancelled })

    return () => {
      cancelled = true
    }
  }, [selectedId, reloadToken, loadSummary])

  const handleRetry = useCallback(() => {
    if (!selectedId) return
    setRetryCount((count) => count + 1)
    setReloadToken((token) => token + 1)
  }, [selectedId])

  const emptyState = (
    <div className="right-pane-section">
      <div className="text-center py-12 px-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80">
        <p className="text-sm text-neutral-600">Select a summary to view details</p>
      </div>
    </div>
  )

  if (!selectedId) {
    return emptyState
  }

  if (loading) {
    return (
      <div className="right-pane-section">
        <LoadingState message="Loading summary details" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="right-pane-section">
        <ErrorState
          message={error}
          onRetry={handleRetry}
          retryCount={retryCount}
        />
      </div>
    )
  }

  const scheduledDate = summary?.sent_at ?? summary?.digest_date
  const formattedSchedule = (() => {
    if (!scheduledDate) return null
    try {
      const parsed = new Date(scheduledDate)
      return {
        exact: format(parsed, "PPP 'at' p"),
        relative: formatDistanceToNow(parsed, { addSuffix: true })
      }
    } catch {
      return null
    }
  })()

  if (!summary) {
    return emptyState
  }

  const statusLabel = summary.status?.replace(/_/g, ' ') ?? 'Unknown'
  const displayRecentSummaries = recentSummaries.filter(item => item.id !== summary.id).slice(0, 4)

  return (
    <div className="right-pane-section">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Digest Tools</p>
        <h2 className="text-lg font-semibold text-neutral-900">{summary.title}</h2>
      </header>

      <DetailCard title="Summary Overview">
        <DetailRow
          label="Status"
          value={
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
              {statusLabel}
            </span>
          }
        />
        <DetailRow label="Recipients" value={summary.total_recipients ?? 0} />
        <DetailRow label="Updates Included" value={summary.total_updates ?? 0} />
        {formattedSchedule && (
          <DetailRow label="Scheduled" value={`${formattedSchedule.exact} (${formattedSchedule.relative})`} />
        )}
      </DetailCard>

      <StatCard
        label="Total Recipients"
        value={summary.total_recipients ?? 0}
      />

      <div className="space-y-2">
        <Button variant="primary" className="w-full">
          Send Now
        </Button>
        <Button variant="outline" className="w-full">
          Edit Schedule
        </Button>
      </div>

      <DetailCard title="Recent Summaries">
        <div className="space-y-3">
          {[summary, ...displayRecentSummaries].map((item) => {
            const referenceDate = item.sent_at ?? item.digest_date ?? item.created_at
            const formatted = referenceDate ? format(new Date(referenceDate), 'MMM d, yyyy') : 'Not sent yet'
            return (
              <div key={item.id} className="pb-3 border-b border-neutral-100 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-neutral-500">{formatted}</span>
                  <span className="text-xs text-neutral-500">{item.total_recipients ?? 0} recipients</span>
                </div>
              </div>
            )
          })}
        </div>
      </DetailCard>
    </div>
  )
}
