'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EnvelopeIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline'

interface EmailPreviewProps {
  htmlContent: string
  subject: string
}

export default function EmailPreview({ htmlContent, subject }: EmailPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document

      if (doc) {
        doc.open()
        doc.write(htmlContent)
        doc.close()
      }
    }
  }, [htmlContent])

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <>
      <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}>
        <CardHeader className="bg-neutral-50 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <EnvelopeIcon className="w-5 h-5 text-orange-600" />
              <CardTitle>Email Preview</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFullscreen}
              >
                <ArrowsPointingOutIcon className="w-4 h-4 mr-1" />
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
            </div>
          </div>
          <div className="mt-2 p-3 bg-white rounded border border-neutral-200">
            <p className="text-xs font-medium text-neutral-500 mb-1">Subject:</p>
            <p className="text-sm font-semibold text-neutral-900">{subject}</p>
          </div>
        </CardHeader>

        <CardContent className={`p-0 ${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[600px]'}`}>
          <iframe
            ref={iframeRef}
            title="Email Preview"
            className="w-full h-full border-0"
            sandbox="allow-same-origin"
          />
        </CardContent>

        {isFullscreen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-200">
            <div className="max-w-7xl mx-auto flex justify-center">
              <Button onClick={handleFullscreen} variant="primary">
                Close Preview
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Overlay for fullscreen */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleFullscreen}
        />
      )}
    </>
  )
}
