'use client'

import { useCallback, useEffect, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { useViewSelection } from '@/contexts/ViewSelectionContext'
import { DetailCard, DetailRow } from './shared/DetailCard'
import { StatCard } from './shared/StatCard'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { getRecipientById, type Recipient } from '@/lib/recipients'

export function RecipientsRightPane() {
  const { selectedId } = useViewSelection()
  const [recipient, setRecipient] = useState<Recipient | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)

  const loadRecipient = useCallback(async (id: string, signal: { cancelled: boolean }) => {
    setLoading(true)
    setError(null)

    try {
      const data = await getRecipientById(id)
      if (signal.cancelled) return

      if (!data) {
        setRecipient(null)
        setError('We could not find details for this recipient.')
        return
      }

      setRecipient(data)
    } catch (err) {
      if (signal.cancelled) return
      const message = err instanceof Error ? err.message : 'Failed to load recipient details.'
      setError(message)
      setRecipient(null)
    } finally {
      if (!signal.cancelled) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    setRetryCount(0)
  }, [selectedId])

  useEffect(() => {
    let isCancelled = false

    if (!selectedId) {
      setRecipient(null)
      setError(null)
      setLoading(false)
      return () => {
        isCancelled = true
      }
    }

    loadRecipient(selectedId, { cancelled: isCancelled })

    return () => {
      isCancelled = true
    }
  }, [selectedId, reloadToken, loadRecipient])

  const handleRetry = useCallback(() => {
    if (!selectedId) return
    setRetryCount((count) => count + 1)
    setReloadToken((token) => token + 1)
  }, [selectedId])

  const emptyState = (
    <div className="right-pane-section">
      <div className="text-center py-12 px-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80">
        <p className="text-sm text-neutral-600">Select a recipient to view details</p>
      </div>
    </div>
  )

  if (!selectedId) {
    return emptyState
  }

  if (loading) {
    return (
      <div className="right-pane-section">
        <LoadingState message="Loading recipient details" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="right-pane-section">
        <ErrorState
          message={error}
          onRetry={handleRetry}
          retryCount={retryCount}
        />
      </div>
    )
  }

  if (!recipient) {
    return emptyState
  }

  const formattedCreatedAt = (() => {
    if (!recipient.created_at) return null
    try {
      const createdDate = new Date(recipient.created_at)
      return {
        exact: format(createdDate, 'PPP'),
        relative: formatDistanceToNow(createdDate, { addSuffix: true })
      }
    } catch {
      return null
    }
  })()

  const contentTypes = recipient.content_types?.map((type) => type.replace(/_/g, ' ')) ?? []
  const channels = recipient.preferred_channels?.map(channel => channel.toUpperCase()) ?? []

  return (
    <div className="right-pane-section">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Recipient Spotlight</p>
        <h2 className="text-lg font-semibold text-neutral-900">{recipient.name}</h2>
      </header>

      <DetailCard title="Contact Information">
        <DetailRow label="Email" value={recipient.email || 'Not provided'} />
        <DetailRow label="Phone" value={recipient.phone || 'Not provided'} />
        <DetailRow label="Relationship" value={recipient.relationship || 'Not specified'} />
        {formattedCreatedAt && (
          <DetailRow label="Member Since" value={`${formattedCreatedAt.exact} (${formattedCreatedAt.relative})`} />
        )}
      </DetailCard>

      <DetailCard title="Preferences">
        <DetailRow label="Frequency" value={recipient.frequency ?? 'Not set'} />
        <DetailRow
          label="Preferred Channels"
          value={channels.length > 0 ? channels.join(', ') : 'No channels selected'}
        />
        <DetailRow
          label="Content Types"
          value={
            <div className="flex flex-wrap gap-1 justify-end">
              {contentTypes.length > 0 ? (
                contentTypes.map((type) => (
                  <span key={type} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {type}
                  </span>
                ))
              ) : (
                <span className="text-xs text-neutral-500">Defaults</span>
              )}
            </div>
          }
        />
      </DetailCard>

      <DetailCard title="Group Memberships">
        {recipient.group ? (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              {recipient.group.name}
            </span>
          </div>
        ) : (
          <p className="text-sm text-neutral-500 text-right">Not assigned to a group</p>
        )}
      </DetailCard>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Preferred Channels"
          value={channels.length}
        />
        <StatCard
          label="Content Types"
          value={contentTypes.length}
        />
      </div>

      <DetailCard title="Recent Activity">
        <DetailRow label="Prompts Enabled" value={Array.isArray(recipient.preferred_channels) ? recipient.preferred_channels.length > 0 ? 'Yes' : 'No' : 'Unknown'} />
        <DetailRow label="Active" value={recipient.is_active ? 'Yes' : 'No'} />
      </DetailCard>

      <div className="space-y-2">
        <Button variant="primary" className="w-full">
          Edit Preferences
        </Button>
        <Button variant="outline" className="w-full">
          View History
        </Button>
      </div>
    </div>
  )
}
