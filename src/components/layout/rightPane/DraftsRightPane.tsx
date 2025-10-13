'use client'

import { useCallback, useEffect, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { useViewSelection } from '@/contexts/ViewSelectionContext'
import { DetailCard, DetailRow } from './shared/DetailCard'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { getDraftById } from '@/lib/services/draftService'
import type { DraftUpdate } from '@/lib/types/digest'
import { getChildById, type Child } from '@/lib/children'
import { getRecipientsByIds, type Recipient } from '@/lib/recipients'

interface DraftRecipientSummary {
  id: string
  name: string
  group?: string
}

export function DraftsRightPane() {
  const { selectedId } = useViewSelection()
  const [draft, setDraft] = useState<DraftUpdate | null>(null)
  const [child, setChild] = useState<Child | null>(null)
  const [recipients, setRecipients] = useState<DraftRecipientSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)

  const loadDraft = useCallback(async (id: string, signal: { cancelled: boolean }) => {
    setLoading(true)
    setError(null)

    try {
      const draftData = await getDraftById(id)

      if (signal.cancelled) return

      if (!draftData) {
        setDraft(null)
        setRecipients([])
        setChild(null)
        setError('We could not find this draft.')
        return
      }

      setDraft(draftData)

      const [childData, recipientData] = await Promise.all([
        getChildById(draftData.child_id).catch(() => null),
        Array.isArray(draftData.confirmed_recipients) && draftData.confirmed_recipients.length > 0
          ? getRecipientsByIds(draftData.confirmed_recipients)
          : Promise.resolve<Recipient[]>([])
      ])

      if (signal.cancelled) return

      setChild(childData)
      setRecipients(
        recipientData.map(recipient => ({
          id: recipient.id,
          name: recipient.name,
          group: recipient.group?.name
        }))
      )
    } catch (err) {
      if (signal.cancelled) return
      const message = err instanceof Error ? err.message : 'Failed to load draft details.'
      setError(message)
      setDraft(null)
      setRecipients([])
      setChild(null)
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
    let cancelled = false

    if (!selectedId) {
      setDraft(null)
      setRecipients([])
      setChild(null)
      setError(null)
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    loadDraft(selectedId, { cancelled })

    return () => {
      cancelled = true
    }
  }, [selectedId, reloadToken, loadDraft])

  const handleRetry = useCallback(() => {
    if (!selectedId) return
    setRetryCount((count) => count + 1)
    setReloadToken((token) => token + 1)
  }, [selectedId])

  const emptyState = (
    <div className="right-pane-section">
      <div className="text-center py-12 px-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80">
        <p className="text-sm text-neutral-600">Select a draft to view details</p>
      </div>
    </div>
  )

  if (!selectedId) {
    return emptyState
  }

  if (loading) {
    return (
      <div className="right-pane-section">
        <LoadingState message="Loading draft details" />
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

  const createdAt = draft?.created_at ? new Date(draft.created_at) : null
  const updatedAt = draft?.updated_at ? new Date(draft.updated_at) : null
  const scheduledFor = draft?.scheduled_for ? new Date(draft.scheduled_for) : null

  const contentSummary = {
    photos: draft?.media_urls?.length ?? 0,
    milestones: draft?.milestone_type ? 1 : 0,
    stories: draft?.content ? 1 : 0
  }

  if (!draft) {
    return emptyState
  }

  const statusClass = draft.distribution_status === 'ready'
    ? 'bg-green-100 text-green-800'
    : draft.distribution_status === 'draft'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-neutral-100 text-neutral-800'

  return (
    <div className="right-pane-section">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Current Draft</p>
        <h2 className="text-lg font-semibold text-neutral-900">{draft.subject || 'Untitled Draft'}</h2>
        {child && (
          <p className="text-xs text-neutral-500">Prepared for {child.name}</p>
        )}
      </header>

      <DetailCard title="Draft Information">
        {createdAt && (
          <DetailRow
            label="Created"
            value={`${format(createdAt, "PPP 'at' p")} (${formatDistanceToNow(createdAt, { addSuffix: true })})`}
          />
        )}
        {updatedAt && (
          <DetailRow
            label="Last Modified"
            value={`${format(updatedAt, "PPP 'at' p")} (${formatDistanceToNow(updatedAt, { addSuffix: true })})`}
          />
        )}
        <DetailRow
          label="Status"
          value={
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
              {draft.distribution_status ?? 'unknown'}
            </span>
          }
        />
      </DetailCard>

      {scheduledFor && (
        <DetailCard title="Schedule">
          <DetailRow
            label="Send Time"
            value={`${format(scheduledFor, "PPP 'at' p")} (${formatDistanceToNow(scheduledFor, { addSuffix: true })})`}
          />
        </DetailCard>
      )}

      <DetailCard title="Content Summary">
        <DetailRow label="Photos" value={contentSummary.photos} />
        <DetailRow label="Milestones" value={contentSummary.milestones} />
        <DetailRow label="Stories" value={contentSummary.stories} />
      </DetailCard>

      <DetailCard title={`Recipients (${recipients.length})`}>
        {recipients.length > 0 ? (
          <div className="space-y-2">
            {recipients.map((recipient) => (
              <div key={recipient.id} className="flex items-center justify-between">
                <span className="text-sm text-neutral-900">{recipient.name}</span>
                <span className="text-xs text-neutral-500">{recipient.group || 'Unassigned'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 text-right">No recipients selected</p>
        )}
      </DetailCard>

      <div className="space-y-2">
        <Button variant="primary" className="w-full">
          Edit Draft
        </Button>
        <Button variant="success" className="w-full">
          Send Now
        </Button>
        <Button variant="outline" className="w-full">
          Reschedule
        </Button>
      </div>
    </div>
  )
}
