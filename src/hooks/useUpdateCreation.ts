'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { uploadUpdatePhotos, validateUpdateMediaFiles, generatePreviewUrls, cleanupPreviewUrls } from '@/lib/photo-upload'
import { createUpdate, updateUpdateAIAnalysis, updateUpdateMediaUrls, updateUpdateRecipients } from '@/lib/updates'
import { analyzeUpdate } from '@/lib/ai-analysis'
import { getChildren } from '@/lib/children'
import { getAgeInMonths } from '@/lib/age-utils'
import type { UpdateFormData } from '@/lib/validation/update'
import type { AIAnalysisResponse } from '@/lib/types/ai-analysis'
import type { Child } from '@/lib/children'

export interface UpdateCreationStep {
  id: 'create' | 'ai-review' | 'preview'
  title: string
  description: string
  isComplete: boolean
  isAccessible: boolean
}

export interface UseUpdateCreationReturn {
  // State
  currentStep: UpdateCreationStep['id']
  steps: UpdateCreationStep[]
  formData: Partial<UpdateFormData>
  aiAnalysis: AIAnalysisResponse | null
  children: Child[]
  isLoading: boolean
  error: string | null
  uploadProgress: number
  previewUrls: string[]

  // Actions
  setFormData: (data: Partial<UpdateFormData>) => void
  setCurrentStep: (step: UpdateCreationStep['id']) => void
  processMediaFiles: (files: File[]) => Promise<void>
  removeMediaFile: (index: number) => void
  runAIAnalysis: () => Promise<void>
  updateRecipients: (recipients: string[]) => Promise<void>
  createUpdateDraft: () => Promise<string>
  finalizeUpdate: (updateId: string) => Promise<void>
  reset: () => void
  loadChildren: () => Promise<void>
}

export function useUpdateCreation(): UseUpdateCreationReturn {
  const router = useRouter()

  // State
  const [currentStep, setCurrentStep] = useState<UpdateCreationStep['id']>('create')
  const [formData, setFormDataState] = useState<Partial<UpdateFormData>>({
    content: '',
    mediaFiles: [],
    confirmedRecipients: []
  })
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [currentUpdateId, setCurrentUpdateId] = useState<string | null>(null)

  // Steps configuration
  const steps: UpdateCreationStep[] = [
    {
      id: 'create',
      title: 'Create Update',
      description: 'Write your update and add photos',
      isComplete: Boolean(formData.content && formData.childId),
      isAccessible: true
    },
    {
      id: 'ai-review',
      title: 'AI Review',
      description: 'Review AI suggestions and select recipients',
      isComplete: Boolean(aiAnalysis?.success),
      isAccessible: Boolean(formData.content && formData.childId)
    },
    {
      id: 'preview',
      title: 'Preview & Send',
      description: 'Review and send your update',
      isComplete: false,
      isAccessible: Boolean(aiAnalysis?.success && formData.confirmedRecipients?.length)
    }
  ]

  // Actions
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

    // Clean up existing preview URLs
    if (previewUrls.length > 0) {
      cleanupPreviewUrls(previewUrls)
    }

    // Generate new preview URLs
    const newPreviewUrls = generatePreviewUrls(files)
    setPreviewUrls(newPreviewUrls)

    // Update form data
    setFormData({ mediaFiles: files })
  }, [previewUrls, setFormData])

  const removeMediaFile = useCallback((index: number) => {
    const currentFiles = formData.mediaFiles || []
    const currentPreviews = [...previewUrls]

    // Clean up the preview URL for the removed file
    if (currentPreviews[index]) {
      URL.revokeObjectURL(currentPreviews[index])
    }

    // Remove from arrays
    const newFiles = currentFiles.filter((_, i) => i !== index)
    const newPreviews = currentPreviews.filter((_, i) => i !== index)

    setPreviewUrls(newPreviews)
    setFormData({ mediaFiles: newFiles })
  }, [formData.mediaFiles, previewUrls, setFormData])

  const loadChildren = useCallback(async () => {
    try {
      setIsLoading(true)
      const childrenData = await getChildren()
      setChildren(childrenData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load children')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const runAIAnalysis = useCallback(async () => {
    if (!formData.content || !formData.childId) {
      setError('Please provide content and select a child')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Find the selected child to get age
      const selectedChild = children.find(child => child.id === formData.childId)
      if (!selectedChild) {
        throw new Error('Selected child not found')
      }

      const childAgeMonths = getAgeInMonths(selectedChild.birth_date)

      // Create a temporary update ID for AI analysis
      const tempUpdateId = crypto.randomUUID()

      const analysisRequest = {
        update_id: tempUpdateId,
        content: formData.content,
        child_age_months: childAgeMonths,
        milestone_type: formData.milestoneType
      }

      const result = await analyzeUpdate(analysisRequest)
      setAiAnalysis(result)

      if (result.success) {
        // Auto-select suggested recipients
        setFormData({
          confirmedRecipients: result.suggested_recipients || []
        })
        setCurrentStep('ai-review')
      } else {
        setError(result.error || 'AI analysis failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed')
    } finally {
      setIsLoading(false)
    }
  }, [formData.content, formData.childId, formData.milestoneType, children, setFormData])

  const updateRecipients = useCallback(async (recipients: string[]) => {
    setFormData({ confirmedRecipients: recipients })

    if (currentUpdateId && aiAnalysis?.success) {
      try {
        await updateUpdateRecipients(
          currentUpdateId,
          aiAnalysis.suggested_recipients || [],
          recipients
        )
      } catch (err) {
        console.warn('Failed to update recipients in database:', err)
      }
    }
  }, [currentUpdateId, aiAnalysis, setFormData])

  const createUpdateDraft = useCallback(async (): Promise<string> => {
    if (!formData.content || !formData.childId) {
      throw new Error('Missing required form data')
    }

    // Return existing update ID if we already created one
    if (currentUpdateId) {
      return currentUpdateId
    }

    try {
      setIsLoading(true)
      setUploadProgress(0)

      // Create the update in database first
      const updateData = {
        child_id: formData.childId!,
        content: formData.content!,
        milestone_type: formData.milestoneType || null,
        confirmed_recipients: formData.confirmedRecipients || [],
        ai_analysis: aiAnalysis?.analysis || {},
        suggested_recipients: aiAnalysis?.suggested_recipients || []
      }


      const update = await createUpdate(updateData)
      setCurrentUpdateId(update.id)

      // Upload media files if any
      let mediaUrls: string[] = []
      if (formData.mediaFiles && formData.mediaFiles.length > 0) {
        setUploadProgress(10)

        try {
          mediaUrls = await uploadUpdatePhotos(formData.mediaFiles, update.id)
          setUploadProgress(80)

          // Update the update with media URLs
          await updateUpdateMediaUrls(update.id, mediaUrls)
        } catch (uploadError) {
          console.warn('Failed to upload media files:', uploadError)
          // Continue without media files rather than failing entirely
        }
      }

      setUploadProgress(100)
      return update.id
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create update')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }, [formData, aiAnalysis])

  const finalizeUpdate = useCallback(async (updateId: string) => {
    try {
      setIsLoading(true)

      // Mark as ready to send (implementation depends on your distribution system)
      // For now, just navigate to the dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize update')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const reset = useCallback(() => {
    // Clean up preview URLs
    if (previewUrls.length > 0) {
      cleanupPreviewUrls(previewUrls)
    }

    setCurrentStep('create')
    setFormDataState({
      content: '',
      mediaFiles: [],
      confirmedRecipients: []
    })
    setAiAnalysis(null)
    setError(null)
    setUploadProgress(0)
    setPreviewUrls([])
    setCurrentUpdateId(null)
  }, [previewUrls])

  return {
    currentStep,
    steps,
    formData,
    aiAnalysis,
    children,
    isLoading,
    error,
    uploadProgress,
    previewUrls,
    setFormData,
    setCurrentStep,
    processMediaFiles,
    removeMediaFile,
    runAIAnalysis,
    updateRecipients,
    createUpdateDraft,
    finalizeUpdate,
    reset,
    loadChildren
  }
}