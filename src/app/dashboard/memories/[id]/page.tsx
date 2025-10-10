'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('Page')
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConversationView } from '@/components/responses'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

type ConversationViewProps = React.ComponentProps<typeof ConversationView>
type ConversationUpdate = ConversationViewProps['update']

export default function UpdatePage() {
  const params = useParams()
  const updateId = params?.id as string
  const [update, setUpdate] = useState<ConversationUpdate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUpdate() {
      try {
        const supabase = createClient()

        // Log the updateId for debugging
        logger.info('Fetching update:', { updateId })

        const { data, error: fetchError } = await supabase
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
          .eq('id', updateId)
          .single()

        if (fetchError) {
          logger.errorWithStack('Error fetching update:', fetchError as Error)
          logger.error('Fetch error details:', {
            code: fetchError.code,
            message: fetchError.message,
            details: fetchError.details,
            hint: fetchError.hint
          })
          setError(`Failed to load update: ${fetchError.message}`)
          return
        }

        if (!data) {
          logger.error('No data returned for update:', { updateId })
          setError('Update not found')
          return
        }

        // Validate that content exists and is not null
        if (!data.content) {
          logger.error('Update has no content:', { updateId })
          setError('Update has no content')
          return
        }

        logger.info('Update fetched successfully:', {
          updateId: data.id,
          hasChildren: !!data.children,
          mediaCount: data.media_urls?.length || 0
        })

        const normalizedRecipients = Array.isArray(data.confirmed_recipients)
          ? data.confirmed_recipients.map((recipient) => {
              if (typeof recipient === 'string') {
                return recipient
              }

              if (recipient && typeof recipient === 'object') {
                const candidate =
                  (recipient as { email?: string }).email ??
                  (recipient as { name?: string }).name ??
                  (recipient as { id?: string }).id

                return candidate ?? ''
              }

              return ''
            }).filter(Boolean)
          : null

        const richContent =
          data.rich_content && typeof data.rich_content === 'object'
            ? (data.rich_content as Record<string, unknown>)
            : undefined

        const contentFormat = (['plain', 'rich', 'email', 'sms', 'whatsapp'] as const).find(
          format => format === data.content_format
        )

        const createdAt = data.created_at ?? new Date().toISOString()

        const normalizedUpdate: ConversationUpdate = {
          id: data.id,
          content: data.content,
          subject: data.subject ?? undefined,
          rich_content: richContent,
          content_format: contentFormat,
          created_at: createdAt,
          child_id: data.child_id,
          parent_id: data.parent_id,
          media_urls: Array.isArray(data.media_urls) ? data.media_urls : data.media_urls ?? null,
          confirmed_recipients:
            normalizedRecipients && normalizedRecipients.length > 0 ? normalizedRecipients : null,
          children: {
            id: data.children.id,
            name: data.children.name,
            birth_date: data.children.birth_date,
            profile_photo_url: data.children.profile_photo_url
          }
        }

        setUpdate(normalizedUpdate)
      } catch (err) {
        logger.error('Unexpected error:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined
        })
        setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
        <ErrorBoundary>
          <ConversationView
            updateId={updateId}
            update={update}
            showAnalytics={false}
          />
        </ErrorBoundary>
      </div>
    </div>
  )
}
