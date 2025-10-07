/**
 * POST /api/memories/approve
 * Approve a single memory (mark as ready for compilation)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const approveSchema = z.object({
  memoryId: z.string().uuid(),
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
    const { memoryId } = approveSchema.parse(body)

    // Update memory status
    const { data: memory, error: updateError } = await supabase
      .from('memories')
      .update({
        distribution_status: 'approved',
        is_new: false,
        marked_ready_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', memoryId)
      .eq('parent_id', user.id)  // Security: ensure user owns this memory
      .select()
      .single()

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error('Error approving memory:', updateError)
      return NextResponse.json(
        { error: 'Failed to approve memory', details: updateError.message },
        { status: 500 }
      )
    }

    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      memory,
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Approve memory error:', error)

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
