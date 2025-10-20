'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { LAYOUT_DIMENSIONS, LAYOUT_Z_INDEX } from '@/types/layout'
import { GlobalSearch } from './GlobalSearch'
import { UserDropdown } from './UserDropdown'
import { ProfileModal } from '@/components/profile/ProfileModal'
import { Button } from '@/components/ui/Button'
import { useNavigationState } from '@/hooks/useNavigationState'
import { useLayout } from '@/contexts/LayoutContext'

/**
 * TopBar component with three sections: logo (left), search (center), profile (right)
 * CRO-293: Core Layout Shell & Top Bar
 */
export function TopBar() {
  const { user, signOut } = useAuth()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const { isMobileNavOpen, toggleMobileNav } = useNavigationState()
  const { focusMode, setFocusMode } = useLayout()

  const handleLayoutToggle = () => {
    setFocusMode(!focusMode)
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 shadow-sm"
      style={{
        height: LAYOUT_DIMENSIONS.TOP_BAR_HEIGHT,
        zIndex: LAYOUT_Z_INDEX.TOP_BAR,
      }}
    >
      <div className="h-full">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
          {/* Left Section: Logo */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden text-neutral-600 hover:text-neutral-900"
              onClick={toggleMobileNav}
              aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileNavOpen}
              aria-controls="mobile-navigation"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Link
              href="/dashboard"
              className="rounded px-2 text-xl font-bold text-primary-700 transition-colors duration-200 hover:text-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              TribeUpdate
            </Link>
          </div>

          {/* Right Section: Search, Notifications, and Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-neutral-600 hover:text-neutral-900"
              onClick={handleLayoutToggle}
            >
              {focusMode ? 'Switch to tools view' : 'Switch to focus view'}
            </Button>

            {/* Global Search */}
            <div className="flex-shrink-0">
              <GlobalSearch />
            </div>

            {/* Notifications */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-neutral-600 hover:text-neutral-900"
              aria-label="View notifications"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
            </Button>

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
