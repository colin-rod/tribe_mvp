'use client'

import { useState } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, ChevronLeftIcon, ChevronRightIcon, PlayIcon } from '@heroicons/react/24/outline'

interface MediaGalleryProps {
  mediaUrls: string[]
  maxPreview?: number
  className?: string
  onMediaClick?: (url: string, index: number) => void
}

export function MediaGallery({
  mediaUrls,
  maxPreview = 4,
  className = '',
  onMediaClick
}: MediaGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleMediaClick = (url: string, index: number) => {
    if (onMediaClick) {
      onMediaClick(url, index)
    } else {
      setCurrentIndex(index)
      setLightboxOpen(true)
    }
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaUrls.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length)
  }

  const isVideo = (url: string) => {
    return /\.(mp4|webm|ogg|mov)$/i.test(url)
  }

  const downloadMedia = (url: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = url.split('/').pop() || 'media'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const previewUrls = mediaUrls.slice(0, maxPreview)
  const remainingCount = mediaUrls.length - maxPreview

  return (
    <>
      {/* Gallery Grid */}
      <div className={`grid gap-2 ${className}`}>
        {previewUrls.map((url, index) => (
          <div
            key={index}
            className="relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100"
            onClick={() => handleMediaClick(url, index)}
          >
            {isVideo(url) ? (
              <div className="relative w-full h-20">
                <video
                  src={url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <PlayIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            ) : (
              <img
                src={url}
                alt={`Media ${index + 1}`}
                className="w-full h-20 object-cover transition-transform group-hover:scale-105"
              />
            )}

            {/* Overlay for remaining count */}
            {index === maxPreview - 1 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                <span className="text-white font-medium">+{remainingCount} more</span>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
              <ArrowTopRightOnSquareIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative max-w-7xl max-h-full p-4">
            {/* Close Button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            {/* Navigation Buttons */}
            {mediaUrls.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
                >
                  <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
                >
                  <ChevronRightIcon className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Download Button */}
            <button
              onClick={() => downloadMedia(mediaUrls[currentIndex])}
              className="absolute bottom-4 right-4 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </button>

            {/* Media Content */}
            <div className="flex items-center justify-center max-h-full">
              {isVideo(mediaUrls[currentIndex]) ? (
                <video
                  src={mediaUrls[currentIndex]}
                  controls
                  className="max-w-full max-h-full rounded-lg"
                  autoPlay
                />
              ) : (
                <img
                  src={mediaUrls[currentIndex]}
                  alt={`Media ${currentIndex + 1}`}
                  className="max-w-full max-h-full rounded-lg"
                />
              )}
            </div>

            {/* Image Counter */}
            {mediaUrls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} of {mediaUrls.length}
              </div>
            )}
          </div>

          {/* Click outside to close */}
          <div
            className="absolute inset-0 -z-10"
            onClick={() => setLightboxOpen(false)}
          />
        </div>
      )}
    </>
  )
}