'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createLogger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { useDraftManagement } from '@/hooks/useDraftManagement'
import Navigation from '@/components/layout/Navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  CameraIcon,
  PencilSquareIcon,
  MicrophoneIcon,
  SparklesIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import type { DraftUpdate } from '@/lib/types/digest'

const logger = createLogger('DraftWorkspacePage')

export default function DraftWorkspacePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const {
    drafts,
    summary,
    loading,
    error,
    loadDrafts,
    loadSummary,
    markReady,
    remove
  } = useDraftManagement()

  const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'ready'>('all')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadDrafts({ status: selectedStatus })
      loadSummary()
    }
  }, [user, selectedStatus, loadDrafts, loadSummary])

  const handleCompileDigest = () => {
    if (summary?.can_compile_digest) {
      router.push('/dashboard/digests/compile')
    }
  }

  const handleQuickCapture = (type: 'photo' | 'text' | 'voice') => {
    // This would open a quick capture modal
    logger.info('Quick capture', { type })
    // For now, redirect to create update page
    router.push('/dashboard/create-update')
  }

  const handleMarkReady = async (draftId: string) => {
    const success = await markReady(draftId)
    if (success) {
      logger.info('Draft marked as ready', { draftId })
    }
  }

  const handleDelete = async (draftId: string) => {
    if (confirm('Are you sure you want to delete this draft?')) {
      const success = await remove(draftId)
      if (success) {
        logger.info('Draft deleted', { draftId })
      }
    }
  }

  const filteredDrafts = drafts.filter(draft => {
    if (selectedStatus === 'all') return true
    return draft.distribution_status === selectedStatus
  })

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />

      <main className="pb-20 md:pb-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  Draft Workspace
                </h1>
                {summary && (
                  <p className="text-sm text-neutral-600 mt-1">
                    {summary.total_drafts} draft{summary.total_drafts === 1 ? '' : 's'} • {' '}
                    {summary.ready_count} ready to compile
                    {summary.can_compile_digest && (
                      <span className="ml-2 inline-flex items-center">
                        <SparklesIcon className="w-4 h-4 text-orange-500 mr-1" />
                        <span className="text-orange-600 font-medium">Ready!</span>
                      </span>
                    )}
                  </p>
                )}
              </div>

              {summary?.can_compile_digest && (
                <Button
                  onClick={handleCompileDigest}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Compile Digest
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Quick Capture Bar */}
          <Card className="mb-6">
            <div className="p-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Quick Capture
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleQuickCapture('photo')}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-colors"
                >
                  <CameraIcon className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-blue-900">Photo</span>
                </button>

                <button
                  onClick={() => handleQuickCapture('text')}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 hover:border-green-300 transition-colors"
                >
                  <PencilSquareIcon className="w-8 h-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-900">Text</span>
                </button>

                <button
                  onClick={() => handleQuickCapture('voice')}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 hover:border-purple-300 transition-colors"
                >
                  <MicrophoneIcon className="w-8 h-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-purple-900">Voice</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-5 h-5 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-700">Filter:</span>
              <div className="flex space-x-2">
                {(['all', 'draft', 'ready'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedStatus === status
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'draft' ? 'Draft' : 'Ready'}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-sm text-neutral-500">
              {filteredDrafts.length} draft{filteredDrafts.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Drafts Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <Card className="p-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => loadDrafts()} variant="outline">
                Try Again
              </Button>
            </Card>
          ) : filteredDrafts.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PencilSquareIcon className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  No Drafts Yet
                </h3>
                <p className="text-sm text-neutral-600 mb-6">
                  Start capturing moments as you go. Add photos, text, or voice notes that you can refine later.
                </p>
                <Button onClick={() => handleQuickCapture('photo')}>
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Capture First Moment
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrafts.map(draft => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onMarkReady={() => handleMarkReady(draft.id)}
                  onDelete={() => handleDelete(draft.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Draft Card Component
function DraftCard({
  draft,
  onMarkReady,
  onDelete
}: {
  draft: DraftUpdate
  onMarkReady: () => void
  onDelete: () => void
}) {
  const router = useRouter()
  const isReady = draft.distribution_status === 'ready'

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => router.push(`/dashboard/drafts/${draft.id}/edit`)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isReady ? 'bg-green-500' : 'bg-orange-500'
            }`} />
            <span className={`text-xs font-medium ${
              isReady ? 'text-green-700' : 'text-orange-700'
            }`}>
              {isReady ? 'Ready' : 'Draft'}
            </span>
          </div>
          <span className="text-xs text-neutral-500">
            {getTimeAgo(draft.last_edited_at)}
          </span>
        </div>

        {/* Content Preview */}
        <p className="text-sm text-neutral-900 mb-3 line-clamp-3">
          {draft.content || 'No content yet...'}
        </p>

        {/* Media Preview */}
        {draft.media_urls && draft.media_urls.length > 0 && (
          <div className="flex space-x-2 mb-3 overflow-x-auto">
            {draft.media_urls.slice(0, 3).map((url, index) => (
              <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                <Image
                  src={url}
                  alt={`Media ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
            {draft.media_urls.length > 3 && (
              <div className="w-16 h-16 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-neutral-600">+{draft.media_urls.length - 3}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <div className="flex items-center space-x-2">
            {draft.milestone_type && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                🎉 Milestone
              </span>
            )}
            {draft.version > 1 && (
              <span className="text-xs text-neutral-500">
                v{draft.version}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isReady && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkReady()
                }}
                className="text-xs font-medium text-green-600 hover:text-green-700"
              >
                Mark Ready
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Helper function
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}