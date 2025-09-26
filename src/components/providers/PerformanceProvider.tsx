'use client'

import { useEffect } from 'react'
import { initPerformanceMonitoring } from '@/lib/performance'
import { createLogger } from '@/lib/logger'

const logger = createLogger('PerformanceProvider')

/**
 * Performance Provider Component
 * Initializes Core Web Vitals monitoring and custom performance tracking
 */
export function PerformanceProvider() {
  useEffect(() => {
    // Initialize performance monitoring once the app loads
    initPerformanceMonitoring()

    // Log initial page load performance
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        // Mark app initialization complete
        performance.mark('app-initialized')

        // Log navigation timing if available
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigationTiming && process.env.NODE_ENV === 'development') {
          logger.info('Page Load Performance', {
            'DNS Lookup': `${navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart}ms`,
            'Connection': `${navigationTiming.connectEnd - navigationTiming.connectStart}ms`,
            'Request': `${navigationTiming.responseStart - navigationTiming.requestStart}ms`,
            'Response': `${navigationTiming.responseEnd - navigationTiming.responseStart}ms`,
            'DOM Processing': `${navigationTiming.domComplete - navigationTiming.domLoading}ms`,
            'Total Load Time': `${navigationTiming.loadEventEnd - navigationTiming.navigationStart}ms`
          })
        }
      })

      // Log when the page becomes interactive
      document.addEventListener('DOMContentLoaded', () => {
        performance.mark('dom-content-loaded')
      })

      // Track page visibility changes (useful for understanding user engagement)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          performance.mark('page-hidden')
        } else {
          performance.mark('page-visible')
        }
      })
    }
  }, [])

  // This component doesn't render anything
  return null
}

export default PerformanceProvider
