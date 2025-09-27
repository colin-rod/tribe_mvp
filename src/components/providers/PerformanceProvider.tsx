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
        try {
          const navigationEntries = performance.getEntriesByType('navigation')
          const navigationTiming = navigationEntries[0] as PerformanceNavigationTiming

          if (navigationTiming && process.env.NODE_ENV === 'development') {
            // Add type guards to ensure properties exist
            const perfData: Record<string, string> = {}

            if (typeof navigationTiming.domainLookupEnd === 'number' && typeof navigationTiming.domainLookupStart === 'number') {
              perfData['DNS Lookup'] = `${navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart}ms`
            }

            if (typeof navigationTiming.connectEnd === 'number' && typeof navigationTiming.connectStart === 'number') {
              perfData['Connection'] = `${navigationTiming.connectEnd - navigationTiming.connectStart}ms`
            }

            if (typeof navigationTiming.responseStart === 'number' && typeof navigationTiming.requestStart === 'number') {
              perfData['Request'] = `${navigationTiming.responseStart - navigationTiming.requestStart}ms`
            }

            if (typeof navigationTiming.responseEnd === 'number' && typeof navigationTiming.responseStart === 'number') {
              perfData['Response'] = `${navigationTiming.responseEnd - navigationTiming.responseStart}ms`
            }

            if (typeof navigationTiming.domComplete === 'number' && typeof navigationTiming.domInteractive === 'number') {
              perfData['DOM Processing'] = `${navigationTiming.domComplete - navigationTiming.domInteractive}ms`
            }

            if (typeof navigationTiming.loadEventEnd === 'number' && typeof navigationTiming.fetchStart === 'number') {
              perfData['Total Load Time'] = `${navigationTiming.loadEventEnd - navigationTiming.fetchStart}ms`
            }

            if (Object.keys(perfData).length > 0) {
              logger.info('Page Load Performance', perfData)
            }
          }
        } catch (error) {
          // Silently handle performance API errors
          if (process.env.NODE_ENV === 'development') {
            logger.warn('Performance navigation timing not available', { error })
          }
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
