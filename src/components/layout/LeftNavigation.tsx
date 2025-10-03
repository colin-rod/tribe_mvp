/**
 * LeftNavigation Component
 * CRO-294: Left Navigation Panel - Structure & Toggle
 *
 * Collapsible left navigation panel with:
 * - Icon-only (64px) and expanded (240px) states
 * - Smooth transitions
 * - localStorage persistence
 * - Keyboard navigation
 * - ARIA accessibility
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { navigationItems } from '@/lib/constants/navigationItems';
import { NavItem } from './NavItem';
import { NavToggleButton } from './NavToggleButton';

const STORAGE_KEY = 'nav-collapsed-state';
const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 240;

export function LeftNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
    setIsMounted(true);
  }, []);

  // Persist collapsed state to localStorage
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem(STORAGE_KEY, String(newState));
      return newState;
    });
  }, []);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!navRef.current) return;

      const navLinks = Array.from(
        navRef.current.querySelectorAll<HTMLAnchorElement>('a[href]')
      );
      const currentIndex = navLinks.findIndex(
        (link) => link === document.activeElement
      );

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (currentIndex < navLinks.length - 1) {
            navLinks[currentIndex + 1]?.focus();
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (currentIndex > 0) {
            navLinks[currentIndex - 1]?.focus();
          }
          break;
        case 'Home':
          event.preventDefault();
          navLinks[0]?.focus();
          break;
        case 'End':
          event.preventDefault();
          navLinks[navLinks.length - 1]?.focus();
          break;
      }
    };

    const nav = navRef.current;
    if (nav) {
      nav.addEventListener('keydown', handleKeyDown);
      return () => nav.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <nav
        className="flex flex-col h-full bg-white border-r border-neutral-200"
        style={{ width: EXPANDED_WIDTH }}
        aria-label="Main navigation"
      />
    );
  }

  return (
    <nav
      ref={navRef}
      className={cn(
        'flex flex-col h-full bg-white border-r border-neutral-200',
        'transition-all duration-200 ease-out'
      )}
      style={{ width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      aria-label="Main navigation"
    >
      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navigationItems.map((item) => (
          <NavItem key={item.id} item={item} isCollapsed={isCollapsed} />
        ))}
      </div>

      {/* Toggle Button */}
      <NavToggleButton isCollapsed={isCollapsed} onToggle={toggleCollapse} />
    </nav>
  );
}
