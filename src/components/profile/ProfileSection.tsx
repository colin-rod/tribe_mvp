'use client'

import { createLogger } from '@/lib/logger'
import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { ProfileFormData, FormState, FormValidationResult } from '@/lib/types/profile'
import { ProfilePhotoUpload } from '@/components/profile/ProfilePhotoUpload'

const logger = createLogger('ProfileSection')

interface ProfileSectionProps {
  user: User
}

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' }
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' }
]

const DATE_FORMAT_OPTIONS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (EU)' }
]

export function ProfileSection({ user }: ProfileSectionProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: user.user_metadata?.firstName || '',
    lastName: user.user_metadata?.lastName || '',
    bio: user.user_metadata?.bio || '',
    timezone: user.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: user.user_metadata?.language || 'en',
    dateFormat: user.user_metadata?.dateFormat || 'MM/DD/YYYY',
    avatar: user.user_metadata?.avatar || ''
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

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required'
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters'
    } else if (formData.firstName.trim().length > 50) {
      errors.firstName = 'First name must be less than 50 characters'
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required'
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters'
    } else if (formData.lastName.trim().length > 50) {
      errors.lastName = 'Last name must be less than 50 characters'
    }

    if (formData.bio && formData.bio.length > 300) {
      errors.bio = 'Bio must be less than 300 characters'
    }

    if (!formData.timezone) {
      errors.timezone = 'Timezone is required'
    }

    setValidation({
      isValid: Object.keys(errors).length === 0,
      errors
    })
  }, [formData])

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
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
      // Update user profile in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          bio: formData.bio,
          timezone: formData.timezone,
          avatar: formData.avatar
        }
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
        error: error instanceof Error ? error.message : 'Failed to update profile'
      })
    }
  }

  const handleAvatarUpdate = (newUrl: string) => {
    logger.info('Avatar updated', { newUrl })
    setFormData(prev => ({ ...prev, avatar: newUrl }))
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Profile Information</h2>
        <p className="text-sm text-gray-600">
          Update your personal information and preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Avatar Section */}
        <ProfilePhotoUpload
          currentPhotoUrl={formData.avatar}
          onPhotoUpdate={handleAvatarUpdate}
        />

        {/* First Name Field */}
        <FormField
          label="First Name"
          required
          error={validation.errors.firstName}
          description="Your first name"
        >
          <Input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Enter your first name"
            className={cn(validation.errors.firstName && 'border-red-500 focus-visible:ring-red-500')}
            aria-describedby={validation.errors.firstName ? 'firstName-error' : 'firstName-description'}
            aria-invalid={!!validation.errors.firstName}
          />
        </FormField>

        {/* Last Name Field */}
        <FormField
          label="Last Name"
          required
          error={validation.errors.lastName}
          description="Your last name"
        >
          <Input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Enter your last name"
            className={cn(validation.errors.lastName && 'border-red-500 focus-visible:ring-red-500')}
            aria-describedby={validation.errors.lastName ? 'lastName-error' : 'lastName-description'}
            aria-invalid={!!validation.errors.lastName}
          />
        </FormField>

        {/* Bio Field */}
        <FormField
          label="Bio"
          optional
          error={validation.errors.bio}
          description="A brief description about yourself (optional)"
        >
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder="Tell others about yourself..."
            rows={3}
            maxLength={300}
            className={cn(
              'flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white',
              'placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50 resize-none',
              validation.errors.bio && 'border-red-500 focus-visible:ring-red-500'
            )}
            aria-describedby={validation.errors.bio ? 'bio-error' : 'bio-description'}
            aria-invalid={!!validation.errors.bio}
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">
              {formData.bio?.length || 0}/300 characters
            </span>
          </div>
        </FormField>

        {/* Timezone Field */}
        <FormField
          label="Timezone"
          required
          error={validation.errors.timezone}
          description="Used for scheduling and time display"
        >
          <select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => handleInputChange('timezone', e.target.value)}
            className={cn(
              'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              validation.errors.timezone && 'border-red-500 focus-visible:ring-red-500'
            )}
            aria-describedby={validation.errors.timezone ? 'timezone-error' : 'timezone-description'}
            aria-invalid={!!validation.errors.timezone}
          >
            <option value="">Select your timezone</option>
            {TIMEZONE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Language Field */}
        <FormField
          label="Language"
          optional
          description="Your preferred language for the interface"
        >
          <select
            id="language"
            value={formData.language}
            onChange={(e) => handleInputChange('language', e.target.value)}
            className={cn(
              'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            aria-describedby="language-description"
          >
            {LANGUAGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Date Format Field */}
        <FormField
          label="Date Format"
          optional
          description="How dates are displayed throughout the app"
        >
          <select
            id="dateFormat"
            value={formData.dateFormat}
            onChange={(e) => handleInputChange('dateFormat', e.target.value)}
            className={cn(
              'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            aria-describedby="dateFormat-description"
          >
            {DATE_FORMAT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Form Messages */}
        {formState.success && (
          <Alert
            variant="success"
            title="Profile updated"
          >
            {formState.lastSaved
              ? `Last saved at ${formState.lastSaved.toLocaleTimeString()}`
              : 'Your profile details are up to date.'}
          </Alert>
        )}

        {formState.error && (
          <Alert
            variant="error"
            title="Failed to update profile"
          >
            {formState.error}
          </Alert>
        )}

        {/* Submit Button */}
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
    </div>
  )
}
