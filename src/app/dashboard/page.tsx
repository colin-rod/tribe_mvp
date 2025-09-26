'use client'

import { useEffect, useState, memo, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createLogger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { getChildren } from '@/lib/children'
import { getRecipientStats } from '@/lib/recipients'
import { getGroupStats } from '@/lib/recipient-groups'
import { getUpdates } from '@/lib/updates'
import { needsOnboarding } from '@/lib/onboarding'
import Navigation from '@/components/layout/Navigation'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { UserPlusIcon, UserGroupIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { UpdatesList } from '@/components/updates'
import { PromptFeed } from '@/components/lazy'
import DashboardHero from '@/components/dashboard/DashboardHero'
import PersonalizedWelcome from '@/components/dashboard/PersonalizedWelcome'
import EnhancedOnboardingProgress from '@/components/dashboard/EnhancedOnboardingProgress'
import EmptyTimelineState from '@/components/dashboard/EmptyTimelineState'
import { useCreateUpdateModal } from '@/hooks/useCreateUpdateModal'
import type { UpdateType } from '@/components/updates/CreateUpdateModal'

const logger = createLogger('DashboardPage')

const DashboardPage = memo(function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [childrenCount, setChildrenCount] = useState(0)
  const [recipientStats, setRecipientStats] = useState({ total: 0, active: 0, groups: 0 })
  const [updatesCreated, setUpdatesCreated] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)
  const [showOnboardingProgress, setShowOnboardingProgress] = useState(true)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [lastUpdateAt, setLastUpdateAt] = useState<Date | undefined>(undefined)
  const [daysSinceStart, setDaysSinceStart] = useState(1)

  // Mock onboarding steps - replace with real data
  const onboardingSteps = useMemo(() => [
    {
      id: 'add-child',
      title: 'Add Your First Child',
      description: 'Tell us about your little one to personalize your updates',
      icon: UserPlusIcon,
      estimatedTimeMinutes: 3,
      isRequired: true,
      isCompleted: childrenCount > 0,
      isSkipped: false,
      isCurrent: childrenCount === 0,
      completedAt: childrenCount > 0 ? new Date() : undefined,
    },
    {
      id: 'invite-recipients',
      title: 'Invite Family & Friends',
      description: 'Add recipients who will receive your updates',
      icon: UserGroupIcon,
      estimatedTimeMinutes: 5,
      isRequired: true,
      isCompleted: recipientStats.total > 0,
      isSkipped: false,
      isCurrent: childrenCount > 0 && recipientStats.total === 0,
      completedAt: recipientStats.total > 0 ? new Date() : undefined,
    },
    {
      id: 'create-first-update',
      title: 'Share Your First Update',
      description: 'Create and send your first update to your family',
      icon: SparklesIcon,
      estimatedTimeMinutes: 2,
      isRequired: true,
      isCompleted: updatesCreated > 0,
      isSkipped: false,
      isCurrent: childrenCount > 0 && recipientStats.total > 0 && updatesCreated === 0,
      completedAt: updatesCreated > 0 ? new Date() : undefined,
    },
  ], [childrenCount, recipientStats.total, updatesCreated])

  useEffect(() => {
    // Redirect to login if not authenticated after loading is complete
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const checkOnboardingStatus = useCallback(async () => {
    try {
      const needsOnboard = await needsOnboarding()
      if (needsOnboard) {
        router.push('/onboarding')
      }
    } catch (error) {
      logger.errorWithStack('Error checking onboarding status:', error as Error)
    }
  }, [router])

  const loadDashboardStats = useCallback(async () => {
    try {
      setLoadingStats(true)

      // Load all stats in parallel
      const [children, recipientStatsData, groupStatsData, updates] = await Promise.all([
        getChildren(),
        getRecipientStats(),
        getGroupStats(),
        getUpdates()
      ])

      setChildrenCount(children.length)
      setRecipientStats({
        total: recipientStatsData.totalRecipients,
        active: recipientStatsData.activeRecipients,
        groups: groupStatsData.totalGroups
      })

      // Count all updates (since sending functionality isn't implemented yet)
      const totalUpdates = updates.length
      setUpdatesCreated(totalUpdates)

      // Calculate user stats for PersonalizedWelcome
      if (user) {
        const userCreatedAt = new Date(user.created_at || Date.now())
        const daysSinceStartValue = Math.max(1, Math.floor(
          (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
        ))
        setDaysSinceStart(daysSinceStartValue)

        // Find most recent update
        if (updates.length > 0) {
          const mostRecent = updates.reduce((latest, current) =>
            new Date(current.created_at).getTime() > new Date(latest.created_at).getTime()
              ? current
              : latest
          )
          setLastUpdateAt(new Date(mostRecent.created_at))
        }
      }

      // Check if onboarding is complete
      const completedSteps = onboardingSteps.filter(step => step.isCompleted).length
      setHasCompletedOnboarding(completedSteps === onboardingSteps.length)
    } catch (error) {
      logger.errorWithStack('Error loading dashboard stats:', error as Error)
    } finally {
      setLoadingStats(false)
    }
  }, [onboardingSteps, user])

  useEffect(() => {
    if (user && !loading) {
      checkOnboardingStatus()
    }
  }, [user, loading, checkOnboardingStatus])

  useEffect(() => {
    if (user) {
      loadDashboardStats()
    }
  }, [user, loadDashboardStats])

  const {
    openCreateUpdateModal,
    createUpdateModal
  } = useCreateUpdateModal({
    onUpdateSent: loadDashboardStats,
    onUpdateScheduled: loadDashboardStats
  })

  // Handler functions for new components
  const handleCreateUpdate = useCallback((type: UpdateType = 'photo') => {
    openCreateUpdateModal(type)
  }, [openCreateUpdateModal])

  const handleOnboardingStepClick = useCallback((stepId: string) => {
    switch (stepId) {
      case 'add-child':
        router.push('/dashboard/children')
        break
      case 'invite-recipients':
        router.push('/dashboard/recipients')
        break
      case 'create-first-update':
        openCreateUpdateModal('photo')
        break
      case 'complete':
        setShowOnboardingProgress(false)
        break
      default:
        break
    }
  }, [router])

  const handleCollapseOnboarding = useCallback((_collapsed: boolean) => {
    // Placeholder for persisting collapse preference
  }, [])

  const memoizedStats = useMemo(() => ({
    children: childrenCount,
    recipients: recipientStats,
    updates: updatesCreated,
    hasData: childrenCount > 0 || recipientStats.total > 0 || updatesCreated > 0
  }), [childrenCount, recipientStats, updatesCreated])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Don't render dashboard if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation onCreateUpdate={handleCreateUpdate} />

      {/* Mobile-first layout with new components */}
      <main className="pb-20 md:pb-8">
        {/* Personalized Welcome Section */}
        <PersonalizedWelcome
          userName={user?.user_metadata?.name || user?.email?.split('@')[0]}
          lastUpdateAt={lastUpdateAt}
          updateCount={updatesCreated}
          daysSinceStart={daysSinceStart}
          onCreateUpdate={handleCreateUpdate}
          onDismissReminder={(reminderId) => {
            logger.info('Reminder dismissed:', { reminderId })
          }}
          className="mb-0"
        />

        {/* Main content container */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Onboarding Progress - Show if not completed */}
            {showOnboardingProgress && !hasCompletedOnboarding && (
              <div className="mb-6 -mt-4 relative z-10">
                <EnhancedOnboardingProgress
                  steps={onboardingSteps}
                  currentStepIndex={onboardingSteps.findIndex(step => step.isCurrent)}
                  totalSteps={onboardingSteps.length}
                  onStepClick={handleOnboardingStepClick}
                  onCollapse={handleCollapseOnboarding}
                  showCelebration={hasCompletedOnboarding}
                />
              </div>
            )}

            {/* Quick Stats - Mobile-optimized */}
            {!loadingStats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Card className="hover:shadow-md transition-all duration-200" padding="md" hover>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">{recipientStats.total}</p>
                    <p className="text-sm text-neutral-600">Recipients</p>
                  </div>
                </Card>

                <Card className="hover:shadow-md transition-all duration-200" padding="md" hover>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">{updatesCreated}</p>
                    <p className="text-sm text-neutral-600">Updates</p>
                  </div>
                </Card>

                <Card className="hover:shadow-md transition-all duration-200" padding="md" hover>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">{childrenCount}</p>
                    <p className="text-sm text-neutral-600">Children</p>
                  </div>
                </Card>
              </div>
            )}

            {/* Recent Activity Section with Enhanced Timeline */}
            <div className="mb-8">
              <Card variant="elevated" className="overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-neutral-900">
                      Recent Activity
                    </h3>
                    <div className="flex items-center space-x-4">
                      <Link
                        href="/dashboard/timeline"
                        className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                      >
                        Timeline view →
                      </Link>
                      <Link
                        href="/dashboard/updates"
                        className="text-sm text-neutral-600 hover:text-neutral-700 font-medium transition-colors"
                      >
                        View all
                      </Link>
                    </div>
                  </div>

                  {/* Show empty state if no updates, otherwise show list */}
                  {!loadingStats && memoizedStats.updates === 0 ? (
                    <EmptyTimelineState
                      hasCompletedOnboarding={hasCompletedOnboarding}
                      userName={user?.user_metadata?.name || user?.email?.split('@')[0]}
                      onCreateUpdate={handleCreateUpdate}
                    />
                  ) : (
                    <UpdatesList
                      limit={5}
                      showViewAllLink={false}
                      onCreateUpdate={handleCreateUpdate}
                    />
                  )}
                </div>
              </Card>
            </div>

            {/* AI Prompt Suggestions - Only show if user has created updates */}
            {memoizedStats.updates > 0 && (
              <div className="mb-8">
                <PromptFeed
                  userId={user?.id}
                  limit={3}
                  showStats={false}
                  showFilters={false}
                  compact={true}
                  autoRefresh={true}
                  refreshInterval={300000} // 5 minutes
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {createUpdateModal}
    </div>
  )
})

DashboardPage.displayName = 'DashboardPage'

export default DashboardPage
