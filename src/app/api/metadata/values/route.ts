/**
 * GET /api/metadata/values
 * Get all unique metadata values for a user (for filter dropdowns)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const valuesQuerySchema = z.object({
  category: z.enum(['milestones', 'locations', 'dates', 'people']).optional(),
})

export async function GET(request: NextRequest) {
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = valuesQuerySchema.parse({
      category: searchParams.get('category'),
    })

    // If category is specified, get values for that category
    if (queryParams.category) {
      const { data, error: functionError } = await supabase
        .rpc('get_user_metadata_values', {
          p_user_id: user.id,
          p_category: queryParams.category,
        })

      if (functionError) {
        // eslint-disable-next-line no-console
        console.error('Error getting metadata values:', functionError)
        return NextResponse.json(
          { error: 'Failed to get metadata values', details: functionError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        category: queryParams.category,
        values: data || [],
      })
    }

    // Otherwise, get all categories
    const categories = ['milestones', 'locations', 'dates', 'people'] as const
    const results: Record<string, Array<{ value: string; memory_count: number }>> = {}

    for (const category of categories) {
      const { data, error: functionError } = await supabase
        .rpc('get_user_metadata_values', {
          p_user_id: user.id,
          p_category: category,
        })

      if (functionError) {
        // eslint-disable-next-line no-console
        console.error(`Error getting ${category} values:`, functionError)
        results[category] = []
      } else {
        results[category] = data || []
      }
    }

    return NextResponse.json({
      success: true,
      values: results,
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Get metadata values error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
