'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ConversationView } from '@/components/responses'

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
  created_at: string
  child_id: string
  parent_id: string
  media_urls: string[]
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

  useEffect(() => {
    if (!open || !updateId) return
    let cancelled = false

    async function fetchUpdate() {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()
        const { data, error } = await supabase
          .from('updates')
          .select(`*, children!inner ( id, name, birth_date, profile_photo_url )`)
          .eq('id', updateId)
          .single()
        if (error) throw error
        if (!cancelled) setUpdate(data as unknown as UpdateRow)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load update')
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

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Close button */}
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

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
  )
}

