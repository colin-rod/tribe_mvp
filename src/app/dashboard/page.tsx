'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('Page')
import { useEffect, useState, memo, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getChildren } from '@/lib/children'
import { getRecipientStats } from '@/lib/recipients'
import { getGroupStats } from '@/lib/recipient-groups'
import { getUpdates } from '@/lib/updates'
import { needsOnboarding } from '@/lib/onboarding'
import Navigation from '@/components/layout/Navigation'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { UpdatesList } from '@/components/updates'
import { PromptFeed } from '@/components/lazy'

const DashboardPage = memo(function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [childrenCount, setChildrenCount] = useState(0)
  const [recipientStats, setRecipientStats] = useState({ total: 0, active: 0, groups: 0 })
  const [updatesCreated, setUpdatesCreated] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    // Redirect to login if not authenticated after loading is complete
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    // Check if user needs onboarding
    if (user && !loading) {
      checkOnboardingStatus()
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

  useEffect(() => {
    // Load stats for dashboard
    if (user) {
      loadDashboardStats()
    }
  }, [user])

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
    } catch (error) {
      logger.errorWithStack('Error loading dashboard stats:', error as Error)
    } finally {
      setLoadingStats(false)
    }
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <Header
        title="Dashboard"
        subtitle={`Welcome back, ${user?.user_metadata?.name || user?.email}!`}
      >
        <Link href="/dashboard/create-update">
          <Button>
            New Update
          </Button>
        </Link>
      </Header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <Card className="h-32 hover:shadow-md transition-all duration-200" padding="md" hover>
            <div className="flex items-center h-full">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-neutral-600 truncate">Total Recipients</dt>
                  <dd className="text-2xl font-semibold text-neutral-900 mt-1">
                    {loadingStats ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <div className="animate-pulse bg-neutral-200 h-7 w-12 rounded" aria-label="Loading recipient count"></div>
                      </div>
                    ) : (
                      <span aria-label={`${recipientStats.total} total recipients`}>{recipientStats.total}</span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>

          <Card className="h-32 hover:shadow-md transition-all duration-200" padding="md" hover>
            <div className="flex items-center h-full">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-neutral-600 truncate">Updates Created</dt>
                  <dd className="text-2xl font-semibold text-neutral-900 mt-1">
                    {loadingStats ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <div className="animate-pulse bg-neutral-200 h-7 w-12 rounded" aria-label="Loading updates count"></div>
                      </div>
                    ) : (
                      <span aria-label={`${updatesCreated} updates created`}>{updatesCreated}</span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>

          <Card className="h-32 hover:shadow-md transition-all duration-200" padding="md" hover>
            <div className="flex items-center h-full">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-info-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-neutral-600 truncate">Children</dt>
                  <dd className="text-2xl font-semibold text-neutral-900 mt-1">
                    {loadingStats ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <div className="animate-pulse bg-neutral-200 h-7 w-12 rounded" aria-label="Loading children count"></div>
                      </div>
                    ) : (
                      <span aria-label={`${childrenCount} children`}>{childrenCount}</span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        </div>

        {/* Getting Started Section */}
        <div className="mt-8">
          <Card variant="elevated" hover className="hover:shadow-xl">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Getting Started
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Welcome to Tribe! Let&apos;s help you get started with sharing updates about your little ones.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">1. Add Your Children</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Start by adding information about your children to create personalized updates.
                  </p>
                  <Link href="/dashboard/children">
                    <Button variant="outline" className="w-full">
                      Add Your First Child
                    </Button>
                  </Link>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">2. Organize Groups</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Organize your recipients into groups like Family, Friends, and Colleagues.
                  </p>
                  <Link href="/dashboard/groups">
                    <Button variant="outline" className="w-full">
                      Manage Groups
                    </Button>
                  </Link>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">3. Invite Recipients</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Invite family and friends who you&apos;d like to share updates with.
                  </p>
                  <Link href="/dashboard/recipients">
                    <Button variant="outline" className="w-full">
                      Add Recipients
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Prompt Suggestions */}
        <div className="mt-8">
          <PromptFeed
            userId={user?.id}
            limit={5}
            showStats={true}
            showFilters={false}
            compact={true}
            autoRefresh={true}
            refreshInterval={300000} // 5 minutes
          />
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <Card variant="elevated" hover className="hover:shadow-xl">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Recent Activity
                </h3>
                <Link
                  href="/dashboard/updates"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View all
                </Link>
              </div>
              <UpdatesList limit={5} showViewAllLink={false} />
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
})

DashboardPage.displayName = 'DashboardPage'

export default DashboardPage