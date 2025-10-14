/**
 * Memory Book Right Pane
 * CRO-534: Memory Book Experience - Unified Dashboard Navigation
 *
 * Context-aware actions for Memory Book views
 * - Print options
 * - Export options
 * - Sharing features (placeholders for future)
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { createLogger } from '@/lib/logger'

const PRINT_ROUTE = '/dashboard/memory-book/print'
const EXPORT_ENDPOINT = '/api/memory-book/export'
const SHARE_ENDPOINT = '/api/memory-book/share'

interface SharePayload {
  shareUrl: string
  shareSubject: string
  shareText: string
}

const logger = createLogger('MemoryBookRightPane')

export function MemoryBookRightPane() {
  const [isPrinting, setIsPrinting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const handlePrint = async () => {
    try {
      setIsPrinting(true)
      const printWindow = window.open(PRINT_ROUTE, '_blank', 'noopener')

      if (!printWindow) {
        throw new Error('Pop-up blocked. Please allow pop-ups to print.')
      }

      toast.success('Opened print-friendly Memory Book')
      printWindow.focus()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open print view'
      toast.error(message)
    } finally {
      setIsPrinting(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      setIsExporting(true)
      const response = await fetch(EXPORT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        let errorMessage = 'Failed to export Memory Book'
        try {
          const errorData = await response.json()
          if (errorData?.error) {
            errorMessage = errorData.error
          }
        } catch (parseError) {
          logger.error('Failed to parse export error response', { error: parseError })
        }
        throw new Error(errorMessage)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const downloadFileName = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1]
        || `memory-book-${new Date().toISOString().split('T')[0]}.pdf`

      link.href = downloadUrl
      link.download = downloadFileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      toast.success('Memory Book PDF exported successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export Memory Book'
      toast.error(message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleShare = async () => {
    try {
      setIsSharing(true)
      const response = await fetch(SHARE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        let errorMessage = 'Unable to prepare Memory Book for sharing'
        try {
          const errorData = await response.json()
          if (errorData?.error) {
            errorMessage = errorData.error
          }
        } catch (parseError) {
          logger.error('Failed to parse share error response', { error: parseError })
        }
        throw new Error(errorMessage)
      }

      const payload = await response.json() as SharePayload

      if ('share' in navigator && typeof navigator.share === 'function') {
        await navigator.share({
          title: payload.shareSubject,
          text: payload.shareText,
          url: payload.shareUrl
        })
        toast.success('Shared Memory Book with your favorite apps')
      } else {
        const mailtoLink = `mailto:?subject=${encodeURIComponent(payload.shareSubject)}&body=${encodeURIComponent(`${payload.shareText}\n\n${payload.shareUrl}`)}`
        const shareWindow = window.open(mailtoLink, '_self')

        if (shareWindow === null) {
          throw new Error('Email client blocked by the browser. Please allow pop-ups to share.')
        }

        toast.success('Opened your email client to share the Memory Book')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.error('Sharing was cancelled')
      } else {
        const message = error instanceof Error ? error.message : 'Failed to share Memory Book'
        toast.error(message)
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="h-full bg-white border-l border-neutral-200 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Memory Book</h2>
        <p className="text-sm text-neutral-600 mt-1">
          Your timeline of memories
        </p>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-700 uppercase tracking-wider">
          Quick Actions
        </h3>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handlePrint}
          loading={isPrinting}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print Memory Book
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleExportPDF}
          loading={isExporting}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export as PDF
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleShare}
          loading={isSharing}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Share Memory Book
        </Button>
      </div>

      {/* Info Section */}
      <div className="pt-6 border-t border-neutral-200">
        <h3 className="text-sm font-medium text-neutral-700 uppercase tracking-wider mb-3">
          About Memory Book
        </h3>
        <div className="space-y-3 text-sm text-neutral-600">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 mt-0.5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>
              View all your sent weekly summaries in a beautiful timeline format
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 mt-0.5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>
              Each summary includes all memories, photos, and the AI-generated narrative
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 mt-0.5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>
              Perfect for printing or creating physical memory books
            </p>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="pt-6 border-t border-neutral-200">
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-primary-900 mb-1">Tip</p>
              <p className="text-primary-700">
                Click on any summary to view the full narrative with all memories and photos from that week
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
