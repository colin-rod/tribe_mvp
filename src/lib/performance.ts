/**
 * Performance monitoring utilities for Core Web Vitals tracking
 * Integrated with Vercel Analytics for comprehensive performance insights
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals'

// Performance thresholds (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
  // Largest Contentful Paint
  LCP: {
    good: 2500,
    needsImprovement: 4000
  },
  // Interaction to Next Paint (replaces FID)
  INP: {
    good: 200,
    needsImprovement: 500
  },
  // Cumulative Layout Shift (score)
  CLS: {
    good: 0.1,
    needsImprovement: 0.25
  },
  // First Contentful Paint
  FCP: {
    good: 1800,
    needsImprovement: 3000
  },
  // Time to First Byte
  TTFB: {
    good: 800,
    needsImprovement: 1800
  }
} as const

export type MetricName = keyof typeof PERFORMANCE_THRESHOLDS
export type PerformanceRating = 'good' | 'needs-improvement' | 'poor'

export interface PerformanceMetric {
  name: MetricName
  value: number
  rating: PerformanceRating
  delta: number
  id: string
}

/**
 * Get performance rating based on value and thresholds
 */
export function getPerformanceRating(metric: MetricName, value: number): PerformanceRating {
  const thresholds = PERFORMANCE_THRESHOLDS[metric]

  if (value <= thresholds.good) {
    return 'good'
  } else if (value <= thresholds.needsImprovement) {
    return 'needs-improvement'
  }

  return 'poor'
}

/**
 * Log performance metrics to console in development
 */
export function logPerformanceMetric(metric: PerformanceMetric) {
  if (process.env.NODE_ENV === 'development') {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌'
    console.log(
      `${emoji} ${metric.name}: ${metric.value}ms (${metric.rating})`,
      {
        delta: metric.delta,
        id: metric.id,
        threshold: PERFORMANCE_THRESHOLDS[metric.name]
      }
    )
  }
}

/**
 * Send performance metrics to analytics service
 */
export function sendPerformanceMetric(metric: PerformanceMetric) {
  // Metrics are automatically sent to Vercel Analytics via web-vitals integration
  // This function can be extended to send to additional analytics services

  // Custom analytics logic could go here
  if (typeof window !== 'undefined' && 'gtag' in window) {
    // Example: Send to Google Analytics 4
    // @ts-ignore
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_id: metric.id,
      metric_delta: Math.round(metric.delta),
      metric_rating: metric.rating
    })
  }
}

/**
 * Initialize performance monitoring
 * Call this once in your app entry point
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return

  const handleMetric = (metric: any) => {
    const performanceMetric: PerformanceMetric = {
      name: metric.name as MetricName,
      value: metric.value,
      rating: getPerformanceRating(metric.name as MetricName, metric.value),
      delta: metric.delta,
      id: metric.id
    }

    logPerformanceMetric(performanceMetric)
    sendPerformanceMetric(performanceMetric)
  }

  // Monitor all Core Web Vitals
  onCLS(handleMetric)
  onINP(handleMetric)
  onFCP(handleMetric)
  onLCP(handleMetric)
  onTTFB(handleMetric)
}

/**
 * Performance monitoring hook for React components
 */
export function usePerformanceMonitoring(componentName: string) {
  if (typeof window === 'undefined') return

  const startTime = performance.now()

  return {
    measureRender: () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime

      if (process.env.NODE_ENV === 'development') {
        console.log(`🎨 ${componentName} render time: ${renderTime.toFixed(2)}ms`)
      }

      return renderTime
    },

    measureInteraction: (interactionName: string) => {
      const interactionStartTime = performance.now()

      return () => {
        const interactionEndTime = performance.now()
        const interactionTime = interactionEndTime - interactionStartTime

        if (process.env.NODE_ENV === 'development') {
          console.log(`⚡ ${componentName}.${interactionName}: ${interactionTime.toFixed(2)}ms`)
        }

        return interactionTime
      }
    }
  }
}

/**
 * Mark performance milestones for custom metrics
 */
export function markPerformance(name: string) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    performance.mark(name)
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    try {
      performance.measure(name, startMark, endMark)
      const measure = performance.getEntriesByName(name, 'measure')[0]

      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 ${name}: ${measure.duration.toFixed(2)}ms`)
      }

      return measure.duration
    } catch (error) {
      console.warn('Performance measurement failed:', error)
      return null
    }
  }

  return null
}

export default {
  initPerformanceMonitoring,
  usePerformanceMonitoring,
  markPerformance,
  measurePerformance,
  getPerformanceRating,
  logPerformanceMetric,
  sendPerformanceMetric,
  PERFORMANCE_THRESHOLDS
}