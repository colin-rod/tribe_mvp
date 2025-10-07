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
  try {
    // First, get the update basic info
    const { data: update, error: updateError } = await supabase
      .from('memories')
      .select('*')
      .eq('id', updateId)
      .single()

    if (updateError || !update) {
      console.error('Error fetching update:', updateError)
      return null
    }

    // Get child details
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name, birth_date, profile_photo_url')
      .eq('id', update.child_id)
      .single()

    if (childError) {
      console.error('Error fetching child:', childError)
      return null
    }

    // Get parent details
    const { data: parent, error: parentError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', update.parent_id)
      .single()

    if (parentError) {
      console.error('Error fetching parent:', parentError)
      return null
    }

    // Combine the data
    return {
      ...update,
      child,
      parent
    }
  } catch (error) {
    console.error('Unexpected error in fetchUpdateWithDetails:', error)
    return null
  }
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
  errorMessage?: string,
  deliveredAt?: string
): Promise<boolean> {
  const updateData: any = {
    status,
    sent_at: new Date().toISOString()
  }

  if (externalId) updateData.external_id = externalId
  if (errorMessage) updateData.error_message = errorMessage
  if (deliveredAt) updateData.delivered_at = deliveredAt

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

export async function markUpdateAsSent(
  supabase: any,
  updateId: string,
  status: 'sent' | 'partially_sent' | 'failed'
): Promise<boolean> {
  const { error } = await supabase
    .from('memories')
    .update({
      distribution_status: status,
      sent_at: new Date().toISOString()
    })
    .eq('id', updateId)

  if (error) {
    console.error('Error updating update status:', error)
    return false
  }

  return true
}