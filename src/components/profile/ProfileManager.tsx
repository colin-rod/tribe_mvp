'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ProfileTabNavigation } from './ProfileTabNavigation'
import { ProfileSection } from './ProfileSection'
import { AccountSection } from './AccountSection'
import { SecuritySection } from './SecuritySection'
import { NotificationSection } from './NotificationSection'
import { PrivacySection } from './PrivacySection'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { ProfileTab } from '@/lib/types/profile'

const PROFILE_TABS: ProfileTab[] = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Personal information and preferences',
    icon: 'user'
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Email, timezone, and basic settings',
    icon: 'cog'
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Password and authentication settings',
    icon: 'shield'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Email and push notification preferences',
    icon: 'bell'
  },
  {
    id: 'privacy',
    label: 'Privacy',
    description: 'Data privacy and sharing controls',
    icon: 'lock'
  }
]

export function ProfileManager() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<string>('profile')

  // Handle URL tab parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    const validTabs = ['profile', 'account', 'security', 'notifications', 'privacy']

    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  // Update URL when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)

    // Update URL without causing a page reload
    const url = new URL(window.location.href)
    if (tabId === 'profile') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', tabId)
    }
    window.history.replaceState({}, '', url.toString())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to manage your profile.</p>
      </div>
    )
  }

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSection user={user} />
      case 'account':
        return <AccountSection user={user} />
      case 'security':
        return <SecuritySection user={user} />
      case 'notifications':
        return <NotificationSection user={user} />
      case 'privacy':
        return <PrivacySection user={user} />
      default:
        return <ProfileSection user={user} />
    }
  }

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
      {/* Desktop: Side navigation */}
      <div className="hidden md:flex">
        <div className="w-80 border-r border-gray-200 bg-gray-50">
          <ProfileTabNavigation
            tabs={PROFILE_TABS}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            variant="sidebar"
          />
        </div>
        <div className="flex-1 min-h-96">
          {renderActiveSection()}
        </div>
      </div>

      {/* Mobile: Accordion layout */}
      <div className="md:hidden">
        <ProfileTabNavigation
          tabs={PROFILE_TABS}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          variant="accordion"
        />
        <div className="p-6">
          {renderActiveSection()}
        </div>
      </div>
    </div>
  )
}
