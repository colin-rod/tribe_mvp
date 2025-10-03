/**
 * Drafts Page
 * CRO-304: Component Migration & Comprehensive Testing
 *
 * Uses new 3-pane layout with drafts view
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

export default function DraftsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <DashboardShell
      leftNav={<LeftNavigation />}
      rightPane={<RightPaneContent />}
    >
      <MiddlePane />
    </DashboardShell>
  )
}
