'use client'

import { createLogger } from '@/lib/logger'
import { useState, useEffect, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { FixedSizeList as List } from 'react-window'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { UpdatesListProps, DashboardUpdate, UpdateCardData } from '@/lib/types/dashboard'
import { getRecentUpdatesWithStats } from '@/lib/updates'
import { transformToCardData } from '@/lib/utils/update-formatting'
import UpdateCard from './UpdateCard'
import UpdateCardSkeleton from './UpdateCardSkeleton'
import { Button } from '@/components/ui/Button'

const logger = createLogger('VirtualizedUpdatesList')

interface VirtualizedUpdatesListProps extends Omit<UpdatesListProps, 'limit'> {
  height?: number
  itemHeight?: number
  overscanCount?: number
  maxItems?: number
}

interface ListItemProps {
  index: number
  style: React.CSSProperties
  data: {
    updates: UpdateCardData[]
    onUpdateClick: (updateId: string) => void
  }
}

const ListItem = memo<ListItemProps>(({ index, style, data }) => {
  const { updates, onUpdateClick } = data
  const update = updates[index]

  if (!update) {
    return (
      <div style={style}>
        <UpdateCardSkeleton />
      </div>
    )
  }

  return (
    <div style={style} className="px-1">
      <UpdateCard
        update={update}
        onClick={onUpdateClick}
        className="mb-4"
      />
    </div>
  )
})

ListItem.displayName = 'ListItem'

/**
 * VirtualizedUpdatesList component for efficiently displaying large lists of updates
 * Uses react-window for performance optimization when dealing with many updates
 */
const VirtualizedUpdatesList = memo<VirtualizedUpdatesListProps>(function VirtualizedUpdatesList({
  showViewAllLink = true,
  className,
  height = 600,
  itemHeight = 200,
  overscanCount = 5,
  maxItems = 1000,
  onCreateUpdate
}) {
  const router = useRouter()
  const [updates, setUpdates] = useState<UpdateCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUpdates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const rawUpdates = await getRecentUpdatesWithStats(maxItems)
      const transformedUpdates = rawUpdates.map((update) =>
        transformToCardData(update as DashboardUpdate)
      )

      setUpdates(transformedUpdates)
    } catch (err) {
      logger.error('Error loading updates:', { error: err })
      setError('Failed to load recent updates')
    } finally {
      setLoading(false)
    }
  }, [maxItems])

  useEffect(() => {
    loadUpdates()
  }, [loadUpdates])

  const handleUpdateClick = useCallback((updateId: string) => {
    router.push(`/dashboard/updates/${updateId}`)
  }, [router])

  const handleRetry = useCallback(() => {
    loadUpdates()
  }, [loadUpdates])

  const handleCreateUpdate = useCallback(() => {
    if (onCreateUpdate) {
      onCreateUpdate('photo')
    } else {
      router.push('/dashboard/create-update')
    }
  }, [onCreateUpdate, router])

  const itemData = useCallback(() => ({
    updates,
    onUpdateClick: handleUpdateClick
  }), [updates, handleUpdateClick])

  // Loading state
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 5 }, (_, index) => (
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
          <Button onClick={handleCreateUpdate}>
            Create Your First Update
          </Button>
        </div>
      </div>
    )
  }

  // Success state with virtualized updates list
  return (
    <div className={cn('space-y-4', className)}>
      <List
        height={height}
        itemCount={updates.length}
        itemSize={itemHeight}
        itemData={itemData()}
        overscanCount={overscanCount}
        className="virtualized-updates-list"
      >
        {ListItem}
      </List>

      {/* View all link */}
      {showViewAllLink && (
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
})

VirtualizedUpdatesList.displayName = 'VirtualizedUpdatesList'

export default VirtualizedUpdatesList
