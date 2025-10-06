/**
 * Activity Page
 * CRO-304: Component Migration & Comprehensive Testing
 *
 * Activity feed view using the 3-pane dashboard layout
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { LeftNavigation } from '@/components/layout/LeftNavigation'
import { MiddlePane } from '@/components/layout/MiddlePane'
import { RightPaneContent } from '@/components/layout/rightPane/RightPaneContent'
import { DashboardActionsProvider } from '@/contexts/DashboardActionsContext'
import { useCreateUpdateModal } from '@/hooks/useCreateUpdateModal'
import type { UpdateType } from '@/components/updates/CreateUpdateModal'

export default function ActivityPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { openCreateUpdateModal, createUpdateModal } = useCreateUpdateModal()

  useEffect(() => {
    // Redirect to login if not authenticated after loading is complete
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

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
    <DashboardActionsProvider
      value={{
        onCreateUpdate: (type: UpdateType = 'photo', initialContent?: string) => openCreateUpdateModal(type, initialContent),
        onCompileDigest: () => router.push('/dashboard/digests/compile'),
      }}
    >
      <DashboardShell
        leftNav={<LeftNavigation />}
        rightPane={<RightPaneContent />}
      >
        <MiddlePane />
      </DashboardShell>
      {createUpdateModal}
    </DashboardActionsProvider>
  )
}
