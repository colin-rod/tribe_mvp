import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { UpdateWithDetails, RecipientWithDetails } from './types.ts'

export function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  return createClient(supabaseUrl, supabaseKey)
}

export async function fetchUpdateWithDetails(
  supabase: any,
  updateId: string
): Promise<UpdateWithDetails | null> {
  const { data, error } = await supabase
    .from('memories')
    .select(`
      id,
      content,
      milestone_type,
      media_urls,
      created_at,
      child:children (
        id,
        name,
        birth_date,
        profile_photo_url
      ),
      parent:profiles (
        id,
        name,
        email
      )
    `)
    .eq('id', updateId)
    .single()

  if (error) {
    console.error('Error fetching update:', error)
    return null
  }

  return data
}

export async function fetchRecipientsWithDetails(
  supabase: any,
  recipientIds: string[]
): Promise<RecipientWithDetails[]> {
  const { data, error } = await supabase
    .from('recipients')
    .select(`
      id,
      name,
      email,
      relationship,
      frequency,
      preferred_channels,
      is_active
    `)
    .in('id', recipientIds)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching recipients:', error)
    return []
  }

  // Filter out recipients without email addresses
  return data.filter((recipient: any) => recipient.email)
}

export async function createDeliveryJob(
  supabase: any,
  updateId: string,
  recipientId: string,
  channel: string = 'email'
): Promise<string | null> {
  const { data, error } = await supabase
    .from('delivery_jobs')
    .insert({
      update_id: updateId,
      recipient_id: recipientId,
      channel,
      status: 'queued'
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating delivery job:', error)
    return null
  }

  return data.id
}

export async function updateDeliveryJobStatus(
  supabase: any,
  jobId: string,
  status: string,
  externalId?: string,
  errorMessage?: string
): Promise<boolean> {
  const updateData: any = { status }

  if (externalId) {
    updateData.external_id = externalId
  }

  if (errorMessage) {
    updateData.error_message = errorMessage
  }

  if (status === 'sent') {
    updateData.sent_at = new Date().toISOString()
  } else if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('delivery_jobs')
    .update(updateData)
    .eq('id', jobId)

  if (error) {
    console.error('Error updating delivery job:', error)
    return false
  }

  return true
}

export async function updateDeliveryJobByExternalId(
  supabase: any,
  externalId: string,
  status: string,
  errorMessage?: string
): Promise<boolean> {
  const updateData: any = { status }

  if (errorMessage) {
    updateData.error_message = errorMessage
  }

  if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('delivery_jobs')
    .update(updateData)
    .eq('external_id', externalId)

  if (error) {
    console.error('Error updating delivery job by external ID:', error)
    return false
  }

  return true
}

export async function markUpdateAsSent(
  supabase: any,
  updateId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('memories')
    .update({
      distribution_status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', updateId)

  if (error) {
    console.error('Error marking update as sent:', error)
    return false
  }

  return true
}