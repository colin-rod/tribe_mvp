'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'
import { Loader2, Link as LinkIcon, Copy, CheckCircle, Trash2, QrCode } from 'lucide-react'
import type { Invitation } from '@/lib/types/invitation'
import QRCodeDisplay from './QRCodeDisplay'

interface ReusableLinkManagerProps {
  onLinkCreated?: () => void
}

export default function ReusableLinkManager({ onLinkCreated }: ReusableLinkManagerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [reusableLinks, setReusableLinks] = useState<Invitation[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedLinkForQR, setSelectedLinkForQR] = useState<Invitation | null>(null)

  // Fetch existing reusable links
  useEffect(() => {
    fetchReusableLinks()
  }, [])

  const fetchReusableLinks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/invitations?type=reusable&status=active')
      if (!response.ok) throw new Error('Failed to fetch reusable links')

      const data = await response.json()
      setReusableLinks(data.invitations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reusable links')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateLink = async () => {
    setIsCreating(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationType: 'reusable',
          customMessage: customMessage || undefined,
          qrCodeSettings: {
            size: 300,
            format: 'png'
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create reusable link')
      }

      const { invitation } = await response.json()
      setReusableLinks(prev => [invitation, ...prev])
      setSuccess('Reusable link created successfully!')
      setCustomMessage('')
      onLinkCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reusable link')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyLink = (invitation: Invitation) => {
    const invitationUrl = `${window.location.origin}/invite/${invitation.token}`
    navigator.clipboard.writeText(invitationUrl)
    setCopiedId(invitation.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevokeLink = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this link? It will no longer work.')) {
      return
    }

    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to revoke link')
      }

      setReusableLinks(prev => prev.filter(link => link.id !== invitationId))
      setSuccess('Link revoked successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke link')
    }
  }

  const getInvitationUrl = (token: string) => {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${token}`
  }

  return (
    <div className="space-y-6">
      {/* Create New Link Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-1">Custom Message (Optional)</label>
          <Textarea
            id="customMessage"
            placeholder="Add a message that recipients will see when they use this link..."
            rows={3}
            maxLength={500}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            disabled={isCreating}
          />
        </div>

        <Button onClick={handleCreateLink} disabled={isCreating} className="w-full">
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Link...
            </>
          ) : (
            <>
              <LinkIcon className="mr-2 h-4 w-4" />
              Create New Reusable Link
            </>
          )}
        </Button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="error">
          <div>{error}</div>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <div>{success}</div>
        </Alert>
      )}

      {/* Existing Links */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Your Reusable Links</h4>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : reusableLinks.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            <p>No reusable links yet. Create one above to get started!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {reusableLinks.map((link) => (
              <Card key={link.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <Input
                          value={getInvitationUrl(link.token)}
                          readOnly
                          className="text-sm"
                        />
                      </div>
                      {link.custom_message && (
                        <p className="text-xs text-gray-600 mt-2 italic">
                          &quot;{link.custom_message}&quot;
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Uses: {link.use_count}</span>
                        <span>Created: {new Date(link.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(link)}
                      className="flex-1"
                    >
                      {copiedId === link.id ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLinkForQR(link)}
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      QR Code
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRevokeLink(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {selectedLinkForQR && (
        <QRCodeDisplay
          invitation={selectedLinkForQR}
          onClose={() => setSelectedLinkForQR(null)}
        />
      )}
    </div>
  )
}
