'use client'

import { createLogger } from '@/lib/logger'

  const logger = createLogger('EmailToMemoryGuide')
import { Copy, Mail, Camera, Smartphone, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface EmailToMemoryGuideProps {
  domain?: string
}

export function EmailToMemoryGuide({ domain = 'colinrodrigues.com' }: EmailToMemoryGuideProps) {
  const [copied, setCopied] = useState(false)
  const memoryEmail = `memory@${domain}`

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(memoryEmail)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      logger.errorWithStack('Failed to copy email:', error as Error)
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <Mail className="h-6 w-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-blue-900">Email-to-Memory</h3>
      </div>

      <p className="text-blue-800 mb-4">
        Create updates instantly by emailing photos and text directly to your family platform.
      </p>

      <div className="bg-white rounded-lg p-4 mb-4 border">
        <div className="flex items-center justify-between">
          <code className="text-blue-700 font-mono text-sm">{memoryEmail}</code>
          <Button
            onClick={copyEmail}
            variant="outline"
            size="sm"
            className="ml-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
        <div className="text-center p-3 bg-white rounded border">
          <Camera className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="font-medium text-gray-900">Attach Photos</p>
          <p className="text-blue-700">Add up to 10 photos per email</p>
        </div>

        <div className="text-center p-3 bg-white rounded border">
          <Smartphone className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="font-medium text-gray-900">From Any Device</p>
          <p className="text-blue-700">Phone, tablet, or computer</p>
        </div>

        <div className="text-center p-3 bg-white rounded border">
          <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="font-medium text-gray-900">Auto-Creation</p>
          <p className="text-blue-700">Updates created as drafts</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-800 font-medium mb-1">
            💡 Pro tip: Specify which child
          </p>
          <p className="text-xs text-blue-700">
            Use subject line: <code>"Memory for [Child Name]: [description]"</code>
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-800 font-medium mb-1">
            ✨ Example
          </p>
          <p className="text-xs text-green-700">
            Subject: <code>"Memory for Emma: First steps today!"</code><br />
            Body: "She walked from the couch to the coffee table!"
          </p>
        </div>
      </div>
    </div>
  )
}