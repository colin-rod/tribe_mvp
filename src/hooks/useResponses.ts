import { useState, useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import type { Database } from '@/lib/types/database'

type ResponseRow = Database['public']['Tables']['responses']['Row']

export type Response = ResponseRow & {
  recipients: {
    id: string
    name: string
    relationship: string
    email: string | null
  }
}

export function useResponses(updateId: string) {
  const loggerRef = useRef(createLogger('UseResponses'))
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
          loggerRef.current.errorWithStack('Error fetching responses:', fetchError as Error)
          if (mounted) {
            setError('Failed to load responses')
          }
          return
        }

        if (mounted) {
          const responsesData = (data ?? []) as Response[]
          setResponses(responsesData)
          setLoading(false)
        }
      } catch (err) {
        loggerRef.current.error('Unexpected error:', { error: err })
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
        const response = data as Response
        setResponses(prev => [...prev, response])
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
        (payload: RealtimePostgresChangesPayload<ResponseRow>) => {
          loggerRef.current.info('New response received:', { data: payload })

          // Type guard to ensure payload.new exists and has required properties
          const newResponse = payload.new
          if (!newResponse || typeof newResponse !== 'object' || !('id' in newResponse) || !('update_id' in newResponse)) {
            loggerRef.current.warn('Invalid response payload received', { payload: newResponse })
            return
          }

          // Now we know newResponse has id and update_id properties
          const typedResponse = newResponse as { id: string; update_id: string }

          // Fetch complete response data with recipient info
          fetchNewResponse(typedResponse.id)
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
