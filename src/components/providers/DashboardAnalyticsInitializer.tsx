'use client'

import { useEffect } from 'react'
import {
  initializeDashboardAnalytics,
  destroyDashboardAnalytics
} from '@/lib/analytics/dashboard-analytics'

export function DashboardAnalyticsInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const instance = initializeDashboardAnalytics()

    return () => {
      if (instance) {
        destroyDashboardAnalytics()
      }
    }
  }, [])

  return null
}
