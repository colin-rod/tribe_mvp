import { useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

interface NotificationData {
  childName: string
  recipientName: string
  relationship: string
  content: string
  updateId: string
}

interface ResponseInsertPayload {
  id: string
  update_id: string
  recipient_id: string
  content: string | null
}

export function useResponseNotifications() {
  const loggerRef = useRef(createLogger('UseResponseNotifications'))
  useEffect(() => {
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const supabase = createClient()

    // Subscribe to new responses for user's updates
    const channel = supabase
      .channel('user_responses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses'
        },
        async (payload: RealtimePostgresChangesPayload<ResponseInsertPayload>) => {
          try {
            // Get the current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Type guard to ensure payload.new exists and has required properties
            const newResponse = payload.new
            if (!newResponse || typeof newResponse !== 'object' ||
                !('id' in newResponse) || !('update_id' in newResponse) || !('recipient_id' in newResponse) ||
                !newResponse.id || !newResponse.update_id || !newResponse.recipient_id) {
              loggerRef.current.warn('Invalid response payload received', { payload: newResponse })
              return
            }

            // Verify this response is for user's update
            const { data: update } = await supabase
              .from('updates')
              .select(`
                id,
                parent_id,
                content,
                children!inner (
                  name
                )
              `)
              .eq('id', newResponse.update_id)
              .eq('parent_id', user.id)
              .single()

            if (update && update.children) {
              // Get recipient info
              const { data: recipient } = await supabase
                .from('recipients')
                .select('name, relationship')
                .eq('id', newResponse.recipient_id)
                .single()

              if (recipient && recipient.name && recipient.relationship) {
                showResponseNotification({
                  childName: update.children.name,
                  recipientName: recipient.name,
                  relationship: recipient.relationship,
                  content: newResponse.content || 'Sent a photo',
                  updateId: update.id
                })
              }
            }
          } catch (error) {
            loggerRef.current.errorWithStack('Error processing response notification:', error as Error)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}

function showResponseNotification(data: NotificationData) {
  // Check if browser notifications are supported and permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(
      `${data.recipientName} responded to ${data.childName}'s update`,
      {
        body: data.content.substring(0, 100) + (data.content.length > 100 ? '...' : ''),
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `response_${data.updateId}`,
        data: { updateId: data.updateId }
      }
    )

    notification.onclick = () => {
      window.focus()
      // Navigate to the update page - adjust URL as needed based on your routing
      window.location.href = `/dashboard/updates/${data.updateId}`
      notification.close()
    }

    // Auto-close notification after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)
  }
}
