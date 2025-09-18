import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(
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

    // Get current recipient and group info
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
      return NextResponse.json({ error: 'Invalid preference link or no group assigned' }, { status: 404 })
    }

    const group = Array.isArray(recipient.recipient_groups) ? recipient.recipient_groups[0] : recipient.recipient_groups

    if (!group) {
      return NextResponse.json({ error: 'No group assigned to recipient' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('recipients')
      .update({
        frequency: group.default_frequency,
        preferred_channels: group.default_channels,
        content_types: ['photos', 'text'], // Default content types
        overrides_group_default: false
      })
      .eq('preference_token', token)
      .eq('is_active', true)

    if (updateError) {
      console.error('Error resetting to group defaults:', updateError)
      return NextResponse.json({ error: 'Failed to reset preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Preference reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}