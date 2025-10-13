'use client'

/**
 * Navigation Component
 * CRO-303: Performance Optimization & Code Splitting
 *
 * Performance optimizations:
 * - Prefetch links for likely next navigation
 * - Uses Next.js Link with prefetch enabled for authenticated routes
 */

import { createLogger } from '@/lib/logger'

const logger = createLogger('Navigation')
import { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useNavigationState } from '@/hooks/useNavigationState'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn, getInitials } from '@/lib/utils'
import {
  DASHBOARD_NAVIGATION_ITEMS,
  DASHBOARD_NAVIGATION_SECTIONS,
  type DashboardNavigationItem,
} from '@/lib/constants/navigationItems'
import type { UpdateType } from '@/hooks/useActivityFilters'
import { trackDashboardInteraction } from '@/lib/analytics/dashboard-analytics'

function useOptionalNavigationState() {
  try {
    return useNavigationState()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Navigation state unavailable for analytics', { error })
    }
    return null
  }
}

interface NavigationProps {
  onCreateUpdate?: (type?: UpdateType) => void
  customActions?: React.ReactNode
}

export default function Navigation({ onCreateUpdate, customActions }: NavigationProps = {}) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const { navigate, isActive } = useNavigationState()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const navigationItems = DASHBOARD_NAVIGATION_ITEMS
  const navigationState = useOptionalNavigationState()

  const getPreservedParams = () => {
    if (!navigationState) return {}
    return Object.fromEntries(navigationState.searchParams.entries())
  }

  const trackNavigationClick = (
    destination: string,
    element: string = 'navigation-link',
    additionalMetadata: Record<string, unknown> = {}
  ) => {
    if (typeof window === 'undefined') return

    trackDashboardInteraction({
      type: 'click',
      element,
      elementId: destination,
      metadata: {
        surface: 'top-bar',
        destination,
        activeView: navigationState?.activeView ?? null,
        preservedParams: getPreservedParams(),
        ...additionalMetadata
      }
    })
  }

  const triggerCreateUpdate = (type: UpdateType = 'photo') => {
    trackNavigationClick('/dashboard/create-memory', 'navigation-action', {
      action: 'create-update',
      updateType: type
    })

    if (onCreateUpdate) {
      onCreateUpdate(type)
      setIsMobileMenuOpen(false)
      setIsUserMenuOpen(false)
    } else {
      router.push('/dashboard/create-memory')
    }
  }

  const handleNavigation = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    item: DashboardNavigationItem,
    options: { closeMobileMenu?: boolean } = {}
  ) => {
    event.preventDefault()
    navigate(item.href)

    if (options.closeMobileMenu) {
      setIsMobileMenuOpen(false)
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
              <Link
                href="/"
                className="text-xl font-bold text-primary-700 hover:text-primary-800 transition-colors duration-200"
                onClick={() => trackNavigationClick('/', 'navigation-link', { label: 'brand', state: 'loading' })}
              >
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
    <nav id="main-navigation" className="bg-white shadow" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href={user ? "/dashboard" : "/"}
              className="text-xl font-bold text-primary-700 hover:text-primary-800 transition-colors duration-200"
              onClick={() => trackNavigationClick(user ? '/dashboard' : '/', 'navigation-link', { label: 'brand' })}
            >
              Tribe
            </Link>

            {user && (
              <div className="hidden md:flex ml-10 items-center space-x-6">
                <div className="flex items-center space-x-1">
                  {navigationItems.map((item) => {
                    const itemIsActive = isActive(item.href, item.alternateHrefs)

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        prefetch
                        onClick={(event) => handleNavigation(event, item)}
                        className={cn(
                          'px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                          itemIsActive
                            ? 'text-primary-700 bg-primary-50 shadow-sm'
                            : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 active:scale-95'
                        )}
                        data-active={itemIsActive ? 'true' : undefined}
                        aria-current={itemIsActive ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
                {customActions || (
                  <button
                    type="button"
                    onClick={() => triggerCreateUpdate('photo')}
                    className="bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Create Memory
                  </button>
                )}
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
                  aria-haspopup="true"
                  aria-expanded={isUserMenuOpen}
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
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          trackNavigationClick('/dashboard/profile', 'navigation-link', { label: 'profile-settings' })
                        }}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all duration-200 active:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                      >
                        <svg className="mr-3 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile Settings
                      </Link>

                      <Link
                        href="/dashboard/children"
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          trackNavigationClick('/dashboard/children', 'navigation-link', { label: 'children' })
                        }}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all duration-200 active:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                      >
                        <svg className="mr-3 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3m-3.49-3A4 4 0 1112 4m0 8a4 4 0 100-8 4 4 0 000 8zm0 0c2.761 0 5 2.239 5 5v2H7v-2c0-2.761 2.239-5 5-5z" />
                        </svg>
                        Children
                      </Link>

                      <Link
                        href="/dashboard/profile?tab=security"
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          trackNavigationClick('/dashboard/profile?tab=security', 'navigation-link', { label: 'security' })
                        }}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all duration-200 active:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                      >
                        <svg className="mr-3 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Security
                      </Link>

                      <Link
                        href="/dashboard/profile?tab=notifications"
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          trackNavigationClick('/dashboard/profile?tab=notifications', 'navigation-link', { label: 'notifications' })
                        }}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all duration-200 active:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                      >
                        <svg className="mr-3 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12.01 8.03A6 6 0 0112 20a6 6 0 116-6v-.97m-6 2.97V5a2 2 0 012-2h6a2 2 0 012 2v8.03" />
                        </svg>
                        Notifications
                      </Link>

                      <Link
                        href="/dashboard/settings"
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          trackNavigationClick('/dashboard/settings', 'navigation-link', { label: 'settings' })
                        }}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all duration-200 active:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                      >
                        <svg className="mr-3 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </Link>

                      <div className="border-t border-neutral-100">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false)
                            handleSignOut()
                            trackNavigationClick('sign-out', 'navigation-action', { action: 'sign-out' })
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
                  <Button
                    variant="ghost"
                    onClick={() => trackNavigationClick('/login', 'navigation-link', { label: 'sign-in' })}
                  >
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    onClick={() => trackNavigationClick('/signup', 'navigation-link', { label: 'sign-up' })}
                  >
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {user && isMobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu" ref={mobileMenuRef}>
          <div className="px-2 pt-2 pb-3 space-y-4 bg-white shadow-lg border-t border-neutral-200 max-h-[calc(100vh-4rem)] overflow-y-auto animate-slide-up">
            {DASHBOARD_NAVIGATION_SECTIONS.map((section) => (
              <div key={section.id} className="space-y-1">
                {'label' in section && section.label ? (
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {section.label}
                  </p>
                ) : null}
                {section.items.map((item) => {
                  const Icon = item.icon
                  const itemIsActive = isActive(item.href, 'alternateHrefs' in item ? item.alternateHrefs : undefined)

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      prefetch
                      onClick={(event) =>
                        handleNavigation(event, item, { closeMobileMenu: true })
                      }
                      className={cn(
                        'flex items-center min-h-[44px] px-3 py-3 rounded-md text-base font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
                        itemIsActive
                          ? 'text-primary-700 bg-primary-50 shadow-sm'
                          : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100'
                      )}
                      data-active={itemIsActive ? 'true' : undefined}
                      aria-current={itemIsActive ? 'page' : undefined}
                    >
                      <Icon className="mr-3 h-5 w-5" aria-hidden="true" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
            <div className="pt-2 border-t border-neutral-200">
              {customActions || (
                <button
                  type="button"
                  onClick={() => triggerCreateUpdate('photo')}
                  className="block w-full min-h-[44px] px-3 py-3 rounded-md text-base font-medium bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 transition-all duration-200 flex items-center justify-center hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg className="mr-3 h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Memory
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
