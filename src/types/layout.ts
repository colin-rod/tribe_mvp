/**
 * Layout state types for the 3-pane dashboard layout
 * CRO-293: Core Layout Shell & Top Bar
 */

export interface LayoutState {
  /** Whether the left navigation panel is collapsed */
  leftNavCollapsed: boolean
  /** Whether the right sidebar panel is collapsed */
  rightPaneCollapsed: boolean
  /** Whether the layout is in mobile mode (below 1024px) */
  isMobile: boolean
}

export interface LayoutContextValue extends LayoutState {
  /** Toggle the left navigation panel */
  toggleLeftNav: () => void
  /** Toggle the right sidebar panel */
  toggleRightPane: () => void
  /** Set mobile state (called by resize observer) */
  setIsMobile: (isMobile: boolean) => void
}

export const LAYOUT_STORAGE_KEY = 'tribe-layout-state'

export const LAYOUT_BREAKPOINTS = {
  /** Breakpoint for showing 2-pane layout (1024px) */
  LG: 1024,
  /** Breakpoint for showing full 3-pane layout (1280px) */
  XL: 1280,
  /** Legacy desktop breakpoint (same as LG) */
  DESKTOP: 1024,
} as const

export const LAYOUT_Z_INDEX = {
  /** Top bar z-index */
  TOP_BAR: 50,
  /** Left navigation z-index */
  LEFT_NAV: 40,
  /** Right pane z-index */
  RIGHT_PANE: 30,
} as const

export const LAYOUT_DIMENSIONS = {
  /** Fixed height of the top bar */
  TOP_BAR_HEIGHT: '64px',
  /** Fixed width of the right pane when expanded */
  RIGHT_PANE_WIDTH: 320,
} as const
