'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('UpdatesList')
import { useState, useEffect, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import UpdateDetailModal from '@/components/updates/UpdateDetailModal'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { UpdatesListProps, DashboardUpdate, UpdateCardData } from '@/lib/types/dashboard'
import { getRecentUpdatesWithStats } from '@/lib/updates'
import { transformToCardData } from '@/lib/utils/update-formatting'
import UpdateCard from './UpdateCard'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { withErrorBoundary } from '@/components/ui/ErrorBoundary'
import ViewModeToggle, { type ViewMode } from '@/components/dashboard/ViewModeToggle'
import TimelineLayout, { type UpdateForDisplay } from '@/components/dashboard/TimelineLayout'
import StreamLayout from '@/components/dashboard/StreamLayout'
import SummaryModeView from '@/components/dashboard/SummaryModeView'

/**
 * UpdatesList component for displaying recent updates on the dashboard
 */
const UpdatesListComponent = memo<UpdatesListProps>(function UpdatesListComponent({
  limit = 5,
  showViewAllLink = true,
  className,
  onCreateUpdate,
  searchQuery,
  searchFilters
}) {
  const router = useRouter()
  const [updates, setUpdates] = useState<UpdateCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [activeUpdateId, setActiveUpdateId] = useState<string | null>(null)

  const loadUpdates = useCallback(async () => {
    const loadStartTime = Date.now()
    const componentRequestId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      setLoading(true)
      setError(null)

      logger.info('UpdatesList: Starting to load updates', {
        limit,
        searchQuery,
        searchFilters,
        componentRequestId,
        timestamp: new Date().toISOString()
      })

      // Add browser environment debugging
      logger.debug('UpdatesList: Browser environment check', {
        componentRequestId,
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        location: {
          href: window.location.href,
          origin: window.location.origin,
          protocol: window.location.protocol
        },
        localStorage: {
          available: typeof localStorage !== 'undefined',
          supabaseSession: localStorage.getItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token') ? 'Present' : 'Missing'
        }
      })

      const rawUpdates = await getRecentUpdatesWithStats(limit)

      // Defensive null check to prevent "can't access property length" errors
      if (!rawUpdates || !Array.isArray(rawUpdates)) {
        logger.warn('UpdatesList: getRecentUpdatesWithStats returned invalid data', {
          componentRequestId,
          rawUpdates,
          typeof: typeof rawUpdates,
          isArray: Array.isArray(rawUpdates)
        })
        setUpdates([])
        return
      }

      let transformedUpdates = rawUpdates.map((update) =>
        transformToCardData(update as DashboardUpdate)
      )

      // Apply search query filter with additional null check
      if (searchQuery && searchQuery.length >= 2 && transformedUpdates && transformedUpdates.length > 0) {
        const query = searchQuery.toLowerCase()
        transformedUpdates = transformedUpdates.filter(update => {
          // Search in main content
          const contentMatch = update.content.toLowerCase().includes(query)

          // Search in content preview
          const previewMatch = update.contentPreview.toLowerCase().includes(query)

          // Search in subject (for email format)
          const subjectMatch = update.subject?.toLowerCase().includes(query) || false

          // Search in child name
          const childNameMatch = update.child.name.toLowerCase().includes(query)

          // Search in rich content if available
          let richContentMatch = false
          if (update.rich_content) {
            const richContentText = JSON.stringify(update.rich_content).toLowerCase()
            richContentMatch = richContentText.includes(query)
          }

          return contentMatch || previewMatch || subjectMatch || childNameMatch || richContentMatch
        })
      }

      // Apply filters with additional null check
      if (searchFilters && transformedUpdates && transformedUpdates.length > 0) {
        // Content type filter
        if (searchFilters.contentType && searchFilters.contentType !== 'all') {
          transformedUpdates = transformedUpdates.filter(update => {
            if (searchFilters.contentType === 'photo') {
              return update.media_urls.some(url => url.match(/\.(jpg|jpeg|png|gif|webp)$/i))
            } else if (searchFilters.contentType === 'video') {
              return update.media_urls.some(url => url.match(/\.(mp4|mov|avi|webm)$/i))
            } else if (searchFilters.contentType === 'milestone') {
              return !!update.milestone_type
            } else if (searchFilters.contentType === 'text') {
              return update.media_urls.length === 0
            }
            return true
          })
        }

        // Content format filter (new functionality)
        if (searchFilters.contentFormat && searchFilters.contentFormat !== 'all') {
          transformedUpdates = transformedUpdates.filter(update =>
            update.content_format === searchFilters.contentFormat
          )
        }

        // Date range filter
        if (searchFilters.dateRange) {
          const dateRange = searchFilters.dateRange as { start?: Date; end?: Date }
          const { start, end } = dateRange
          transformedUpdates = transformedUpdates.filter(update => {
            const updateDate = new Date(update.createdAt)
            if (start && updateDate < start) return false
            if (end && updateDate > end) return false
            return true
          })
        }

        // Child filter
        if (searchFilters.childId) {
          transformedUpdates = transformedUpdates.filter(update =>
            update.child_id === searchFilters.childId
          )
        }
      }

      // Final null safety check before setting updates
      setUpdates(transformedUpdates || [])
    } catch (err) {
      const loadEndTime = Date.now()
      const loadDuration = loadEndTime - loadStartTime

      // Capture comprehensive error details with enhanced debugging
      const errRecord = err as Record<string, unknown>
      const errorDetails = {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined,
        code: errRecord?.code,
        details: errRecord?.details,
        hint: errRecord?.hint,
        statusCode: typeof errRecord?.statusCode === 'number' ? errRecord.statusCode : undefined,
        status: errRecord?.status,
        statusText: errRecord?.statusText,
        headers: errRecord?.headers,
        response: errRecord?.response,
        request: errRecord?.request,
        config: errRecord?.config,
        cause: errRecord?.cause,
        fullError: err
      }

      // Network and browser context
      const navConnection = (navigator as unknown as { connection?: { effectiveType?: string } }).connection
      const contextInfo = {
        loadDuration,
        browserOnline: navigator.onLine,
        connectionType: navConnection?.effectiveType || 'unknown',
        referrer: document.referrer,
        userAgent: navigator.userAgent.substring(0, 100),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        timestamp: new Date().toISOString()
      }

      logger.error('UpdatesList: Critical error loading updates', {
        componentRequestId,
        error: errorDetails,
        context: contextInfo,
        component: 'UpdatesList',
        operation: 'loadUpdates',
        parameters: {
          limit,
          searchQuery,
          searchFilters
        }
      })

      // Enhanced error classification and user messaging
      let userMessage = 'Failed to load recent updates'
      let errorCategory = 'unknown'

      if (errorDetails.code === 'PGRST301' || errorDetails.statusCode === 406) {
        userMessage = 'Access denied - there may be a permission issue with your account. Please try logging out and back in.'
        errorCategory = 'permission_denied'
      } else if (errorDetails.message?.includes('Not authenticated') || errorDetails.message?.includes('no user session')) {
        userMessage = 'Your session has expired. Please log in again to view your updates.'
        errorCategory = 'authentication_required'
      } else if (errorDetails.message?.includes('Network') || !navigator.onLine) {
        userMessage = 'Network error - please check your internet connection and try again.'
        errorCategory = 'network_error'
      } else if (errorDetails.statusCode && errorDetails.statusCode >= 500) {
        userMessage = 'Server error - our team has been notified. Please try again in a few minutes.'
        errorCategory = 'server_error'
      } else if (errorDetails.statusCode === 429) {
        userMessage = 'Too many requests - please wait a moment and try again.'
        errorCategory = 'rate_limited'
      } else if (errorDetails.message?.includes('CORS')) {
        userMessage = 'Configuration error - please contact support if this persists.'
        errorCategory = 'cors_error'
      } else if (loadDuration > 30000) {
        userMessage = 'Request timed out - please check your connection and try again.'
        errorCategory = 'timeout'
      }

      // Log the error category for analytics
      logger.info('UpdatesList: Error categorized for user feedback', {
        componentRequestId,
        errorCategory,
        userMessage,
        originalError: errorDetails.code || errorDetails.name
      })

      setError(userMessage)
    } finally {
      setLoading(false)
    }
  }, [limit, searchQuery, searchFilters])

  useEffect(() => {
    loadUpdates()
  }, [loadUpdates])

  const handleUpdateClick = useCallback((updateId: string) => {
    setActiveUpdateId(updateId)
  }, [])

  const handleRetry = useCallback(() => {
    logger.info('UpdatesList: User initiated retry', {
      timestamp: new Date().toISOString(),
      previousError: error,
      retryNumber: 'manual'
    })
    loadUpdates()
  }, [loadUpdates, error])

  const handleCreateUpdate = useCallback(() => {
    if (onCreateUpdate) {
      onCreateUpdate('photo')
    } else {
      router.push('/dashboard/create-memory')
    }
  }, [onCreateUpdate, router])

  // Transform UpdateCardData to UpdateForDisplay format for layout components
  const transformToUpdateFormat = useCallback((cardData: UpdateCardData): UpdateForDisplay => ({
    id: cardData.id,
    parent_id: '',
    child_id: cardData.child_id,
    content: cardData.content,
    subject: cardData.subject,
    rich_content: cardData.rich_content || undefined,
    content_format: cardData.content_format as 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp' | undefined,
    media_urls: cardData.media_urls,
    milestone_type: cardData.milestone_type as 'first_smile' | 'rolling' | 'sitting' | 'crawling' | 'first_steps' | 'first_words' | 'first_tooth' | 'walking' | 'potty_training' | 'first_day_school' | 'birthday' | 'other' | undefined,
    ai_analysis: null,
    suggested_recipients: null,
    confirmed_recipients: null,
    distribution_status: 'sent' as const,
    created_at: new Date(cardData.createdAt).toISOString(),
    child_name: cardData.child.name,
    child_avatar: cardData.child.avatar || null,
    response_count: cardData.responseCount || 0
  }), [])

  // Loading state
  if (loading) {
    return (
      <LoadingState
        type="skeleton"
        variant="timeline-card"
        className={className}
        skeletonOptions={{ count: limit }}
      />
    )
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Unable to Load Memories"
        message={error}
        onRetry={handleRetry}
        className={className}
      />
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
            {"You haven't created any memories recently. Share your first memory to get started!"}
          </p>
          <Button onClick={handleCreateUpdate}>
            Create Your First Memory
          </Button>
        </div>
      </div>
    )
  }

  // Success state with updates
  const updatesForLayout = updates.map(transformToUpdateFormat)

  return (
    <div className={cn('space-y-4', className)}>
      {/* View mode toggle */}
      <div className="flex justify-end mb-4">
        <ViewModeToggle currentMode={viewMode} onChange={setViewMode} />
      </div>

      {/* Render based on view mode */}
      {viewMode === 'cards' && (
        <>
          {updates.map((update) => (
            <UpdateCard
              key={update.id}
              update={update}
              onClick={handleUpdateClick}
            />
          ))}
        </>
      )}

      {viewMode === 'timeline' && (
        <TimelineLayout
          updates={updatesForLayout}
          onLike={(updateId) => logger.info('Like clicked', { updateId })}
          onComment={(updateId) => router.push(`/dashboard/memories/${updateId}`)}
        />
      )}

      {viewMode === 'stream' && (
        <StreamLayout
          updates={updatesForLayout}
          onLike={(updateId) => logger.info('Like clicked', { updateId })}
          onComment={(updateId) => router.push(`/dashboard/memories/${updateId}`)}
        />
      )}

      {viewMode === 'digest' && (
        <SummaryModeView updates={updatesForLayout} />
      )}

      {/* View all link */}
      {showViewAllLink && updates.length >= limit && (
        <div className="pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/memories"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all memories
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
      <UpdateDetailModal
        open={!!activeUpdateId}
        updateId={activeUpdateId || ''}
        onClose={() => setActiveUpdateId(null)}
      />
    </div>
  )
})

UpdatesListComponent.displayName = 'UpdatesListComponent'

// Wrap with error boundary for production resilience
const UpdatesList = withErrorBoundary(UpdatesListComponent, {
  isolate: true,
  onError: (error, errorInfo) => {
    logger.error('UpdatesList error boundary caught error', { error, errorInfo })
  }
})

export default UpdatesList
