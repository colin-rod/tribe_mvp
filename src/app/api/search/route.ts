/**
 * Full-Text Search API
 * CRO-127: Suboptimal Full-Text Search Implementation
 * CRO-123: Cursor-based pagination implementation
 *
 * Provides server-side full-text search using PostgreSQL FTS
 * with result ranking, highlighting, and performance optimization.
 * Now supports cursor-based pagination for efficient deep pagination.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { normalizePaginationParams } from '@/lib/utils/pagination';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Search result types
export type SearchResultType = 'memory' | 'comment' | 'child' | 'recipient' | 'group';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  content?: string;
  excerpt?: string;
  url: string;
  rank: number;
  metadata?: Record<string, unknown>;
  highlights?: {
    title?: string;
    content?: string;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  executionTime: number;
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
  };
}

/**
 * GET /api/search
 *
 * Query parameters:
 * - q: Search query (required)
 * - types: Comma-separated list of types to search (optional)
 * - limit: Maximum number of results (default: 50, max: 100)
 * - cursor: Base64-encoded cursor for pagination (preferred over offset)
 * - offset: Pagination offset (default: 0, deprecated - use cursor instead)
 * - includeHighlights: Include search term highlights (default: true)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

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
    const query = searchParams.get('q')?.trim();
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const includeHighlights = searchParams.get('includeHighlights') !== 'false';

    // Normalize pagination parameters (supports both cursor and offset)
    const paginationParams = normalizePaginationParams({
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      cursor: searchParams.get('cursor') || undefined
    });

    const limit = paginationParams.limit;
    const cursor = paginationParams.cursor;
    const offset = paginationParams.offset || 0;


    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Prepare search query for PostgreSQL FTS
    const tsQuery = query
      .split(/\s+/)
      .filter(Boolean)
      .map(term => `${term}:*`)
      .join(' & ');

    const results: SearchResult[] = [];
    let totalResults = 0;

    // Search memories (updates) if no types specified or 'memory' is included
    if (types.length === 0 || types.includes('memory')) {
      // Use cursor-based function if cursor provided, otherwise fall back to offset
      const searchFunction = cursor ? 'search_memories_cursor' : 'search_memories';
      const searchParams = cursor
        ? {
            search_query: tsQuery,
            user_id: user.id,
            result_limit: limit + 1, // Fetch one extra to determine hasMore
            cursor_created_at: cursor.createdAt,
            cursor_id: cursor.id
          }
        : {
            search_query: tsQuery,
            user_id: user.id,
            result_limit: limit,
            result_offset: offset
          };

      const { data: memories, error: memoriesError } = await supabase.rpc(searchFunction as 'search_memories', searchParams);

      if (memoriesError) {
        // eslint-disable-next-line no-console
        console.error('Error searching memories:', memoriesError);
      } else if (memories) {
        type MemorySearchResult = {
          id: string
          subject: string | null
          content: string | null
          child_id: string
          distribution_status: string
          created_at: string
          search_rank: number
        }
        const typedMemories = memories as unknown as MemorySearchResult[]
        totalResults += typedMemories.length;

        for (const memory of typedMemories) {
          results.push({
            id: memory.id,
            type: 'memory',
            title: memory.subject || 'Untitled Memory',
            content: memory.content || undefined,
            excerpt: generateExcerpt(memory.content, query),
            url: memory.distribution_status === 'draft'
              ? `/dashboard/drafts/${memory.id}/edit`
              : `/dashboard/memories/${memory.id}`,
            rank: memory.search_rank,
            metadata: {
              childId: memory.child_id,
              status: memory.distribution_status,
              createdAt: memory.created_at,
            },
            highlights: includeHighlights ? {
              title: highlightMatches(memory.subject || '', query),
              content: highlightMatches(generateExcerpt(memory.content, query), query),
            } : undefined,
          });
        }
      }
    }

    // Search comments if requested
    if (types.includes('comment')) {
      // Use cursor-based function if cursor provided, otherwise fall back to offset
      const searchFunction = cursor ? 'search_comments_cursor' : 'search_comments';
      const searchParams = cursor
        ? {
            search_query: tsQuery,
            user_id: user.id,
            result_limit: limit + 1, // Fetch one extra to determine hasMore
            cursor_created_at: cursor.createdAt,
            cursor_id: cursor.id
          }
        : {
            search_query: tsQuery,
            user_id: user.id,
            result_limit: limit,
            result_offset: offset
          };

      const { data: comments, error: commentsError } = await supabase.rpc(searchFunction as 'search_comments', searchParams);

      if (commentsError) {
        // eslint-disable-next-line no-console
        console.error('Error searching comments:', commentsError);
      } else if (comments) {
        type CommentSearchResult = {
          id: string
          content: string
          update_id: string
          update_subject: string | null
          created_at: string
          search_rank: number
        }
        const typedComments = comments as unknown as CommentSearchResult[]
        totalResults += typedComments.length;

        for (const comment of typedComments) {
          results.push({
            id: comment.id,
            type: 'comment',
            title: `Comment on ${comment.update_subject || 'Update'}`,
            content: comment.content,
            excerpt: generateExcerpt(comment.content, query),
            url: `/dashboard/memories/${comment.update_id}#comment-${comment.id}`,
            rank: comment.search_rank,
            metadata: {
              updateId: comment.update_id,
              createdAt: comment.created_at,
            },
            highlights: includeHighlights ? {
              content: highlightMatches(generateExcerpt(comment.content, query), query),
            } : undefined,
          });
        }
      }
    }

    // Search children if no types specified or 'child' is included
    if (types.length === 0 || types.includes('child')) {
      const { data: children, error: childrenError } = await supabase
        .from('children')
        .select('id, name, birth_date')
        .eq('parent_id', user.id)
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (childrenError) {
        // eslint-disable-next-line no-console
        console.error('Error searching children:', childrenError);
      } else if (children) {
        totalResults += children.length;

        for (const child of children) {
          results.push({
            id: child.id,
            type: 'child',
            title: child.name,
            url: `/dashboard/children?selected=${child.id}`,
            rank: 0.5, // Lower rank for simple ILIKE matches
            metadata: {
              birthDate: child.birth_date,
            },
            highlights: includeHighlights ? {
              title: highlightMatches(child.name, query),
            } : undefined,
          });
        }
      }
    }

    // Search recipients if no types specified or 'recipient' is included
    if (types.length === 0 || types.includes('recipient')) {
      const { data: recipients, error: recipientsError } = await supabase
        .from('recipients')
        .select('id, name, email, relationship')
        .eq('parent_id', user.id)
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('name')
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (recipientsError) {
        // eslint-disable-next-line no-console
        console.error('Error searching recipients:', recipientsError);
      } else if (recipients) {
        totalResults += recipients.length;

        for (const recipient of recipients) {
          results.push({
            id: recipient.id,
            type: 'recipient',
            title: recipient.name,
            content: recipient.email || undefined,
            url: `/dashboard/recipients?selected=${recipient.id}`,
            rank: 0.5, // Lower rank for simple ILIKE matches
            metadata: {
              relationship: recipient.relationship,
              email: recipient.email,
            },
            highlights: includeHighlights ? {
              title: highlightMatches(recipient.name, query),
              content: recipient.email ? highlightMatches(recipient.email, query) : undefined,
            } : undefined,
          });
        }
      }
    }

    // Search groups if no types specified or 'group' is included
    if (types.length === 0 || types.includes('group')) {
      const { data: groups, error: groupsError } = await supabase
        .from('recipient_groups')
        .select('id, name, default_frequency')
        .eq('parent_id', user.id)
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (groupsError) {
        // eslint-disable-next-line no-console
        console.error('Error searching groups:', groupsError);
      } else if (groups) {
        totalResults += groups.length;

        for (const group of groups) {
          results.push({
            id: group.id,
            type: 'group',
            title: group.name,
            url: `/dashboard/groups?selected=${group.id}`,
            rank: 0.5, // Lower rank for simple ILIKE matches
            metadata: {
              frequency: group.default_frequency,
            },
            highlights: includeHighlights ? {
              title: highlightMatches(group.name, query),
            } : undefined,
          });
        }
      }
    }

    // Sort results by rank (highest first)
    results.sort((a, b) => b.rank - a.rank);

    const executionTime = Date.now() - startTime;

    // Build pagination metadata
    // Note: For search results sorted by rank, cursor pagination is less straightforward
    // We'll provide nextCursor based on the last result's created_at and id
    const hasMore = cursor ? results.length > limit : false;
    const visibleResults = hasMore ? results.slice(0, limit) : results;

    let nextCursor: string | undefined;
    if (hasMore && visibleResults.length > 0) {
      const lastResult = visibleResults[visibleResults.length - 1];
      if (lastResult.metadata?.createdAt && lastResult.id) {
        const cursorObj = {
          createdAt: lastResult.metadata.createdAt as string,
          id: lastResult.id
        };
        // Use the encoding function from pagination utils
        nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
      }
    }

    const response: SearchResponse = {
      results: visibleResults,
      total: totalResults,
      query,
      executionTime,
      pagination: {
        hasMore,
        nextCursor
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate a contextual excerpt around the search query
 */
function generateExcerpt(content: string | null, query: string, maxLength = 200): string {
  if (!content) return '';

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryIndex = lowerContent.indexOf(lowerQuery);

  if (queryIndex === -1) {
    // Query not found, return beginning
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  // Calculate start position (try to center the query)
  const halfLength = Math.floor(maxLength / 2);
  let start = Math.max(0, queryIndex - halfLength);

  // Adjust start to not break words
  if (start > 0) {
    const spaceIndex = content.indexOf(' ', start);
    if (spaceIndex !== -1 && spaceIndex < start + 20) {
      start = spaceIndex + 1;
    }
  }

  let excerpt = content.substring(start, start + maxLength);

  // Add ellipsis if needed
  if (start > 0) excerpt = '...' + excerpt;
  if (start + maxLength < content.length) excerpt = excerpt + '...';

  return excerpt.trim();
}

/**
 * Highlight search terms in text
 */
function highlightMatches(text: string, query: string): string {
  if (!text || !query) return text;

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let result = text;

  for (const term of terms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  }

  return result;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
