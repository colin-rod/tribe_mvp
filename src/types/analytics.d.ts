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

  // Onboarding events
  onboarding_step_click: {
    event_category: 'onboarding'
    event_label: 'add-child' | 'invite-recipients' | 'create-first-update' | 'complete'
    value: 1
  }

  // Update Card events
  update_card_click: {
    event_category: 'engagement'
    event_label: string // update ID
    value: 1
  }
}

export {}