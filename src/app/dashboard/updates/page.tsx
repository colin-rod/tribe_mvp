/**
 * Updates Page
 * CRO-304: Component Migration & Comprehensive Testing
 *
 * Uses new 3-pane layout - redirects to activity view
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

export default function UpdatesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

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

  // Don't render if user is not authenticated
  if (!user) {
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
