import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AvatarUpload')

export interface AvatarUploadResult {
  url: string
  path: string
}

export interface AvatarUploadError {
  message: string
  code?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const AVATAR_BUCKET = 'media'

/**
 * Validate avatar file before upload
 */
export function validateAvatarFile(file: File): AvatarUploadError | null {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      message: 'File size must be less than 5MB',
      code: 'FILE_TOO_LARGE'
    }
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      message: 'Only JPG, PNG, and WebP images are allowed',
      code: 'INVALID_FILE_TYPE'
    }
  }

  return null
}

/**
 * Upload avatar to Supabase Storage
 */
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<AvatarUploadResult> {
  logger.info('Starting avatar upload', { fileName: file.name, fileSize: file.size, userId })

  // Validate file
  const validationError = validateAvatarFile(file)
  if (validationError) {
    logger.error('Avatar validation failed', { error: validationError.message, code: validationError.code })
    throw new Error(validationError.message)
  }

  try {
    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    logger.info('Uploading file to storage', { filePath })

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      logger.error('Storage upload failed', { error })
      throw new Error(`Upload failed: ${error.message}`)
    }

    logger.info('File uploaded successfully', { path: data.path })

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(data.path)

    logger.info('Avatar upload complete', { publicUrl })

    return {
      url: publicUrl,
      path: data.path
    }
  } catch (error) {
    logger.error('Avatar upload failed', { error })
    throw error instanceof Error ? error : new Error('Failed to upload avatar')
  }
}

/**
 * Delete old avatar from storage
 */
export async function deleteAvatar(filePath: string): Promise<void> {
  if (!filePath) {
    logger.warn('No file path provided for deletion')
    return
  }

  try {
    logger.info('Deleting old avatar', { filePath })

    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([filePath])

    if (error) {
      logger.error('Failed to delete old avatar', { error })
      // Don't throw - this is not critical
    } else {
      logger.info('Old avatar deleted successfully')
    }
  } catch (error) {
    logger.error('Error during avatar deletion', { error })
    // Don't throw - this is not critical
  }
}

/**
 * Update user profile with new avatar URL
 */
export async function updateUserAvatar(avatarUrl: string): Promise<void> {
  logger.info('Updating user avatar in profile', { avatarUrl })

  const { error } = await supabase.auth.updateUser({
    data: { avatar: avatarUrl }
  })

  if (error) {
    logger.error('Failed to update user avatar', { error })
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  logger.info('User avatar updated successfully')
}

/**
 * Complete avatar upload flow: upload, update profile, delete old
 */
export async function uploadAndSetAvatar(
  file: File,
  userId: string,
  oldAvatarPath?: string
): Promise<string> {
  logger.info('Starting complete avatar upload flow')

  // Upload new avatar
  const { url } = await uploadAvatar(file, userId)

  // Update user profile
  await updateUserAvatar(url)

  // Delete old avatar if exists (non-blocking)
  if (oldAvatarPath) {
    deleteAvatar(oldAvatarPath).catch(err =>
      logger.warn('Failed to delete old avatar', { error: err })
    )
  }

  logger.info('Avatar upload flow completed', { newUrl: url })
  return url
}

/**
 * Compress and resize image before upload
 */
export async function compressImage(
  file: File,
  maxWidth: number = 512,
  maxHeight: number = 512,
  quality: number = 0.9
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })

            logger.info('Image compressed', {
              originalSize: file.size,
              compressedSize: compressedFile.size,
              reduction: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`
            })

            resolve(compressedFile)
          },
          file.type,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
