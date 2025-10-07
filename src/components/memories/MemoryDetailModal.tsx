'use client'

/**
 * MemoryDetailModal - Full implementation
 * Displays complete memory details with conversation view and approval actions
 *
 * Updated from UpdateDetailModal to align with Memory Book terminology
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ConversationView } from '@/components/responses'
import { MemoryBadge } from './MemoryBadge'
import { getStatusDisplayText, shouldShowNewBadge, canApproveMemory } from '@/lib/utils/memory-formatting'
import { approveMemory } from '@/lib/memories'
import { toast } from 'sonner'

interface MemoryDetailModalProps {
  open: boolean
  memoryId: string
  onClose: () => void
  onMemoryUpdated?: () => void  // Callback to refresh parent list
}

interface MemoryRow {
  id: string
  content: string
  subject?: string
  rich_content?: Record<string, unknown>
  content_format?: 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp'
  created_at: string
  child_id: string
  parent_id: string
  media_urls: string[]
  distribution_status: 'new' | 'approved' | 'compiled' | 'sent' | 'failed'
  is_new: boolean
  capture_channel?: 'web' | 'email' | 'sms' | 'whatsapp' | 'audio' | 'video'
  marked_ready_at?: string
  photo_count: number
  children: {
    id: string
    name: string
    birth_date: string
    profile_photo_url: string | null
  }
}

export default function MemoryDetailModal({
  open,
  memoryId,
  onClose,
  onMemoryUpdated
}: MemoryDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [memory, setMemory] = useState<MemoryRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)

  useEffect(() => {
    if (!open || !memoryId) return
    let cancelled = false

    async function fetchMemory() {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()
        const { data, error } = await supabase
          .from('memories')
          .select(`
            *,
            children!inner (
              id,
              name,
              birth_date,
              profile_photo_url
            )
          `)
          .eq('id', memoryId)
          .single()

        if (error) throw error
        if (!cancelled) setMemory(data as unknown as MemoryRow)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load memory')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchMemory()
    return () => {
      cancelled = true
    }
  }, [open, memoryId])

  const handleApprove = async () => {
    if (!memory) return

    setIsApproving(true)
    try {
      await approveMemory(memory.id)

      // Update local state
      setMemory({
        ...memory,
        distribution_status: 'approved',
        is_new: false,
        marked_ready_at: new Date().toISOString()
      })

      toast.success('Memory marked as ready for compilation!')

      // Notify parent component
      if (onMemoryUpdated) {
        onMemoryUpdated()
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to approve memory:', error)
      toast.error('Failed to mark memory as ready')
    } finally {
      setIsApproving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with badges and actions */}
        {!loading && !error && memory && (
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  Memory Details
                </h2>

                {/* Status Badge */}
                <span className={`
                  inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                  ${memory.distribution_status === 'new' ? 'bg-blue-100 text-blue-700' : ''}
                  ${memory.distribution_status === 'approved' ? 'bg-green-100 text-green-700' : ''}
                  ${memory.distribution_status === 'compiled' ? 'bg-purple-100 text-purple-700' : ''}
                  ${memory.distribution_status === 'sent' ? 'bg-gray-100 text-gray-700' : ''}
                  ${memory.distribution_status === 'failed' ? 'bg-red-100 text-red-700' : ''}
                `}>
                  {getStatusDisplayText(memory.distribution_status)}
                </span>

                {/* New Badge */}
                {shouldShowNewBadge(memory.is_new, memory.distribution_status) && (
                  <MemoryBadge isNew={memory.is_new} status={memory.distribution_status} />
                )}

                {/* Capture Channel Badge */}
                {memory.capture_channel && memory.capture_channel !== 'web' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                    via {memory.capture_channel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Approve Button */}
                {canApproveMemory(memory.distribution_status) && (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isApproving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Marking as Ready...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Mark as Ready
                      </>
                    )}
                  </button>
                )}

                {/* Close Button */}
                <button
                  aria-label="Close"
                  onClick={onClose}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date(memory.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>

              {memory.photo_count > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {memory.photo_count} {memory.photo_count === 1 ? 'photo' : 'photos'}
                </span>
              )}

              {memory.marked_ready_at && (
                <span className="flex items-center gap-1 text-green-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ready for compilation
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="h-[calc(90vh-120px)] overflow-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="w-16 h-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 text-center">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !error && memory && (
            <ErrorBoundary>
              <ConversationView
                updateId={memoryId}
                update={memory}
                showAnalytics={false}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  )
}
