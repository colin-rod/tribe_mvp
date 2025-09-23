'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('PersonalInfoForm')
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
import { useProfileManager } from '@/hooks/useProfileManager'
import { personalInfoSchema, type PersonalInfoFormData } from '@/lib/validation/profile'
import { validateImageFile, getChildPhotoUrl } from '@/lib/photo-upload'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface PersonalInfoFormProps {
  onSuccess?: () => void
}

export default function PersonalInfoForm({ onSuccess }: PersonalInfoFormProps) {
  const { user } = useAuth()
  const { profile, updatePersonalInfo, loading, error, refreshProfile } = useProfileManager()
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      name: '',
      email: '',
      profile_photo: undefined
    }
  })

  const watchedPhoto = watch('profile_photo')

  // Load profile data when component mounts
  useEffect(() => {
    if (!profile && user) {
      refreshProfile()
    }
  }, [profile, user, refreshProfile])

  // Set form values when profile loads
  useEffect(() => {
    if (profile && user) {
      reset({
        name: profile.name || user.user_metadata?.name || '',
        email: profile.email || user.email || '',
        profile_photo: undefined
      })
    }
  }, [profile, user, reset])

  // Handle photo preview
  useEffect(() => {
    if (watchedPhoto && Array.isArray(watchedPhoto) && watchedPhoto.length > 0) {
      const file = watchedPhoto[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setRemovePhoto(false)
    }
  }, [watchedPhoto])

  const handlePhotoRemove = () => {
    setValue('profile_photo', undefined)
    setPhotoPreview(null)
    setRemovePhoto(true)
  }

  const onSubmit = async (data: PersonalInfoFormData) => {
    try {
      // Convert FileList to File if present
      const formData: PersonalInfoFormData = {
        ...data,
        profile_photo: data.profile_photo && Array.isArray(data.profile_photo) && data.profile_photo.length > 0
          ? data.profile_photo[0]
          : undefined
      }

      await updatePersonalInfo(formData)
      onSuccess?.()

      // Reset form dirty state after successful update
      reset(formData)
    } catch (err) {
      // Error is already handled in the hook
      logger.error('Failed to update personal info:', { error: err })
    }
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
        <p className="mt-1 text-sm text-gray-600">
          Update your personal details and profile photo.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Profile Photo
          </label>

          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {photoPreview && !removePhoto ? (
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Current profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-800 text-lg font-semibold">
                      {profile.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <div className="space-y-2">
                <div className="relative">
                  <input
                    {...register('profile_photo')}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="relative"
                  >
                    Change Photo
                  </Button>
                </div>

                {(photoPreview || user.user_metadata?.avatar_url) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePhotoRemove}
                    disabled={loading}
                  >
                    Remove Photo
                  </Button>
                )}

                <p className="text-xs text-gray-500">
                  JPEG, PNG, WebP up to 5MB
                </p>
              </div>
            </div>
          </div>

          {errors.profile_photo && (
            <p className="mt-2 text-sm text-red-600">{errors.profile_photo.message}</p>
          )}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <Input
            {...register('name')}
            id="name"
            type="text"
            disabled={loading}
            className={errors.name ? 'border-red-300' : ''}
            placeholder="Enter your full name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <Input
            {...register('email')}
            id="email"
            type="email"
            disabled={loading}
            className={errors.email ? 'border-red-300' : ''}
            placeholder="Enter your email address"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            We'll send you a confirmation email if you change your email address.
          </p>
        </div>

        {/* Account Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Account Information</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Account created:</span>
              <span>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Last updated:</span>
              <span>{profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}</span>
            </div>
            <div className="flex justify-between">
              <span>User ID:</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !isDirty}
            className="min-w-[140px]"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Updating...
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