'use client'

import { createLogger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getChildPhotoUrl, refreshChildPhotoUrl, isSignedUrlExpired } from '@/lib/photo-upload'

const logger = createLogger('ChildImage')

interface ChildImageProps {
  childId: string
  photoUrl?: string
  name?: string
  alt: string
  className?: string
  onError?: () => void
  width?: number
  height?: number
  priority?: boolean
}

export default function ChildImage({
  childId,
  photoUrl,
  name,
  alt,
  className = '',
  onError,
  width = 400,
  height = 400,
  priority = false
}: ChildImageProps) {
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(photoUrl)
  const [imageError, setImageError] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Update currentPhotoUrl when photoUrl prop changes
  useEffect(() => {
    setCurrentPhotoUrl(photoUrl)
    setImageError(false)
  }, [photoUrl])

  const handleImageError = async () => {
    if (isRefreshing || imageError || !currentPhotoUrl) {
      setImageError(true)
      onError?.()
      return
    }

    setIsRefreshing(true)

    try {
      // Try to refresh the signed URL
      const newUrl = await refreshChildPhotoUrl(childId)
      if (newUrl && newUrl !== currentPhotoUrl) {
        setCurrentPhotoUrl(newUrl)
        setImageError(false)
      } else {
        setImageError(true)
        onError?.()
      }
    } catch (error) {
      logger.warn('Failed to refresh photo URL:', { data: error })
      setImageError(true)
      onError?.()
    } finally {
      setIsRefreshing(false)
    }
  }

  const resolvedPhotoUrl = getChildPhotoUrl(imageError ? undefined : currentPhotoUrl, name)

  return (
    <Image
      src={resolvedPhotoUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={imageError ? undefined : handleImageError}
      priority={priority}
      quality={85}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  )
}
