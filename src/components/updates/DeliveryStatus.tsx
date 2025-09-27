'use client'

import { useState, useEffect } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { DeliveryStatusBadge, type DeliveryStatus } from '@/components/ui/DeliveryStatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'

const logger = createLogger('DeliveryStatus')

interface DeliveryJob {
  id: string
  recipient_id: string
  status: DeliveryStatus
  error_message: string | null
  sent_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
  recipients: {
    id: string
    name: string
    email: string | null
    relationship: string
  }
}

type DeliveryJobRow = Omit<DeliveryJob, 'recipients'>

interface DeliveryStatusProps {
  updateId: string
  className?: string
  onStatusChange?: (jobs: DeliveryJob[]) => void
}

export default function DeliveryStatus({ updateId, className, onStatusChange }: DeliveryStatusProps) {
  const [jobs, setJobs] = useState<DeliveryJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial delivery jobs
  useEffect(() => {
    const fetchDeliveryJobs = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('delivery_jobs')
          .select(`
            *,
            recipients (
              id,
              name,
              email,
              relationship
            )
          `)
          .eq('update_id', updateId)
          .eq('channel', 'email')
          .order('created_at', { ascending: true })

        if (error) {
          throw error
        }

        setJobs(data || [])
        onStatusChange?.(data || [])
      } catch (error) {
        logger.errorWithStack('Error fetching delivery jobs:', error as Error)
        setError(error instanceof Error ? error.message : 'Failed to load delivery status')
      } finally {
        setLoading(false)
      }
    }

    if (updateId) {
      fetchDeliveryJobs()
    }
  }, [updateId, onStatusChange])

  // Set up real-time subscription for delivery job updates
  useEffect(() => {
    if (!updateId) return

    const subscription = supabase
      .channel(`delivery_jobs_${updateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_jobs',
          filter: `update_id=eq.${updateId}`
        },
        async (payload: RealtimePostgresChangesPayload<DeliveryJobRow>) => {
          logger.info('Delivery job update:', { data: payload })

          if (payload.eventType === 'INSERT' && payload.new?.id) {
            // Fetch the new job with recipient details
            const { data } = await supabase
              .from('delivery_jobs')
              .select(`
                *,
                recipients (
                  id,
                  name,
                  email,
                  relationship
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              setJobs(prev => {
                const updated = [...prev, data]
                onStatusChange?.(updated)
                return updated
              })
            }
          } else if (payload.eventType === 'UPDATE' && payload.new?.id) {
            setJobs(prev => {
              const updated = prev.map(job =>
                job.id === payload.new!.id
                  ? { ...job, ...payload.new }
                  : job
              )
              onStatusChange?.(updated)
              return updated
            })
          } else if (payload.eventType === 'DELETE' && payload.old?.id) {
            setJobs(prev => {
              const updated = prev.filter(job => job.id !== payload.old!.id)
              onStatusChange?.(updated)
              return updated
            })
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [updateId, onStatusChange])

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-4', className)}>
        <LoadingSpinner size="sm" className="mr-2" />
        <span className="text-sm text-gray-600">Loading delivery status...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('p-4 bg-red-50 border border-red-200 rounded-md', className)}>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className={cn('p-4 bg-gray-50 border border-gray-200 rounded-md', className)}>
        <p className="text-sm text-gray-600">No delivery jobs found for this update.</p>
      </div>
    )
  }

  const getStatusTimestamp = (job: DeliveryJob) => {
    switch (job.status) {
      case 'delivered':
        return job.delivered_at
      case 'sent':
        return job.sent_at
      case 'failed':
        return job.updated_at
      default:
        return job.created_at
    }
  }

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-gray-900">Delivery Status</h3>

      <div className="space-y-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {job.recipients.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {job.recipients.relationship}
                  {job.recipients.email && ` • ${job.recipients.email}`}
                </p>
                {job.error_message && (
                  <p className="text-xs text-red-600 mt-1 break-words">
                    Error: {job.error_message}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end space-y-1">
                <DeliveryStatusBadge status={job.status} size="sm" />
                <span className="text-xs text-gray-500">
                  {formatTimestamp(getStatusTimestamp(job))}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Total: {jobs.length}</span>
          <span>
            Delivered: {jobs.filter(j => j.status === 'delivered').length} •
            Sent: {jobs.filter(j => j.status === 'sent').length} •
            Failed: {jobs.filter(j => j.status === 'failed').length}
          </span>
        </div>
      </div>
    </div>
  )
}
