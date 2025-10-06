/**
 * Dashboard Page
 * CRO-304: Component Migration & Comprehensive Testing
 *
 * Main dashboard using the new 3-pane layout with:
 * - DashboardShell for layout
 * - LeftNavigation for navigation
 * - MiddlePane for dynamic view content
 * - RightPane for context-aware tools
 */

'use client'

import { useEffect, useCallback } from 'react'
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

function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Create Update Modal
  const { openCreateUpdateModal, createUpdateModal } = useCreateUpdateModal()

  // Dashboard action handlers
  const handleCreateUpdate = useCallback((type: UpdateType = 'photo', initialContent?: string) => {
    openCreateUpdateModal(type, initialContent)
  }, [openCreateUpdateModal])

  const handleCompileDigest = useCallback(() => {
    router.push('/dashboard/digests/compile')
  }, [router])

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
        onCreateUpdate: handleCreateUpdate,
        onCompileDigest: handleCompileDigest,
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

DashboardPage.displayName = 'DashboardPage'

export default DashboardPage
