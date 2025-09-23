import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { updatePreferencesSchema } from '@/lib/validation/recipients'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'


const logger = createLogger('Route')
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    if (!token || token.trim() === '') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('recipients')
      .select(`
        *,
        recipient_groups(*)
      `)
      .eq('preference_token', token)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 })
      }
      logger.errorWithStack('Error fetching recipient by token:', error as Error)
      return NextResponse.json({ error: 'Failed to fetch recipient' }, { status: 500 })
    }

    const recipient = {
      ...data,
      group: Array.isArray(data.recipient_groups) ? data.recipient_groups[0] : data.recipient_groups
    }

    return NextResponse.json({ recipient })
  } catch (error) {
    logger.errorWithStack('Preference API error:', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    // Validate the request body
    const preferences = updatePreferencesSchema.parse(body)

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    if (!token || token.trim() === '') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Validate that the token exists and recipient is active
    const { data: recipient, error: fetchError } = await supabase
      .from('recipients')
      .select(`
        *,
        recipient_groups(*)
      `)
      .eq('preference_token', token)
      .eq('is_active', true)
      .single()

    if (fetchError || !recipient) {
      return NextResponse.json({ error: 'Invalid or expired preference link' }, { status: 404 })
    }

    // Check if the new preferences are different from group defaults
    const group = Array.isArray(recipient.recipient_groups) ? recipient.recipient_groups[0] : recipient.recipient_groups
    const overridesGroupDefault = group ?
      preferences.frequency !== group.default_frequency ||
      !arraysEqual(preferences.preferred_channels, group.default_channels) :
      true // If no group, any preferences are considered overrides

    const { error: updateError } = await supabase
      .from('recipients')
      .update({
        frequency: preferences.frequency,
        preferred_channels: preferences.preferred_channels,
        content_types: preferences.content_types,
        overrides_group_default: overridesGroupDefault
      })
      .eq('preference_token', token)
      .eq('is_active', true)

    if (updateError) {
      logger.errorWithStack('Error updating recipient preferences:', updateError as Error)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid preference data', details: error.errors }, { status: 400 })
    }
    logger.errorWithStack('Preference update error:', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function arraysEqual(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) return false
  const sorted1 = [...arr1].sort()
  const sorted2 = [...arr2].sort()
  return sorted1.every((val, i) => val === sorted2[i])
}