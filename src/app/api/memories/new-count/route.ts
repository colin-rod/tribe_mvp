/**
 * GET /api/memories/new-count
 * Get count of new (unapproved) memories for badge display
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Count new memories
    const { count, error: countError } = await supabase
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', user.id)
      .eq('is_new', true)

    if (countError) {
      // eslint-disable-next-line no-console
      console.error('Error counting new memories:', countError)
      return NextResponse.json(
        { error: 'Failed to count new memories', details: countError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('New count error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
