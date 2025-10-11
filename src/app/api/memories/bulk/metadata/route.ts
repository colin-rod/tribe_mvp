/**
 * PATCH /api/memories/bulk/metadata
 * Bulk update metadata across multiple memories
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const bulkUpdateSchema = z.object({
  memory_ids: z.array(z.string().uuid()).min(1).max(100), // Max 100 memories at once
  category: z.enum(['milestones', 'locations', 'dates', 'people']),
  values: z.array(z.string().max(50)).max(10),
  operation: z.enum(['add', 'remove', 'replace']),
})

export async function PATCH(request: NextRequest) {
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
    const { memory_ids, category, values, operation } = bulkUpdateSchema.parse(body)

    // Call the PostgreSQL function for bulk update
    const { data, error: functionError } = await supabase
      .rpc('bulk_update_metadata', {
        p_user_id: user.id,
        p_memory_ids: memory_ids,
        p_category: category,
        p_values: values,
        p_operation: operation,
      })

    if (functionError) {
      // eslint-disable-next-line no-console
      console.error('Error in bulk metadata update:', functionError)
      return NextResponse.json(
        { error: 'Failed to bulk update metadata', details: functionError.message },
        { status: 500 }
      )
    }

    // Fetch updated memories to return
    const { data: updatedMemories, error: fetchError } = await supabase
      .from('memories')
      .select('id, metadata, updated_at')
      .in('id', memory_ids)
      .eq('parent_id', user.id)

    if (fetchError) {
      // eslint-disable-next-line no-console
      console.error('Error fetching updated memories:', fetchError)
    }

    return NextResponse.json({
      success: true,
      affected_count: data || 0,
      updated_memory_ids: memory_ids,
      memories: updatedMemories || [],
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Bulk update metadata error:', error)

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
