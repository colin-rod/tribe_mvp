'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'
import { LAYOUT_DIMENSIONS, LAYOUT_Z_INDEX } from '@/types/layout'
import { GlobalSearch } from './GlobalSearch'

/**
 * TopBar component with three sections: logo (left), search (center), profile (right)
 * CRO-293: Core Layout Shell & Top Bar
 */
export function TopBar() {
  const { user } = useAuth()

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

        {/* Center Section: Global Search */}
        <div className="flex-1 max-w-2xl mx-4">
          <GlobalSearch />
        </div>

        {/* Right Section: Profile */}
        <div className="flex items-center space-x-4">
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

          {/* Profile Avatar */}
          {user && (
            <Link
              href="/dashboard/profile"
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-800 text-sm font-semibold">
                  {getInitials(user.user_metadata?.name || user.email || '')}
                </span>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-neutral-700">
                  {user.user_metadata?.name || user.email}
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
