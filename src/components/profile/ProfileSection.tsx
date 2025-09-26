'use client'

import Image from 'next/image'
import { createLogger } from '@/lib/logger'
import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { FormMessage } from '@/components/ui/FormMessage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { ProfileFormData, FormState, FormValidationResult } from '@/lib/types/profile'
import { CameraIcon } from '@heroicons/react/24/outline'
import { getDefaultAvatarUrl } from '@/lib/utils/avatar'

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
    name: user.user_metadata?.name || '',
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

    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters'
    } else if (formData.name.trim().length > 50) {
      errors.name = 'Name must be less than 50 characters'
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
      // TODO: Implement actual API call to update profile
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call

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

  const handleAvatarUpload = () => {
    // TODO: Implement avatar upload functionality
    logger.info('Avatar upload clicked')
  }

  const avatarSrc = formData.avatar || getDefaultAvatarUrl({ name: formData.name || user.user_metadata?.name })
  const avatarAlt = formData.avatar ? 'Profile picture' : 'Default profile avatar'

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
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Image
              src={avatarSrc}
              alt={avatarAlt}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full border-2 border-gray-200 object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={handleAvatarUpload}
              className="absolute -bottom-1 -right-1 p-1.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              aria-label="Change profile picture"
            >
              <CameraIcon className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Profile Picture</p>
            <p className="text-xs text-gray-500">JPG, PNG up to 5MB</p>
          </div>
        </div>

        {/* Name Field */}
        <FormField
          label="Full Name"
          required
          error={validation.errors.name}
          description="Your display name as it appears to other users"
        >
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your full name"
            className={cn(validation.errors.name && 'border-red-500 focus-visible:ring-red-500')}
            aria-describedby={validation.errors.name ? 'name-error' : 'name-description'}
            aria-invalid={!!validation.errors.name}
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
          <FormMessage
            type="success"
            message="Profile updated successfully!"
            details={formState.lastSaved ? `Last saved at ${formState.lastSaved.toLocaleTimeString()}` : undefined}
          />
        )}

        {formState.error && (
          <FormMessage
            type="error"
            message="Failed to update profile"
            details={formState.error}
          />
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
