/**
 * React Query Client Configuration
 * CRO-98 Phase 3: Client-side query caching and state management
 *
 * This provides:
 * - Automatic caching of query results
 * - Background refetching
 * - Optimistic updates
 * - Request deduplication
 * - Stale-while-revalidate pattern
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ReactQuery')

/**
 * Default options for all queries
 */
const queryConfig: DefaultOptions = {
  queries: {
    // Stale time: Data is considered fresh for 30 seconds
    // Prevents unnecessary refetches for rapidly changing components
    staleTime: 30 * 1000, // 30 seconds

    // Cache time: Keep unused data in cache for 5 minutes
    // Allows instant display when navigating back
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)

    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      const err = error as { status?: number }
      if (err.status && err.status >= 400 && err.status < 500) {
        return false
      }
      // Retry up to 3 times for network/server errors
      return failureCount < 3
    },

    // Exponential backoff for retries
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch on window focus (user comes back to tab)
    refetchOnWindowFocus: true,

    // Refetch on reconnect (network comes back)
    refetchOnReconnect: true,

    // Don't refetch on mount if data is still fresh
    refetchOnMount: true,

    // Enable suspense mode for better loading states (optional)
    // suspense: false,

    // Network mode: online (default) - only fetch when online
    networkMode: 'online'
  },

  mutations: {
    // Retry mutations once on network errors
    retry: 1,

    // Network mode for mutations
    networkMode: 'online',

    // Global mutation error handler
    onError: (error) => {
      logger.error('Mutation error', { error })
    }
  }
}

/**
 * Create and configure the QueryClient
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: queryConfig
  })
}

/**
 * Singleton QueryClient instance for the application
 * Create once and reuse throughout the app
 */
export const queryClient = createQueryClient()

/**
 * Query key factory for consistent key generation
 * Helps with cache invalidation and organization
 *
 * @example
 * ```ts
 * const queryKey = queryKeys.updates.list({ parentId: 'user-123' })
 * // ['updates', 'list', { parentId: 'user-123' }]
 * ```
 */
export const queryKeys = {
  // Updates/Memories queries
  updates: {
    all: ['updates'] as const,
    lists: () => [...queryKeys.updates.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.updates.lists(), filters] as const,
    details: () => [...queryKeys.updates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.updates.details(), id] as const,
    stats: (id: string) => [...queryKeys.updates.detail(id), 'stats'] as const
  },

  // Memories (alias for updates for backwards compatibility)
  memories: {
    all: ['memories'] as const,
    lists: () => [...queryKeys.memories.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.memories.lists(), filters] as const,
    details: () => [...queryKeys.memories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.memories.details(), id] as const
  },

  // Responses queries
  responses: {
    all: ['responses'] as const,
    lists: () => [...queryKeys.responses.all, 'list'] as const,
    list: (updateId: string) =>
      [...queryKeys.responses.lists(), { updateId }] as const,
    detail: (id: string) => [...queryKeys.responses.all, 'detail', id] as const
  },

  // Comments queries
  comments: {
    all: ['comments'] as const,
    lists: () => [...queryKeys.comments.all, 'list'] as const,
    list: (updateId: string, pagination?: Record<string, unknown>) =>
      [...queryKeys.comments.lists(), { updateId, ...pagination }] as const
  },

  // Likes queries
  likes: {
    all: ['likes'] as const,
    lists: () => [...queryKeys.likes.all, 'list'] as const,
    list: (updateId: string) =>
      [...queryKeys.likes.lists(), { updateId }] as const,
    userLikes: (userId: string) =>
      [...queryKeys.likes.all, 'user', userId] as const
  },

  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    stats: (userId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.dashboard.all, 'stats', userId, filters] as const,
    timeline: (userId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.dashboard.all, 'timeline', userId, filters] as const
  },

  // Children queries
  children: {
    all: ['children'] as const,
    lists: () => [...queryKeys.children.all, 'list'] as const,
    list: (parentId: string) =>
      [...queryKeys.children.lists(), { parentId }] as const,
    detail: (id: string) => [...queryKeys.children.all, 'detail', id] as const
  },

  // Recipients queries
  recipients: {
    all: ['recipients'] as const,
    lists: () => [...queryKeys.recipients.all, 'list'] as const,
    list: (parentId: string) =>
      [...queryKeys.recipients.lists(), { parentId }] as const,
    detail: (id: string) =>
      [...queryKeys.recipients.all, 'detail', id] as const
  },

  // Groups queries
  groups: {
    all: ['groups'] as const,
    lists: () => [...queryKeys.groups.all, 'list'] as const,
    list: (parentId: string) =>
      [...queryKeys.groups.lists(), { parentId }] as const,
    detail: (id: string) => [...queryKeys.groups.all, 'detail', id] as const
  },

  // Search queries
  search: {
    all: ['search'] as const,
    results: (query: string, filters?: Record<string, unknown>) =>
      [...queryKeys.search.all, 'results', query, filters] as const
  }
} as const

/**
 * Helper to invalidate all queries for a specific entity
 *
 * @example
 * ```ts
 * // Invalidate all update queries after creating a new update
 * await invalidateQueries(queryClient, 'updates')
 * ```
 */
export async function invalidateQueries(
  client: QueryClient,
  entity: keyof typeof queryKeys
): Promise<void> {
  await client.invalidateQueries({
    queryKey: queryKeys[entity].all
  })
}

/**
 * Helper to prefetch data for better UX
 *
 * @example
 * ```ts
 * // Prefetch update details when hovering over a link
 * await prefetchQuery(queryClient, queryKeys.updates.detail(updateId), () =>
 *   fetchUpdateById(updateId)
 * )
 * ```
 */
export async function prefetchQuery<T>(
  client: QueryClient,
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
): Promise<void> {
  await client.prefetchQuery({
    queryKey,
    queryFn
  })
}

/**
 * Helper to set query data directly (for optimistic updates)
 *
 * @example
 * ```ts
 * // Optimistically update like count
 * setQueryData(
 *   queryClient,
 *   queryKeys.updates.detail(updateId),
 *   (old) => ({ ...old, like_count: old.like_count + 1 })
 * )
 * ```
 */
export function setQueryData<T>(
  client: QueryClient,
  queryKey: readonly unknown[],
  updater: T | ((old: T | undefined) => T)
): void {
  client.setQueryData(queryKey, updater)
}
