'use client'

import Image from 'next/image'
import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { getPrivacyMessageForStep } from '@/lib/onboarding'
import { validateChildName, validateBirthDate } from '@/lib/validation/child'
import type { ChildSetupData } from '@/hooks/useOnboarding'
import {
  UserIcon,
  PhotoIcon,
  LockClosedIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

// Simple image preview component for onboarding
const ImagePreview = ({
  src,
  alt,
  size = 'lg',
  className
}: {
  src: string
  alt: string
  size?: 'sm' | 'lg'
  className?: string
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    lg: 'w-24 h-24'
  }

  const dimension = size === 'sm' ? 48 : 96

  return (
    <Image
      src={src}
      alt={alt}
      width={dimension}
      height={dimension}
      className={`${sizeClasses[size]} rounded-full object-cover ${className || ''}`}
      unoptimized
    />
  )
}

interface ChildSetupStepProps {
  data: Partial<ChildSetupData>
  onUpdate: (data: Partial<ChildSetupData>) => void
  onNext: () => void
  onPrevious: () => void
  className?: string
}

export function ChildSetupStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  className
}: ChildSetupStepProps) {
  const [formData, setFormData] = useState<ChildSetupData>({
    name: data.name || '',
    birth_date: data.birth_date || '',
    profile_photo: data.profile_photo || undefined
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const privacyMessage = getPrivacyMessageForStep('child-setup')

  // Update parent state when form data changes
  useEffect(() => {
    onUpdate(formData)
  }, [formData, onUpdate])

  // Generate preview URL for uploaded image
  useEffect(() => {
    if (formData.profile_photo) {
      const url = URL.createObjectURL(formData.profile_photo)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [formData.profile_photo])

  // Validation
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    const nameError = validateChildName(formData.name)
    if (nameError) newErrors.name = nameError

    const birthDateError = validateBirthDate(formData.birth_date)
    if (birthDateError) newErrors.birth_date = birthDateError

    if (formData.profile_photo) {
      if (formData.profile_photo.size > 5 * 1024 * 1024) {
        newErrors.profile_photo = 'Image must be less than 5MB'
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(formData.profile_photo.type)) {
        newErrors.profile_photo = 'Image must be JPEG, PNG, or WebP format'
      }
    }

    setErrors(newErrors)
    setIsValid(Object.keys(newErrors).length === 0 && !!formData.name && !!formData.birth_date)
  }, [formData])

  const handleInputChange = (field: keyof ChildSetupData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileSelect = (file: File) => {
    setFormData(prev => ({ ...prev, profile_photo: file }))
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
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

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, profile_photo: undefined }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) {
      onNext()
    }
  }

  // Calculate child&apos;s age for display
  const getChildAge = (birthDate: string) => {
    if (!birthDate) return null

    const birth = new Date(birthDate)
    const now = new Date()
    const ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())

    if (ageInMonths < 12) {
      return `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''} old`
    } else {
      const years = Math.floor(ageInMonths / 12)
      const months = ageInMonths % 12
      if (months === 0) {
        return `${years} year${years !== 1 ? 's' : ''} old`
      } else {
        return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''} old`
      }
    }
  }

  const childAge = getChildAge(formData.birth_date)

  return (
    <div className={cn('max-w-2xl mx-auto space-y-8', className)}>
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
          <UserIcon className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Add Your Child
        </h1>
        <p className="text-gray-600">
          Name and birth date
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-900">
            Child's Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your child's name"
            className={cn(
              'text-base',
              errors.name && 'border-red-500 focus-visible:ring-red-500'
            )}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Birth Date */}
        <div className="space-y-2">
          <label htmlFor="birth_date" className="block text-sm font-medium text-gray-900">
            Birth Date <span className="text-red-500">*</span>
          </label>
          <Input
            id="birth_date"
            type="date"
            value={formData.birth_date}
            onChange={(e) => handleInputChange('birth_date', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={cn(
              'text-base',
              errors.birth_date && 'border-red-500 focus-visible:ring-red-500'
            )}
          />
          {errors.birth_date && (
            <p className="text-sm text-red-600">{errors.birth_date}</p>
          )}
          {childAge && (
            <p className="text-sm text-primary-600 font-medium">
              {formData.name} is {childAge}
            </p>
          )}
        </div>

        {/* Photo Upload - Optional, moved to end */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            Profile Photo
            <span className="text-gray-500 font-normal ml-2">(Optional)</span>
          </label>

          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Photo preview/placeholder */}
            <div className="flex-shrink-0">
              {previewUrl ? (
                <div className="relative">
                  <ImagePreview
                    src={previewUrl}
                    alt={formData.name || 'Child'}
                    size="lg"
                    className="border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                  <PhotoIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Upload area */}
            <div className="flex-1 w-full">
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
                  isDragOver
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400',
                  errors.profile_photo && 'border-red-300'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-2">
                  <div className="text-gray-600 text-sm">
                    {isDragOver ? 'Drop photo here' : 'Click to upload or drag photo here'}
                  </div>
                  <div className="text-xs text-gray-500">
                    JPEG, PNG, or WebP • Max 5MB
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
              {errors.profile_photo && (
                <p className="text-sm text-red-600 mt-1">{errors.profile_photo}</p>
              )}
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

          <Button
            type="submit"
            disabled={!isValid}
            className={cn(
              'px-8',
              !isValid && 'opacity-50 cursor-not-allowed'
            )}
          >
            Continue →
          </Button>
        </div>
      </form>

    </div>
  )
}

// Compact version for mobile or quicker flow
interface ChildSetupStepCompactProps {
  data: Partial<ChildSetupData>
  onUpdate: (data: Partial<ChildSetupData>) => void
  onNext: () => void
  onPrevious: () => void
  className?: string
}

export function ChildSetupStepCompact({
  data,
  onUpdate,
  onNext,
  onPrevious,
  className
}: ChildSetupStepCompactProps) {
  const [formData, setFormData] = useState<ChildSetupData>({
    name: data.name || '',
    birth_date: data.birth_date || '',
    profile_photo: data.profile_photo || undefined
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    onUpdate(formData)
  }, [formData, onUpdate])

  useEffect(() => {
    const newErrors: Record<string, string> = {}
    const nameError = validateChildName(formData.name)
    if (nameError) newErrors.name = nameError
    const birthDateError = validateBirthDate(formData.birth_date)
    if (birthDateError) newErrors.birth_date = birthDateError
    setErrors(newErrors)
    setIsValid(Object.keys(newErrors).length === 0 && !!formData.name && !!formData.birth_date)
  }, [formData])

  const handleInputChange = (field: keyof ChildSetupData, value: string) => {
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
        <h1 className="text-2xl font-bold text-gray-900">Add Your Child</h1>
        <p className="text-sm text-gray-600">Name and birth date</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Child's name"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>

        <div>
          <Input
            type="date"
            value={formData.birth_date}
            onChange={(e) => handleInputChange('birth_date', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={errors.birth_date ? 'border-red-500' : ''}
          />
          {errors.birth_date && <p className="text-xs text-red-600 mt-1">{errors.birth_date}</p>}
        </div>


        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onPrevious}>
            ← Back
          </Button>
          <Button type="submit" disabled={!isValid} size="sm">
            Continue →
          </Button>
        </div>
      </form>
    </div>
  )
}
