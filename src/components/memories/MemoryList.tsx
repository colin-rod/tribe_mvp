'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('MemoryList')
import { useState, useEffect, useCallback, memo } from 'react'
import MemoryDetailModal from '@/components/memories/MemoryDetailModal'
import { cn } from '@/lib/utils'
import { getRecentMemoriesWithStats } from '@/lib/memories'
import MemoryCard from './MemoryCard'
import { MemoryCountBadge } from './MemoryBadge'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { withErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { MemoryCardData } from '@/lib/types/memory'

interface MemoryListProps {
  limit?: number
  showCreateButton?: boolean
  className?: string
  onCreateMemory?: () => void
  searchQuery?: string
}

/**
 * MemoryList component for displaying recent memories on the dashboard
 */
const MemoryListComponent = memo<MemoryListProps>(function MemoryListComponent({
  limit = 5,
  showCreateButton = true,
  className,
  onCreateMemory,
  searchQuery
}) {
  const [memories, setMemories] = useState<MemoryCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null)
  const [newMemoriesCount, setNewMemoriesCount] = useState(0)
  const [showingNewOnly, setShowingNewOnly] = useState(false)

  const loadMemories = useCallback(async () => {
    const loadStartTime = Date.now()
    const componentRequestId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      setLoading(true)
      setError(null)

      logger.info('MemoryList: Starting to load memories', {
        limit,
        searchQuery,
        componentRequestId,
        timestamp: new Date().toISOString()
      })

      const result = await getRecentMemoriesWithStats(limit)

      // Defensive null check
      if (!result || !Array.isArray(result.memories)) {
        logger.warn('MemoryList: getRecentMemoriesWithStats returned invalid data', {
          componentRequestId,
          result,
          typeof: typeof result,
          isArray: Array.isArray(result?.memories)
        })
        setMemories([])
        setNewMemoriesCount(0)
        return
      }

      // Transform to card data
      let transformedMemories: MemoryCardData[] = result.memories.map((memory) => ({
        id: memory.id,
        child: {
          id: memory.child_id,
          name: memory.children?.name || 'Unknown',
          age: calculateAge(memory.children?.birth_date),
          avatar: memory.children?.profile_photo_url ?? undefined
        },
        content: memory.content || '',
        subject: memory.subject ?? null,
        rich_content: (memory.rich_content as Record<string, unknown> | null) ?? null,
        content_format: memory.content_format ?? null,
        contentPreview: getContentPreview(memory.content, memory.subject),
        media_urls: memory.media_urls ?? [],
        distributionStatus: (memory.distribution_status ?? 'new') as MemoryCardData['distributionStatus'],
        isNew: Boolean(memory.is_new),
        captureChannel: (memory.capture_channel ?? 'web') as MemoryCardData['captureChannel'],
        timeAgo: formatTimeAgo(memory.created_at),
        responseCount: memory.response_count ?? 0,
        hasUnreadResponses: memory.has_unread_responses ?? false,
        likeCount: memory.like_count ?? 0,
        commentCount: memory.comment_count ?? 0,
        isLiked: memory.isLiked ?? false
      }))

      // Apply search query filter
      if (searchQuery && searchQuery.length >= 2) {
        const query = searchQuery.toLowerCase()
        transformedMemories = transformedMemories.filter(memory => {
          const contentMatch = memory.content.toLowerCase().includes(query)
          const previewMatch = memory.contentPreview.toLowerCase().includes(query)
          const subjectMatch = memory.subject?.toLowerCase().includes(query) || false
          const childNameMatch = memory.child.name.toLowerCase().includes(query)

          return contentMatch || previewMatch || subjectMatch || childNameMatch
        })
      }

      setMemories(transformedMemories)
      const count = result.newMemoriesCount ?? 0
      setNewMemoriesCount(count)

      const loadEndTime = Date.now()
      logger.info('MemoryList: Successfully loaded memories', {
        componentRequestId,
        count: transformedMemories.length,
        newCount: count,
        duration: loadEndTime - loadStartTime,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      logger.error('MemoryList: Error loading memories', {
        componentRequestId,
        error: err instanceof Error ? {
          message: err.message,
          name: err.name,
          stack: err.stack
        } : err,
        timestamp: new Date().toISOString()
      })

      setError(err instanceof Error ? err.message : 'Failed to load memories')
      setMemories([])
    } finally {
      setLoading(false)
    }
  }, [limit, searchQuery])

  useEffect(() => {
    loadMemories()
  }, [loadMemories])

  useEffect(() => {
    if (newMemoriesCount === 0 && showingNewOnly) {
      setShowingNewOnly(false)
    }
  }, [newMemoriesCount, showingNewOnly])

  const handleNewBadgeClick = useCallback(() => {
    if (newMemoriesCount > 0) {
      setShowingNewOnly(true)
    }
  }, [newMemoriesCount])

  const handleClearFilter = useCallback(() => {
    setShowingNewOnly(false)
  }, [])

  // Handle memory click - open detail modal
  const handleMemoryClick = useCallback((memoryId: string) => {
    setActiveMemoryId(memoryId)
  }, [])

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setActiveMemoryId(null)
    // Reload memories to get updated status/badges
    loadMemories()
  }, [loadMemories])

  if (loading) {
    return <LoadingState message="Loading memories..." className={className} />
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={loadMemories}
        className={className}
      />
    )
  }

  if (memories.length === 0 && !searchQuery) {
    return (
      <div className={cn('text-center py-12', className)}>
        <svg
          className="mx-auto h-12 w-12 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-neutral-900">No memories yet</h3>
        <p className="mt-1 text-sm text-neutral-500">Get started by creating your first memory.</p>
        {showCreateButton && onCreateMemory && (
          <div className="mt-6">
            <Button onClick={onCreateMemory}>
              Create Memory
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (memories.length === 0 && searchQuery) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-sm text-neutral-500">No memories found for &quot;{searchQuery}&quot;</p>
      </div>
    )
  }

  const filteredMemories = showingNewOnly
    ? memories.filter(memory => memory.isNew)
    : memories

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with new memories count */}
      {newMemoriesCount > 0 && (
        <button
          type="button"
          onClick={handleNewBadgeClick}
          className={cn(
            'flex w-full items-center justify-between p-4 border rounded-lg transition-colors',
            showingNewOnly
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100 focus:bg-blue-100'
          )}
          aria-pressed={showingNewOnly}
          aria-label="Show only new memories"
        >
          <div className="flex items-center space-x-3">
            <MemoryCountBadge count={newMemoriesCount} />
            <div className="text-left">
              <p className="text-sm font-medium">
                {newMemoriesCount === 1 ? '1 new memory' : `${newMemoriesCount} new memories`}
              </p>
              <p className="text-xs">
                Review and mark as ready for compilation
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold underline">
            {showingNewOnly ? 'Filter active' : 'Show only new'}
          </span>
        </button>
      )}

      {showingNewOnly && (
        <div className="flex items-center justify-between p-3 bg-blue-100 border border-blue-200 rounded-lg text-blue-900">
          <span className="text-sm font-medium">Showing only new memories</span>
          <button
            type="button"
            onClick={handleClearFilter}
            className="text-xs font-semibold underline hover:text-blue-800"
          >
            Show all activity
          </button>
        </div>
      )}

      {/* Memory cards */}
      {filteredMemories.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-blue-200 rounded-lg bg-blue-50 text-blue-700">
          <p className="text-sm font-medium">All caught up! No new memories to review.</p>
          <button
            type="button"
            onClick={handleClearFilter}
            className="mt-2 text-xs font-semibold underline"
          >
            Show all activity
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onClick={handleMemoryClick}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {activeMemoryId && (
        <MemoryDetailModal
          memoryId={activeMemoryId}
          open={!!activeMemoryId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
})

// Helper functions
function calculateAge(birthDate?: string): string {
  if (!birthDate) return 'Unknown age'

  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())

  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''}`
  }

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`
  }

  return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
}

function getContentPreview(content: string | null, subject?: string | null): string {
  if (subject) {
    return `${subject}: ${(content || '').substring(0, 100)}...`
  }
  return (content || '').substring(0, 150) + (content && content.length > 150 ? '...' : '')
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Unknown'

  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}

const MemoryList = withErrorBoundary(MemoryListComponent, {
  fallback: ({ retry }) => (
    <ErrorState
      message="Failed to load memory list"
      onRetry={retry}
    />
  ),
})

export default MemoryList
