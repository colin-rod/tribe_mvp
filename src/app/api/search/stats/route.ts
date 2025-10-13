/**
 * Search Statistics API
 * CRO-127: Suboptimal Full-Text Search Implementation
 *
 * Provides search usage statistics and analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/search/stats
 *
 * Query parameters:
 * - days: Number of days to look back (default: 30)
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    // Get statistics using the database function
    const { data, error } = await supabase.rpc('get_search_statistics', {
      user_id: user.id,
      days_back: days,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching search statistics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Transform the result
    const stats = data && data.length > 0 ? data[0] : {
      total_searches: 0,
      unique_queries: 0,
      avg_results_count: 0,
      avg_execution_time_ms: 0,
      top_queries: [],
    };

    return NextResponse.json({
      totalSearches: Number(stats.total_searches || 0),
      uniqueQueries: Number(stats.unique_queries || 0),
      avgResultsCount: Number(stats.avg_results_count || 0),
      avgExecutionTimeMs: Number(stats.avg_execution_time_ms || 0),
      topQueries: stats.top_queries || [],
      periodDays: days,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Search statistics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
