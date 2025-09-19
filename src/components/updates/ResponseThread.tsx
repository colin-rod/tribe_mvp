'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { Mail, MessageSquare, Users } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface Response {
  id: string
  update_id: string
  recipient_id: string
  channel: 'email' | 'whatsapp' | 'sms'
  content: string | null
  media_urls: string[]
  received_at: string
  recipients: {
    id: string
    name: string
    relationship: string
    email: string | null
  }
}

interface ResponseThreadProps {
  updateId: string
}

export function ResponseThread({ updateId }: ResponseThreadProps) {
  const [responses, setResponses] = useState<Response[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchResponses() {
      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('responses')
          .select(`
            id,
            update_id,
            recipient_id,
            channel,
            content,
            media_urls,
            received_at,
            recipients!inner (
              id,
              name,
              relationship,
              email
            )
          `)
          .eq('update_id', updateId)
          .order('received_at', { ascending: true })

        if (fetchError) {
          console.error('Error fetching responses:', fetchError)
          if (mounted) {
            setError('Failed to load responses')
          }
          return
        }

        if (mounted) {
          setResponses(data || [])
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        if (mounted) {
          setError('An unexpected error occurred')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchResponses()

    // Subscribe to new responses
    const supabase = createClient()
    const channel = supabase
      .channel('responses')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
          filter: `update_id=eq.${updateId}`
        },
        (payload) => {
          console.log('New response received:', payload)
          // Refetch responses to get complete data with recipient info
          fetchResponses()
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [updateId])

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4 text-blue-600" />
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4 text-green-600" />
      case 'sms':
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />
    }
  }

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'email':
        return 'Email'
      case 'whatsapp':
        return 'WhatsApp'
      case 'sms':
        return 'SMS'
      default:
        return channel
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">Loading responses...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Recipients can reply via email to share their thoughts and reactions to this update.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900">
          Responses ({responses.length})
        </h3>
      </div>

      {responses.map((response) => (
        <div key={response.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {response.recipients.name[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{response.recipients.name}</p>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
                    {response.recipients.relationship}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {getChannelIcon(response.channel)}
                  <span>via {getChannelLabel(response.channel)}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(response.received_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </div>

          {response.content && (
            <div className="mb-3">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {response.content}
              </p>
            </div>
          )}

          {response.media_urls && response.media_urls.length > 0 && (
            <div className="mt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {response.media_urls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Response media ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => window.open(url, '_blank')}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}