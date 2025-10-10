'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSummaryCompilation } from '@/hooks/useSummaryCompilation'
import { useDraftManagement } from '@/hooks/useDraftManagement'
import {
  SparklesIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

export default function SummaryStats() {
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-base">
            <SparklesIcon className="w-4 h-4 text-orange-500" />
            <span>Summary System</span>
          </CardTitle>
          {canCompileSummary && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Ready to compile
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Compact Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
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
          <Link href="/dashboard/digests/compile" className="block mb-3">
            <Button variant="success" className="w-full" size="sm">
              <SparklesIcon className="w-4 h-4 mr-2" />
              Compile Summary Now
            </Button>
          </Link>
        )}

        {/* Additional Info */}
        {!canCompileSummary && hasDrafts && (
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-center mb-3">
            <p className="text-xs text-neutral-600 mb-2">
              Mark drafts as ready to compile
            </p>
            <Link href="/dashboard/drafts">
              <Button variant="outline" size="sm" className="text-xs h-7">
                <PencilSquareIcon className="w-3.5 h-3.5 mr-1.5" />
                View Drafts
              </Button>
            </Link>
          </div>
        )}

        {!canCompileSummary && !hasDrafts && (
          <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-100 text-center mb-3">
            <SparklesIcon className="w-6 h-6 text-orange-500 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-neutral-900 mb-1">
              New Workflow Available!
            </p>
            <p className="text-xs text-neutral-600 mb-2">
              Capture moments as memories, then compile summaries
            </p>
            <Link href="/dashboard/drafts">
              <Button variant="primary" size="sm" className="text-xs h-7">
                <PencilSquareIcon className="w-3.5 h-3.5 mr-1.5" />
                Start Creating
              </Button>
            </Link>
          </div>
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