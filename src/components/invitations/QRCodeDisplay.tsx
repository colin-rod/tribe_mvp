'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Loader2, Download, X } from 'lucide-react'
import type { Invitation } from '@/lib/types/invitation'

interface QRCodeDisplayProps {
  invitation: Invitation
  onClose: () => void
}

export default function QRCodeDisplay({ invitation, onClose }: QRCodeDisplayProps) {
  const [format, setFormat] = useState<'png' | 'svg'>('png')
  const [size, setSize] = useState(300)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQRCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, size])

  const fetchQRCode = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/invitations/${invitation.id}/qr-code?format=${format}&size=${size}`
      )

      if (!response.ok) {
        throw new Error('Failed to generate QR code')
      }

      const data = await response.json()
      setQrCodeData(data.qrCode.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load QR code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(
        `/api/invitations/${invitation.id}/qr-code?format=${format}&size=${size}&download=true`
      )

      if (!response.ok) {
        throw new Error('Failed to download QR code')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invitation-qr-${invitation.id.substring(0, 8)}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download QR code')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">QR Code for Invitation Link</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* QR Code Preview */}
          <Card className="p-6 bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <Alert variant="error">
                <div>{error}</div>
              </Alert>
            ) : qrCodeData ? (
              <div className="flex items-center justify-center">
                {format === 'png' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeData}
                    alt="Invitation QR Code"
                    className="max-w-full h-auto"
                  />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: qrCodeData }} />
                )}
              </div>
            ) : null}
          </Card>

          {/* Format Selection */}
          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium text-gray-700 mb-1">Format</legend>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="format-png"
                  name="format"
                  value="png"
                  checked={format === 'png'}
                  onChange={() => setFormat('png')}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                />
                <label htmlFor="format-png" className="cursor-pointer text-sm font-medium text-gray-700">
                  PNG (Image)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="format-svg"
                  name="format"
                  value="svg"
                  checked={format === 'svg'}
                  onChange={() => setFormat('svg')}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                />
                <label htmlFor="format-svg" className="cursor-pointer text-sm font-medium text-gray-700">
                  SVG (Vector)
                </label>
              </div>
            </div>
          </fieldset>

          {/* Size Selection */}
          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium text-gray-700 mb-1">Size</legend>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="size-200"
                  name="size"
                  value="200"
                  checked={size === 200}
                  onChange={() => setSize(200)}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                />
                <label htmlFor="size-200" className="cursor-pointer text-sm font-medium text-gray-700">
                  Small (200px)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="size-300"
                  name="size"
                  value="300"
                  checked={size === 300}
                  onChange={() => setSize(300)}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                />
                <label htmlFor="size-300" className="cursor-pointer text-sm font-medium text-gray-700">
                  Medium (300px)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="size-500"
                  name="size"
                  value="500"
                  checked={size === 500}
                  onChange={() => setSize(500)}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                />
                <label htmlFor="size-500" className="cursor-pointer text-sm font-medium text-gray-700">
                  Large (500px)
                </label>
              </div>
            </div>
          </fieldset>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1" disabled={isLoading || !!error}>
              <Download className="mr-2 h-4 w-4" />
              Download QR Code
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <p className="font-semibold mb-1">How to use:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Download and share this QR code in printed materials</li>
              <li>Recipients can scan it with their phone camera to join</li>
              <li>The link never expires and can be used unlimited times</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
