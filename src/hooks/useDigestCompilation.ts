import { useState, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import type {
  Digest,
  CompileDigestRequest,
  DigestPreviewData,
  CustomizeDigestRequest,
  ApproveDigestRequest,
  DigestStats
} from '@/lib/types/digest'
import {
  compileDigest,
  getDigestPreview,
  customizeDigestForRecipient,
  approveDigest,
  getDigestById,
  getDigests,
  getDigestStats,
  deleteDigest
} from '@/lib/services/digestService'

const logger = createLogger('useDigestCompilation')

export function useDigestCompilation() {
  const [digest, setDigest] = useState<Digest | null>(null)
  const [previewData, setPreviewData] = useState<DigestPreviewData | null>(null)
  const [digests, setDigests] = useState<Digest[]>([])
  const [stats, setStats] = useState<DigestStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [compilationProgress, setCompilationProgress] = useState<number>(0)

  /**
   * Compile new digest from ready updates
   */
  const compile = useCallback(async (
    request: Omit<CompileDigestRequest, 'parent_id'>
  ): Promise<{ success: boolean; digestId?: string }> => {
    setLoading(true)
    setError(null)
    setCompilationProgress(0)

    try {
      logger.info('Starting digest compilation', { request })
      setCompilationProgress(25)

      const response = await compileDigest(request)

      setCompilationProgress(75)

      if (!response.success) {
        throw new Error(response.error || 'Compilation failed')
      }

      setDigest(response.digest || null)
      setPreviewData(response.preview_data || null)
      setCompilationProgress(100)

      logger.info('Digest compiled successfully', { digestId: response.digest?.id })

      return {
        success: true,
        digestId: response.digest?.id
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to compile digest'
      setError(message)
      logger.error('Compilation failed', { error: err })
      return { success: false }
    } finally {
      setLoading(false)
      setTimeout(() => setCompilationProgress(0), 1000)
    }
  }, [])

  /**
   * Load preview data for digest
   */
  const loadPreview = useCallback(async (digestId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const data = await getDigestPreview(digestId)
      setDigest(data.digest)
      setPreviewData(data)
      logger.info('Preview loaded', { digestId, recipientCount: data.recipients.length })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load preview'
      setError(message)
      logger.error('Failed to load preview', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Customize digest for specific recipient
   */
  const customize = useCallback(async (request: CustomizeDigestRequest): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await customizeDigestForRecipient(request)
      logger.info('Digest customized', { digestId: request.digest_id, recipientId: request.recipient_id })

      // Reload preview to show changes
      if (digest) {
        await loadPreview(digest.id)
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to customize digest'
      setError(message)
      logger.error('Failed to customize', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [digest, loadPreview])

  /**
   * Approve and optionally send digest
   */
  const approve = useCallback(async (request: ApproveDigestRequest): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await approveDigest(request)
      logger.info('Digest approved', { digestId: request.digest_id, sendImmediately: request.send_immediately })

      // Reload digest to show updated status
      if (digest) {
        const updated = await getDigestById(request.digest_id)
        setDigest(updated)
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve digest'
      setError(message)
      logger.error('Failed to approve', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [digest])

  /**
   * Load all digests
   */
  const loadDigests = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const data = await getDigests()
      setDigests(data)
      logger.info('Digests loaded', { count: data.length })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load digests'
      setError(message)
      logger.error('Failed to load digests', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Load digest statistics
   */
  const loadStats = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const data = await getDigestStats()
      setStats(data)
      logger.info('Stats loaded', { stats: data })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load stats'
      setError(message)
      logger.error('Failed to load stats', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Delete digest
   */
  const remove = useCallback(async (digestId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await deleteDigest(digestId)
      logger.info('Digest deleted', { digestId })
      await loadDigests() // Refresh list
      await loadStats() // Refresh stats
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete digest'
      setError(message)
      logger.error('Failed to delete digest', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [loadDigests, loadStats])

  /**
   * Load single digest by ID
   */
  const loadDigest = useCallback(async (digestId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const data = await getDigestById(digestId)
      setDigest(data)
      logger.info('Digest loaded', { digestId, found: !!data })
      return !!data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load digest'
      setError(message)
      logger.error('Failed to load digest', { error: err })
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    digest,
    previewData,
    digests,
    stats,
    loading,
    error,
    compilationProgress,
    compile,
    loadPreview,
    customize,
    approve,
    loadDigests,
    loadStats,
    remove,
    loadDigest
  }
}