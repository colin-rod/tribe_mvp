'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('Navigation')
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getInitials } from '@/lib/utils'
import type { UpdateType } from '@/components/updates/CreateUpdateModal'

interface NavigationProps {
  onCreateUpdate?: (type?: UpdateType) => void
}

export default function Navigation({ onCreateUpdate }: NavigationProps = {}) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const triggerCreateUpdate = (type: UpdateType = 'photo') => {
    if (onCreateUpdate) {
      onCreateUpdate(type)
      setIsMobileMenuOpen(false)
      setIsUserMenuOpen(false)
    } else {
      router.push('/dashboard/create-update')
    }
  }

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close mobile menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  if (loading) {
    return (
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-primary-700 hover:text-primary-800 transition-colors duration-200">
                Tribe
              </Link>
            </div>
            <div className="flex items-center">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        </div>
      </nav>
    )
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      // Redirect to home page after successful sign out
      router.push('/')
      router.refresh()
    } catch (error) {
      logger.errorWithStack('Error signing out:', error as Error)
    }
  }

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href={user ? "/dashboard" : "/"} className="text-xl font-bold text-primary-700 hover:text-primary-800 transition-colors duration-200">
              Tribe
            </Link>

            {user && (
              <div className="hidden md:flex ml-10 space-x-8">
                <Link
                  href="/dashboard"
                  className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/children"
                  className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Children
                </Link>
                <Link
                  href="/dashboard/recipients"
                  className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Recipients
                </Link>
                <Link
                  href="/dashboard/groups"
                  className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Groups
                </Link>
                <button
                  type="button"
                  onClick={() => triggerCreateUpdate('photo')}
                  className="bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Create Update
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            {user && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden min-h-[44px] min-w-[44px] p-2 rounded-md text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset transition-all duration-200 active:scale-95"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={isMobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
              >
                {isMobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            )}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 p-2 hover:bg-gray-50 transition-all duration-200 active:scale-95"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-800 text-sm font-semibold">
                      {getInitials(user.user_metadata?.name || user.email || '')}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-neutral-700">
                      {user.user_metadata?.name || user.email}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-slide-up"
                    style={{
                      maxHeight: 'min(80vh, 20rem)',
                      top: '100%'
                    }}
                  >
                    <div className="py-1">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-neutral-100">
                        <p className="text-sm font-medium text-neutral-900">
                          {user.user_metadata?.name || 'User'}
                        </p>
                        <p className="text-sm text-neutral-600 truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all duration-200 active:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                      >
                        <svg className="mr-3 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile Settings
                      </Link>

                      <Link
                        href="/dashboard/profile?tab=security"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all duration-200 active:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                      >
                        <svg className="mr-3 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Security
                      </Link>

                      <Link
                        href="/dashboard/profile?tab=notifications"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all duration-200 active:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                      >
                        <svg className="mr-3 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12.01 8.03A6 6 0 0112 20a6 6 0 116-6v-.97m-6 2.97V5a2 2 0 012-2h6a2 2 0 012 2v8.03" />
                        </svg>
                        Notifications
                      </Link>

                      <div className="border-t border-neutral-100">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false)
                            handleSignOut()
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all duration-200 active:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                        >
                          <svg className="mr-3 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link href="/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link href="/signup">
                  <Button>Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {user && isMobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu" ref={mobileMenuRef}>
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white shadow-lg border-t border-neutral-200 max-h-[calc(100vh-4rem)] overflow-y-auto animate-slide-up">
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block min-h-[44px] px-3 py-3 rounded-md text-base font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 transition-all duration-200 flex items-center"
            >
              <svg className="mr-3 h-5 w-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v2H8V5z" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/dashboard/children"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block min-h-[44px] px-3 py-3 rounded-md text-base font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 transition-all duration-200 flex items-center"
            >
              <svg className="mr-3 h-5 w-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Children
            </Link>
            <Link
              href="/dashboard/recipients"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block min-h-[44px] px-3 py-3 rounded-md text-base font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 transition-all duration-200 flex items-center"
            >
              <svg className="mr-3 h-5 w-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Recipients
            </Link>
            <Link
              href="/dashboard/groups"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block min-h-[44px] px-3 py-3 rounded-md text-base font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 transition-all duration-200 flex items-center"
            >
              <svg className="mr-3 h-5 w-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Groups
            </Link>
            <div className="pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => triggerCreateUpdate('photo')}
                className="block w-full min-h-[44px] px-3 py-3 rounded-md text-base font-medium bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 transition-all duration-200 flex items-center justify-center hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg className="mr-3 h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Update
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
