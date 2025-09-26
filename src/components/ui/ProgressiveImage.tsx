'use client'

import Image from 'next/image'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { getTimelineCache } from '@/lib/cache/timeline-cache'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ProgressiveImage')

export interface ProgressiveImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  blurDataURL?: string
  width?: number
  height?: number
  sizes?: string
  quality?: number
  priority?: boolean
  loading?: 'lazy' | 'eager'
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  objectPosition?: string
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void
  onLoadingStateChange?: (loading: boolean) => void
  enableWebP?: boolean
  enableRetina?: boolean
  enableProgressiveEnhancement?: boolean
  cacheKey?: string
}

interface ImageState {
  isLoading: boolean
  isLoaded: boolean
  hasError: boolean
  currentSrc: string
  loadedSources: Set<string>
  retryCount: number
}

interface OptimizedImageSources {
  webp?: string
  avif?: string
  thumbnail?: string
  preview?: string
  fullsize: string
}

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff

/**
 * Progressive image component with blur-up effect, format optimization, and intelligent caching
 */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className,
  style,
  placeholder,
  blurDataURL,
  width,
  height,
  sizes,
  quality = 75,
  priority = false,
  loading = 'lazy',
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  onError,
  onLoadingStateChange,
  enableWebP = true,
  enableRetina = true,
  enableProgressiveEnhancement = true,
  cacheKey
}) => {
  const [imageState, setImageState] = useState<ImageState>({
    isLoading: false,
    isLoaded: false,
    hasError: false,
    currentSrc: placeholder || blurDataURL || '',
    loadedSources: new Set(),
    retryCount: 0
  })

  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const preloadRef = useRef<HTMLImageElement | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()

  const cache = getTimelineCache()

  // Intersection observer for lazy loading
  const { isIntersecting } = useIntersectionObserver(containerRef, {
    threshold: 0.1,
    rootMargin: '50px',
    enabled: !priority && loading === 'lazy'
  })

  // Generate optimized image sources
  const generateOptimizedSources = useCallback((originalSrc: string): OptimizedImageSources => {
    const sources: OptimizedImageSources = {
      fullsize: originalSrc
    }

    // Generate WebP version if enabled
    if (enableWebP) {
      sources.webp = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp')
    }

    // Generate AVIF version for better compression
    sources.avif = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.avif')

    // Generate different size variants
    sources.thumbnail = originalSrc.replace(/\.([^.]+)$/, '_thumb.$1')
    sources.preview = originalSrc.replace(/\.([^.]+)$/, '_preview.$1')

    // Add retina versions if enabled
    if (enableRetina && window.devicePixelRatio > 1) {
      sources.fullsize = originalSrc.replace /\.([^.]+)$/, `_2x.$1`)
    }

    return sources
  }, [enableWebP, enableRetina])

  // Check if browser supports format
  const supportsFormat = useCallback((format: string): boolean => {
    if (typeof window === 'undefined') return false

    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1

    try {
      const testFormats = {
        webp: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
        avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='
      }

      return testFormats[format] ? canvas.toDataURL('image/' + format).startsWith('data:image/' + format) : false
    } catch {
      return false
    }
  }, [])

  // Get best supported image source
  const getBestImageSource = useCallback((sources: OptimizedImageSources): string => {
    // Check format support and return best option
    if (sources.avif && supportsFormat('avif')) {
      return sources.avif
    }

    if (sources.webp && supportsFormat('webp')) {
      return sources.webp
    }

    return sources.fullsize
  }, [supportsFormat])

  // Load image with caching
  const loadImageWithCache = useCallback(async (imageSrc: string): Promise<string> => {
    const key = cacheKey || imageSrc

    // Check cache first
    const cached = await cache.getImage(key)
    if (cached?.blob) {
      return URL.createObjectURL(cached.blob)
    }

    // Load image
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = async () => {
        try {
          // Convert to blob for caching
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(imageSrc)
            return
          }

          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          ctx.drawImage(img, 0, 0)

          canvas.toBlob(async (blob) => {
            if (blob) {
              // Cache the image blob
              await cache.cacheImage(key, blob, {
                originalSrc: imageSrc,
                width: img.naturalWidth,
                height: img.naturalHeight
              })

              resolve(URL.createObjectURL(blob))
            } else {
              resolve(imageSrc)
            }
          }, 'image/webp', quality / 100)
        } catch (error) {
          logger.warn('Failed to cache image:', error)
          resolve(imageSrc)
        }
      }

      img.onerror = () => reject(new Error(`Failed to load image: ${imageSrc}`))
      img.crossOrigin = 'anonymous' // Enable CORS for caching
      img.src = imageSrc
    })
  }, [cache, cacheKey, quality])

  // Retry loading with exponential backoff
  const retryLoad = useCallback(() => {
    if (imageState.retryCount >= MAX_RETRY_ATTEMPTS) {
      logger.error('Max retry attempts reached for image:', src)
      setImageState(prev => ({ ...prev, hasError: true, isLoading: false }))
      onLoadingStateChange?.(false)
      return
    }

    const delay = RETRY_DELAYS[imageState.retryCount] || 4000

    retryTimeoutRef.current = setTimeout(() => {
      setImageState(prev => ({
        ...prev,
        retryCount: prev.retryCount + 1,
        hasError: false,
        isLoading: true
      }))
      onLoadingStateChange?.(true)
      loadImage()
    }, delay)

    logger.info(`Retrying image load in ${delay}ms (attempt ${imageState.retryCount + 1}/${MAX_RETRY_ATTEMPTS})`)
  }, [imageState.retryCount, src, onLoadingStateChange])

  // Progressive loading implementation
  const loadImage = useCallback(async () => {
    if (!src) return

    setImageState(prev => ({ ...prev, isLoading: true, hasError: false }))
    onLoadingStateChange?.(true)

    try {
      const optimizedSources = generateOptimizedSources(src)
      const bestSource = getBestImageSource(optimizedSources)

      // If we have progressive enhancement enabled, load thumbnail first
      if (enableProgressiveEnhancement && optimizedSources.thumbnail && !imageState.loadedSources.has('thumbnail')) {
        try {
          const thumbnailSrc = await loadImageWithCache(optimizedSources.thumbnail)
          setImageState(prev => ({
            ...prev,
            currentSrc: thumbnailSrc,
            loadedSources: new Set([...prev.loadedSources, 'thumbnail'])
          }))
        } catch (error) {
          logger.debug('Thumbnail load failed, continuing with main image:', error)
        }
      }

      // Load the best quality image
      const finalSrc = await loadImageWithCache(bestSource)

      setImageState(prev => ({
        ...prev,
        currentSrc: finalSrc,
        isLoaded: true,
        isLoading: false,
        loadedSources: new Set([...prev.loadedSources, 'fullsize'])
      }))
      onLoadingStateChange?.(false)

    } catch (error) {
      logger.error('Image load failed:', { src, error })
      setImageState(prev => ({ ...prev, hasError: true, isLoading: false }))
      onLoadingStateChange?.(false)

      // Retry loading
      retryLoad()
    }
  }, [src, generateOptimizedSources, getBestImageSource, enableProgressiveEnhancement, imageState.loadedSources, loadImageWithCache, onLoadingStateChange, retryLoad])

  // Handle image load success
  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget

    setImageState(prev => ({
      ...prev,
      isLoaded: true,
      isLoading: false,
      hasError: false
    }))
    onLoadingStateChange?.(false)
    onLoad?.(event)

    logger.debug('Image loaded successfully:', {
      src: img.src,
      dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
      currentSrc: imageState.currentSrc
    })
  }, [onLoad, onLoadingStateChange, imageState.currentSrc])

  // Handle image load error
  const handleImageError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    logger.error('Image load error:', { src, event })
    setImageState(prev => ({ ...prev, hasError: true, isLoading: false }))
    onLoadingStateChange?.(false)
    onError?.(event)

    // Try retry
    retryLoad()
  }, [src, onError, onLoadingStateChange, retryLoad])

  // Start loading when component mounts or becomes visible
  useEffect(() => {
    if (priority || isIntersecting) {
      loadImage()
    }
  }, [priority, isIntersecting, loadImage])

  // Cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (preloadRef.current) {
        preloadRef.current.onload = null
        preloadRef.current.onerror = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-neutral-100',
        className
      )}
      style={{
        ...style,
        width,
        height
      }}
    >
      {/* Blur placeholder */}
      {blurDataURL && !imageState.isLoaded && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-sm scale-110 transition-opacity duration-300"
          style={{
            backgroundImage: `url(${blurDataURL})`,
            opacity: imageState.isLoading ? 1 : 0
          }}
        />
      )}

      {/* Loading skeleton */}
      {imageState.isLoading && !blurDataURL && (
        <div className="absolute inset-0 bg-neutral-200 animate-pulse" />
      )}

      {/* Main image */}
      {(imageState.currentSrc || src) && (
        <Image
          ref={imgRef}
          src={imageState.currentSrc || src}
          sizes={sizes}
          alt={alt}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            imageState.isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            objectFit,
            objectPosition
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority ? 'eager' : loading}
          priority={priority}
          fill={!width || !height}
          width={width}
          height={height}
          unoptimized
        />
      )}

      {/* Loading indicator */}
      {imageState.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {imageState.hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-100 text-neutral-400">
          <svg
            className="w-8 h-8 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs">Image unavailable</span>
          {imageState.retryCount < MAX_RETRY_ATTEMPTS && (
            <button
              onClick={() => retryLoad()}
              className="mt-2 px-2 py-1 text-xs bg-neutral-200 hover:bg-neutral-300 rounded transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 left-0 bg-black/80 text-white text-xs p-1 opacity-0 hover:opacity-100 transition-opacity">
          <div>Loaded: {imageState.isLoaded ? 'Yes' : 'No'}</div>
          <div>Loading: {imageState.isLoading ? 'Yes' : 'No'}</div>
          <div>Error: {imageState.hasError ? 'Yes' : 'No'}</div>
          <div>Retries: {imageState.retryCount}</div>
          <div>Sources: {Array.from(imageState.loadedSources).join(', ')}</div>
        </div>
      )}
    </div>
  )
}

export default ProgressiveImage
