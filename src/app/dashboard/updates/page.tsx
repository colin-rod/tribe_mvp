'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/layout/Navigation'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { UpdatesList } from '@/components/updates'
import { useCreateUpdateModal } from '@/hooks/useCreateUpdateModal'
import { useSearchDebounced } from '@/hooks/useSearchDebounced'
import TimelineSearch from '@/components/timeline/TimelineSearch'
import type { UpdateType } from '@/components/updates/CreateUpdateModal'

function UpdatesContent() {
  const [updatesListKey, setUpdatesListKey] = useState(0)

  // Search functionality
  const {
    query,
    filters,
    isSearching,
    hasActiveFilters,
    setQuery,
    setFilters,
    clearSearch
  } = useSearchDebounced({
    delay: 300,
    minLength: 2,
    enableUrlPersistence: true,
    urlParamPrefix: 'updates'
  })

  const handleUpdateCompleted = useCallback(() => {
    setUpdatesListKey(prev => prev + 1)
  }, [])

  const {
    openCreateUpdateModal,
    createUpdateModal
  } = useCreateUpdateModal({
    onUpdateSent: handleUpdateCompleted,
    onUpdateScheduled: handleUpdateCompleted
  })

  const handleCreateUpdate = useCallback((type: UpdateType = 'photo') => {
    openCreateUpdateModal(type)
  }, [openCreateUpdateModal])

  return (
    <>
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Search and Filters */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <TimelineSearch
              query={query}
              filters={filters}
              onQueryChange={setQuery}
              onFiltersChange={setFilters}
              onClear={clearSearch}
              isSearching={isSearching}
              hasActiveFilters={hasActiveFilters}
            />
          </div>
        </div>

        {/* Updates List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <UpdatesList
              key={updatesListKey}
              limit={50}
              showViewAllLink={false}
              onCreateUpdate={handleCreateUpdate}
              searchQuery={query}
              searchFilters={filters}
            />
          </div>
        </div>
      </main>
      {createUpdateModal}
    </>
  )
}

export default function UpdatesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const handleCreateUpdate = useCallback((_type: UpdateType = 'photo') => {
    // This will be handled by the UpdatesContent component
  }, [])

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
    <div className="min-h-screen bg-gray-50">
      <Navigation onCreateUpdate={handleCreateUpdate} />

      <Header
        title="All Updates"
        subtitle="View and manage all your updates"
      >
        <Button onClick={() => handleCreateUpdate('photo')}>
          New Update
        </Button>
      </Header>

      <Suspense fallback={
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      }>
        <UpdatesContent />
      </Suspense>
    </div>
  )
}
