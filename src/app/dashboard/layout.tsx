'use client'

import { useCallback, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { LeftNavigation } from '@/components/layout/LeftNavigation'
import { RightPaneContent } from '@/components/layout/rightPane/RightPaneContent'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DashboardActionsProvider } from '@/contexts/DashboardActionsContext'
import { NavigationProvider } from '@/contexts/NavigationContext'
import { ViewSelectionProvider } from '@/contexts/ViewSelectionContext'
import { useAuth } from '@/hooks/useAuth'
import { useCreateUpdateModal } from '@/hooks/useCreateUpdateModal'
import type { MemoryType } from '@/components/updates/CreateMemoryModal'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { openCreateUpdateModal, createUpdateModal } = useCreateUpdateModal()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  const handleCreateUpdate = useCallback(
    (type: MemoryType = 'photo', initialContent?: string) => {
      openCreateUpdateModal(type, initialContent)
    },
    [openCreateUpdateModal]
  )

  const handleCompileDigest = useCallback(() => {
    router.push('/dashboard/digests/compile')
  }, [router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <NavigationProvider>
      <ViewSelectionProvider>
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
            {children}
          </DashboardShell>
          {createUpdateModal}
        </DashboardActionsProvider>
      </ViewSelectionProvider>
    </NavigationProvider>
  )
}
