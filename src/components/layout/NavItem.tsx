/**
 * NavItem Component
 * CRO-294: Left Navigation Panel - Structure & Toggle
 * CRO-295: Routing & Navigation State Management
 *
 * Individual navigation item with support for collapsed/expanded states,
 * tooltips, and accessibility features
 */

'use client';

import type { MouseEvent } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';
import { useNavigationState } from '@/hooks/useNavigationState';
import type { NavItem as NavItemType } from '@/lib/constants/navigationItems';
import type { DashboardRoute } from '@/lib/constants/routes';

interface NavItemProps {
  item: NavItemType;
  isCollapsed: boolean;
}

export function NavItem({ item, isCollapsed }: NavItemProps) {
  const { navigate, isActive } = useNavigationState();
  const itemIsActive = isActive(item.href);
  const Icon = item.icon;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(item.href as DashboardRoute);
  };

  const navLink = (
    <a
      href={item.href}
      onClick={handleClick}
      data-active={itemIsActive ? 'true' : undefined}
      className={cn(
        'nav-item',
        isCollapsed ? 'justify-center px-3 py-3' : 'px-3 py-2'
      )}
      aria-label={item.label}
      aria-current={itemIsActive ? 'page' : undefined}
    >
      <span aria-hidden="true" className="nav-item__indicator" />
      <Icon className="nav-item__icon" aria-hidden="true" />
      {!isCollapsed && (
        <span className="z-10 truncate text-sm font-medium">{item.label}</span>
      )}
      {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="nav-item__badge" aria-label={`${item.badge} notifications`}>
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </a>
  );

  // Show tooltip only when collapsed
  if (isCollapsed) {
    return (
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            {navLink}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              align="center"
              sideOffset={12}
              className={cn(
                'bg-neutral-900 text-white px-3 py-2 rounded-md text-sm',
                'shadow-lg z-50 max-w-xs'
              )}
            >
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-2 text-neutral-300">
                  ({item.badge})
                </span>
              )}
              <Tooltip.Arrow className="fill-neutral-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return navLink;
}
