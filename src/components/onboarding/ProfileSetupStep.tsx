'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import type { ProfileSetupData } from '@/hooks/useOnboarding'
import { UserIcon } from '@heroicons/react/24/outline'

interface ProfileSetupStepProps {
  data: Partial<ProfileSetupData>
  onUpdate: (data: Partial<ProfileSetupData>) => void
  onNext: () => void
  onPrevious: () => void
  className?: string
}

export function ProfileSetupStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  className
}: ProfileSetupStepProps) {
  const [formData, setFormData] = useState<ProfileSetupData>({
    name: data.name || '',
    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    emailNotifications: data.emailNotifications ?? true,
    smsNotifications: data.smsNotifications ?? false,
    pushNotifications: data.pushNotifications ?? true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)

  // Common timezones for quick selection
  const commonTimezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
    'Pacific/Auckland'
  ]

  // Update parent state when form data changes
  useEffect(() => {
    onUpdate(formData)
  }, [formData, onUpdate])

  // Validation
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name must be less than 50 characters'
    }

    if (!formData.timezone) {
      newErrors.timezone = 'Timezone is required'
    }

    setErrors(newErrors)
    setIsValid(Object.keys(newErrors).length === 0)
  }, [formData])

  const handleInputChange = (field: keyof ProfileSetupData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Auto-save profile data on blur
  const handleAutoSave = async () => {
    if (!formData.name || !formData.timezone || !isValid) return

    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          timezone: formData.timezone
        })
      })
    } catch {
      // Silently fail - data is still in state
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) {
      // Save before proceeding
      handleAutoSave().finally(() => {
        onNext()
      })
    }
  }

  return (
    <div className={cn('max-w-2xl mx-auto space-y-8', className)}>
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
          <UserIcon className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Your Profile
        </h1>
        <p className="text-lg text-gray-600">
          Name and timezone
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-900">
            Your Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            onBlur={handleAutoSave}
            placeholder="Enter your full name"
            className={cn(
              'text-base',
              errors.name && 'border-red-500 focus-visible:ring-red-500'
            )}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-900">
            Timezone <span className="text-red-500">*</span>
          </label>
          <select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => handleInputChange('timezone', e.target.value)}
            onBlur={handleAutoSave}
            className={cn(
              'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
              errors.timezone && 'border-red-500 focus-visible:ring-red-500'
            )}
          >
            <option value="">Select your timezone</option>
            <optgroup label="Common Timezones">
              {commonTimezones.map(tz => (
                <option key={tz} value={tz}>
                  {tz.replace('_', ' ')} ({new Date().toLocaleTimeString('en-US', {
                    timeZone: tz,
                    timeZoneName: 'short'
                  }).split(' ')[1]})
                </option>
              ))}
            </optgroup>
            <optgroup label="All Timezones">
              {Intl.supportedValuesOf('timeZone').map(tz => (
                <option key={tz} value={tz}>
                  {tz.replace('_', ' ')}
                </option>
              ))}
            </optgroup>
          </select>
          {errors.timezone && (
            <p className="text-sm text-red-600">{errors.timezone}</p>
          )}
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

          <Button
            type="submit"
            disabled={!isValid}
            className={cn(
              'px-8',
              !isValid && 'opacity-50 cursor-not-allowed'
            )}
          >
            Continue
          </Button>
        </div>
      </form>
    </div>
  )
}

// Compact version for mobile or quick setup
interface ProfileSetupStepCompactProps {
  data: Partial<ProfileSetupData>
  onUpdate: (data: Partial<ProfileSetupData>) => void
  onNext: () => void
  onPrevious: () => void
  className?: string
}

export function ProfileSetupStepCompact({
  data,
  onUpdate,
  onNext,
  onPrevious,
  className
}: ProfileSetupStepCompactProps) {
  const [formData, setFormData] = useState<ProfileSetupData>({
    name: data.name || '',
    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    emailNotifications: data.emailNotifications ?? true,
    smsNotifications: data.smsNotifications ?? false,
    pushNotifications: data.pushNotifications ?? true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    onUpdate(formData)
  }, [formData, onUpdate])

  useEffect(() => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.timezone) newErrors.timezone = 'Timezone is required'
    setErrors(newErrors)
    setIsValid(Object.keys(newErrors).length === 0)
  }, [formData])

  const handleInputChange = (field: keyof ProfileSetupData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) {
      onNext()
    }
  }

  return (
    <div className={cn('max-w-md mx-auto space-y-6', className)}>
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
          <UserIcon className="w-6 h-6 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p className="text-sm text-gray-600">Name and timezone</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Your name"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>

        <div>
          <select
            value={formData.timezone}
            onChange={(e) => handleInputChange('timezone', e.target.value)}
            className={cn(
              'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
              errors.timezone && 'border-red-500'
            )}
          >
            <option value="">Select timezone</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
          </select>
          {errors.timezone && <p className="text-xs text-red-600 mt-1">{errors.timezone}</p>}
        </div>

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onPrevious}>
            ← Back
          </Button>
          <Button type="submit" disabled={!isValid} size="sm">
            Continue
          </Button>
        </div>
      </form>
    </div>
  )
}
