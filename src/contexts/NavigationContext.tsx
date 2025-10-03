'use client';

/**
 * Navigation Context Provider
 * CRO-295: Routing & Navigation State Management
 *
 * Provides centralized navigation state management with URL preservation
 */

import React, { createContext, useContext, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DashboardRoute, getNavigationItemByPath } from '@/lib/constants/routes';

interface NavigationContextValue {
  /** Current pathname */
  pathname: string;
  /** Current search parameters */
  searchParams: URLSearchParams;
  /** Active navigation item based on current route */
  activeItemId: string | null;
  /** Navigate to a new route */
  navigate: (path: DashboardRoute, options?: NavigationOptions) => void;
  /** Navigate with preserved search params */
  navigatePreserving: (path: DashboardRoute) => void;
  /** Check if a path is currently active */
  isActive: (path: string) => boolean;
}

interface NavigationOptions {
  /** Whether to preserve current search parameters (default: false) */
  preserveParams?: boolean;
  /** Additional search params to merge */
  params?: Record<string, string>;
  /** Whether to replace the current history entry (default: false) */
  replace?: boolean;
  /** Enable route prefetching (default: true) */
  prefetch?: boolean;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeItem = useMemo(() => {
    return getNavigationItemByPath(pathname);
  }, [pathname]);

  const navigate = useMemo(() => {
    return (path: DashboardRoute, options: NavigationOptions = {}) => {
      const {
        preserveParams = false,
        params = {},
        replace = false,
        prefetch = true,
      } = options;

      let targetUrl = path;

      // Handle search parameters
      if (preserveParams || Object.keys(params).length > 0) {
        const urlParams = new URLSearchParams();

        // Preserve existing params if requested
        if (preserveParams) {
          searchParams.forEach((value, key) => {
            urlParams.set(key, value);
          });
        }

        // Merge new params
        Object.entries(params).forEach(([key, value]) => {
          urlParams.set(key, value);
        });

        const queryString = urlParams.toString();
        if (queryString) {
          targetUrl = `${path}?${queryString}`;
        }
      }

      // Navigate using Next.js router
      if (replace) {
        router.replace(targetUrl);
      } else {
        router.push(targetUrl);
      }

      // Prefetch if enabled
      if (prefetch) {
        router.prefetch(path);
      }
    };
  }, [router, searchParams]);

  const navigatePreserving = useMemo(() => {
    return (path: DashboardRoute) => {
      navigate(path, { preserveParams: true });
    };
  }, [navigate]);

  const isActive = useMemo(() => {
    return (path: string) => {
      return pathname === path;
    };
  }, [pathname]);

  const value: NavigationContextValue = useMemo(
    () => ({
      pathname,
      searchParams,
      activeItemId: activeItem?.id ?? null,
      navigate,
      navigatePreserving,
      isActive,
    }),
    [pathname, searchParams, activeItem, navigate, navigatePreserving, isActive]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

/**
 * Hook to access navigation context
 * @throws Error if used outside NavigationProvider
 */
export function useNavigation() {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }

  return context;
}
