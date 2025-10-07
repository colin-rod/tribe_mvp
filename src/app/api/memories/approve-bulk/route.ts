/**
 * POST /api/memories/approve-bulk
 * Approve multiple memories in a single request (batch operation)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const approveBulkSchema = z.object({
  memoryIds: z.array(z.string().uuid()).min(1).max(100), // Max 100 at a time
})

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    const { memoryIds } = approveBulkSchema.parse(body)

    // Batch update memory statuses
    const { data: memories, error: updateError } = await supabase
      .from('memories')
      .update({
        distribution_status: 'approved',
        is_new: false,
        marked_ready_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', memoryIds)
      .eq('parent_id', user.id)  // Security: ensure user owns these memories
      .select()

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error('Error approving memories:', updateError)
      return NextResponse.json(
        { error: 'Failed to approve memories', details: updateError.message },
        { status: 500 }
      )
    }

    const approvedCount = memories?.length || 0

    // Check if any memories were not found/authorized
    if (approvedCount < memoryIds.length) {
      return NextResponse.json({
        success: true,
        approved: approvedCount,
        requested: memoryIds.length,
        warning: 'Some memories were not found or unauthorized',
        memories,
      })
    }

    return NextResponse.json({
      success: true,
      approved: approvedCount,
      memories,
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Approve bulk memories error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
