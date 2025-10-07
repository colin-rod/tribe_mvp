'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogBody,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  FeedbackType,
  feedbackFormSchema,
  type FeedbackFormData,
  type FeedbackResponse,
} from '@/lib/types/feedback'

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: FeedbackType.OTHER,
    description: '',
    screenshots: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  /**
   * Get current user email if authenticated
   */
  const getUserEmail = async (): Promise<string | undefined> => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      return user?.email
    } catch {
      // Anonymous submission - no error needed
      return undefined
    }
  }

  /**
   * Handle screenshot paste
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault()
      addScreenshots(files)
    }
  }

  /**
   * Add screenshots to form data
   */
  const addScreenshots = (files: File[]) => {
    const currentScreenshots = formData.screenshots || []
    const newScreenshots = [...currentScreenshots, ...files]

    // Limit to 5 screenshots
    if (newScreenshots.length > 5) {
      toast.error('Maximum 5 screenshots allowed')
      return
    }

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setScreenshotPreviews(prev => [...prev, ...newPreviews])

    setFormData({ ...formData, screenshots: newScreenshots })
  }

  /**
   * Handle file input change
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      addScreenshots(Array.from(files))
    }
    // Reset input
    e.target.value = ''
  }

  /**
   * Remove screenshot
   */
  const removeScreenshot = (index: number) => {
    const newScreenshots = formData.screenshots?.filter((_, i) => i !== index) || []
    const newPreviews = screenshotPreviews.filter((_, i) => i !== index)

    // Revoke URL to free memory
    URL.revokeObjectURL(screenshotPreviews[index])

    setFormData({ ...formData, screenshots: newScreenshots })
    setScreenshotPreviews(newPreviews)
  }

  /**
   * Cleanup preview URLs on unmount
   */
  React.useEffect(() => {
    const previews = screenshotPreviews
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate form data
    const validation = feedbackFormSchema.safeParse(formData)
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as string
        fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      // Get user email if available
      const userEmail = await getUserEmail()

      // Upload screenshots if any
      let screenshotUrls: string[] = []
      if (formData.screenshots && formData.screenshots.length > 0) {
        const uploadFormData = new FormData()
        formData.screenshots.forEach((file, index) => {
          uploadFormData.append(`screenshot_${index}`, file)
        })

        const uploadResponse = await fetch('/api/feedback/upload-screenshots', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload screenshots')
        }

        const uploadData = await uploadResponse.json()
        screenshotUrls = uploadData.urls || []
      }

      // Prepare request payload
      const payload = {
        type: formData.type,
        description: formData.description,
        pageUrl: window.location.href,
        userEmail,
        timestamp: new Date().toISOString(),
        screenshotUrls,
      }

      // Submit to API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data: FeedbackResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      // Success!
      toast.success(data.message || 'Thank you for your feedback!')

      // Analytics tracking
      if (typeof window !== 'undefined') {
        window.gtag?.('event', 'feedback_submitted', {
          event_category: 'engagement',
          event_label: formData.type,
          value: 1,
        })
      }

      // Reset form and close modal
      screenshotPreviews.forEach(url => URL.revokeObjectURL(url))
      setFormData({
        type: FeedbackType.OTHER,
        description: '',
        screenshots: [],
      })
      setScreenshotPreviews([])
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to submit feedback. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isSubmitting) {
      screenshotPreviews.forEach(url => URL.revokeObjectURL(url))
      setFormData({
        type: FeedbackType.OTHER,
        description: '',
        screenshots: [],
      })
      setScreenshotPreviews([])
      setErrors({})
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent maxWidth="lg">
        <DialogHeader>
          <DialogTitle>Share Your Feedback</DialogTitle>
          <DialogDescription>
            Help us improve Tribe by sharing your thoughts, reporting bugs, or suggesting new
            features. Your feedback is valuable to us!
          </DialogDescription>
          <DialogClose onClick={handleClose} />
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback Type */}
            <div>
              <label
                htmlFor="feedback-type"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                What type of feedback would you like to share?
              </label>
              <select
                id="feedback-type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as typeof formData.type })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                disabled={isSubmitting}
              >
                <option value={FeedbackType.BUG}>🐛 Bug Report</option>
                <option value={FeedbackType.FEATURE_REQUEST}>✨ Feature Request</option>
                <option value={FeedbackType.UX_ISSUE}>🎨 UX Issue</option>
                <option value={FeedbackType.OTHER}>💬 General Feedback</option>
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="feedback-description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="feedback-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onPaste={handlePaste}
                placeholder="Please describe your feedback in detail... (Paste screenshots with Ctrl/Cmd+V)"
                rows={6}
                disabled={isSubmitting}
                className={errors.description ? 'border-red-500' : ''}
              />
              <div className="mt-1 flex justify-between items-center">
                {errors.description ? (
                  <p className="text-sm text-red-600">{errors.description}</p>
                ) : (
                  <p className="text-xs text-gray-500">Minimum 10 characters</p>
                )}
                <p className="text-xs text-gray-500">{formData.description.length} / 5000</p>
              </div>
            </div>

            {/* Screenshots */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Screenshots (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting || (formData.screenshots?.length || 0) >= 5}
                  className="text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  + Add Screenshot
                </button>
              </div>

              {/* Screenshot Previews */}
              {screenshotPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  {screenshotPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        disabled={isSubmitting}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="absolute bottom-1 left-1 bg-gray-900/75 text-white rounded px-2 py-0.5 text-xs">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={isSubmitting}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Paste screenshots directly with Ctrl/Cmd+V or click &quot;Add Screenshot&quot; to upload. Maximum 5 screenshots.
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your feedback will be automatically sent to our team along
                with the current page URL. If you&apos;re logged in, we&apos;ll include your email
                so we can follow up if needed.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
