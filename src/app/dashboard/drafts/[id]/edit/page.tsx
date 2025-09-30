'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useDraftManagement } from '@/hooks/useDraftManagement'
import DraftEditor from '@/components/drafts/DraftEditor'
import Navigation from '@/components/layout/Navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { createLogger } from '@/lib/logger'
import type { DraftUpdate } from '@/lib/types/digest'

const logger = createLogger('DraftEditPage')

export default function DraftEditPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const draftId = params?.id as string

  const {
    getDraft,
    update,
    addMedia,
    addText,
    markReady,
    remove,
    loading,
    error
  } = useDraftManagement()

  const [draft, setDraft] = useState<DraftUpdate | null>(null)
  const [loadingDraft, setLoadingDraft] = useState(true)

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load draft
  useEffect(() => {
    const loadDraft = async () => {
      if (!draftId || !user) return

      setLoadingDraft(true)
      try {
        const draftData = await getDraft(draftId)
        if (!draftData) {
          logger.error('Draft not found', { draftId })
          router.push('/dashboard/drafts')
          return
        }
        setDraft(draftData)
      } catch (err) {
        logger.error('Failed to load draft', { error: err, draftId })
      } finally {
        setLoadingDraft(false)
      }
    }

    loadDraft()
  }, [draftId, user, getDraft, router])

  const handleBack = () => {
    router.push('/dashboard/drafts')
  }

  const handleSave = async (updates: Partial<DraftUpdate>): Promise<boolean> => {
    if (!draft) return false

    const success = await update(draft.id, updates)
    if (success) {
      // Reload draft to get updated version
      const updatedDraft = await getDraft(draft.id)
      if (updatedDraft) {
        setDraft(updatedDraft)
      }
    }
    return success || false
  }

  const handleAddMedia = async (mediaUrls: string[]): Promise<boolean> => {
    if (!draft) return false

    const success = await addMedia(draft.id, mediaUrls)
    if (success) {
      // Reload draft to get updated media
      const updatedDraft = await getDraft(draft.id)
      if (updatedDraft) {
        setDraft(updatedDraft)
      }
      return true
    }
    return false
  }

  const handleMarkReady = async () => {
    if (!draft) return

    const success = await markReady(draft.id)
    if (success) {
      router.push('/dashboard/drafts')
    }
  }

  const handleDelete = async () => {
    if (!draft) return

    if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      const success = await remove(draft.id)
      if (success) {
        router.push('/dashboard/drafts')
      }
    }
  }

  if (authLoading || loadingDraft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="p-12 text-center">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              Draft Not Found
            </h2>
            <p className="text-neutral-600 mb-6">
              The draft you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Drafts
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />

      <main className="pb-20 md:pb-8">
        {/* Header */}
        <div className="bg-white border-b border-neutral-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Back to Drafts</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-neutral-500">
                  Version {draft.version} • Edited {getTimeAgo(draft.last_edited_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {error && (
            <Card className="mb-4 p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </Card>
          )}

          <DraftEditor
            draft={draft}
            onSave={handleSave}
            onAddMedia={handleAddMedia}
            onMarkReady={handleMarkReady}
            onDelete={handleDelete}
            loading={loading}
          />
        </div>
      </main>
    </div>
  )
}

// Helper function
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}