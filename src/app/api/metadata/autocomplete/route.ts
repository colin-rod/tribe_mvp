/**
 * GET /api/metadata/autocomplete
 * Get autocomplete suggestions for metadata based on user's vocabulary
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const autocompleteQuerySchema = z.object({
  category: z.enum(['milestones', 'locations', 'dates', 'people']),
  query: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
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
    const queryParams = autocompleteQuerySchema.parse({
      category: searchParams.get('category'),
      query: searchParams.get('query') || '',
      limit: searchParams.get('limit'),
    })

    // Call the PostgreSQL function for autocomplete
    const { data, error: functionError } = await supabase
      .rpc('get_metadata_autocomplete', {
        p_user_id: user.id,
        p_category: queryParams.category,
        p_query: queryParams.query,
        p_limit: queryParams.limit,
      })

    if (functionError) {
      // eslint-disable-next-line no-console
      console.error('Error getting autocomplete suggestions:', functionError)
      return NextResponse.json(
        { error: 'Failed to get autocomplete suggestions', details: functionError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      suggestions: data || [],
    })

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Autocomplete error:', error)

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
