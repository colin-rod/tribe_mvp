'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { cn } from '@/lib/utils'
import { useSummaryCompilation } from '@/hooks/useSummaryCompilation'
import { useDraftManagement } from '@/hooks/useDraftManagement'
import {
  SparklesIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

interface SummaryStatsProps {
  className?: string
}

export default function SummaryStats({ className }: SummaryStatsProps = {}) {
  const { stats, loading: summaryLoading, loadStats } = useSummaryCompilation()
  const { summary, loading: draftLoading, loadSummary } = useDraftManagement()

  useEffect(() => {
    loadStats()
    loadSummary()
  }, [loadStats, loadSummary])

  const isLoading = summaryLoading || draftLoading

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  const canCompileSummary = summary?.can_compile_digest || false
  const hasDrafts = (summary?.total_drafts || 0) > 0
  const hasSentSummaries = (stats?.total_digests || 0) > 0

  return (
    <Card
      padding="none"
      className={cn('right-pane-card right-pane-card--bordered overflow-hidden', className)}
    >
      <CardHeader className="border-b border-neutral-100 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-primary-600" />
          <CardTitle className="text-sm font-semibold leading-6 text-neutral-900">
            Summary System
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-4 space-y-4">
        {canCompileSummary && (
          <Alert
            variant="success"
            className="border rounded-lg border-success-200"
            title="Ready to compile"
          >
            Your latest draft has enough approved memories to send a personalized summary.
          </Alert>
        )}

        {/* Compact Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Drafts Count */}
          <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-100">
            <DocumentTextIcon className="w-6 h-6 text-orange-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-neutral-900">
              {summary?.total_drafts || 0}
            </p>
            <p className="text-xs text-neutral-600">
              Draft{(summary?.total_drafts || 0) !== 1 ? 's' : ''}
            </p>
            {(summary?.ready_count || 0) > 0 && (
              <p className="text-xs text-green-600 mt-0.5 font-medium">
                {summary?.ready_count} ready
              </p>
            )}
          </div>

          {/* Pending Summaries */}
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <ClockIcon className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-neutral-900">
              {stats?.pending_review || 0}
            </p>
            <p className="text-xs text-neutral-600">Pending Review</p>
          </div>

          {/* Sent Summaries */}
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
            <CheckCircleIcon className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-neutral-900">
              {stats?.sent_this_month || 0}
            </p>
            <p className="text-xs text-neutral-600">Sent This Month</p>
          </div>
        </div>

        {/* Compile Summary Action */}
        {canCompileSummary && (
          <Link href="/dashboard/digests/compile" className="block">
            <Button variant="success" className="w-full" size="sm">
              <SparklesIcon className="w-4 h-4 mr-2" />
              Compile Summary Now
            </Button>
          </Link>
        )}

        {/* Additional Info */}
        {!canCompileSummary && hasDrafts && (
          <Alert
            variant="info"
            className="border rounded-lg border-info-200"
            title="Mark drafts as ready"
          >
            <p>Approve the remaining drafts so your summary can be compiled.</p>
            <div className="mt-3 flex justify-center">
              <Link href="/dashboard/drafts">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <PencilSquareIcon className="mr-1.5 h-3.5 w-3.5" />
                  View Drafts
                </Button>
              </Link>
            </div>
          </Alert>
        )}

        {!canCompileSummary && !hasDrafts && (
          <Alert
            className="border rounded-lg border-neutral-200"
            title="Capture memories to get started"
          >
            <p>Save a few updates as drafts and we&apos;ll guide you through the compilation flow.</p>
            <div className="mt-3 flex justify-center">
              <Link href="/dashboard/drafts">
                <Button variant="primary" size="sm" className="h-8 text-xs">
                  <PencilSquareIcon className="mr-1.5 h-3.5 w-3.5" />
                  Start Creating
                </Button>
              </Link>
            </div>
          </Alert>
        )}

        {/* Last Sent Info */}
        {hasSentSummaries && stats?.last_sent_at && (
          <p className="text-xs text-neutral-500 text-center">
            Last sent: {new Date(stats.last_sent_at).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}