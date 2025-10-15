/**
 * Cursor Pagination Utilities
 * CRO-123: Cursor-based pagination implementation
 *
 * Provides utilities for encoding/decoding pagination cursors and working with
 * cursor-based pagination patterns for efficient pagination at scale.
 */

export interface PaginationCursor {
  createdAt: string
  id: string
}

/**
 * Encode cursor for URL transmission
 * Converts cursor object to base64-encoded string safe for URLs
 *
 * @param cursor - The pagination cursor to encode
 * @returns Base64-encoded cursor string
 *
 * @example
 * const cursor = { createdAt: '2025-10-15T12:00:00Z', id: 'abc-123' }
 * const encoded = encodeCursor(cursor)
 * // Returns: "eyJjcmVhdGVkQXQiOiIyMDI1LTEwLTE1VDEyOjAwOjAwWiIsImlkIjoiYWJjLTEyMyJ9"
 */
export function encodeCursor(cursor: PaginationCursor): string {
  const json = JSON.stringify(cursor)
  // Use browser-safe base64 encoding
  if (typeof window !== 'undefined') {
    return btoa(json)
  }
  // Node.js environment
  return Buffer.from(json, 'utf-8').toString('base64')
}

/**
 * Decode cursor from URL parameter
 * Converts base64-encoded string back to cursor object
 *
 * @param encoded - The base64-encoded cursor string
 * @returns Decoded cursor object or null if invalid
 *
 * @example
 * const encoded = "eyJjcmVhdGVkQXQiOiIyMDI1LTEwLTE1VDEyOjAwOjAwWiIsImlkIjoiYWJjLTEyMyJ9"
 * const cursor = decodeCursor(encoded)
 * // Returns: { createdAt: '2025-10-15T12:00:00Z', id: 'abc-123' }
 */
export function decodeCursor(encoded: string): PaginationCursor | null {
  try {
    // Use browser-safe base64 decoding
    let json: string
    if (typeof window !== 'undefined') {
      json = atob(encoded)
    } else {
      // Node.js environment
      json = Buffer.from(encoded, 'base64').toString('utf-8')
    }

    const cursor = JSON.parse(json) as PaginationCursor

    // Validate cursor structure
    if (!cursor.createdAt || !cursor.id) {
      return null
    }

    return cursor
  } catch {
    return null
  }
}

/**
 * Extract cursor from last item in result set
 * Used to generate the next page cursor from current results
 *
 * @param items - Array of items with created_at and id fields
 * @returns Cursor object or undefined if no items
 *
 * @example
 * const items = [
 *   { created_at: '2025-10-15T10:00:00Z', id: '1', ... },
 *   { created_at: '2025-10-15T11:00:00Z', id: '2', ... }
 * ]
 * const cursor = extractCursor(items)
 * // Returns: { createdAt: '2025-10-15T11:00:00Z', id: '2' }
 */
export function extractCursor<T extends { created_at: string; id: string }>(
  items: T[]
): PaginationCursor | undefined {
  const lastItem = items[items.length - 1]
  if (!lastItem) return undefined

  return {
    createdAt: lastItem.created_at,
    id: lastItem.id
  }
}

/**
 * Check if there are more results beyond current page
 * Compares result count with limit to determine if hasMore
 *
 * @param resultCount - Number of items returned
 * @param limit - Requested page size
 * @returns true if more results exist
 *
 * @example
 * const hasMore = hasMoreResults(21, 20) // Returns: true
 * const hasMore = hasMoreResults(20, 20) // Returns: false
 */
export function hasMoreResults(resultCount: number, limit: number): boolean {
  return resultCount > limit
}

/**
 * Normalize pagination parameters from various sources
 * Supports both cursor and legacy offset parameters
 *
 * @param params - Raw pagination parameters from request
 * @returns Normalized pagination parameters
 */
export function normalizePaginationParams(params: {
  limit?: string | number
  offset?: string | number
  cursor?: string
  cursorCreatedAt?: string
  cursorId?: string
}): {
  limit: number
  offset?: number
  cursor?: PaginationCursor
} {
  const limit = typeof params.limit === 'string'
    ? parseInt(params.limit, 10)
    : params.limit || 20

  // Cap limit at reasonable maximum
  const normalizedLimit = Math.min(Math.max(limit, 1), 100)

  // Handle cursor parameter (preferred)
  if (params.cursor) {
    const cursor = decodeCursor(params.cursor)
    return {
      limit: normalizedLimit,
      cursor: cursor || undefined
    }
  }

  // Handle legacy cursorCreatedAt/cursorId parameters
  if (params.cursorCreatedAt && params.cursorId) {
    return {
      limit: normalizedLimit,
      cursor: {
        createdAt: params.cursorCreatedAt,
        id: params.cursorId
      }
    }
  }

  // Handle legacy offset parameter
  if (params.offset !== undefined) {
    const offset = typeof params.offset === 'string'
      ? parseInt(params.offset, 10)
      : params.offset

    return {
      limit: normalizedLimit,
      offset: Math.max(offset, 0)
    }
  }

  // No pagination parameters
  return { limit: normalizedLimit }
}

/**
 * Build pagination response metadata
 * Creates consistent pagination metadata for API responses
 *
 * @param data - The result data array
 * @param limit - The requested page size
 * @param total - Optional total count (expensive to compute)
 * @returns Pagination metadata object
 */
export function buildPaginationResponse<T extends { created_at: string; id: string }>(
  data: T[],
  limit: number,
  total?: number
): {
  hasMore: boolean
  nextCursor?: string
  total?: number
} {
  const hasMore = hasMoreResults(data.length, limit)

  // If we fetched limit+1, remove the extra item and extract cursor from last visible item
  const visibleData = hasMore ? data.slice(0, limit) : data
  const cursor = hasMore ? extractCursor(visibleData) : undefined

  return {
    hasMore,
    nextCursor: cursor ? encodeCursor(cursor) : undefined,
    total
  }
}

/**
 * Validate cursor timestamp
 * Ensures cursor timestamp is valid and not in the future
 *
 * @param timestamp - ISO 8601 timestamp string
 * @returns true if valid, false otherwise
 */
export function isValidCursorTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp)
    const now = new Date()

    // Check if valid date and not in the future
    return !isNaN(date.getTime()) && date <= now
  } catch {
    return false
  }
}

/**
 * Create pagination cursor from item
 * Helper to create cursor from any item with timestamp and id
 *
 * @param item - Item with created_at and id fields
 * @returns Pagination cursor
 */
export function createCursor<T extends { created_at: string; id: string }>(
  item: T
): PaginationCursor {
  return {
    createdAt: item.created_at,
    id: item.id
  }
}
