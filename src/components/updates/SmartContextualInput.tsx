'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { validateUpdateMediaFiles } from '@/lib/photo-upload'
import RichTextEditor from '@/components/ui/RichTextEditor'

interface MediaItem {
  id: string
  file: File
  previewUrl: string
  type: 'image' | 'video' | 'audio'
  position: number // Character position in text where media should appear
}

interface SmartContextualInputProps {
  content: string
  mediaFiles: File[]
  previewUrls: string[]
  onContentChange: (content: string) => void
  onMediaChange: (files: File[]) => void
  onMediaRemove: (index: number) => void
  disabled?: boolean
  placeholder?: string
  maxCharacters?: number
  maxFiles?: number
}

export default function SmartContextualInput({
  content,
  mediaFiles,
  previewUrls,
  onContentChange,
  onMediaChange,
  onMediaRemove,
  disabled = false,
  placeholder,
  maxCharacters = 2000,
  maxFiles = 10
}: SmartContextualInputProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [useRichText, setUseRichText] = useState(true) // Toggle between plain text and rich text
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputPlaceholder = "Share a moment... add photos or video if you like"
  const resolvedPlaceholder = placeholder ?? inputPlaceholder

  // Sync mediaFiles with mediaItems
  useEffect(() => {
    const items: MediaItem[] = mediaFiles.map((file, index) => {
      const fileType = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        : 'audio'

      return {
        id: `${file.name}-${index}-${Date.now()}`,
        file,
        previewUrl: previewUrls[index] || '',
        type: fileType,
        position: 0 // Default position at start
      }
    })
    setMediaItems(items)
  }, [mediaFiles, previewUrls])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    if (newContent.length <= maxCharacters) {
      onContentChange(newContent)
    }
  }

  const handleRichTextChange = (html: string) => {
    onContentChange(html)
  }

  // Helper to get plain text length from HTML
  const getTextLength = (htmlOrText: string): number => {
    if (!useRichText) return htmlOrText.length
    // Create a temporary div to extract text from HTML
    const div = document.createElement('div')
    div.innerHTML = htmlOrText
    return div.textContent?.length || 0
  }

  const extractPlainText = useCallback((value: string) => {
    if (!value) return ''
    const div = document.createElement('div')
    div.innerHTML = value
    return div.textContent?.trim() ?? ''
  }, [])

  const convertPlainTextToHtml = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    return trimmed
      .split(/\n{2,}/)
      .map(segment => segment.trim())
      .filter(Boolean)
      .map(segment => `<p>${segment.replace(/\n/g, '<br />')}</p>`)
      .join('')
  }, [])

  const isLikelyHtml = useCallback((value: string) => {
    return /<\/?[a-z][\s\S]*>/i.test(value)
  }, [])

  const handleEditorModeToggle = useCallback((checked: boolean) => {
    if (checked) {
      setUseRichText(true)
      if (!content) return
      if (!isLikelyHtml(content)) {
        onContentChange(convertPlainTextToHtml(content))
      }
    } else {
      setUseRichText(false)
      const text = extractPlainText(content)
      onContentChange(text)
    }
  }, [content, convertPlainTextToHtml, extractPlainText, isLikelyHtml, onContentChange])

  useEffect(() => {
    if (!useRichText) {
      const plain = extractPlainText(content)
      if (!plain && content !== '') {
        onContentChange('')
      }
    }
  }, [content, extractPlainText, onContentChange, useRichText])

  const processNewFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const combinedFiles = [...mediaFiles, ...fileArray]

    // Validate files
    const validationError = validateUpdateMediaFiles(combinedFiles)
    if (validationError) {
      // TODO: Show error to user via proper error handling
      return
    }

    if (combinedFiles.length > maxFiles) {
      // TODO: Show max files error to user
      return
    }

    onMediaChange(combinedFiles)
  }, [mediaFiles, maxFiles, onMediaChange])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault()
      processNewFiles(files)
    }
  }, [processNewFiles])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processNewFiles(files)
    }
  }, [processNewFiles])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      processNewFiles(files)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [processNewFiles])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const renderMediaPreview = (item: MediaItem, index: number) => {
    switch (item.type) {
      case 'image':
        return (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
            {item.previewUrl ? (
              <Image
                src={item.previewUrl}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        )
      case 'video':
        return (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-900 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
              VIDEO
            </div>
          </div>
        )
      case 'audio':
        return (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-purple-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
            <div className="absolute bottom-1 right-1 bg-purple-600 text-white text-xs px-1 rounded">
              AUDIO
            </div>
          </div>
        )
    }
  }

  const characterCount = getTextLength(content)

  return (
    <div className="space-y-4">
      {/* Editor Mode Toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useRichText}
            onChange={(e) => handleEditorModeToggle(e.target.checked)}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            disabled={disabled}
          />
          <span className="text-sm text-gray-700 font-medium">
            Rich Text Formatting
          </span>
          <span className="text-xs text-gray-500">
            (Bold, Italic, Lists, Headings, etc.)
          </span>
        </label>
      </div>

      {/* Main Input Area */}
      {useRichText ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <RichTextEditor
            content={content}
            onChange={handleRichTextChange}
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            maxCharacters={maxCharacters}
          />
        </div>
      ) : (
        <div className={`relative border-2 rounded-lg transition-colors ${
          isDragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 bg-white'
        }`}>
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            rows={8}
            className="w-full px-4 py-3 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
          />

          {/* Character Count */}
          <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white/90 px-2 py-1 rounded">
            <span className={characterCount > maxCharacters ? 'text-red-600' : ''}>
              {characterCount}
            </span>
            /{maxCharacters}
          </div>

          {/* Drag Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-50/90 border-2 border-primary-500 rounded-lg pointer-events-none">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                </svg>
                <p className="mt-2 text-sm font-medium text-primary-700">Drop media here</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      <div className="flex flex-col gap-3 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleFileSelect}
            disabled={disabled || mediaFiles.length >= maxFiles}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Add media
          </button>
          <span className="text-[11px] sm:text-xs leading-snug">Drag & drop or paste photos, videos, or audio</span>
        </div>
        <span className="text-[11px] sm:text-xs text-gray-400 leading-snug">
          PNG, JPG, WebP, MP4, MP3 (max {maxFiles})
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,audio/mpeg,audio/wav"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Media Previews */}
      {mediaItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Media ({mediaItems.length}/{maxFiles})
            </h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {mediaItems.map((item, index) => (
              <div
                key={item.id}
                className="relative group"
              >
                {renderMediaPreview(item, index)}

                {/* File Info Tooltip */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  <p className="truncate max-w-[150px]">{item.file.name}</p>
                  <p className="text-gray-300">{formatFileSize(item.file.size)}</p>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => onMediaRemove(index)}
                  disabled={disabled}
                  className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md disabled:opacity-50"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Media Number Badge */}
                <div className="absolute top-1 left-1 bg-gray-900/75 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {mediaItems.length === 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-3">
          <p className="text-xs font-semibold text-blue-700">
            💡 Quick tip
          </p>
          <ul className="mt-1 space-y-1 text-sm text-blue-700">
            <li>• Draft your story first, then drop photos right where they fit best</li>
            <li>• Paste images straight from your clipboard with Ctrl/Cmd+V</li>
          </ul>
        </div>
      )}
    </div>
  )
}
