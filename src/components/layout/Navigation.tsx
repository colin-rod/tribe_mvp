'use client';

/**
 * Navigation Component
 * CRO-303: Performance Optimization & Code Splitting
 *
 * Provides the top navigation bar for authenticated and unauthenticated
 * experiences. When rendered outside of the dashboard shell, the component
 * gracefully degrades by falling back to Next.js routing utilities instead of
 * the dashboard navigation context.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import type { UpdateType } from '@/hooks/useActivityFilters';
import { useNavigationState } from '@/hooks/useNavigationState';
import { trackDashboardInteraction } from '@/lib/analytics/dashboard-analytics';
import {
  DASHBOARD_NAVIGATION_ITEMS,
  mobileNavigationSections,
  type DashboardNavigationItem,
} from '@/lib/constants/navigationItems';
import { createLogger } from '@/lib/logger';
import { cn, getInitials } from '@/lib/utils';

const logger = createLogger('Navigation');

function useOptionalNavigationState() {
  try {
    return useNavigationState();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Navigation state unavailable for analytics', { error });
    }
    return null;
  }
}

interface NavigationProps {
  onCreateUpdate?: (type?: UpdateType) => void;
  customActions?: ReactNode;
}

type NavigationClickMetadata = Record<string, unknown>;

export default function Navigation({
  onCreateUpdate,
  customActions,
}: NavigationProps = {}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const navigationState = useOptionalNavigationState();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    navigationState?.closeMobileNav();
  }, [navigationState]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        navigationState?.openMobileNav();
      } else {
        navigationState?.closeMobileNav();
      }
      return next;
    });
  }, [navigationState]);

  const getPreservedParams = () => {
    if (!navigationState) return {};
    return Object.fromEntries(navigationState.searchParams.entries());
  };

  const isItemActive = (
    href: string,
    alternateHrefs?: readonly string[],
  ) => {
    if (navigationState) {
      return navigationState.isActive(href, alternateHrefs);
    }

    if (pathname === href) {
      return true;
    }

    const normalizedAlternate = alternateHrefs ?? [];
    if (normalizedAlternate.includes(pathname)) {
      return true;
    }

    const baseHref = href.split('?')[0];
    return pathname.startsWith(baseHref);
  };

  const trackNavigationClick = (
    destination: string,
    element: string = 'navigation-link',
    additionalMetadata: NavigationClickMetadata = {},
  ) => {
    if (typeof window === 'undefined') return;

    trackDashboardInteraction({
      type: 'click',
      element,
      elementId: destination,
      metadata: {
        surface: 'top-bar',
        destination,
        activeView: navigationState?.activeView ?? null,
        preservedParams: getPreservedParams(),
        ...additionalMetadata,
      },
    });
  };

  const triggerCreateUpdate = (type: UpdateType = 'photo') => {
    trackNavigationClick('/dashboard/create-memory', 'navigation-action', {
      action: 'create-update',
      updateType: type,
    });

    if (onCreateUpdate) {
      onCreateUpdate(type);
      closeMobileMenu();
      setIsUserMenuOpen(false);
      return;
    }

    router.push('/dashboard/create-memory');
  };

  const handleNavigation = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    item: DashboardNavigationItem,
    options: { closeMobileMenu?: boolean } = {},
  ) => {
    if (navigationState) {
      event.preventDefault();
      navigationState.navigate(item.href);
    }

    if (options.closeMobileMenu) {
      closeMobileMenu();
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuContainerRef.current &&
        !userMenuContainerRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }

      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        closeMobileMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeMobileMenu]);

  // Close menus on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeMobileMenu]);

  if (loading) {
    return (
      <nav className="bg-white shadow">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xl font-bold text-primary-700 transition-colors duration-200 hover:text-primary-800"
            onClick={() =>
              trackNavigationClick('/', 'navigation-link', {
                label: 'brand',
                state: 'loading',
              })
            }
          >
            Tribe
          </Link>
          <LoadingSpinner size="sm" />
        </div>
      </nav>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      logger.errorWithStack('Error signing out', error as Error);
    }
  };

  return (
    <nav
      id="main-navigation"
      className="bg-white shadow"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link
              href={user ? '/dashboard' : '/'}
              className="text-xl font-bold text-primary-700 transition-colors duration-200 hover:text-primary-800"
              onClick={() =>
                trackNavigationClick(user ? '/dashboard' : '/', 'navigation-link', {
                  label: 'brand',
                })
              }
            >
              Tribe
            </Link>

            {user && (
              <div className="ml-10 hidden items-center space-x-6 md:flex">
                <div className="flex items-center space-x-1">
                  {DASHBOARD_NAVIGATION_ITEMS.map((item) => {
                    const itemIsActive = isItemActive(
                      item.href,
                      item.alternateHrefs,
                    );

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        prefetch
                        onClick={(event) => handleNavigation(event, item)}
                        className={cn(
                          'rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                          itemIsActive
                            ? 'bg-primary-50 text-primary-700 shadow-sm'
                            : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 active:scale-95',
                        )}
                        data-active={itemIsActive ? 'true' : undefined}
                        aria-current={itemIsActive ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                {customActions ?? (
                  <button
                    type="button"
                    onClick={() => triggerCreateUpdate('photo')}
                    className="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-primary-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 active:bg-primary-800"
                  >
                    Create Memory
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <button
                onClick={toggleMobileMenu}
                className="min-h-[44px] min-w-[44px] rounded-md p-2 text-neutral-700 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={
                  isMobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'
                }
              >
                {isMobileMenuOpen ? (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            )}

            {user ? (
              <div className="relative" ref={userMenuContainerRef}>
                <button
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex items-center space-x-3 rounded-full p-2 text-sm transition-all duration-200 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  aria-haspopup="true"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                    <span className="text-sm font-semibold text-primary-800">
                      {getInitials(user.user_metadata?.name || user.email || '')}
                    </span>
                  </div>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-medium text-neutral-700">
                      {user.user_metadata?.name || user.email}
                    </p>
                  </div>
                  <svg
                    className="h-4 w-4 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    style={{ maxHeight: 'min(80vh, 20rem)' }}
                  >
                    <div className="border-b border-neutral-100 px-4 py-3">
                      <p className="text-sm font-medium text-neutral-900">
                        {user.user_metadata?.name || 'User'}
                      </p>
                      <p className="truncate text-sm text-neutral-600">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/dashboard/profile"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          trackNavigationClick(
                            '/dashboard/profile',
                            'navigation-link',
                            { label: 'profile-settings' },
                          );
                        }}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                      >
                        <svg
                          className="mr-3 h-4 w-4 text-neutral-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        Profile Settings
                      </Link>

                      <Link
                        href="/dashboard/children"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          trackNavigationClick(
                            '/dashboard/children',
                            'navigation-link',
                            { label: 'children' },
                          );
                        }}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                      >
                        <svg
                          className="mr-3 h-4 w-4 text-neutral-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-3-3m-3.49-3A4 4 0 1112 4m0 8a4 4 0 100-8 4 4 0 000 8zm0 0c2.761 0 5 2.239 5 5v2H7v-2c0-2.761 2.239-5 5-5z"
                          />
                        </svg>
                        Children
                      </Link>

                      <Link
                        href="/dashboard/profile?tab=security"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          trackNavigationClick(
                            '/dashboard/profile?tab=security',
                            'navigation-link',
                            { label: 'security' },
                          );
                        }}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                      >
                        <svg
                          className="mr-3 h-4 w-4 text-neutral-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        Security
                      </Link>

                      <Link
                        href="/dashboard/profile?tab=notifications"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          trackNavigationClick(
                            '/dashboard/profile?tab=notifications',
                            'navigation-link',
                            { label: 'notifications' },
                          );
                        }}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                      >
                        <svg
                          className="mr-3 h-4 w-4 text-neutral-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-5 5v-5zM12.01 8.03A6 6 0 0112 20a6 6 0 116-6v-.97m-6 2.97V5a2 2 0 012-2h6a2 2 0 012 2v8.03"
                          />
                        </svg>
                        Notifications
                      </Link>

                      <Link
                        href="/dashboard/settings"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          trackNavigationClick(
                            '/dashboard/settings',
                            'navigation-link',
                            { label: 'settings' },
                          );
                        }}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                      >
                        <svg
                          className="mr-3 h-4 w-4 text-neutral-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Settings
                      </Link>
                    </div>

                    <div className="border-t border-neutral-100">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleSignOut();
                          trackNavigationClick('sign-out', 'navigation-action', {
                            action: 'sign-out',
                          });
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                      >
                        <svg
                          className="mr-3 h-4 w-4 text-neutral-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      trackNavigationClick('/login', 'navigation-link', {
                        label: 'sign-in',
                      })
                    }
                  >
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    onClick={() =>
                      trackNavigationClick('/signup', 'navigation-link', {
                        label: 'sign-up',
                      })
                    }
                  >
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {user && isMobileMenuOpen && (
        <div
          className="md:hidden"
          id="mobile-menu"
          ref={mobileMenuRef}
        >
          <div className="space-y-8 border-t border-neutral-200 bg-white px-4 py-4 shadow-lg">
            {mobileNavigationSections.map((section) => (
              <div key={section.id} className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(item.href, item.alternateHrefs);
                    const dashboardItem = DASHBOARD_NAVIGATION_ITEMS.find(
                      (navItem) => navItem.id === item.id,
                    );

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={(event) => {
                          if (dashboardItem) {
                            handleNavigation(event, dashboardItem, {
                              closeMobileMenu: true,
                            });
                          } else {
                            closeMobileMenu();
                          }
                        }}
                        className={cn(
                          'flex min-h-[44px] items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                          active
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900',
                        )}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon
                          className="h-5 w-5 flex-shrink-0 text-neutral-500"
                          aria-hidden="true"
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="ml-2 inline-flex min-w-[1.5rem] justify-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {(customActions ?? true) && (
              <div className="border-t border-neutral-200 pt-3">
                {(customActions && (
                  <div
                    onClick={() => {
                      closeMobileMenu();
                    }}
                  >
                    {customActions}
                  </div>
                )) || (
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      triggerCreateUpdate('photo');
                    }}
                    className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary-600 px-3 py-3 text-base font-medium text-white transition-all duration-200 hover:bg-primary-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 active:scale-[0.98] active:bg-primary-800"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create Memory
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
