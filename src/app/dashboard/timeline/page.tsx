'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import Navigation from '@/components/layout/Navigation'
import Timeline from '@/components/timeline/Timeline'
import PersonalizedWelcome from '@/components/dashboard/PersonalizedWelcome'
import EnhancedEmptyState from '@/components/ui/EnhancedEmptyState'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { TimelineSkeleton } from '@/components/ui/SkeletonLoader'
import { useCreateUpdateModal } from '@/hooks/useCreateUpdateModal'
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring'
import AdvancedFilters from '@/components/dashboard/AdvancedFilters'
import EnhancedSplitButton from '@/components/dashboard/EnhancedSplitButton'
import { getUpdates } from '@/lib/updates'
import { initializeDashboardAnalytics, trackDashboardInteraction } from '@/lib/analytics/dashboard-analytics'
import { initializeDashboardFeatureFlags, useFeatureFlag, isFeatureEnabled } from '@/lib/feature-flags/dashboard-flags'
import { getTimelineCache } from '@/lib/cache/timeline-cache'
import type { UpdateType } from '@/components/updates/CreateUpdateModal'
import type { FilterPreset } from '@/components/dashboard/AdvancedFilters'
import type { SplitButtonOption } from '@/components/dashboard/EnhancedSplitButton'
import type { SearchFilters } from '@/hooks/useSearchDebounced'

const logger = createLogger('TimelinePage')

interface UserStats {
  totalUpdates: number
  daysSinceStart: number
  lastUpdateAt?: Date
}

const TimelinePage = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [userStats, setUserStats] = useState<UserStats>({
    totalUpdates: 0,
    daysSinceStart: 1
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({})
  const [selectedUpdates, setSelectedUpdates] = useState<string[]>([])

  // Initialize Phase 3 features
  const analytics = useMemo(() => initializeDashboardAnalytics(), [])
  const featureFlags = useMemo(() => initializeDashboardFeatureFlags(), [])
  const cache = getTimelineCache()

  // Feature flag evaluations
  const advancedFiltersFlag = useFeatureFlag('advanced_filters')
  const enhancedSplitButtonFlag = useFeatureFlag('enhanced_split_button')
  const performanceMonitoringFlag = useFeatureFlag('performance_monitoring')

  // Performance monitoring
  const {
    isMonitoring,
    currentMetrics,
    alerts,
    performanceScore,
    recommendations,
    startMonitoring,
    measureTimelineRender,
    updateCacheStats
  } = usePerformanceMonitoring({
    enableRealTimeMonitoring: performanceMonitoringFlag.enabled,
    enableAlerts: true,
    enableAutoOptimization: true,
    thresholds: {
      timelineRenderTime: 100,
      searchResponseTime: 300,
      imageLoadTime: 2000
    }
  })

  // Load dashboard stats with performance monitoring
  const loadDashboardStats = useCallback(async () => {
    if (!user) return

    const endMeasure = measureTimelineRender()

    try {
      setLoadingStats(true)
      setError(null)

      // Check cache first
      const cacheKey = `user_stats_${user.id}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        updateCacheStats(1, 0) // Cache hit
        setUserStats(cached)
        setLoadingStats(false)
        endMeasure()
        return
      }

      const updates = await getUpdates()

      // Calculate user stats
      const totalUpdates = updates.length
      const userCreatedAt = new Date(user.created_at || Date.now())
      const daysSinceStart = Math.max(1, Math.floor(
        (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
      ))

      // Find most recent update
      const lastUpdate = updates.length > 0
        ? new Date(Math.max(...updates.map(u => new Date(u.created_at).getTime())))
        : undefined

      const stats = {
        totalUpdates,
        daysSinceStart,
        lastUpdateAt: lastUpdate
      }

      setUserStats(stats)

      // Cache the results
      await cache.set(cacheKey, stats, 5 * 60 * 1000) // 5 minutes
      updateCacheStats(0, 1) // Cache miss

      trackDashboardInteraction({
        type: 'view_update',
        element: 'dashboard-stats-loaded',
        metadata: { totalUpdates, daysSinceStart }
      })

    } catch (err) {
      logger.error('Error loading dashboard stats:', err as any)
      setError('Failed to load dashboard data')
      trackDashboardInteraction({
        type: 'performance_event',
        element: 'dashboard-stats-error',
        metadata: { error: err instanceof Error ? err.message : 'Unknown error' }
      })
    } finally {
      setLoadingStats(false)
      endMeasure()
    }
  }, [user, cache, measureTimelineRender, updateCacheStats])

  const {
    openCreateUpdateModal,
    createUpdateModal
  } = useCreateUpdateModal({
    onUpdateSent: loadDashboardStats,
    onUpdateScheduled: loadDashboardStats
  })

  // Enhanced split button options
  const splitButtonOptions: SplitButtonOption[] = useMemo(() => [
    {
      id: 'photo',
      label: 'Photo Update',
      description: 'Share a photo with family and friends',
      shortcut: 'P',
      isPrimary: true,
      category: 'media',
      action: () => {
        trackDashboardInteraction({
          type: 'create_update',
          element: 'split-button-photo'
        })
        openCreateUpdateModal('photo')
      }
    },
    {
      id: 'milestone',
      label: 'Milestone',
      description: 'Record a special achievement or moment',
      shortcut: 'M',
      category: 'special',
      action: () => {
        trackDashboardInteraction({
          type: 'create_update',
          element: 'split-button-milestone'
        })
        openCreateUpdateModal('milestone')
      }
    },
    {
      id: 'video',
      label: 'Video Update',
      description: 'Share a video moment',
      shortcut: 'V',
      category: 'media',
      action: () => {
        trackDashboardInteraction({
          type: 'create_update',
          element: 'split-button-video'
        })
        openCreateUpdateModal('video')
      }
    },
    {
      id: 'text',
      label: 'Text Update',
      description: 'Share a quick text update',
      shortcut: 'T',
      category: 'basic',
      action: () => {
        trackDashboardInteraction({
          type: 'create_update',
          element: 'split-button-text'
        })
        openCreateUpdateModal('text')
      }
    }
  ], [openCreateUpdateModal])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && !loading) {
      loadDashboardStats()
    }
  }, [user, loading, loadDashboardStats])

  // Handle create update with analytics
  const handleCreateUpdate = useCallback((type: UpdateType = 'photo') => {
    trackDashboardInteraction({
      type: 'create_update',
      element: `create-update-${type}`,
      metadata: { updateType: type }
    })
    openCreateUpdateModal(type)
  }, [openCreateUpdateModal])

  // Handle filter changes
  const handleFiltersChange = useCallback((filters: SearchFilters) => {
    setActiveFilters(filters)
    trackDashboardInteraction({
      type: 'filter',
      element: 'advanced-filters',
      metadata: { filters }
    })
  }, [])

  // Handle preset save
  const handlePresetSave = useCallback((preset: Omit<FilterPreset, 'id'>) => {
    trackDashboardInteraction({
      type: 'preset_usage',
      element: 'filter-preset-saved',
      metadata: { presetName: preset.name }
    })
  }, [])

  // Handle preset load
  const handlePresetLoad = useCallback((preset: FilterPreset) => {
    trackDashboardInteraction({
      type: 'preset_usage',
      element: 'filter-preset-loaded',
      metadata: { presetId: preset.id, presetName: preset.name }
    })
  }, [])

  // Handle bulk actions
  const handleBulkAction = useCallback(async (actionId: string, selectedIds: string[]) => {
    trackDashboardInteraction({
      type: 'bulk_action',
      element: `bulk-action-${actionId}`,
      metadata: { actionId, itemCount: selectedIds.length }
    })

    // Implementation would depend on the specific action
    switch (actionId) {
      case 'delete':
        // Handle bulk delete
        break
      case 'export':
        // Handle bulk export
        break
      case 'archive':
        // Handle bulk archive
        break
    }

    setSelectedUpdates([])
  }, [])

  // Handle update click with analytics
  const handleUpdateClick = useCallback((updateId: string) => {
    if (updateId === 'new') {
      handleCreateUpdate('photo')
    } else {
      trackDashboardInteraction({
        type: 'view_update',
        element: 'timeline-update-click',
        elementId: updateId
      })
      router.push(`/dashboard/updates/${updateId}`)
    }
  }, [router, handleCreateUpdate])

  // Initialize analytics and feature flags
  useEffect(() => {
    if (user && analytics && featureFlags) {
      analytics.setUserId(user.id)
      featureFlags.setUserContext({
        userId: user.id,
        email: user.email || undefined,
        properties: {
          accountAge: Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          totalUpdates: userStats.totalUpdates
        }
      })
    }
  }, [user, analytics, featureFlags, userStats.totalUpdates])

  // Start performance monitoring
  useEffect(() => {
    if (performanceMonitoringFlag.enabled && !isMonitoring) {
      startMonitoring()
    }
  }, [performanceMonitoringFlag.enabled, isMonitoring, startMonitoring])

  // Loading state
  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation onCreateUpdate={handleCreateUpdate} />
        <main className="pb-20 md:pb-8">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto pt-6">
              <TimelineSkeleton count={6} compact={false} />
            </div>
          </div>
        </main>
        {createUpdateModal}
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return null
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation onCreateUpdate={handleCreateUpdate} />
        <main className="pb-20 md:pb-8">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto pt-6">
              <EnhancedEmptyState
                type="no-updates"
                title="Timeline Unavailable"
                description="We couldn't load your timeline right now. Please try again."
                actionLabel="Retry"
                onAction={loadDashboardStats}
              />
            </div>
          </div>
        </main>
        {createUpdateModal}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation
        onCreateUpdate={enhancedSplitButtonFlag.enabled ? undefined : handleCreateUpdate}
        customActions={enhancedSplitButtonFlag.enabled ? (
          <EnhancedSplitButton
            options={splitButtonOptions}
            buttonText="Create Update"
            showAnalytics={true}
            showRecentOptions={true}
            showKeyboardShortcuts={true}
            onOptionSelect={(option) => {
              trackDashboardInteraction({
                type: 'create_update',
                element: 'enhanced-split-button',
                metadata: { optionId: option.id }
              })
            }}
          />
        ) : undefined}
      />

      <main className="pb-20 md:pb-8">
        <ErrorBoundary>
          {/* Performance Alerts */}
          {performanceMonitoringFlag.enabled && alerts.length > 0 && (
            <div className="px-4 sm:px-6 lg:px-8 pt-4">
              <div className="max-w-4xl mx-auto">
                {alerts.slice(0, 2).map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'mb-2 p-3 rounded-md border-l-4 text-sm',
                      alert.type === 'error' ? 'bg-red-50 border-red-400 text-red-700' :
                      alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-700' :
                      'bg-blue-50 border-blue-400 text-blue-700'
                    )}
                  >
                    <div className="font-medium">{alert.message}</div>
                    {alert.suggestion && (
                      <div className="mt-1 text-xs opacity-75">{alert.suggestion}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personalized Welcome Section */}
          <PersonalizedWelcome
            userName={user?.user_metadata?.name || user?.email?.split('@')[0]}
            lastUpdateAt={userStats.lastUpdateAt}
            updateCount={userStats.totalUpdates}
            daysSinceStart={userStats.daysSinceStart}
            onCreateUpdate={handleCreateUpdate}
            onDismissReminder={(reminderId) => {
              logger.info('Reminder dismissed:', { reminderId })
              trackDashboardInteraction({
                type: 'view_update',
                element: 'reminder-dismissed',
                metadata: { reminderId }
              })
            }}
            className="mb-0"
          />

          {/* Timeline Section */}
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              {/* Advanced Filters */}
              {advancedFiltersFlag.enabled && userStats.totalUpdates > 0 && (
                <div className="mb-4 -mt-2">
                  <AdvancedFilters
                    filters={activeFilters}
                    onFiltersChange={handleFiltersChange}
                    onPresetSave={handlePresetSave}
                    onPresetLoad={handlePresetLoad}
                    onPresetDelete={(presetId) => {
                      trackDashboardInteraction({
                        type: 'preset_usage',
                        element: 'filter-preset-deleted',
                        metadata: { presetId }
                      })
                    }}
                    selectedItems={selectedUpdates}
                    onBulkAction={handleBulkAction}
                    showBulkActions={selectedUpdates.length > 0}
                    showPresets={true}
                    showHistory={true}
                    totalCount={userStats.totalUpdates}
                    filteredCount={userStats.totalUpdates} // This would be calculated based on active filters
                  />
                </div>
              )}

              <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden relative z-10">
                <ErrorBoundary isolate>
                  {userStats.totalUpdates === 0 ? (
                    <div className="p-6">
                      <EnhancedEmptyState
                        type="no-updates"
                        onAction={() => handleCreateUpdate('photo')}
                        showTemplates={true}
                        showComparison={false}
                        userStats={userStats}
                      />
                    </div>
                  ) : (
                    <Timeline
                      onUpdateClick={handleUpdateClick}
                      showSearch={!advancedFiltersFlag.enabled}
                      showStats={true}
                      height={Math.min(800, typeof window !== 'undefined' ? window.innerHeight - 400 : 800)}
                      pageSize={20}
                      compact={false}
                      filters={advancedFiltersFlag.enabled ? activeFilters : undefined}
                      onSelectionChange={setSelectedUpdates}
                      enableProgressiveImages={isFeatureEnabled('progressive_images')}
                      enableSmartCaching={isFeatureEnabled('advanced_caching')}
                    />
                  )}
                </ErrorBoundary>
              </div>

              {/* Performance Dashboard (Development/Debug) */}
              {process.env.NODE_ENV === 'development' && performanceMonitoringFlag.enabled && (
                <div className="mt-4 p-4 bg-gray-900 text-white rounded-lg text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Performance Dashboard</h3>
                    <div className={cn(
                      'px-2 py-1 rounded text-xs',
                      performanceScore >= 90 ? 'bg-green-600' :
                      performanceScore >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                    )}>
                      Score: {performanceScore}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-gray-400">Timeline Render</div>
                      <div>{Math.round(currentMetrics.timelineRenderTime)}ms</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Search Response</div>
                      <div>{Math.round(currentMetrics.searchResponseTime)}ms</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Cache Hit Rate</div>
                      <div>{Math.round(currentMetrics.cacheHitRate * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-400">FPS</div>
                      <div>{currentMetrics.fps}</div>
                    </div>
                  </div>
                  {recommendations.length > 0 && (
                    <div className="mt-3">
                      <div className="text-gray-400 mb-1">Recommendations:</div>
                      <ul className="text-xs space-y-1">
                        {recommendations.slice(0, 3).map((rec, index) => (
                          <li key={index} className="text-gray-300">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ErrorBoundary>
      </main>

      {createUpdateModal}
    </div>
  )
}

export default TimelinePage
