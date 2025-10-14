// Google Analytics gtag types for the dashboard components

declare global {
  interface Window {
    gtag?: ((
      command: 'event',
      eventName: string,
      eventParameters: {
        event_category: string
      event_label: string
      value?: number
      custom_parameter?: string
      timestamp?: string
    }
    ) => void) & ((
      command: 'config' | 'event',
      targetId: string,
      config?: Record<string, unknown>
    ) => void)
  }
}

export interface DashboardAnalyticsEvents {
  // Dashboard Hero events
  dashboard_hero_create_click: {
    event_category: 'engagement'
    event_label: 'photo_default' | 'photo' | 'text' | 'video' | 'milestone'
    value: 1
  }
  dashboard_hero_dropdown_open: {
    event_category: 'engagement'
    event_label: 'update_options'
    value: 1
  }
  dashboard_hero_option_select: {
    event_category: 'engagement'
    event_label: 'photo' | 'text' | 'video' | 'milestone'
    value: 1
  }

  // Empty Timeline events
  empty_timeline_create_click: {
    event_category: 'engagement'
    event_label: 'photo' | 'text' | 'video' | 'milestone'
    value: 1
  }

  // Reflection-focused onboarding events
  reflection_entry_opened: {
    event_category: 'reflection'
    event_label: string
  }
  reflection_entry_completed: {
    event_category: 'reflection'
    event_label: string
  }
  reflection_entry_skipped: {
    event_category: 'reflection'
    event_label: string
  }

  // Update Card events
  update_card_click: {
    event_category: 'engagement'
    event_label: string // update ID
    value: 1
  }
}

export {}