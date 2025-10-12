'use client';

/**
 * Navigation Context Provider
 * CRO-295: Routing & Navigation State Management
 *
 * Provides centralized navigation state management with URL preservation
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DashboardRoute, isPathActive } from '@/lib/constants/routes';
import {
  getNavigationItemByPath,
  type DashboardNavigationItemId,
} from '@/lib/constants/navigationItems';

interface NavigationContextValue {
  /** Current pathname */
  pathname: string;
  /** Current search parameters */
  searchParams: URLSearchParams;
  /** Active navigation item based on current route */
  activeItemId: DashboardNavigationItemId | null;
  /** Navigate to a new route */
  navigate: (path: DashboardRoute, options?: NavigationOptions) => void;
  /** Navigate with preserved search params */
  navigatePreserving: (path: DashboardRoute) => void;
  /** Check if a path is currently active */
  isActive: (path: string) => boolean;
  /** Whether the mobile navigation drawer is open */
  isMobileNavOpen: boolean;
  /** Open the mobile navigation drawer */
  openMobileNav: () => void;
  /** Close the mobile navigation drawer */
  closeMobileNav: () => void;
  /** Toggle the mobile navigation drawer */
  toggleMobileNav: () => void;
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const activeItem = useMemo(() => {
    return getNavigationItemByPath(pathname);
  }, [pathname]);

  const navigate = useCallback(
    (path: DashboardRoute, options: NavigationOptions = {}) => {
      const {
        preserveParams = false,
        params = {},
        replace = false,
        prefetch = true,
      } = options;

      let targetUrl: string = path;

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
    },
    [router, searchParams]
  );

  const navigatePreserving = useCallback(
    (path: DashboardRoute) => {
      navigate(path, { preserveParams: true });
    },
    [navigate]
  );

  const isActive = useCallback(
    (path: string) => {
      return pathname === path;
    },
    [pathname]
  );

  const openMobileNav = useCallback(() => {
    setIsMobileNavOpen(true);
  }, []);

  const closeMobileNav = useCallback(() => {
    setIsMobileNavOpen(false);
  }, []);

  const toggleMobileNav = useCallback(() => {
    setIsMobileNavOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    // Close mobile nav on route change to keep state in sync
    setIsMobileNavOpen(false);
  }, [pathname]);

  const value: NavigationContextValue = useMemo(
    () => ({
      pathname,
      searchParams,
      activeItemId: activeItem?.id ?? null,
      navigate,
      navigatePreserving,
      isActive,
      isMobileNavOpen,
      openMobileNav,
      closeMobileNav,
      toggleMobileNav,
    }),
    [
      pathname,
      searchParams,
      activeItem,
      navigate,
      navigatePreserving,
      isActive,
      isMobileNavOpen,
      openMobileNav,
      closeMobileNav,
      toggleMobileNav,
    ]
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
