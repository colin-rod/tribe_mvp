'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useDigestCompilation } from '@/hooks/useDigestCompilation'
import { useDraftManagement } from '@/hooks/useDraftManagement'
import {
  SparklesIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

export default function DigestStats() {
  const { stats, loading: digestLoading, loadStats } = useDigestCompilation()
  const { summary, loading: draftLoading, loadSummary } = useDraftManagement()

  useEffect(() => {
    loadStats()
    loadSummary()
  }, [loadStats, loadSummary])

  const isLoading = digestLoading || draftLoading

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  const canCompileDigest = summary?.can_compile_digest || false
  const hasDrafts = (summary?.total_drafts || 0) > 0
  const hasSentDigests = (stats?.total_digests || 0) > 0

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <SparklesIcon className="w-5 h-5 text-orange-500" />
            <span>Digest System</span>
          </CardTitle>
          {canCompileDigest && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Ready to compile
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Drafts Count */}
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-100">
            <DocumentTextIcon className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-neutral-900">
              {summary?.total_drafts || 0}
            </p>
            <p className="text-sm text-neutral-600">
              Draft{(summary?.total_drafts || 0) !== 1 ? 's' : ''}
            </p>
            {(summary?.ready_count || 0) > 0 && (
              <p className="text-xs text-green-600 mt-1">
                {summary?.ready_count} ready
              </p>
            )}
          </div>

          {/* Pending Digests */}
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <ClockIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-neutral-900">
              {stats?.pending_review || 0}
            </p>
            <p className="text-sm text-neutral-600">Pending Review</p>
          </div>

          {/* Sent Digests */}
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
            <CheckCircleIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-neutral-900">
              {stats?.sent_this_month || 0}
            </p>
            <p className="text-sm text-neutral-600">Sent This Month</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          {canCompileDigest ? (
            <Link href="/dashboard/digests/compile" className="block">
              <Button variant="success" className="w-full">
                <SparklesIcon className="w-5 h-5 mr-2" />
                Compile Digest Now
              </Button>
            </Link>
          ) : hasDrafts ? (
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
              <p className="text-sm text-neutral-600 mb-2">
                Mark drafts as ready to compile a digest
              </p>
              <Link href="/dashboard/drafts">
                <Button variant="outline" size="sm">
                  <PencilSquareIcon className="w-4 h-4 mr-2" />
                  View Drafts
                </Button>
              </Link>
            </div>
          ) : (
            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-100 text-center">
              <SparklesIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <h4 className="font-medium text-neutral-900 mb-1">
                New Workflow Available!
              </h4>
              <p className="text-sm text-neutral-600 mb-3">
                Capture moments as drafts, then compile personalized digests for your recipients
              </p>
              <Link href="/dashboard/drafts">
                <Button variant="primary" size="sm">
                  <PencilSquareIcon className="w-4 h-4 mr-2" />
                  Start Creating Drafts
                </Button>
              </Link>
            </div>
          )}

          {hasSentDigests && stats?.last_sent_at && (
            <p className="text-xs text-neutral-500 text-center">
              Last sent: {new Date(stats.last_sent_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Stats Summary */}
        {hasSentDigests && stats && (
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-neutral-900">
                  {stats.average_updates_per_digest.toFixed(1)}
                </p>
                <p className="text-xs text-neutral-600">Avg Updates/Digest</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-neutral-900">
                  {stats.average_recipients_per_digest.toFixed(1)}
                </p>
                <p className="text-xs text-neutral-600">Avg Recipients/Digest</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}