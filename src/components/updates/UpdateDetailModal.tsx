'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ConversationView } from '@/components/responses'
import EditUpdateModal from './EditUpdateModal'
import type { DraftUpdate } from '@/lib/types/digest'

interface UpdateDetailModalProps {
  open: boolean
  updateId: string
  onClose: () => void
}

interface UpdateRow {
  id: string
  content: string
  subject?: string
  rich_content?: Record<string, unknown>
  content_format?: 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp'
  distribution_status?: string
  created_at: string
  child_id: string
  parent_id: string
  media_urls: string[]
  milestone_type?: string
  confirmed_recipients?: string[]
  suggested_recipients?: string[]
  children: {
    id: string
    name: string
    birth_date: string
    profile_photo_url: string | null
  }
}

export default function UpdateDetailModal({ open, updateId, onClose }: UpdateDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [update, setUpdate] = useState<UpdateRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (!open || !updateId) return
    let cancelled = false

    async function fetchUpdate() {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()
        const { data, error } = await supabase
          .from('memories')
          .select(`
            *,
            children!inner ( id, name, birth_date, profile_photo_url )
          `)
          .eq('id', updateId)
          .single()
        if (error) throw error
        if (!cancelled) setUpdate(data as unknown as UpdateRow)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load memory')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchUpdate()
    return () => {
      cancelled = true
    }
  }, [open, updateId])

  if (!open) return null

  const isEditable = update?.distribution_status === 'draft' || update?.distribution_status === 'scheduled'

  const handleEditSuccess = () => {
    // Refetch the update after successful edit
    const supabase = createClient()
    supabase
      .from('memories')
      .select(`
        *,
        children!inner ( id, name, birth_date, profile_photo_url )
      `)
      .eq('id', updateId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setUpdate(data as unknown as UpdateRow)
        }
      })
  }

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header with Edit button */}
          <div className="absolute top-3 right-3 z-10 flex items-center space-x-2">
            {isEditable && update && (
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-primary-300 bg-white text-primary-700 hover:bg-primary-50 transition-colors shadow-sm"
                aria-label="Edit memory"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-sm font-medium">Edit</span>
              </button>
            )}
            <button
              aria-label="Close"
              onClick={onClose}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="h-[80vh] overflow-auto p-6">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <LoadingSpinner />
              </div>
            )}
            {error && (
              <div className="text-center text-red-600 py-10">{error}</div>
            )}
            {!loading && !error && update && (
              <ErrorBoundary>
                <ConversationView updateId={updateId} update={update} showAnalytics={false} />
              </ErrorBoundary>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {update && isEditable && (
        <EditUpdateModal
          open={showEditModal}
          update={update as unknown as DraftUpdate}
          onClose={() => setShowEditModal(false)}
          onSaveSuccess={handleEditSuccess}
        />
      )}
    </>
  )
}
