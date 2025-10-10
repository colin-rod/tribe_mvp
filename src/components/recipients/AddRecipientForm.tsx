'use client'

import { useState } from 'react'
import { createLogger } from '@/lib/logger'
import { Recipient, createRecipient } from '@/lib/recipients'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { FormFeedback } from '@/components/ui/FormFeedback'

const logger = createLogger('AddRecipientForm')

interface AddRecipientFormProps {
  onRecipientAdded: (recipient: Recipient) => void
  onCancel: () => void
  selectedGroupId?: string
}

interface FormData {
  name: string
  email: string
  phone: string
}

export default function AddRecipientForm({ onRecipientAdded, onCancel }: AddRecipientFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Name is required
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    // At least email or phone is required
    const hasEmail = formData.email.trim() !== ''
    const hasPhone = formData.phone.trim() !== ''

    if (!hasEmail && !hasPhone) {
      newErrors.contact = 'Please provide at least an email address or phone number'
    }

    // Validate email format if provided
    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    // Validate phone format if provided
    if (hasPhone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number (include country code, e.g., +1234567890)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      const newRecipient = await createRecipient({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        relationship: 'other' // Default - recipient can update via preference link
      })

      onRecipientAdded(newRecipient)
    } catch (error: unknown) {
      logger.errorWithStack('Error creating recipient', error instanceof Error ? error : new Error('Unknown error'))
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to create recipient. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Add New Recipient</h2>
        <p className="text-sm text-gray-600">
          Add someone to receive your baby updates. They&apos;ll get a magic link to set their own preferences.
        </p>
      </div>

      {/* General Error */}
      {errors.general && (
        <FormFeedback
          type="error"
          message={errors.general}
          dismissible
          onDismiss={() => setErrors(prev => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { general: _general, ...rest } = prev
            return rest
          })}
        />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            onBlur={validateForm}
            placeholder="Enter recipient's full name"
            className={errors.name ? 'border-red-300' : ''}
            autoFocus
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Contact Method Error */}
        {errors.contact && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-700">{errors.contact}</p>
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            onBlur={validateForm}
            placeholder="email@example.com"
            className={errors.email ? 'border-red-300' : ''}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            onBlur={validateForm}
            placeholder="+1234567890"
            className={errors.phone ? 'border-red-300' : ''}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Include country code for international numbers
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1 text-sm">What happens next?</h4>
              <div className="text-sm text-blue-800 space-y-1">
                {formData.email && (
                  <div>• {formData.name || 'They'} will receive a magic link via email</div>
                )}
                {formData.phone && !formData.email && (
                  <div>• {formData.name || 'They'} will receive a magic link via SMS</div>
                )}
                <div>• They can set their own notification preferences</div>
                <div>• They can unsubscribe anytime</div>
                <div>• You control what content they see</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Adding...
              </>
            ) : (
              'Add Recipient'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
