'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { LAYOUT_DIMENSIONS, LAYOUT_Z_INDEX } from '@/types/layout'
import { GlobalSearch } from './GlobalSearch'
import { UserDropdown } from './UserDropdown'
import { ProfileModal } from '@/components/profile/ProfileModal'

/**
 * TopBar component with three sections: logo (left), search (center), profile (right)
 * CRO-293: Core Layout Shell & Top Bar
 */
export function TopBar() {
  const { user, signOut } = useAuth()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  return (
    <header
      className="fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 shadow-sm"
      style={{
        height: LAYOUT_DIMENSIONS.TOP_BAR_HEIGHT,
        zIndex: LAYOUT_Z_INDEX.TOP_BAR,
      }}
    >
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left Section: Logo */}
        <div className="flex items-center">
          <Link
            href="/dashboard"
            className="text-xl font-bold text-primary-700 hover:text-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded px-2"
          >
            Tribe
          </Link>
        </div>

        {/* Right Section: Search, Notifications, and Profile */}
        <div className="flex items-center space-x-4">
          {/* Global Search */}
          <div className="w-80">
            <GlobalSearch />
          </div>

          {/* Notifications */}
          <button
            type="button"
            className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="Notifications"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>

          {/* User Dropdown */}
          {user && (
            <UserDropdown
              user={user}
              onProfileClick={() => setIsProfileModalOpen(true)}
              onSignOut={signOut}
            />
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {user && (
        <ProfileModal
          user={user}
          open={isProfileModalOpen}
          onOpenChange={setIsProfileModalOpen}
        />
      )}
    </header>
  )
}
