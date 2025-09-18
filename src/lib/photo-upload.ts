import { createClient } from './supabase/client'

export async function uploadChildPhoto(file: File, childId: string): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Process image before upload
  const processedFile = await processImage(file, { maxWidth: 400, quality: 0.8 })

  const filePath = `${user.id}/children/${childId}/profile.jpg`

  const { error } = await supabase.storage
    .from('media')
    .upload(filePath, processedFile, {
      upsert: true,
      contentType: 'image/jpeg'
    })

  if (error) throw error

  // Create a signed URL that expires in 7 days
  const { data, error: signedUrlError } = await supabase.storage
    .from('media')
    .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry

  if (signedUrlError) throw signedUrlError

  return data.signedUrl
}

export async function deleteChildPhoto(childId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const filePath = `${user.id}/children/${childId}/profile.jpg`

  const { error } = await supabase.storage
    .from('media')
    .remove([filePath])

  if (error) throw error
}

async function processImage(file: File, options: { maxWidth: number, quality: number }): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      try {
        // Calculate new dimensions
        const { width, height } = calculateDimensions(img.width, img.height, options.maxWidth)

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          if (blob) {
            const processedFile = new File([blob], 'profile.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(processedFile)
          } else {
            reject(new Error('Failed to process image'))
          }
        }, 'image/jpeg', options.quality)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))

    // Create object URL for the image
    img.src = URL.createObjectURL(file)
  })
}

function calculateDimensions(originalWidth: number, originalHeight: number, maxWidth: number) {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight }
  }

  const ratio = originalHeight / originalWidth
  return {
    width: maxWidth,
    height: Math.round(maxWidth * ratio)
  }
}

export function validateImageFile(file: File): string | null {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return 'File must be a JPEG, PNG, or WebP image'
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return 'File size must be less than 5MB'
  }

  return null
}

export function getChildPhotoUrl(photoUrl?: string): string {
  if (photoUrl) {
    return photoUrl
  }

  // Return a default avatar or placeholder
  return '/placeholder-child.png'
}

// Helper function to get a fresh signed URL for an existing photo
export async function refreshChildPhotoUrl(childId: string): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const filePath = `${user.id}/children/${childId}/profile.jpg`

  // Check if the file exists first
  const { data: fileList, error: listError } = await supabase.storage
    .from('media')
    .list(`${user.id}/children/${childId}`, {
      search: 'profile.jpg'
    })

  if (listError || !fileList || fileList.length === 0) {
    return null // No photo exists
  }

  // Create a fresh signed URL
  const { data, error: signedUrlError } = await supabase.storage
    .from('media')
    .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days expiry

  if (signedUrlError) throw signedUrlError

  return data.signedUrl
}

// Helper function to check if a signed URL is expired or invalid
export function isSignedUrlExpired(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const expiresParam = urlObj.searchParams.get('Expires')

    if (!expiresParam) return false // Not a signed URL

    const expiresTimestamp = parseInt(expiresParam) * 1000 // Convert to milliseconds
    return Date.now() > expiresTimestamp
  } catch {
    return true // Invalid URL
  }
}