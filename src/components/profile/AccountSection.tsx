'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { EnvelopeIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { FormMessage } from '@/components/ui/FormMessage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { AccountFormData, FormState, FormValidationResult } from '@/lib/types/profile'

interface AccountSectionProps {
  user: User
}

export function AccountSection({ user }: AccountSectionProps) {
  const [formData, setFormData] = useState<AccountFormData>({
    email: user.email || ''
  })

  const [formState, setFormState] = useState<FormState>({
    loading: false,
    success: false,
    error: null
  })

  const [validation, setValidation] = useState<FormValidationResult>({
    isValid: true,
    errors: {}
  })

  // Validation
  useEffect(() => {
    const errors: Record<string, string> = {}

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    setValidation({
      isValid: Object.keys(errors).length === 0,
      errors
    })
  }, [formData])

  const handleInputChange = (field: keyof AccountFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear form state when user starts typing
    if (formState.success || formState.error) {
      setFormState(prev => ({ ...prev, success: false, error: null }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validation.isValid) {
      return
    }

    setFormState({ loading: true, success: false, error: null })

    try {
      // Update user email in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        email: formData.email
      })

      if (error) {
        throw new Error(error.message)
      }

      setFormState({
        loading: false,
        success: true,
        error: null,
        lastSaved: new Date()
      })

      // Clear success message after 3 seconds
      setTimeout(() => {
        setFormState(prev => ({ ...prev, success: false }))
      }, 3000)
    } catch (error) {
      setFormState({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update account settings'
      })
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Settings</h2>
        <p className="text-sm text-gray-600">Update details that affect how you sign in.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Email Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <EnvelopeIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
            <div>
              <h3 className="text-base font-medium text-gray-900">Email Address</h3>
              <p className="text-sm text-gray-600">Your primary email for account access and notifications</p>
            </div>
          </div>

          <FormField
            label="Email Address"
            required
            error={validation.errors.email}
            description="We'll send a verification email if you change this"
          >
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email address"
              className={cn(validation.errors.email && 'border-red-500 focus-visible:ring-red-500')}
              autoComplete="email"
            />
          </FormField>

          {formData.email !== user.email && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Changing your email will require verification of the new address.
              </p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!validation.isValid || formState.loading}
            className="min-w-[120px]"
          >
            {formState.loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>

      {/* Form Messages */}
      {formState.success && (
        <FormMessage
          type="success"
          message="Account settings updated successfully!"
          details={formState.lastSaved ? `Last saved at ${formState.lastSaved.toLocaleTimeString()}` : undefined}
          className="mt-6"
        />
      )}

      {formState.error && (
        <FormMessage
          type="error"
          message="Failed to update account settings"
          details={formState.error}
          className="mt-6"
        />
      )}
    </div>
  )
}
