import { useState, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import type { DraftUpdate, DraftUpdateRequest, DraftWorkspaceSummary, DraftFilters } from '@/lib/types/digest'
import {
  createDraft,
  updateDraft,
  addMediaToDraft,
  addTextToDraft,
  markDraftAsReady,
  markReadyAsDraft,
  deleteDraft,
  getDrafts,
  getDraftWorkspaceSummary,
  getDraftById
} from '@/lib/services/draftService'

const logger = createLogger('useDraftManagement')

export function useDraftManagement() {
  const [drafts, setDrafts] = useState<DraftUpdate[]>([])
  const [summary, setSummary] = useState<DraftWorkspaceSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load all drafts with optional filters
   */
  const loadDrafts = useCallback(async (filters?: DraftFilters) => {
    setLoading(true)
    setError(null)

    try {
      const data = await getDrafts(filters)
      setDrafts(data)
      logger.info('Drafts loaded', { count: data.length })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load drafts'
      setError(message)
      logger.error('Failed to load drafts', { error: err })
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Load workspace summary
   */
  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getDraftWorkspaceSummary()
      setSummary(data)
      logger.info('Summary loaded', { summary: data })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load summary'
      setError(message)
      logger.error('Failed to load summary', { error: err })
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Create new draft
   */
  const create = useCallback(async (data: DraftUpdateRequest): Promise<DraftUpdate | null> => {
    setLoading(true)
    setError(null)

    try {
      const draft = await createDraft(data)
      logger.info('Draft created', { draftId: draft.id })
      await loadDrafts() // Refresh list
      await loadSummary() // Refresh summary
      return draft
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create draft'
      setError(message)
      logger.error('Failed to create draft', { error: err })
      return null
    } finally {
      setLoading(false)
    }
  }, [loadDrafts, loadSummary])

  /**
   * Update existing draft
   */
  const update = useCallback(async (draftId: string, data: Partial<DraftUpdateRequest>): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await updateDraft(draftId, data)
      logger.info('Draft updated', { draftId })
      await loadDrafts() // Refresh list
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update draft'
      setError(message)
      logger.error('Failed to update draft', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [loadDrafts])

  /**
   * Add media to draft
   */
  const addMedia = useCallback(async (draftId: string, mediaUrls: string[]): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await addMediaToDraft(draftId, mediaUrls)
      logger.info('Media added to draft', { draftId, count: mediaUrls.length })
      await loadDrafts() // Refresh list
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add media'
      setError(message)
      logger.error('Failed to add media', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [loadDrafts])

  /**
   * Add text to draft
   */
  const addText = useCallback(async (draftId: string, text: string, append: boolean = false): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await addTextToDraft(draftId, text, append)
      logger.info('Text added to draft', { draftId, append })
      await loadDrafts() // Refresh list
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add text'
      setError(message)
      logger.error('Failed to add text', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [loadDrafts])

  /**
   * Mark draft as ready
   */
  const markReady = useCallback(async (draftId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await markDraftAsReady(draftId)
      logger.info('Draft marked as ready', { draftId })
      await loadDrafts() // Refresh list
      await loadSummary() // Refresh summary
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark as ready'
      setError(message)
      logger.error('Failed to mark as ready', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [loadDrafts, loadSummary])

  /**
   * Mark ready memory back to draft
   */
  const unmarkReady = useCallback(async (updateId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await markReadyAsDraft(updateId)
      logger.info('Memory marked as draft', { updateId })
      await loadDrafts() // Refresh list
      await loadSummary() // Refresh summary
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark as draft'
      setError(message)
      logger.error('Failed to mark as draft', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [loadDrafts, loadSummary])

  /**
   * Delete draft
   */
  const remove = useCallback(async (draftId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await deleteDraft(draftId)
      logger.info('Draft deleted', { draftId })
      await loadDrafts() // Refresh list
      await loadSummary() // Refresh summary
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete draft'
      setError(message)
      logger.error('Failed to delete draft', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [loadDrafts, loadSummary])

  /**
   * Get single draft by ID
   */
  const getDraft = useCallback(async (draftId: string): Promise<DraftUpdate | null> => {
    setLoading(true)
    setError(null)

    try {
      const draft = await getDraftById(draftId)
      logger.info('Draft fetched', { draftId, found: !!draft })
      return draft
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch draft'
      setError(message)
      logger.error('Failed to fetch draft', { error: err })
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    drafts,
    summary,
    loading,
    error,
    loadDrafts,
    loadSummary,
    create,
    update,
    addMedia,
    addText,
    markReady,
    unmarkReady,
    remove,
    getDraft
  }
}