'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('ChildImage')
import { useState, useEffect } from 'react'
import { getChildPhotoUrl, refreshChildPhotoUrl, isSignedUrlExpired } from '@/lib/photo-upload'

interface ChildImageProps {
  childId: string
  photoUrl?: string
  alt: string
  className?: string
  onError?: () => void
}

export default function ChildImage({ childId, photoUrl, alt, className = '', onError }: ChildImageProps) {
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

  if (!currentPhotoUrl || imageError) {
    return (
      <div className={`flex items-center justify-center bg-primary-100 ${className}`}>
        <svg className="w-1/2 h-1/2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    )
  }

  return (
    <img
      src={getChildPhotoUrl(currentPhotoUrl)}
      alt={alt}
      className={className}
      onError={handleImageError}
    />
  )
}