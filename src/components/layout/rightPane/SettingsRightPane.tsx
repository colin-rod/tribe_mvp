'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { DetailCard, DetailRow } from './shared/DetailCard'
import { StatCard } from './shared/StatCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { useProfileManager } from '@/hooks/useProfileManager'
import type { NotificationPreferences } from '@/lib/types/profile'

type SettingsToggleKey =
  | 'emailNotifications'
  | 'browserNotifications'
  | 'weeklyDigest'
  | 'responseNotifications'
  | 'marketingEmails'

type QuickToggleState = Record<SettingsToggleKey, boolean>

const defaultToggleState: QuickToggleState = {
  emailNotifications: true,
  browserNotifications: false,
  weeklyDigest: true,
  responseNotifications: true,
  marketingEmails: false
}

const toggleFieldMap: Record<SettingsToggleKey, keyof NotificationPreferences> = {
  emailNotifications: 'email_notifications',
  browserNotifications: 'browser_notifications',
  weeklyDigest: 'weekly_digest',
  responseNotifications: 'delivery_notifications',
  marketingEmails: 'system_notifications'
}

export function SettingsRightPane() {
  const {
    profile,
    loading,
    error,
    refreshProfile,
    updateNotificationPreferences,
    getNotificationPreferences
  } = useProfileManager()

  const [quickToggles, setQuickToggles] = useState<QuickToggleState>(defaultToggleState)
  const [toggleLoading, setToggleLoading] = useState<SettingsToggleKey | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!profile && !loading) {
      refreshProfile()
    }
  }, [profile, loading, refreshProfile])

  useEffect(() => {
    const preferences = getNotificationPreferences()
    if (preferences) {
      setQuickToggles({
        emailNotifications: preferences.email_notifications ?? defaultToggleState.emailNotifications,
        browserNotifications: preferences.browser_notifications ?? defaultToggleState.browserNotifications,
        weeklyDigest: preferences.weekly_digest ?? defaultToggleState.weeklyDigest,
        responseNotifications: preferences.delivery_notifications ?? defaultToggleState.responseNotifications,
        marketingEmails: preferences.system_notifications ?? defaultToggleState.marketingEmails
      })
    }
  }, [profile, getNotificationPreferences])

  const handleToggle = async (toggle: SettingsToggleKey) => {
    if (!profile) return

    const nextValue = !quickToggles[toggle]
    setQuickToggles(prev => ({ ...prev, [toggle]: nextValue }))
    setToggleLoading(toggle)
    setToggleError(null)

    try {
      const field = toggleFieldMap[toggle]
      await updateNotificationPreferences({ [field]: nextValue })
    } catch (err) {
      setQuickToggles(prev => ({ ...prev, [toggle]: !nextValue }))
      const message = err instanceof Error ? err.message : 'Failed to update setting.'
      setToggleError(message)
    } finally {
      setToggleLoading(null)
    }
  }

  const handleRetry = async () => {
    setRetryCount((count) => count + 1)
    await refreshProfile()
  }

  const memberSince = useMemo(() => {
    if (!profile?.created_at) return 'Unknown'
    return format(new Date(profile.created_at), 'PPP')
  }, [profile?.created_at])

  const lastUpdatedRelative = useMemo(() => {
    if (!profile?.updated_at) return null
    return formatDistanceToNow(new Date(profile.updated_at), { addSuffix: true })
  }, [profile?.updated_at])

  const recentChanges = useMemo(() => {
    if (!profile) return []

    const changes: Array<{ id: string; setting: string; value: string; date?: string }> = []

    if (profile.updated_at) {
      changes.push({
        id: 'profile-updated',
        setting: 'Account updated',
        value: lastUpdatedRelative ?? 'Recently',
        date: format(new Date(profile.updated_at), 'PP')
      })
    }

    const preferences = getNotificationPreferences()
    if (preferences) {
      changes.push({
        id: 'notifications',
        setting: 'Notification preferences',
        value: preferences.email_notifications ? 'Email alerts enabled' : 'Email alerts disabled'
      })
    }

    return changes
  }, [profile, lastUpdatedRelative, getNotificationPreferences])

  const helpLinks = useMemo(() => {
    return [
      {
        id: 'digest',
        title: quickToggles.weeklyDigest ? 'Adjust weekly digest timing' : 'Enable weekly digest summaries',
        url: '/dashboard/settings?tab=notifications'
      },
      {
        id: 'support',
        title: 'Contact Support',
        url: 'mailto:support@tribeapp.com'
      }
    ]
  }, [quickToggles.weeklyDigest])

  if (!profile && loading) {
    return (
      <div className="right-pane-section">
        <LoadingState message="Loading account settings" />
      </div>
    )
  }

  if (!profile && error) {
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

  if (!profile) {
    return (
      <div className="right-pane-section">
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80">
          <p className="text-sm text-neutral-600">Account settings will appear here once loaded.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="right-pane-section">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Control Center</p>
        <h2 className="text-lg font-semibold text-neutral-900">Quick Settings</h2>
      </header>

      <DetailCard title="Quick Toggles">
        <div className="space-y-3">
          {(
            Object.keys(quickToggles) as SettingsToggleKey[]
          ).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-neutral-700 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <button
                onClick={() => handleToggle(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  quickToggles[key] ? 'bg-primary-600' : 'bg-neutral-200'
                } ${toggleLoading === key ? 'opacity-70 pointer-events-none' : ''}`}
                aria-pressed={quickToggles[key]}
                disabled={toggleLoading === key}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    quickToggles[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
        {toggleError && (
          <p className="mt-3 text-xs text-red-600" role="alert">
            {toggleError}
          </p>
        )}
      </DetailCard>

      <DetailCard title="Account Information">
        <DetailRow
          label="Plan"
          value={
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {profile.status || 'Free'}
            </span>
          }
        />
        <DetailRow label="Email" value={profile.email} />
        <DetailRow label="Member Since" value={memberSince} />
      </DetailCard>

      <StatCard
        label="Weekly Digest"
        value={quickToggles.weeklyDigest ? 'Enabled' : 'Disabled'}
      />

      <DetailCard title="Recent Changes">
        {recentChanges.length > 0 ? (
          <div className="space-y-3">
            {recentChanges.map((change) => (
              <div key={change.id} className="pb-3 border-b border-neutral-100 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-neutral-900">{change.setting}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-neutral-600">{change.value}</span>
                  {change.date && (
                    <span className="text-xs text-neutral-500">{change.date}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 text-right">No recent updates</p>
        )}
      </DetailCard>

      <DetailCard title="Help & Support">
        <div className="space-y-2">
          {helpLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              className="block text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              {link.title} →
            </a>
          ))}
        </div>
      </DetailCard>
    </div>
  )
}
