'use client';

/**
 * Navigation State Hook
 * CRO-295: Routing & Navigation State Management
 *
 * Provides convenient access to navigation state and utilities
 */

import { useNavigation } from '@/contexts/NavigationContext';
import { DashboardRoute } from '@/lib/constants/routes';
import { useCallback } from 'react';

export interface UseNavigationStateReturn {
  /** Current pathname */
  pathname: string;
  /** Current search parameters */
  searchParams: URLSearchParams;
  /** Active navigation item ID */
  activeView: string | null;
  /** Navigate to a route with options */
  navigate: (path: DashboardRoute, preserveParams?: boolean) => void;
  /** Navigate preserving all search params */
  navigatePreserving: (path: DashboardRoute) => void;
  /** Check if a path is active */
  isActive: (path: string) => boolean;
  /** Get a search param value */
  getParam: (key: string) => string | null;
  /** Navigate with specific params */
  navigateWithParams: (path: DashboardRoute, params: Record<string, string>) => void;
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
    navigatePreserving,
    isActive,
  } = useNavigation();

  const navigate = useCallback(
    (path: DashboardRoute, preserveParams = false) => {
      contextNavigate(path, { preserveParams });
    },
    [contextNavigate]
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
    },
    [contextNavigate]
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
  };
}
