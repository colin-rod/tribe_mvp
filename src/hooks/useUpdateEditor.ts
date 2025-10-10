'use client'

import { useState, useCallback, useEffect } from 'react'
import { createLogger } from '@/lib/logger'
import { updateDraft, addMediaToDraft } from '@/lib/services/draftService'
import { uploadUpdatePhotos, validateUpdateMediaFiles, generatePreviewUrls } from '@/lib/photo-upload'
import type { DraftUpdate } from '@/lib/types/digest'
import type { UpdateFormData } from '@/lib/validation/update'

const logger = createLogger('UseUpdateEditor')

export interface UseUpdateEditorOptions {
  updateId: string
  initialData: DraftUpdate
  onSaveSuccess?: () => void
  onSaveError?: (error: string) => void
}

export interface UseUpdateEditorReturn {
  // State
  formData: Partial<UpdateFormData>
  isLoading: boolean
  isSaving: boolean
  error: string | null
  previewUrls: string[]
  hasUnsavedChanges: boolean

  // Actions
  setFormData: (data: Partial<UpdateFormData>) => void
  processMediaFiles: (files: File[]) => Promise<void>
  removeMediaFile: (index: number) => void
  saveChanges: () => Promise<boolean>
  reset: () => void
}

export function useUpdateEditor({
  updateId,
  initialData,
  onSaveSuccess,
  onSaveError
}: UseUpdateEditorOptions): UseUpdateEditorReturn {
  // Initialize form data from existing update
  const [formData, setFormDataState] = useState<Partial<UpdateFormData>>({
    childId: initialData.child_id,
    content: initialData.content || '',
    subject: initialData.subject || '',
    milestoneType: initialData.milestone_type as UpdateFormData['milestoneType'],
    confirmedRecipients: [],
    mediaFiles: []
  })

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>(initialData.media_urls || [])
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Track changes to form data
  useEffect(() => {
    const hasChanges =
      formData.content !== initialData.content ||
      formData.subject !== (initialData.subject || '') ||
      formData.milestoneType !== initialData.milestone_type ||
      newMediaFiles.length > 0

    setHasUnsavedChanges(hasChanges)
  }, [formData, newMediaFiles, initialData])

  const setFormData = useCallback((data: Partial<UpdateFormData>) => {
    setFormDataState(prev => ({ ...prev, ...data }))
    setError(null)
  }, [])

  const processMediaFiles = useCallback(async (files: File[]) => {
    setError(null)

    // Validate files
    const validationError = validateUpdateMediaFiles(files)
    if (validationError) {
      setError(validationError)
      return
    }

    // Generate preview URLs for new files
    const newPreviewUrls = generatePreviewUrls(files)

    // Combine existing media with new previews
    setPreviewUrls([...initialData.media_urls || [], ...newPreviewUrls])
    setNewMediaFiles(files)
    setFormData({ mediaFiles: files })
  }, [initialData.media_urls, setFormData])

  const removeMediaFile = useCallback((index: number) => {
    const existingMediaCount = initialData.media_urls?.length || 0

    if (index < existingMediaCount) {
      // Removing existing media - update the preview URLs
      const newExistingMedia = (initialData.media_urls || []).filter((_, i) => i !== index)
      const newPreviewUrls = [...newExistingMedia, ...generatePreviewUrls(newMediaFiles)]
      setPreviewUrls(newPreviewUrls)
    } else {
      // Removing newly added file
      const newFileIndex = index - existingMediaCount
      const updatedFiles = newMediaFiles.filter((_, i) => i !== newFileIndex)

      // Clean up the removed preview URL
      const removedPreviewUrl = previewUrls[index]
      if (removedPreviewUrl && removedPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removedPreviewUrl)
      }

      setNewMediaFiles(updatedFiles)
      setPreviewUrls(previewUrls.filter((_, i) => i !== index))
      setFormData({ mediaFiles: updatedFiles })
    }
  }, [initialData.media_urls, newMediaFiles, previewUrls, setFormData])

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedChanges) {
      logger.info('No changes to save', { updateId })
      return true
    }

    try {
      setIsSaving(true)
      setError(null)

      // Upload new media files if any
      let uploadedMediaUrls: string[] = []
      if (newMediaFiles.length > 0) {
        logger.info('Uploading media files', { updateId, count: newMediaFiles.length })
        uploadedMediaUrls = await uploadUpdatePhotos(newMediaFiles, updateId)

        // Add media URLs to the update
        await addMediaToDraft(updateId, uploadedMediaUrls)
      }

      // Update text content and other fields
      const updates: Partial<DraftUpdate> = {}

      if (formData.content !== initialData.content) {
        updates.content = formData.content
      }

      if (formData.subject !== (initialData.subject || '')) {
        updates.subject = (formData.subject || undefined) as string | undefined
      }

      if (formData.milestoneType !== initialData.milestone_type) {
        updates.milestone_type = (formData.milestoneType || undefined) as string | undefined
      }

      if (Object.keys(updates).length > 0) {
        logger.info('Updating draft', { updateId, updates })
        await updateDraft(updateId, updates)
      }

      setHasUnsavedChanges(false)
      setNewMediaFiles([])

      logger.info('Successfully saved changes', { updateId })
      onSaveSuccess?.()
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes'
      logger.error('Failed to save changes', { error: err, updateId })
      setError(errorMessage)
      onSaveError?.(errorMessage)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [
    updateId,
    hasUnsavedChanges,
    newMediaFiles,
    formData,
    initialData,
    onSaveSuccess,
    onSaveError
  ])

  const reset = useCallback(() => {
    // Clean up preview URLs for newly added files
    newMediaFiles.forEach((_, index) => {
      const previewIndex = (initialData.media_urls?.length || 0) + index
      const previewUrl = previewUrls[previewIndex]
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    })

    setFormDataState({
      childId: initialData.child_id,
      content: initialData.content || '',
      subject: initialData.subject || '',
      milestoneType: initialData.milestone_type as UpdateFormData['milestoneType'],
      confirmedRecipients: [],
      mediaFiles: []
    })
    setPreviewUrls(initialData.media_urls || [])
    setNewMediaFiles([])
    setHasUnsavedChanges(false)
    setError(null)
  }, [initialData, newMediaFiles, previewUrls])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up blob URLs for newly added files
      newMediaFiles.forEach((_, index) => {
        const previewIndex = (initialData.media_urls?.length || 0) + index
        const previewUrl = previewUrls[previewIndex]
        if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on unmount

  return {
    formData,
    isLoading: false, // Not used in this hook, but kept for interface compatibility
    isSaving,
    error,
    previewUrls,
    hasUnsavedChanges,
    setFormData,
    processMediaFiles,
    removeMediaFile,
    saveChanges,
    reset
  }
}
