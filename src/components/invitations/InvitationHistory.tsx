'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Loader2, Mail, MessageSquare, Phone, Link as LinkIcon, Search, Trash2, Send } from 'lucide-react'
import type { Invitation } from '@/lib/types/invitation'

export default function InvitationHistory() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchInvitations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, search])

  const fetchInvitations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (search) params.append('search', search)

      const response = await fetch(`/api/invitations?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch invitations')

      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return

    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to revoke invitation')

      // Update local state
      setInvitations(prev =>
        prev.map(inv =>
          inv.id === invitationId ? { ...inv, status: 'revoked' as const } : inv
        )
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke invitation')
    }
  }

  const handleResend = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations/${invitationId}/send`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to resend invitation')

      alert('Invitation resent successfully!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resend invitation')
    }
  }

  const getChannelIcon = (channel: string | null) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <MessageSquare className="h-4 w-4" />
      case 'whatsapp':
        return <Phone className="h-4 w-4" />
      case 'link':
        return <LinkIcon className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'used':
        return <Badge variant="secondary">Used</Badge>
      case 'revoked':
        return <Badge variant="error">Revoked</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    return type === 'single_use' ? (
      <Badge variant="default">Single-use</Badge>
    ) : (
      <Badge variant="info">Reusable
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="type-filter" className="text-sm font-medium">Type</label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Types</option>
              <option value="single_use">Single-use</option>
              <option value="reusable">Reusable</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="status-filter" className="text-sm font-medium">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="used">Used</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <Card className="p-6 text-center text-red-600">
          <p>{error}</p>
        </Card>
      ) : invitations.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          <p>No invitations found matching your filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <Card key={invitation.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Type and Status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeBadge(invitation.invitation_type)}
                    {getStatusBadge(invitation.status)}
                    {invitation.channel && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        {getChannelIcon(invitation.channel)}
                        <span className="capitalize">{invitation.channel}</span>
                      </div>
                    )}
                  </div>

                  {/* Recipient Info */}
                  <div className="text-sm">
                    {invitation.recipient_email && (
                      <p className="text-gray-900 font-medium">
                        {invitation.recipient_email}
                      </p>
                    )}
                    {invitation.recipient_phone && (
                      <p className="text-gray-900 font-medium">
                        {invitation.recipient_phone}
                      </p>
                    )}
                    {invitation.custom_message && (
                      <p className="text-gray-600 italic mt-1">
                        &quot;{invitation.custom_message}&quot;
                      </p>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Created: {new Date(invitation.created_at).toLocaleDateString()}</span>
                    {invitation.expires_at && (
                      <span>
                        Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    {invitation.invitation_type === 'reusable' && (
                      <span>Uses: {invitation.use_count}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {invitation.status === 'active' &&
                    invitation.invitation_type === 'single_use' &&
                    (invitation.recipient_email || invitation.recipient_phone) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResend(invitation.id)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}

                  {invitation.status === 'active' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRevoke(invitation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {!isLoading && invitations.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {invitations.length} invitation{invitations.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
