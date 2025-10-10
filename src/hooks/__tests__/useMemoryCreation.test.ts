import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMemoryCreation } from '../useMemoryCreation'
import type { UpdateFormData } from '@/lib/validation/update'

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
}

jest.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger
}))

// Mock photo upload
const mockUploadUpdatePhotos = jest.fn()
const mockValidateUpdateMediaFiles = jest.fn()
const mockGeneratePreviewUrls = jest.fn()
const mockCleanupPreviewUrls = jest.fn()

jest.mock('@/lib/photo-upload', () => ({
  uploadUpdatePhotos: (...args: unknown[]) => mockUploadUpdatePhotos(...args),
  validateUpdateMediaFiles: (...args: unknown[]) => mockValidateUpdateMediaFiles(...args),
  generatePreviewUrls: (...args: unknown[]) => mockGeneratePreviewUrls(...args),
  cleanupPreviewUrls: (...args: unknown[]) => mockCleanupPreviewUrls(...args)
}))

// Mock updates
const mockCreateUpdate = jest.fn()
const mockUpdateUpdateMediaUrls = jest.fn()
const mockUpdateUpdateRecipients = jest.fn()
const mockMarkUpdateAsSent = jest.fn()

jest.mock('@/lib/updates', () => ({
  createUpdate: (...args: unknown[]) => mockCreateUpdate(...args),
  updateUpdateMediaUrls: (...args: unknown[]) => mockUpdateUpdateMediaUrls(...args),
  updateUpdateRecipients: (...args: unknown[]) => mockUpdateUpdateRecipients(...args),
  markUpdateAsSent: (...args: unknown[]) => mockMarkUpdateAsSent(...args)
}))

// Mock AI analysis
const mockAnalyzeUpdate = jest.fn()
jest.mock('@/lib/ai-analysis', () => ({
  analyzeUpdate: (...args: unknown[]) => mockAnalyzeUpdate(...args)
}))

// Mock children
const mockGetChildren = jest.fn()
jest.mock('@/lib/children', () => ({
  getChildren: (...args: unknown[]) => mockGetChildren(...args)
}))

// Mock age utils
jest.mock('@/lib/age-utils', () => ({
  getAgeInMonths: jest.fn(() => 6)
}))

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}))

describe('useMemoryCreation', () => {
  const mockChild = {
    id: 'child-123',
    name: 'Emma',
    birth_date: '2024-01-01',
    parent_id: 'user-123',
    profile_photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetChildren.mockResolvedValue([mockChild])
    mockValidateUpdateMediaFiles.mockReturnValue([])
    mockGeneratePreviewUrls.mockReturnValue([])
  })

  describe('initialization', () => {
    it('should initialize with create step', () => {
      const { result } = renderHook(() => useMemoryCreation())

      expect(result.current.currentStep).toBe('create')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should have proper step configuration', () => {
      const { result } = renderHook(() => useMemoryCreation())

      expect(result.current.steps).toHaveLength(2)
      expect(result.current.steps[0].id).toBe('create')
      expect(result.current.steps[1].id).toBe('preview')
    })
  })

  describe('setFormData', () => {
    it('should update form data', () => {
      const { result } = renderHook(() => useMemoryCreation())

      act(() => {
        result.current.setFormData({ content: 'Test content' })
      })

      expect(result.current.formData.content).toBe('Test content')
    })

    it('should merge form data', () => {
      const { result } = renderHook(() => useMemoryCreation())

      act(() => {
        result.current.setFormData({ content: 'Test' })
        result.current.setFormData({ childId: 'child-123' })
      })

      expect(result.current.formData.content).toBe('Test')
      expect(result.current.formData.childId).toBe('child-123')
    })
  })

  describe('loadChildren', () => {
    it('should load children successfully', async () => {
      const { result } = renderHook(() => useMemoryCreation())

      await act(async () => {
        await result.current.loadChildren()
      })

      await waitFor(() => {
        expect(result.current.children).toEqual([mockChild])
      })
    })

    it('should handle load error', async () => {
      mockGetChildren.mockRejectedValue(new Error('Load failed'))

      const { result } = renderHook(() => useMemoryCreation())

      await act(async () => {
        await result.current.loadChildren()
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Load failed')
      })
    })
  })

  describe('processMediaFiles', () => {
    it('should process media files successfully', async () => {
      const mockFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
      const mockUrls = ['preview-url-1']

      mockValidateUpdateMediaFiles.mockReturnValue([])
      mockGeneratePreviewUrls.mockReturnValue(mockUrls)

      const { result } = renderHook(() => useMemoryCreation())

      await act(async () => {
        await result.current.processMediaFiles([mockFile])
      })

      await waitFor(() => {
        expect(result.current.previewUrls).toEqual(mockUrls)
        expect(result.current.formData.mediaFiles).toHaveLength(1)
      })
    })

    it('should handle validation errors', async () => {
      const mockFile = new File(['content'], 'large.jpg', { type: 'image/jpeg' })
      mockValidateUpdateMediaFiles.mockReturnValue(['File too large'])

      const { result } = renderHook(() => useMemoryCreation())

      await act(async () => {
        await result.current.processMediaFiles([mockFile])
      })

      await waitFor(() => {
        expect(result.current.error).toBe('File too large')
      })
    })
  })

  describe('runAIAnalysis', () => {
    it('should run AI analysis successfully', async () => {
      const mockAnalysis = {
        suggestedRecipients: ['rec-1', 'rec-2'],
        milestoneDetected: 'first_smile',
        sentiment: 'positive'
      }

      mockAnalyzeUpdate.mockResolvedValue(mockAnalysis)

      const { result } = renderHook(() => useMemoryCreation())

      act(() => {
        result.current.setFormData({ content: 'Emma smiled!', childId: 'child-123' })
      })

      await act(async () => {
        await result.current.runAIAnalysis()
      })

      await waitFor(() => {
        expect(result.current.aiAnalysis).toEqual(mockAnalysis)
        expect(result.current.hasRequestedAnalysis).toBe(true)
        expect(result.current.isAnalyzing).toBe(false)
      })
    })

    it('should handle analysis error', async () => {
      mockAnalyzeUpdate.mockRejectedValue(new Error('Analysis failed'))

      const { result } = renderHook(() => useMemoryCreation())

      act(() => {
        result.current.setFormData({ content: 'Test', childId: 'child-123' })
      })

      await act(async () => {
        await result.current.runAIAnalysis()
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Analysis failed')
        expect(result.current.isAnalyzing).toBe(false)
      })
    })
  })

  describe('createUpdateDraft', () => {
    it('should create update draft', async () => {
      const mockUpdateId = 'update-123'
      mockCreateUpdate.mockResolvedValue({ id: mockUpdateId })

      const { result } = renderHook(() => useMemoryCreation())

      act(() => {
        result.current.setFormData({
          content: 'Test content',
          childId: 'child-123'
        })
      })

      let updateId: string = ''
      await act(async () => {
        updateId = await result.current.createUpdateDraft()
      })

      expect(updateId).toBe(mockUpdateId)
      expect(mockCreateUpdate).toHaveBeenCalled()
    })
  })

  describe('finalizeUpdate', () => {
    it('should finalize update with media and recipients', async () => {
      const mockUpdateId = 'update-123'
      mockCreateUpdate.mockResolvedValue({ id: mockUpdateId })
      mockUploadUpdatePhotos.mockResolvedValue(['url1.jpg', 'url2.jpg'])
      mockUpdateUpdateMediaUrls.mockResolvedValue(undefined)
      mockUpdateUpdateRecipients.mockResolvedValue(undefined)
      mockMarkUpdateAsSent.mockResolvedValue(undefined)

      const { result } = renderHook(() => useMemoryCreation())

      const mockFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })

      act(() => {
        result.current.setFormData({
          content: 'Test content',
          childId: 'child-123',
          mediaFiles: [mockFile],
          confirmedRecipients: ['rec-1', 'rec-2']
        })
      })

      await act(async () => {
        await result.current.createUpdateDraft()
      })

      await act(async () => {
        await result.current.finalizeUpdate()
      })

      await waitFor(() => {
        expect(mockUploadUpdatePhotos).toHaveBeenCalled()
        expect(mockUpdateUpdateMediaUrls).toHaveBeenCalledWith(mockUpdateId, ['url1.jpg', 'url2.jpg'])
        expect(mockUpdateUpdateRecipients).toHaveBeenCalledWith(mockUpdateId, ['rec-1', 'rec-2'])
        expect(mockMarkUpdateAsSent).toHaveBeenCalledWith(mockUpdateId)
      })
    })
  })

  describe('reset', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useMemoryCreation())

      act(() => {
        result.current.setFormData({ content: 'Test', childId: 'child-123' })
        result.current.setCurrentStep('preview')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.currentStep).toBe('create')
      expect(result.current.formData.content).toBe('')
      expect(result.current.aiAnalysis).toBeNull()
    })
  })

  describe('removeMediaFile', () => {
    it('should remove media file by index', async () => {
      const mockFile1 = new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' })
      const mockFile2 = new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' })

      mockGeneratePreviewUrls.mockReturnValue(['url1', 'url2'])

      const { result } = renderHook(() => useMemoryCreation())

      await act(async () => {
        await result.current.processMediaFiles([mockFile1, mockFile2])
      })

      act(() => {
        result.current.removeMediaFile(0)
      })

      expect(result.current.formData.mediaFiles).toHaveLength(1)
      expect(result.current.previewUrls).toHaveLength(1)
    })
  })
})
