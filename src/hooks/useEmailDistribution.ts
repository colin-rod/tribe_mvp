'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface DistributeEmailRequest {
  update_id: string
  recipient_ids: string[]
}

export interface DeliveryJobInfo {
  id: string
  recipient_id: string
  status: 'queued' | 'sent' | 'delivered' | 'failed'
  external_id?: string
  error_message?: string
}

export interface DistributeEmailResponse {
  success: boolean
  delivery_jobs?: DeliveryJobInfo[]
  error?: string
}

export interface EmailDistributionState {
  loading: boolean
  success: boolean | null
  error: string | null
  deliveryJobs: DeliveryJobInfo[]
}

export function useEmailDistribution() {
  const [state, setState] = useState<EmailDistributionState>({
    loading: false,
    success: null,
    error: null,
    deliveryJobs: []
  })

  const distributeUpdate = useCallback(async (request: DistributeEmailRequest): Promise<DistributeEmailResponse> => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      success: null
    }))

    try {
      // Call the distribute-email Edge Function
      const { data, error } = await supabase.functions.invoke('distribute-email', {
        body: request
      })

      if (error) {
        throw new Error(error.message || 'Failed to distribute memory')
      }

      if (!data.success) {
        throw new Error(data.error || 'Memory distribution failed')
      }

      const response: DistributeEmailResponse = {
        success: true,
        delivery_jobs: data.delivery_jobs || []
      }

      setState(prev => ({
        ...prev,
        loading: false,
        success: true,
        deliveryJobs: response.delivery_jobs || []
      }))

      return response

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to distribute memory'

      setState(prev => ({
        ...prev,
        loading: false,
        success: false,
        error: errorMessage
      }))

      return {
        success: false,
        error: errorMessage
      }
    }
  }, [])

  const resetState = useCallback(() => {
    setState({
      loading: false,
      success: null,
      error: null,
      deliveryJobs: []
    })
  }, [])

  return {
    ...state,
    distributeUpdate,
    resetState
  }
}