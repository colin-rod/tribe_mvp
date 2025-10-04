/**
 * Example usage of the DashboardShell and Layout system
 * CRO-293: Core Layout Shell & Top Bar
 *
 * This file demonstrates how to use the new 3-pane layout system.
 * To use this layout in your application:
 *
 * 1. Wrap your app with LayoutProvider (usually in a layout.tsx file)
 * 2. Use DashboardShell for pages that need the 3-pane layout
 * 3. Pass leftNav, children (main content), and rightPane as props
 */

'use client'

import { LayoutProvider, useLayout } from '@/contexts/LayoutContext'
import { DashboardShell } from './DashboardShell'

// Example Left Navigation Component
function ExampleLeftNav() {
  const { toggleLeftNav } = useLayout()

  return (
    <nav className="w-64 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Navigation</h2>
        <button
          onClick={toggleLeftNav}
          className="p-2 rounded hover:bg-neutral-100"
          aria-label="Collapse navigation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <ul className="space-y-2">
        <li><a href="/dashboard" className="block p-2 rounded hover:bg-neutral-100">Dashboard</a></li>
        <li><a href="/dashboard/children" className="block p-2 rounded hover:bg-neutral-100">Children</a></li>
        <li><a href="/dashboard/recipients" className="block p-2 rounded hover:bg-neutral-100">Recipients</a></li>
      </ul>
    </nav>
  )
}

// Example Right Pane Component
function ExampleRightPane() {
  const { toggleRightPane } = useLayout()

  return (
    <aside className="w-80 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Activity</h2>
        <button
          onClick={toggleRightPane}
          className="p-2 rounded hover:bg-neutral-100"
          aria-label="Collapse activity panel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="p-3 bg-neutral-50 rounded">
          <p className="text-sm text-neutral-600">Recent activity will appear here</p>
        </div>
      </div>
    </aside>
  )
}

// Example Main Content Component
function ExampleMainContent() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Main Content Area</h1>
      <div className="space-y-4">
        <div className="p-4 bg-white rounded shadow">
          <p>This is the main content area. It takes up the full remaining space.</p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <p>The layout automatically handles:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Responsive breakpoints (single column on mobile)</li>
            <li>Panel collapse/expand state</li>
            <li>LocalStorage persistence</li>
            <li>Proper z-index hierarchy</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Example Page Component
export function ExampleDashboardPage() {
  return (
    <LayoutProvider>
      <DashboardShell
        leftNav={<ExampleLeftNav />}
        rightPane={<ExampleRightPane />}
      >
        <ExampleMainContent />
      </DashboardShell>
    </LayoutProvider>
  )
}

/**
 * Usage in app/dashboard/layout.tsx:
 *
 * import { LayoutProvider } from '@/contexts/LayoutContext'
 *
 * export default function DashboardLayout({ children }) {
 *   return (
 *     <LayoutProvider>
 *       {children}
 *     </LayoutProvider>
 *   )
 * }
 *
 * Usage in app/dashboard/page.tsx:
 *
 * import { DashboardShell } from '@/components/layout/DashboardShell'
 * import { LeftNav } from '@/components/layout/LeftNav'
 * import { ActivityPane } from '@/components/layout/ActivityPane'
 *
 * export default function DashboardPage() {
 *   return (
 *     <DashboardShell
 *       leftNav={<LeftNav />}
 *       rightPane={<ActivityPane />}
 *     >
 *       <YourMainContent />
 *     </DashboardShell>
 *   )
 * }
 */
