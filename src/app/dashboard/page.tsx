'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getChildren } from '@/lib/children'
import { getRecipientStats } from '@/lib/recipients'
import { getGroupStats } from '@/lib/recipient-groups'
import { getUpdates } from '@/lib/updates'
import Navigation from '@/components/layout/Navigation'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function DashboardPage() {
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
    // Load stats for dashboard
    if (user) {
      loadDashboardStats()
    }
  }, [user])

  const loadDashboardStats = async () => {
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
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Recipients</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loadingStats ? '...' : recipientStats.total}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Updates Created</dt>
                  <dd className="text-lg font-medium text-gray-900">{updatesCreated}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Children</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loadingStats ? '...' : childrenCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
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
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  No activity yet. Create your first update to get started!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}