'use client'

import { useState, useRef, ChangeEvent } from 'react'
import Image from 'next/image'
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { createLogger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import {
  uploadAndSetAvatar,
  validateAvatarFile,
  compressImage
} from '@/lib/utils/avatar-upload'
import { getDefaultAvatarUrl } from '@/lib/utils/avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'

const logger = createLogger('ProfilePhotoUpload')

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string
  currentPhotoPath?: string
  onPhotoUpdate?: (url: string) => void
  className?: string
}

export function ProfilePhotoUpload({
  currentPhotoUrl,
  currentPhotoPath,
  onPhotoUpdate,
  className
}: ProfilePhotoUploadProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset error state
    setError(null)

    // Validate file
    const validationError = validateAvatarFile(file)
    if (validationError) {
      setError(validationError.message)
      return
    }

    try {
      // Show preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Compress image
      logger.info('Compressing image before upload')
      const compressedFile = await compressImage(file, 512, 512, 0.9)

      // Upload
      setUploading(true)
      logger.info('Starting avatar upload')

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const newUrl = await uploadAndSetAvatar(
        compressedFile,
        user.id,
        currentPhotoPath
      )

      logger.info('Avatar uploaded successfully', { url: newUrl })

      // Notify parent component
      onPhotoUpdate?.(newUrl)

      // Clear preview after successful upload
      setTimeout(() => setPreview(null), 1000)
    } catch (err) {
      logger.error('Avatar upload failed', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to upload photo')
      setPreview(null)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleCancelPreview = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayUrl = preview || currentPhotoUrl || getDefaultAvatarUrl({
    name: user?.user_metadata?.firstName || user?.email
  })

  const isDefault = !currentPhotoUrl && !preview

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Avatar Display */}
      <div className="relative">
        <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-gray-200">
          <Image
            src={displayUrl}
            alt={isDefault ? 'Default profile avatar' : 'Profile picture'}
            width={80}
            height={80}
            className="h-full w-full object-cover"
            unoptimized={isDefault}
          />
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <LoadingSpinner size="sm" className="text-white" />
            </div>
          )}
        </div>

        {/* Camera Button */}
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Upload profile picture"
        >
          <CameraIcon className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Cancel Preview Button */}
        {preview && !uploading && (
          <button
            type="button"
            onClick={handleCancelPreview}
            className="absolute -top-1 -left-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            aria-label="Cancel upload"
          >
            <XMarkIcon className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Upload Info */}
      <div className="flex-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="sr-only"
          id="avatar-upload"
          disabled={uploading}
        />
        <label htmlFor="avatar-upload" className="block">
          <p className="text-sm font-medium text-gray-900">Profile Picture</p>
          <p className="text-xs text-gray-500 mt-1">
            JPG, PNG, or WebP (max 5MB)
          </p>
          {error && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <span className="inline-block">⚠️</span>
              {error}
            </p>
          )}
          {uploading && (
            <p className="text-xs text-primary-600 mt-1">
              Uploading...
            </p>
          )}
          {preview && !uploading && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Ready to save
            </p>
          )}
        </label>
      </div>
    </div>
  )
}
