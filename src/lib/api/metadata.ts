/**
 * API client functions for memory metadata operations
 */

import type {
  MemoryMetadata,
  MetadataCategory,
  MetadataAutocompleteRequest,
  MetadataAutocompleteResponse,
  UpdateMetadataRequest,
  UpdateMetadataCategoryRequest,
  BulkUpdateMetadataRequest,
  BulkUpdateMetadataResponse,
} from '@/lib/types/memory'

/**
 * Update full metadata for a memory
 */
export async function updateMemoryMetadata(
  memoryId: string,
  metadata: MemoryMetadata
): Promise<void> {
  const response = await fetch(`/api/memories/${memoryId}/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ metadata }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update metadata')
  }

  return response.json()
}

/**
 * Update specific metadata category for a memory
 */
export async function updateMetadataCategory(
  memoryId: string,
  category: MetadataCategory,
  values: string[]
): Promise<void> {
  const response = await fetch(`/api/memories/${memoryId}/metadata`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category, values }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update metadata category')
  }

  return response.json()
}

/**
 * Remove specific metadata category from a memory
 */
export async function removeMetadataCategory(
  memoryId: string,
  category: MetadataCategory
): Promise<void> {
  const response = await fetch(`/api/memories/${memoryId}/metadata`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to remove metadata category')
  }

  return response.json()
}

/**
 * Bulk update metadata across multiple memories
 */
export async function bulkUpdateMetadata(
  memoryIds: string[],
  category: MetadataCategory,
  values: string[],
  operation: 'add' | 'remove' | 'replace'
): Promise<BulkUpdateMetadataResponse> {
  const response = await fetch('/api/memories/bulk/metadata', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      memory_ids: memoryIds,
      category,
      values,
      operation,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to bulk update metadata')
  }

  return response.json()
}

/**
 * Get autocomplete suggestions for metadata
 */
export async function getMetadataAutocomplete(
  category: MetadataCategory,
  query?: string,
  limit?: number
): Promise<MetadataAutocompleteResponse> {
  const params = new URLSearchParams({
    category,
    ...(query && { query }),
    ...(limit && { limit: limit.toString() }),
  })

  const response = await fetch(`/api/metadata/autocomplete?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get autocomplete suggestions')
  }

  return response.json()
}

/**
 * Get all unique metadata values for a category (for filters)
 */
export async function getMetadataValues(
  category?: MetadataCategory
): Promise<{
  success: boolean
  values: Record<string, Array<{ value: string; memory_count: number }>> | Array<{ value: string; memory_count: number }>
  category?: MetadataCategory
}> {
  const params = new URLSearchParams()
  if (category) {
    params.set('category', category)
  }

  const response = await fetch(`/api/metadata/values?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get metadata values')
  }

  return response.json()
}

/**
 * Helper: Add metadata tags to a memory
 */
export async function addMetadataTags(
  memoryId: string,
  category: MetadataCategory,
  tags: string[]
): Promise<void> {
  return updateMetadataCategory(memoryId, category, tags)
}

/**
 * Helper: Remove metadata tags from a memory
 */
export async function removeMetadataTags(
  memoryId: string,
  category: MetadataCategory
): Promise<void> {
  return removeMetadataCategory(memoryId, category)
}

/**
 * Helper: Add a single tag to existing metadata
 */
export async function addSingleTag(
  memoryId: string,
  category: MetadataCategory,
  tag: string,
  existingTags: string[]
): Promise<void> {
  const updatedTags = [...new Set([...existingTags, tag])]
  return updateMetadataCategory(memoryId, category, updatedTags)
}

/**
 * Helper: Remove a single tag from existing metadata
 */
export async function removeSingleTag(
  memoryId: string,
  category: MetadataCategory,
  tag: string,
  existingTags: string[]
): Promise<void> {
  const updatedTags = existingTags.filter(t => t !== tag)
  return updateMetadataCategory(memoryId, category, updatedTags)
}
