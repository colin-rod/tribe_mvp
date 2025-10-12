'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useLayout } from '@/contexts/LayoutContext'
import { TopBar } from './TopBar'
import { RightPane } from './RightPane'
import { LAYOUT_DIMENSIONS, LAYOUT_Z_INDEX } from '@/types/layout'
import { useNavigationState } from '@/hooks/useNavigationState'
import { mobileNavigationSections } from '@/lib/constants/navigationItems'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface MobileNavigationDrawerProps {
  isOpen: boolean
  onClose: () => void
}

function MobileNavigationDrawer({ isOpen, onClose }: MobileNavigationDrawerProps) {
  const { pathname, isActive } = useNavigationState()
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const isPathActive = (href: string) => {
    if (isActive(href)) return true

    const basePath = href.split('?')[0]
    return pathname.startsWith(basePath)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-navigation-title"
    >
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        ref={trapRef}
        className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-white shadow-xl"
        id="mobile-navigation"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
          <h2 id="mobile-navigation-title" className="text-base font-semibold text-neutral-900">
            Menu
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6" aria-label="Mobile navigation">
          <div className="space-y-8">
            {mobileNavigationSections.map(section => (
              <div key={section.id}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map(item => {
                    const Icon = item.icon
                    const active = isPathActive(item.href)

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                          active
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                        )}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0 text-neutral-500" aria-hidden="true" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="ml-2 inline-flex min-w-[1.5rem] justify-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}

export interface DashboardShellProps {
  /** Content for the left navigation panel */
  leftNav?: React.ReactNode
  /** Content for the main/middle pane */
  children: React.ReactNode
  /** Content for the right sidebar panel */
  rightPane?: React.ReactNode
}

/**
 * DashboardShell component with CSS Grid 3-pane layout
 * CRO-293: Core Layout Shell & Top Bar
 * CRO-295: Routing & Navigation State Management
 * CRO-297: Right Pane - Base Structure & Collapse
 *
 * Layout structure:
 * - Fixed TopBar across the top
 * - CSS Grid with 3 columns: [nav] auto [main] 1fr [sidebar] auto
 * - Responsive: Single column on mobile (< 1024px)
 * - State persists in localStorage
 * - Navigation state managed via NavigationProvider
 */
export function DashboardShell({ leftNav, children, rightPane }: DashboardShellProps) {
  const { leftNavCollapsed, isMobile } = useLayout()
  const { isMobileNavOpen, closeMobileNav } = useNavigationState()

  // On mobile, show single column layout
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar />
        <main
          className="flex-1 overflow-auto bg-white"
          style={{
            paddingTop: LAYOUT_DIMENSIONS.TOP_BAR_HEIGHT,
          }}
        >
          {children}
        </main>
        <MobileNavigationDrawer isOpen={isMobileNavOpen} onClose={closeMobileNav} />
      </div>
    )
  }

  // Desktop 3-pane layout
  return (
    <div className="h-screen flex flex-col">
      <TopBar />

      <div
        className="flex-1 grid overflow-hidden"
        style={{
          paddingTop: LAYOUT_DIMENSIONS.TOP_BAR_HEIGHT,
          gridTemplateColumns: `${leftNavCollapsed ? '0px' : 'auto'} 1fr auto`,
          gridTemplateAreas: '"nav main sidebar"',
        }}
      >
        {/* Left Navigation */}
        {!leftNavCollapsed && leftNav && (
          <aside
            className="border-r border-neutral-200 bg-white overflow-y-auto"
            style={{
              gridArea: 'nav',
              zIndex: LAYOUT_Z_INDEX.LEFT_NAV,
            }}
          >
            {leftNav}
          </aside>
        )}

        {/* Main Content */}
        <main
          className="overflow-y-auto bg-neutral-50"
          style={{
            gridArea: 'main',
          }}
        >
          {children}
        </main>

        {/* Right Sidebar */}
        {rightPane && (
          <div
            style={{
              gridArea: 'sidebar',
              zIndex: LAYOUT_Z_INDEX.RIGHT_PANE,
            }}
          >
            <RightPane>{rightPane}</RightPane>
          </div>
        )}
      </div>
    </div>
  )
}
