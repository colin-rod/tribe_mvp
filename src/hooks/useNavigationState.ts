'use client';

/**
 * Navigation State Hook
 * CRO-295: Routing & Navigation State Management
 *
 * Provides convenient access to navigation state and utilities
 */

import { useNavigation } from '@/contexts/NavigationContext';
import { DashboardRoute } from '@/lib/constants/routes';
import type { DashboardNavigationItemId } from '@/lib/constants/navigationItems';
import { useCallback } from 'react';

export interface UseNavigationStateReturn {
  /** Current pathname */
  pathname: string;
  /** Current search parameters */
  searchParams: URLSearchParams;
  /** Active navigation item ID */
  activeView: DashboardNavigationItemId | null;
  /** Navigate to a route with options */
  navigate: (path: DashboardRoute, preserveParams?: boolean) => void;
  /** Navigate preserving all search params */
  navigatePreserving: (path: DashboardRoute) => void;
  /** Check if a path is active */
  isActive: (path: string, alternateHrefs?: readonly string[]) => boolean;
  /** Get a search param value */
  getParam: (key: string) => string | null;
  /** Navigate with specific params */
  navigateWithParams: (path: DashboardRoute, params: Record<string, string>) => void;
  /** Whether the mobile navigation drawer is open */
  isMobileNavOpen: boolean;
  /** Toggle the mobile navigation drawer */
  toggleMobileNav: () => void;
  /** Close the mobile navigation drawer */
  closeMobileNav: () => void;
  /** Open the mobile navigation drawer */
  openMobileNav: () => void;
}

/**
 * Custom hook for navigation state management
 *
 * @example
 * ```tsx
 * const { pathname, navigate, activeView } = useNavigationState();
 *
 * // Simple navigation
 * navigate('/dashboard/children');
 *
 * // Navigate preserving search params
 * navigatePreserving('/dashboard/digests');
 *
 * // Navigate with specific params
 * navigateWithParams('/dashboard/activity', { filter: 'unread' });
 * ```
 */
export function useNavigationState(): UseNavigationStateReturn {
  const {
    pathname,
    searchParams,
    activeItemId,
    navigate: contextNavigate,
    navigatePreserving: contextNavigatePreserving,
    isActive,
    isMobileNavOpen,
    toggleMobileNav,
    closeMobileNav,
    openMobileNav,
  } = useNavigation();

  const navigate = useCallback(
    (path: DashboardRoute, preserveParams = false) => {
      contextNavigate(path, { preserveParams });
      closeMobileNav();
    },
    [contextNavigate, closeMobileNav]
  );

  const navigatePreserving = useCallback(
    (path: DashboardRoute) => {
      contextNavigatePreserving(path);
      closeMobileNav();
    },
    [contextNavigatePreserving, closeMobileNav]
  );

  const getParam = useCallback(
    (key: string) => {
      return searchParams.get(key);
    },
    [searchParams]
  );

  const navigateWithParams = useCallback(
    (path: DashboardRoute, params: Record<string, string>) => {
      contextNavigate(path, { params });
      closeMobileNav();
    },
    [contextNavigate, closeMobileNav]
  );

  return {
    pathname,
    searchParams,
    activeView: activeItemId,
    navigate,
    navigatePreserving,
    isActive,
    getParam,
    navigateWithParams,
    isMobileNavOpen,
    toggleMobileNav,
    closeMobileNav,
    openMobileNav,
  };
}
