'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createLogger } from '@/lib/logger'
import { trackDashboardPerformance, trackCustomDashboardEvent } from '@/lib/analytics/dashboard-analytics'
import type { MetricType } from '@/lib/analytics/dashboard-analytics'

const logger = createLogger('PerformanceMonitoring')

export interface PerformanceAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  metric: string
  value: number
  threshold: number
  timestamp: Date
  component?: string
  message: string
  suggestion?: string
}

export interface PerformanceThresholds {
  timelineRenderTime: number
  searchResponseTime: number
  imageLoadTime: number
  memoryUsage: number
  fps: number
  cacheHitRate: number
}

export interface UsePerformanceMonitoringOptions {
  enableRealTimeMonitoring: boolean
  enableAlerts: boolean
  enableAutoOptimization: boolean
  thresholds: Partial<PerformanceThresholds>
  alertCallback?: (alert: PerformanceAlert) => void
}

export interface UsePerformanceMonitoringReturn {
  isMonitoring: boolean
  currentMetrics: PerformanceMetrics
  alerts: PerformanceAlert[]
  performanceScore: number
  recommendations: string[]
  startMonitoring: () => void
  stopMonitoring: () => void
  clearAlerts: () => void
  measureTimelineRender: () => () => void
  measureSearchResponse: () => () => void
  measureImageLoad: (imageUrl: string) => () => void
  updateCacheStats: (hits: number, misses: number) => void
  getPerformanceReport: () => PerformanceReport
}

interface PerformanceMetrics {
  timelineRenderTime: number
  searchResponseTime: number
  imageLoadTime: number
  memoryUsage: number
  fps: number
  cacheHitRate: number
}

interface CacheStats {
  hits: number
  misses: number
}

interface FpsCounter {
  frames: number
  lastTime: number
  fps: number
}

interface PerformanceReport {
  timestamp: string
  metrics: PerformanceMetrics
  thresholds: PerformanceThresholds
  alerts: number
  score: number
  recommendations: string[]
  cacheStats: CacheStats
}

interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number
  }
}

interface PerformanceMonitoringWindow extends Window {
  __performanceMonitoringCleanup?: () => void
}

const METRIC_TYPE_MAP: Record<keyof PerformanceMetrics, MetricType> = {
  timelineRenderTime: 'timeline_render_time',
  searchResponseTime: 'search_response_time',
  imageLoadTime: 'image_load_time',
  memoryUsage: 'memory_usage',
  fps: 'virtual_scroll_fps',
  cacheHitRate: 'cache_hit_rate'
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  timelineRenderTime: 100, // ms
  searchResponseTime: 300, // ms
  imageLoadTime: 2000, // ms
  memoryUsage: 50 * 1024 * 1024, // 50MB
  fps: 30,
  cacheHitRate: 0.8 // 80%
}

/**
 * Hook for monitoring dashboard performance with real-time alerts and optimization suggestions
 */
export function usePerformanceMonitoring({
  enableRealTimeMonitoring = true,
  enableAlerts = true,
  enableAutoOptimization = false,
  thresholds = {},
  alertCallback
}: UsePerformanceMonitoringOptions = {}): UsePerformanceMonitoringReturn {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics>({
    timelineRenderTime: 0,
    searchResponseTime: 0,
    imageLoadTime: 0,
    memoryUsage: 0,
    fps: 0,
    cacheHitRate: 0
  })

  const thresholdsRef = useRef<PerformanceThresholds>({ ...DEFAULT_THRESHOLDS, ...thresholds })
  const metricsRef = useRef<PerformanceMetrics>(currentMetrics)
  const performanceObserverRef = useRef<PerformanceObserver | null>(null)
  const fpsCounterRef = useRef<FpsCounter>({ frames: 0, lastTime: 0, fps: 0 })
  const cacheStatsRef = useRef<CacheStats>({ hits: 0, misses: 0 })

  // Update refs when state changes
  useEffect(() => {
    metricsRef.current = currentMetrics
  }, [currentMetrics])

  // Create performance alert
  const createAlert = useCallback((
    type: PerformanceAlert['type'],
    metric: string,
    value: number,
    threshold: number,
    component?: string
  ): PerformanceAlert => {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      component,
      message: generateAlertMessage(type, metric, value, threshold),
      suggestion: generateOptimizationSuggestion(metric, value, threshold)
    }

    if (alertCallback) {
      alertCallback(alert)
    }

    return alert
  }, [alertCallback])

  // Add alert to list
  const addAlert = useCallback((alert: PerformanceAlert) => {
    setAlerts(prev => {
      // Remove old alerts for the same metric to prevent spam
      const filtered = prev.filter(a =>
        a.metric !== alert.metric ||
        Date.now() - a.timestamp.getTime() > 30000 // Keep for 30 seconds
      )
      return [...filtered, alert].slice(-10) // Keep last 10 alerts
    })

    logger.warn('Performance alert created:', alert)
    trackCustomDashboardEvent('performance_alert', {
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      type: alert.type
    })
  }, [])

  // Check metric against threshold
  const checkThreshold = useCallback((metric: keyof PerformanceThresholds, value: number, component?: string) => {
    const threshold = thresholdsRef.current[metric]
    if (!threshold) return

    let alertType: PerformanceAlert['type'] = 'info'

    // Determine alert severity based on how much threshold is exceeded
    const ratio = value / threshold
    if (ratio > 2) {
      alertType = 'error'
    } else if (ratio > 1.5) {
      alertType = 'warning'
    } else if (ratio > 1) {
      alertType = 'info'
    } else {
      return // Performance is within acceptable range
    }

    const alert = createAlert(alertType, metric, value, threshold, component)
    addAlert(alert)
  }, [createAlert, addAlert])

  // Update metric and check threshold
  const updateMetric = useCallback((metric: keyof PerformanceMetrics, value: number, component?: string) => {
    setCurrentMetrics(prev => ({ ...prev, [metric]: value }))

    if (enableAlerts) {
      checkThreshold(metric as keyof PerformanceThresholds, value, component)
    }

    // Track performance metric
    const metricType = METRIC_TYPE_MAP[metric]
    trackDashboardPerformance({
      type: metricType,
      value,
      ...(component ? { metadata: { component } } : {})
    })
  }, [enableAlerts, checkThreshold])

  // FPS monitoring
  const measureFPS = useCallback(() => {
    const measure = () => {
      const now = performance.now()
      fpsCounterRef.current.frames++

      if (now - fpsCounterRef.current.lastTime >= 1000) {
        const fps = Math.round((fpsCounterRef.current.frames * 1000) / (now - fpsCounterRef.current.lastTime))
        fpsCounterRef.current.fps = fps
        fpsCounterRef.current.frames = 0
        fpsCounterRef.current.lastTime = now

        updateMetric('fps', fps)
      }

      if (isMonitoring) {
        requestAnimationFrame(measure)
      }
    }

    requestAnimationFrame(measure)
  }, [isMonitoring, updateMetric])

  // Memory monitoring
  const measureMemory = useCallback(() => {
    const performanceWithMemory = performance as PerformanceWithMemory
    const usedJSHeapSize = performanceWithMemory.memory?.usedJSHeapSize
    if (typeof usedJSHeapSize === 'number') {
      updateMetric('memoryUsage', usedJSHeapSize)
    }
  }, [updateMetric])

  // Timeline render measurement
  const measureTimelineRender = useCallback(() => {
    const startTime = performance.now()
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      updateMetric('timelineRenderTime', duration, 'timeline')
    }
  }, [updateMetric])

  // Search response measurement
  const measureSearchResponse = useCallback(() => {
    const startTime = performance.now()
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      updateMetric('searchResponseTime', duration, 'search')
    }
  }, [updateMetric])

  // Image load measurement
  const measureImageLoad = useCallback((imageUrl: string) => {
    const startTime = performance.now()
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      updateMetric('imageLoadTime', duration, 'image')

      logger.info('Image load measured:', {
        url: imageUrl,
        duration,
        timestamp: new Date().toISOString()
      })
    }
  }, [updateMetric])

  // Cache statistics update
  const updateCacheStats = useCallback((hits: number, misses: number) => {
    cacheStatsRef.current.hits += hits
    cacheStatsRef.current.misses += misses

    const total = cacheStatsRef.current.hits + cacheStatsRef.current.misses
    const hitRate = total > 0 ? cacheStatsRef.current.hits / total : 0

    updateMetric('cacheHitRate', hitRate)
  }, [updateMetric])

  // Performance Observer setup
  const setupPerformanceObserver = useCallback(() => {
    if (!('PerformanceObserver' in window)) return

    performanceObserverRef.current = new PerformanceObserver((list) => {
      const entries = list.getEntries()

      entries.forEach((entry) => {
        if (entry.entryType === 'measure') {
          // Custom measurements
          if (entry.name.includes('timeline-render')) {
            updateMetric('timelineRenderTime', entry.duration, 'timeline')
          } else if (entry.name.includes('search-response')) {
            updateMetric('searchResponseTime', entry.duration, 'search')
          }
        } else if (entry.entryType === 'resource' && entry.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          // Image resources
          updateMetric('imageLoadTime', entry.duration, 'image')
        }
      })
    })

    try {
      performanceObserverRef.current.observe({
        entryTypes: ['measure', 'resource', 'navigation']
      })
    } catch (error) {
      logger.error('Failed to setup PerformanceObserver:', error)
    }
  }, [updateMetric])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return

    setIsMonitoring(true)
    logger.info('Performance monitoring started')

    if (enableRealTimeMonitoring) {
      setupPerformanceObserver()
      measureFPS()

      // Setup memory monitoring interval
      const memoryInterval = setInterval(measureMemory, 5000) // Every 5 seconds

      // Cleanup function stored in ref
      const cleanup = () => {
        clearInterval(memoryInterval)
        if (performanceObserverRef.current) {
          performanceObserverRef.current.disconnect()
        }
      }

      // Store cleanup function
      ;(window as PerformanceMonitoringWindow).__performanceMonitoringCleanup = cleanup
    }

    trackCustomDashboardEvent('performance_monitoring_started', {
      enableRealTimeMonitoring,
      enableAlerts,
      enableAutoOptimization
    })
  }, [isMonitoring, enableRealTimeMonitoring, setupPerformanceObserver, measureFPS, measureMemory, enableAlerts, enableAutoOptimization])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return

    setIsMonitoring(false)
    logger.info('Performance monitoring stopped')

    // Execute cleanup
    const cleanup = (window as PerformanceMonitoringWindow).__performanceMonitoringCleanup
    if (cleanup) {
      cleanup()
      delete (window as PerformanceMonitoringWindow).__performanceMonitoringCleanup
    }

    trackCustomDashboardEvent('performance_monitoring_stopped', {})
  }, [isMonitoring])

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([])
    logger.info('Performance alerts cleared')
  }, [])

  // Calculate performance score
  const performanceScore = useCallback(() => {
    const metrics = metricsRef.current
    const weights = {
      timelineRenderTime: 0.3,
      searchResponseTime: 0.2,
      imageLoadTime: 0.2,
      fps: 0.15,
      memoryUsage: 0.1,
      cacheHitRate: 0.05
    }

    let score = 100
    const thresholds = thresholdsRef.current

    // Deduct points based on threshold exceedance
    if (metrics.timelineRenderTime > thresholds.timelineRenderTime) {
      const penalty = Math.min(30, (metrics.timelineRenderTime / thresholds.timelineRenderTime - 1) * 20)
      score -= penalty * weights.timelineRenderTime
    }

    if (metrics.searchResponseTime > thresholds.searchResponseTime) {
      const penalty = Math.min(30, (metrics.searchResponseTime / thresholds.searchResponseTime - 1) * 20)
      score -= penalty * weights.searchResponseTime
    }

    if (metrics.imageLoadTime > thresholds.imageLoadTime) {
      const penalty = Math.min(30, (metrics.imageLoadTime / thresholds.imageLoadTime - 1) * 20)
      score -= penalty * weights.imageLoadTime
    }

    if (metrics.fps < thresholds.fps) {
      const penalty = Math.min(30, (1 - metrics.fps / thresholds.fps) * 30)
      score -= penalty * weights.fps
    }

    if (metrics.memoryUsage > thresholds.memoryUsage) {
      const penalty = Math.min(30, (metrics.memoryUsage / thresholds.memoryUsage - 1) * 25)
      score -= penalty * weights.memoryUsage
    }

    if (metrics.cacheHitRate < thresholds.cacheHitRate) {
      const penalty = Math.min(30, (1 - metrics.cacheHitRate / thresholds.cacheHitRate) * 20)
      score -= penalty * weights.cacheHitRate
    }

    return Math.max(0, Math.round(score))
  }, [])

  // Generate recommendations
  const recommendations = useCallback(() => {
    const metrics = metricsRef.current
    const thresholds = thresholdsRef.current
    const recs: string[] = []

    if (metrics.timelineRenderTime > thresholds.timelineRenderTime) {
      recs.push('Consider implementing virtual scrolling or reducing item complexity')
    }

    if (metrics.searchResponseTime > thresholds.searchResponseTime) {
      recs.push('Implement debounced search or client-side filtering for better responsiveness')
    }

    if (metrics.imageLoadTime > thresholds.imageLoadTime) {
      recs.push('Optimize images with WebP format, lazy loading, or progressive enhancement')
    }

    if (metrics.fps < thresholds.fps) {
      recs.push('Reduce DOM operations and use CSS transforms for animations')
    }

    if (metrics.memoryUsage > thresholds.memoryUsage) {
      recs.push('Check for memory leaks and implement proper cleanup in components')
    }

    if (metrics.cacheHitRate < thresholds.cacheHitRate) {
      recs.push('Improve caching strategy or increase cache expiration times')
    }

    return recs
  }, [])

  // Get performance report
  const getPerformanceReport = useCallback((): PerformanceReport => {
    return {
      timestamp: new Date().toISOString(),
      metrics: { ...metricsRef.current },
      thresholds: { ...thresholdsRef.current },
      alerts: alerts.length,
      score: performanceScore(),
      recommendations: recommendations(),
      cacheStats: { ...cacheStatsRef.current }
    }
  }, [alerts.length, performanceScore, recommendations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isMonitoring) {
        stopMonitoring()
      }
    }
  }, [isMonitoring, stopMonitoring])

  // Auto-start monitoring if enabled
  useEffect(() => {
    if (enableRealTimeMonitoring && !isMonitoring) {
      startMonitoring()
    }
  }, [enableRealTimeMonitoring, isMonitoring, startMonitoring])

  return {
    isMonitoring,
    currentMetrics,
    alerts,
    performanceScore: performanceScore(),
    recommendations: recommendations(),
    startMonitoring,
    stopMonitoring,
    clearAlerts,
    measureTimelineRender,
    measureSearchResponse,
    measureImageLoad,
    updateCacheStats,
    getPerformanceReport
  }
}

// Helper functions
function generateAlertMessage(
  type: PerformanceAlert['type'],
  metric: string,
  value: number,
  threshold: number
): string {
  const formatValue = (val: number, metricType: string) => {
    if (metricType.includes('Time')) {
      return `${Math.round(val)}ms`
    } else if (metricType === 'memoryUsage') {
      return `${Math.round(val / 1024 / 1024)}MB`
    } else if (metricType === 'cacheHitRate') {
      return `${Math.round(val * 100)}%`
    } else {
      return `${Math.round(val)}`
    }
  }

  const valueStr = formatValue(value, metric)
  const thresholdStr = formatValue(threshold, metric)

  const messages = {
    error: `Critical performance issue: ${metric} is ${valueStr} (threshold: ${thresholdStr})`,
    warning: `Performance degradation: ${metric} is ${valueStr} (threshold: ${thresholdStr})`,
    info: `Performance notice: ${metric} is ${valueStr} (threshold: ${thresholdStr})`
  }

  return messages[type]
}

function generateOptimizationSuggestion(metric: string, _value: number, _threshold: number): string {
  const suggestions = {
    timelineRenderTime: 'Consider using React.memo, useMemo, or virtual scrolling to improve render performance',
    searchResponseTime: 'Implement debounced search or move filtering to a Web Worker',
    imageLoadTime: 'Use WebP format, implement progressive loading, or reduce image dimensions',
    memoryUsage: 'Check for memory leaks, unused listeners, or large cached data',
    fps: 'Reduce DOM manipulations and use CSS transforms for better animation performance',
    cacheHitRate: 'Review caching strategy and consider increasing cache retention time'
  }

  return suggestions[metric as keyof typeof suggestions] || 'Review performance bottlenecks in this area'
}
