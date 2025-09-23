import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

interface Response {
  id: string
  update_id: string
  recipient_id: string
  channel: string
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

export function useResponses(updateId: string) {
  const logger = createLogger('UseResponses')
  const [responses, setResponses] = useState<Response[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newResponseCount, setNewResponseCount] = useState(0)

  useEffect(() => {
    let mounted = true

    async function fetchResponses() {
      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('responses')
          .select(`
            *,
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
          logger.errorWithStack('Error fetching responses:', fetchError as Error)
          if (mounted) {
            setError('Failed to load responses')
          }
          return
        }

        if (mounted) {
          setResponses(data || [])
          setLoading(false)
        }
      } catch (err) {
        logger.error('Unexpected error:', { error: err })
        if (mounted) {
          setError('An unexpected error occurred')
          setLoading(false)
        }
      }
    }

    const fetchNewResponse = async (responseId: string) => {
      const supabase = createClient()
      const { data } = await supabase
        .from('responses')
        .select(`
          *,
          recipients!inner (
            id,
            name,
            relationship,
            email
          )
        `)
        .eq('id', responseId)
        .single()

      if (data && mounted) {
        setResponses(prev => [...prev, data])
      }
    }

    fetchResponses()

    // Set up real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel(`responses_${updateId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
          filter: `update_id=eq.${updateId}`
        },
        (payload: any) => {
          logger.info('New response received:', { data: payload })
          // Fetch complete response data with recipient info
          fetchNewResponse(payload.new.id)
          setNewResponseCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [updateId])

  const markResponsesAsRead = () => {
    setNewResponseCount(0)
  }

  return {
    responses,
    loading,
    error,
    newResponseCount,
    markResponsesAsRead
  }
}