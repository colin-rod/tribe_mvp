/**
 * Search Analytics API
 * CRO-127: Suboptimal Full-Text Search Implementation
 *
 * Tracks search queries and user interactions for analytics and improvement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/search/analytics
 *
 * Track a search query and optionally a clicked result
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      query,
      resultsCount,
      executionTimeMs,
      searchTypes = [],
      clickedResultId,
      clickedResultType,
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Insert analytics record
    const { error: insertError } = await supabase
      .from('search_analytics')
      .insert({
        user_id: user.id,
        query: query.trim(),
        results_count: resultsCount || 0,
        execution_time_ms: executionTimeMs || null,
        search_types: searchTypes,
        clicked_result_id: clickedResultId || null,
        clicked_result_type: clickedResultType || null,
      });

    if (insertError) {
      // eslint-disable-next-line no-console
      console.error('Error inserting search analytics:', insertError);
      return NextResponse.json(
        { error: 'Failed to track analytics' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Search analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
