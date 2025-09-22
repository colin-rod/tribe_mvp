'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { UpdatesListProps, DashboardUpdate, UpdateCardData } from '@/lib/types/dashboard'
import { getRecentUpdatesWithStats } from '@/lib/updates'
import { transformToCardData } from '@/lib/utils/update-formatting'
import UpdateCard from './UpdateCard'
import UpdateCardSkeleton from './UpdateCardSkeleton'
import { Button } from '@/components/ui/Button'

/**
 * UpdatesList component for displaying recent updates on the dashboard
 */
export default function UpdatesList({
  limit = 5,
  showViewAllLink = true,
  className
}: UpdatesListProps) {
  const router = useRouter()
  const [updates, setUpdates] = useState<UpdateCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUpdates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const rawUpdates = await getRecentUpdatesWithStats(limit)
      const transformedUpdates = rawUpdates.map((update: DashboardUpdate) =>
        transformToCardData(update)
      )

      setUpdates(transformedUpdates)
    } catch (err) {
      console.error('Error loading updates:', err)
      setError('Failed to load recent updates')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    loadUpdates()
  }, [loadUpdates])

  const handleUpdateClick = useCallback((updateId: string) => {
    router.push(`/dashboard/updates/${updateId}`)
  }, [router])

  const handleRetry = useCallback(() => {
    loadUpdates()
  }, [loadUpdates])

  // Loading state
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: limit }, (_, index) => (
          <UpdateCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">
            Unable to Load Updates
          </h3>
          <p className="text-sm text-red-700 mb-4">
            {error}
          </p>
          <Button
            variant="outline"
            onClick={handleRetry}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Empty state
  if (updates.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Recent Activity
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            You haven't created any updates recently. Share your first update to get started!
          </p>
          <Link href="/dashboard/create-update">
            <Button>
              Create Your First Update
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Success state with updates
  return (
    <div className={cn('space-y-4', className)}>
      {updates.map((update) => (
        <UpdateCard
          key={update.id}
          update={update}
          onClick={handleUpdateClick}
        />
      ))}

      {/* View all link */}
      {showViewAllLink && updates.length >= limit && (
        <div className="pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/updates"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all updates
            <svg
              className="ml-1 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}