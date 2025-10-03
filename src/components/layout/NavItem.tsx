/**
 * NavItem Component
 * CRO-294: Left Navigation Panel - Structure & Toggle
 * CRO-295: Routing & Navigation State Management
 *
 * Individual navigation item with support for collapsed/expanded states,
 * tooltips, and accessibility features
 */

'use client';

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

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(item.href as DashboardRoute);
  };

  const navLink = (
    <a
      href={item.href}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 rounded-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
        'cursor-pointer',
        isCollapsed ? 'px-3 py-3 justify-center' : 'px-3 py-2',
        itemIsActive && [
          'bg-primary-50 text-primary-700 border-l-4 border-primary-600',
          isCollapsed ? 'border-l-0 border-b-4' : '',
        ],
        !itemIsActive && 'text-neutral-700 hover:bg-neutral-100'
      )}
      aria-label={item.label}
      aria-current={itemIsActive ? 'page' : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
      {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
        <span
          className="ml-auto bg-primary-600 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center"
          aria-label={`${item.badge} notifications`}
        >
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
