'use client'

import { useEffect, Suspense, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/layout/Navigation'
import Header from '@/components/layout/Header'
import { ProfileManager } from '@/components/profile'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useCreateUpdateModal } from '@/hooks/useCreateUpdateModal'
import type { UpdateType } from '@/components/updates/CreateUpdateModal'

function ProfileContent() {
  return <ProfileManager />
}

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const {
    openCreateUpdateModal,
    createUpdateModal
  } = useCreateUpdateModal()

  const handleCreateUpdate = useCallback((type: UpdateType = 'photo') => {
    openCreateUpdateModal(type)
  }, [openCreateUpdateModal])

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

  // Don't render profile if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onCreateUpdate={handleCreateUpdate} />

      <Header
        title="Profile Settings"
        subtitle="Manage your account settings and preferences"
      />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<LoadingSpinner size="lg" />}>
          <ProfileContent />
        </Suspense>
      </main>

      {createUpdateModal}
    </div>
  )
}
