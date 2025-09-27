'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('Page')
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConversationView } from '@/components/responses'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface ConfirmedRecipient {
  id: string
  name?: string
  email?: string
}

interface Update {
  id: string
  content: string
  created_at: string
  child_id: string
  parent_id: string
  media_urls: string[]
  confirmed_recipients?: ConfirmedRecipient[]
  children: {
    id: string
    name: string
    birth_date: string
    profile_photo_url: string | null
  }
}

export default function UpdatePage() {
  const params = useParams()
  const updateId = params?.id as string
  const [update, setUpdate] = useState<Update | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUpdate() {
      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('updates')
          .select(`
            *,
            children!inner (
              id,
              name,
              birth_date,
              profile_photo_url
            )
          `)
          .eq('id', updateId)
          .single()

        if (fetchError) {
          logger.errorWithStack('Error fetching update:', fetchError as Error)
          setError('Failed to load update')
          return
        }

        setUpdate(data)
      } catch (err) {
        logger.error('Unexpected error:', { error: err })
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (updateId) {
      fetchUpdate()
    }
  }, [updateId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-2 text-gray-600">Loading update...</p>
        </div>
      </div>
    )
  }

  if (error || !update) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Update</h2>
            <p className="text-red-700">{error || 'Update not found'}</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>

          <h1 className="text-2xl font-bold text-gray-900">
            Update & Responses
          </h1>
          <p className="text-gray-600">
            View the complete conversation thread for this update
          </p>
        </div>

        {/* Main Content */}
        <ConversationView
          updateId={updateId}
          update={update}
          showAnalytics={true}
        />
      </div>
    </div>
  )
}
