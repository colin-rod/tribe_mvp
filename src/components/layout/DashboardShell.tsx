'use client'

import { useLayout } from '@/contexts/LayoutContext'
import { NavigationProvider } from '@/contexts/NavigationContext'
import { ViewSelectionProvider } from '@/contexts/ViewSelectionContext'
import { TopBar } from './TopBar'
import { RightPane } from './RightPane'
import { LAYOUT_DIMENSIONS, LAYOUT_Z_INDEX } from '@/types/layout'

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

  // On mobile, show single column layout
  if (isMobile) {
    return (
      <NavigationProvider>
        <ViewSelectionProvider>
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
          </div>
        </ViewSelectionProvider>
      </NavigationProvider>
    )
  }

  // Desktop 3-pane layout
  return (
    <NavigationProvider>
      <ViewSelectionProvider>
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
      </ViewSelectionProvider>
    </NavigationProvider>
  )
}
