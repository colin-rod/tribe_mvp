/**
 * React Query - Central Export
 * CRO-98 Phase 3: Client-side caching layer
 *
 * This module provides a comprehensive caching solution for the application:
 * - Automatic query caching and background refetching
 * - Optimistic updates for better UX
 * - Request deduplication
 * - Stale-while-revalidate patterns
 * - Loading and error state management
 */

// Core React Query exports
export { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Custom configuration
export { createQueryClient, queryClient, queryKeys, invalidateQueries, prefetchQuery, setQueryData } from './client'

// Provider component
export { ReactQueryProvider } from './provider'

// Hooks for updates/memories
export {
  useRecentUpdates,
  useRecentMemories,
  useUpdate,
  useInvalidateUpdates,
  useOptimisticUpdate,
  useCreateUpdateMutation,
  usePrefetchUpdates
} from './hooks/useUpdates'

// Type exports
export type { QueryKey, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
