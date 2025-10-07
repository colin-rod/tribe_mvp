'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('MemoryList')
import { useState, useEffect, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import MemoryDetailModal from '@/components/memories/MemoryDetailModal'
import { cn } from '@/lib/utils'
import { getRecentMemoriesWithStats, getNewMemoriesCount } from '@/lib/memories'
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
  const router = useRouter()
  const [memories, setMemories] = useState<MemoryCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null)
  const [newMemoriesCount, setNewMemoriesCount] = useState(0)

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

      const rawMemories = await getRecentMemoriesWithStats(limit)

      // Defensive null check
      if (!rawMemories || !Array.isArray(rawMemories)) {
        logger.warn('MemoryList: getRecentMemoriesWithStats returned invalid data', {
          componentRequestId,
          rawMemories,
          typeof: typeof rawMemories,
          isArray: Array.isArray(rawMemories)
        })
        setMemories([])
        return
      }

      // Transform to card data
      let transformedMemories: MemoryCardData[] = rawMemories.map((memory) => ({
        id: memory.id,
        child: {
          id: memory.child_id,
          name: memory.children?.name || 'Unknown',
          age: calculateAge(memory.children?.birth_date),
          avatar: memory.children?.profile_photo_url
        },
        content: memory.content || '',
        subject: memory.subject,
        rich_content: memory.rich_content as Record<string, unknown> | undefined,
        content_format: memory.content_format,
        contentPreview: getContentPreview(memory.content, memory.subject),
        media_urls: memory.media_urls || [],
        distributionStatus: memory.distribution_status,
        isNew: memory.is_new,
        captureChannel: memory.capture_channel,
        timeAgo: formatTimeAgo(memory.created_at),
        createdAt: memory.created_at || '',
        responseCount: memory.response_count || 0,
        hasUnreadResponses: memory.has_unread_responses || false,
        likeCount: memory.like_count || 0,
        commentCount: memory.comment_count || 0,
        isLiked: memory.isLiked || false
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

      // Load new memories count for badge
      const count = await getNewMemoriesCount()
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
        retry={loadMemories}
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
        <p className="text-sm text-neutral-500">No memories found for "{searchQuery}"</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with new memories count */}
      {newMemoriesCount > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <MemoryCountBadge count={newMemoriesCount} />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {newMemoriesCount === 1 ? '1 new memory' : `${newMemoriesCount} new memories`}
              </p>
              <p className="text-xs text-blue-700">
                Review and mark as ready for compilation
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Memory cards */}
      <div className="space-y-4">
        {memories.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            onClick={handleMemoryClick}
          />
        ))}
      </div>

      {/* Detail modal */}
      {activeMemoryId && (
        <MemoryDetailModal
          memoryId={activeMemoryId}
          isOpen={!!activeMemoryId}
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
  fallback: <ErrorState message="Failed to load memory list" />,
})

export default MemoryList
