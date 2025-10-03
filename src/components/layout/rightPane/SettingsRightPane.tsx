'use client'

import { useState } from 'react'
import { DetailCard, DetailRow } from './shared/DetailCard'
import { StatCard } from './shared/StatCard'

export function SettingsRightPane() {
  // TODO: Replace with actual state management
  const [quickToggles, setQuickToggles] = useState({
    emailNotifications: true,
    autoSchedule: false,
    richText: true,
    darkMode: false
  })

  const accountInfo = {
    plan: 'Pro',
    storage: {
      used: 2.4,
      total: 10,
      unit: 'GB'
    },
    memberSince: 'January 2025'
  }

  const recentChanges = [
    { id: 1, setting: 'Email Notifications', value: 'Enabled', date: '2025-12-01' },
    { id: 2, setting: 'Auto-Schedule', value: 'Disabled', date: '2025-11-28' },
    { id: 3, setting: 'Rich Text Editor', value: 'Enabled', date: '2025-11-25' }
  ]

  const helpLinks = [
    { id: 1, title: 'Getting Started Guide', url: '#' },
    { id: 2, title: 'FAQs', url: '#' },
    { id: 3, title: 'Contact Support', url: '#' },
    { id: 4, title: 'Feature Requests', url: '#' }
  ]

  const handleToggle = (setting: keyof typeof quickToggles) => {
    setQuickToggles(prev => ({ ...prev, [setting]: !prev[setting] }))
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Settings</h2>
      </div>

      {/* Quick Toggles */}
      <DetailCard title="Quick Toggles">
        <div className="space-y-3">
          {Object.entries(quickToggles).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <button
                onClick={() => handleToggle(key as keyof typeof quickToggles)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </DetailCard>

      {/* Account Info */}
      <DetailCard title="Account Information">
        <DetailRow label="Plan" value={
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {accountInfo.plan}
          </span>
        } />
        <DetailRow label="Member Since" value={accountInfo.memberSince} />
      </DetailCard>

      {/* Storage Usage */}
      <StatCard
        label="Storage Usage"
        value={`${accountInfo.storage.used} ${accountInfo.storage.unit}`}
      />
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: `${(accountInfo.storage.used / accountInfo.storage.total) * 100}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 text-center">
        {accountInfo.storage.used} of {accountInfo.storage.total} {accountInfo.storage.unit} used
      </p>

      {/* Recent Changes Log */}
      <DetailCard title="Recent Changes">
        <div className="space-y-3">
          {recentChanges.map((change) => (
            <div key={change.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
              <p className="text-sm font-medium text-gray-900">{change.setting}</p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-600">{change.value}</span>
                <span className="text-xs text-gray-500">{change.date}</span>
              </div>
            </div>
          ))}
        </div>
      </DetailCard>

      {/* Help Links */}
      <DetailCard title="Help & Support">
        <div className="space-y-2">
          {helpLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              {link.title} →
            </a>
          ))}
        </div>
      </DetailCard>
    </div>
  )
}
