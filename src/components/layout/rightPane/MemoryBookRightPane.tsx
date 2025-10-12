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

import { Button } from '@/components/ui/Button'

export function MemoryBookRightPane() {
  const handlePrint = () => {
    // TODO: Implement print functionality
    window.print()
  }

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    alert('PDF export coming soon!')
  }

  const handleShare = () => {
    // TODO: Implement sharing functionality
    alert('Sharing functionality coming soon!')
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
          disabled
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
          <span className="ml-auto text-xs text-neutral-500">Coming Soon</span>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleShare}
          disabled
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
          <span className="ml-auto text-xs text-neutral-500">Coming Soon</span>
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
