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
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

      // Prepare request payload
      const payload = {
        ...formData,
        pageUrl: window.location.href,
        userEmail,
        timestamp: new Date().toISOString(),
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
      setFormData({
        type: FeedbackType.OTHER,
        description: '',
      })
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
      setFormData({
        type: FeedbackType.OTHER,
        description: '',
      })
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
                placeholder="Please describe your feedback in detail..."
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
