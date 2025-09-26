'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getPrivacyMessageForStep } from '@/lib/onboarding'
import type { FirstUpdateData } from '@/hooks/useOnboarding'
import {
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  CpuChipIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

interface FirstUpdateStepProps {
  data: Partial<FirstUpdateData>
  onUpdate: (data: Partial<FirstUpdateData>) => void
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
  canSkip: boolean
  childName?: string
  className?: string
}

export function FirstUpdateStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  onSkip,
  canSkip,
  childName = 'your child',
  className
}: FirstUpdateStepProps) {
  const [formData, setFormData] = useState<FirstUpdateData>({
    content: data.content || '',
    mediaFiles: data.mediaFiles || [],
    childId: data.childId || '',
    sendToAll: data.sendToAll ?? true
  })

  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const privacyMessage = getPrivacyMessageForStep('first-update')

  // Sample update prompts to inspire users
  const updatePrompts = [
    `${childName} just learned to roll over!`,
    `Caught ${childName} smiling at me today`,
    `${childName}'s first day at daycare went amazing!`,
    `Look at how much ${childName} has grown this month!`,
    `${childName} said their first word today!`,
    `Enjoying some quality time with ${childName} at the park`,
    `${childName} is getting so good at tummy time!`,
    `Can't believe how fast ${childName} is growing up`
  ]

  // Update parent state when form data changes
  useEffect(() => {
    onUpdate(formData)
  }, [formData, onUpdate])

  // Generate preview URLs for uploaded images
  useEffect(() => {
    // Clean up existing preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url))

    // Generate new preview URLs
    const newUrls = formData.mediaFiles.map(file => URL.createObjectURL(file))
    setPreviewUrls(newUrls)

    // Cleanup function
    return () => {
      newUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [formData.mediaFiles])

  // Validation
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.content.trim()) {
      if (!canSkip) {
        newErrors.content = 'Update content is required'
      }
    } else if (formData.content.trim().length < 10) {
      newErrors.content = 'Update should be at least 10 characters'
    } else if (formData.content.trim().length > 1000) {
      newErrors.content = 'Update should be less than 1000 characters'
    }

    // Validate media files
    formData.mediaFiles.forEach((file, index) => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        newErrors[`file-${index}`] = 'File size must be less than 10MB'
      }
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        newErrors[`file-${index}`] = 'Only image and video files are allowed'
      }
    })

    setErrors(newErrors)
    setIsValid(Object.keys(newErrors).length === 0 && (!!formData.content.trim() || canSkip))
  }, [formData, canSkip])

  const handleContentChange = (content: string) => {
    setFormData(prev => ({ ...prev, content }))
  }

  const handleFileSelect = (files: File[]) => {
    const validFiles = files.filter(file => {
      return file.type.startsWith('image/') || file.type.startsWith('video/')
    })
    setFormData(prev => ({ ...prev, mediaFiles: [...prev.mediaFiles, ...validFiles] }))
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, i) => i !== index)
    }))
  }

  const handlePromptClick = (prompt: string) => {
    handleContentChange(prompt)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid || (canSkip && !formData.content.trim())) {
      onNext()
    }
  }

  const handleSkip = () => {
    if (canSkip) {
      onSkip()
    }
  }

  return (
    <div className={cn('max-w-3xl mx-auto space-y-8', className)}>
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
          <DocumentTextIcon className="h-10 w-10 text-primary-600" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Share Your First Update
        </h1>
        <p className="text-lg text-gray-600">
          Create a practice update to see how Tribe works
        </p>
        {canSkip && (
          <p className="text-sm text-gray-500">
            This step is optional - you can create your first update later
          </p>
        )}
      </div>

      {/* Update Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Content Input */}
        <div className="space-y-3">
          <label htmlFor="content" className="block text-sm font-medium text-gray-900">
            What's happening with {childName}?
            {!canSkip && <span className="text-red-500 ml-1">*</span>}
          </label>

          <textarea
            id="content"
            value={formData.content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={`Share a moment, milestone, or memory about ${childName}...`}
            rows={4}
            className={cn(
              'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 resize-none',
              errors.content && 'border-red-500 focus-visible:ring-red-500'
            )}
          />

          {errors.content && (
            <p className="text-sm text-red-600">{errors.content}</p>
          )}

          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {formData.content.length > 0 && `${formData.content.length}/1000 characters`}
            </span>
            <span>
              Try sharing a recent moment, milestone, or just how {childName} is doing
            </span>
          </div>
        </div>

        {/* Quick Prompts */}
        {formData.content.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Need inspiration? Try one of these:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {updatePrompts.slice(0, 6).map((prompt, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handlePromptClick(prompt)}
                  className="text-left p-2 bg-white border border-gray-200 rounded hover:bg-primary-50 hover:border-primary-300 transition-colors text-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Media Upload */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            Photos or Videos
            <span className="text-gray-500 font-normal ml-2">(Optional)</span>
          </label>

          {/* Upload Area */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
              isDragOver
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="space-y-2">
              <PhotoIcon className="mx-auto h-8 w-8 text-primary-600" aria-hidden="true" />
              <div className="text-gray-600">
                {isDragOver ? 'Drop files here' : 'Click to upload or drag photos/videos here'}
              </div>
              <div className="text-xs text-gray-500">
                JPEG, PNG, MP4, MOV • Max 10MB per file
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Media Preview */}
          {formData.mediaFiles.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {formData.mediaFiles.map((file, index) => (
                <div key={index} className="relative group">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={previewUrls[index]}
                      alt="Preview"
                      className="w-full h-24 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                      <VideoCameraIcon className="h-8 w-8 text-gray-500" aria-hidden="true" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                  {errors[`file-${index}`] && (
                    <p className="text-xs text-red-600 mt-1">{errors[`file-${index}`]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send Options */}
        {formData.content.trim() && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h4 className="font-medium text-primary-900 mb-3">Who should receive this update?</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="sendOption"
                  checked={formData.sendToAll}
                  onChange={() => setFormData(prev => ({ ...prev, sendToAll: true }))}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-primary-800">Send to everyone in my circle</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="sendOption"
                  checked={!formData.sendToAll}
                  onChange={() => setFormData(prev => ({ ...prev, sendToAll: false }))}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-primary-800">Let me choose specific recipients (advanced)</span>
              </label>
            </div>
            <p className="text-xs text-primary-700 mt-2">
              Don't worry - this is just for testing. The update won&apos;t actually be sent during onboarding.
            </p>
          </div>
        )}

        {/* AI Preview */}
        {formData.content.trim() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-blue-600">
                <CpuChipIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-2">AI Analysis Preview</h4>
                <p className="text-sm text-blue-800 mb-2">
                  In a real update, our AI would analyze your content and suggest:
                </p>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>• Which recipients would most appreciate this update</div>
                  <div>• The best time to send based on recipient preferences</div>
                  <div>• Content tags and milestone detection</div>
                  <div>• Personalized message variations for different recipients</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-gray-600">
              <ShieldCheckIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Practice Mode</h4>
              <p className="text-sm text-gray-700">{privacyMessage}</p>
              <p className="text-xs text-gray-600 mt-1">
                This practice update won&apos;t be sent to anyone. It's just to show you how the process works.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
          >
            ← Previous
          </Button>

          <div className="flex space-x-3">
            {canSkip && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
              >
                Skip for now
              </Button>
            )}
            <Button
              type="submit"
              disabled={!isValid && !(canSkip && !formData.content.trim())}
              className="px-8"
            >
              {formData.content.trim() ? 'Continue' : 'Skip'} →
            </Button>
          </div>
        </div>
      </form>

      {/* Help Text */}
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-500">
          Remember: This is just practice! No updates will be sent during setup.
        </p>
        <div className="text-xs text-gray-400">
          You'll create and send real updates from your dashboard after completing onboarding
        </div>
      </div>
    </div>
  )
}

// Compact version for mobile
interface FirstUpdateStepCompactProps {
  data: Partial<FirstUpdateData>
  onUpdate: (data: Partial<FirstUpdateData>) => void
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
  canSkip: boolean
  childName?: string
  className?: string
}

export function FirstUpdateStepCompact({
  data,
  onUpdate,
  onNext,
  onPrevious,
  onSkip,
  canSkip,
  childName = 'your child',
  className
}: FirstUpdateStepCompactProps) {
  const [content, setContent] = useState(data.content || '')

  useEffect(() => {
    onUpdate({ content, mediaFiles: [], childId: '', sendToAll: true })
  }, [content, onUpdate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <div className={cn('max-w-md mx-auto space-y-6', className)}>
      <div className="text-center space-y-2">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <DocumentTextIcon className="h-7 w-7 text-primary-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Practice Update</h1>
        <p className="text-sm text-gray-600">Try creating your first update</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Share something about ${childName}...`}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />

        <div className="text-xs text-gray-500 text-center">
          This is just practice - nothing will be sent!
        </div>

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onPrevious}>
            ← Back
          </Button>
          <div className="flex space-x-2">
            {canSkip && (
              <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
                Skip
              </Button>
            )}
            <Button type="submit" size="sm">
              Continue →
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
