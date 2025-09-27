'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('DashboardAnalytics')

export interface UserInteraction {
  id: string
  type: InteractionType
  element: string
  elementId?: string
  timestamp: Date
  userId?: string
  sessionId: string
  metadata?: Record<string, unknown>
  duration?: number
  context?: {
    page: string
    section: string
    device: 'mobile' | 'tablet' | 'desktop'
    viewport: { width: number; height: number }
    userAgent: string
  }
}

export type InteractionType =
  | 'click'
  | 'scroll'
  | 'search'
  | 'filter'
  | 'create_update'
  | 'view_update'
  | 'timeline_navigation'
  | 'preset_usage'
  | 'bulk_action'
  | 'keyboard_shortcut'
  | 'performance_event'

export interface PerformanceMetric {
  id: string
  type: MetricType
  value: number
  timestamp: Date
  context: {
    page: string
    component: string
    device: 'mobile' | 'tablet' | 'desktop'
  }
  metadata?: Record<string, unknown>
}

export type MetricType =
  | 'timeline_render_time'
  | 'search_response_time'
  | 'filter_apply_time'
  | 'image_load_time'
  | 'virtual_scroll_fps'
  | 'memory_usage'
  | 'bundle_load_time'
  | 'api_response_time'
  | 'cache_hit_rate'

export interface UserBehaviorPattern {
  userId: string
  patterns: {
    mostActiveTimeOfDay: { hour: number; count: number }[]
    preferredContentTypes: { type: string; percentage: number }[]
    averageSessionDuration: number
    mostUsedFeatures: { feature: string; count: number }[]
    searchPatterns: { query: string; frequency: number }[]
    navigationFlow: { from: string; to: string; count: number }[]
  }
  lastUpdated: Date
}

export interface DashboardAnalytics {
  interactions: UserInteraction[]
  performanceMetrics: PerformanceMetric[]
  userPatterns: Map<string, UserBehaviorPattern>
  aggregatedStats: {
    totalInteractions: number
    averageSessionDuration: number
    bounceRate: number
    conversionRate: number
    errorRate: number
    performanceScore: number
  }
}

export interface AnalyticsConfiguration {
  enableRealTimeTracking: boolean
  enablePerformanceMonitoring: boolean
  enableUserBehaviorTracking: boolean
  enableHeatmapTracking: boolean
  samplingRate: number
  batchSize: number
  flushInterval: number
  maxStorageSize: number
  enableDebugMode: boolean
}

type StoredUserInteraction = Omit<UserInteraction, 'timestamp'> & { timestamp: string }
type StoredPerformanceMetric = Omit<PerformanceMetric, 'timestamp'> & { timestamp: string }
type StoredUserBehaviorPattern = Omit<UserBehaviorPattern, 'lastUpdated'> & { lastUpdated: string }

class DashboardAnalyticsManager {
  private interactions: UserInteraction[] = []
  private performanceMetrics: PerformanceMetric[] = []
  private userPatterns: Map<string, UserBehaviorPattern> = new Map()
  private sessionId: string
  private userId?: string
  private config: AnalyticsConfiguration
  private flushTimer?: NodeJS.Timeout
  private performanceObserver?: PerformanceObserver
  private mutationObserver?: MutationObserver

  private readonly STORAGE_KEYS = {
    INTERACTIONS: 'dashboard_interactions',
    METRICS: 'dashboard_metrics',
    PATTERNS: 'dashboard_patterns',
    SESSION: 'dashboard_session'
  } as const

  constructor(config: Partial<AnalyticsConfiguration> = {}) {
    this.sessionId = this.generateSessionId()
    this.config = {
      enableRealTimeTracking: true,
      enablePerformanceMonitoring: true,
      enableUserBehaviorTracking: true,
      enableHeatmapTracking: false,
      samplingRate: 1.0,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      maxStorageSize: 10 * 1024 * 1024, // 10MB
      enableDebugMode: process.env.NODE_ENV === 'development',
      ...config
    }

    this.initializeTracking()
    this.loadStoredData()
    this.setupPerformanceMonitoring()
    this.setupAutoFlush()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop'

    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private getCurrentContext() {
    if (typeof window === 'undefined') return null

    return {
      page: window.location.pathname,
      section: this.getCurrentSection(),
      device: this.getDeviceType(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      userAgent: navigator.userAgent
    }
  }

  private getCurrentSection(): string {
    // Extract section from pathname or DOM
    const pathname = window.location.pathname
    if (pathname.includes('/timeline')) return 'timeline'
    if (pathname.includes('/updates')) return 'updates'
    if (pathname.includes('/dashboard')) return 'dashboard'
    return 'unknown'
  }

  private initializeTracking() {
    if (typeof window === 'undefined' || !this.config.enableRealTimeTracking) return

    // Track clicks
    document.addEventListener('click', this.handleClickEvent.bind(this), true)

    // Track scrolls
    let scrollTimeout: NodeJS.Timeout
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        this.trackInteraction({
          type: 'scroll',
          element: 'window',
          metadata: {
            scrollY: window.scrollY,
            scrollPercent: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
          }
        })
      }, 150)
    })

    // Track keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardEvent.bind(this))

    // Track resize events
    window.addEventListener('resize', () => {
      this.trackInteraction({
        type: 'performance_event',
        element: 'window',
        metadata: {
          event: 'resize',
          viewport: { width: window.innerWidth, height: window.innerHeight }
        }
      })
    })
  }

  private handleClickEvent(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target) return

    // Generate element selector
    const elementSelector = this.generateElementSelector(target)
    const elementId = target.id || target.getAttribute('data-analytics-id')

    this.trackInteraction({
      type: 'click',
      element: elementSelector,
      elementId: elementId || undefined,
      metadata: {
        coordinates: { x: event.clientX, y: event.clientY },
        button: event.button,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey
      }
    })
  }

  private handleKeyboardEvent(event: KeyboardEvent) {
    // Only track shortcut combinations
    if (event.metaKey || event.ctrlKey) {
      this.trackInteraction({
        type: 'keyboard_shortcut',
        element: 'keyboard',
        metadata: {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          altKey: event.altKey
        }
      })
    }
  }

  private generateElementSelector(element: HTMLElement): string {
    const path: string[] = []
    let current = element

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase()

      // Add ID if present
      if (current.id) {
        selector += `#${current.id}`
        path.unshift(selector)
        break
      }

      // Add classes
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ')
          .filter(cls => cls.length > 0)
          .slice(0, 2) // Limit to first 2 classes
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`
        }
      }

      // Add nth-child for specificity
      const siblings = Array.from(current.parentElement?.children || [])
        .filter(el => el.tagName === current.tagName)
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-child(${index})`
      }

      path.unshift(selector)
      current = current.parentElement as HTMLElement
    }

    return path.slice(-4).join(' > ') // Limit depth
  }

  private setupPerformanceMonitoring() {
    if (!this.config.enablePerformanceMonitoring || typeof window === 'undefined') return

    // Performance Observer for various metrics
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          const metricEntry = entry as PerformanceEntry & { value?: number }
          this.trackPerformanceMetric({
            type: this.mapPerformanceEntryType(entry.entryType),
            value: metricEntry.duration || metricEntry.value || 0,
            metadata: {
              name: entry.name,
              entryType: entry.entryType,
              startTime: entry.startTime
            }
          })
        })
      })

      try {
        this.performanceObserver.observe({ entryTypes: ['navigation', 'resource', 'measure', 'paint'] })
      } catch (error) {
        logger.warn('Performance observer setup failed:', { error })
      }
    }

    // Memory usage monitoring
    if ('memory' in performance) {
      setInterval(() => {
        const memoryInfo = (performance as Performance & {
          memory?: {
            usedJSHeapSize: number
            totalJSHeapSize: number
            jsHeapSizeLimit: number
          }
        }).memory

        if (!memoryInfo) return

        this.trackPerformanceMetric({
          type: 'memory_usage',
          value: memoryInfo.usedJSHeapSize,
          metadata: {
            totalJSHeapSize: memoryInfo.totalJSHeapSize,
            jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
          }
        })
      }, 60000) // Every minute
    }

    // FPS monitoring for virtual scroll
    let lastFrameTime = 0
    let frameCount = 0
    const measureFPS = () => {
      const now = performance.now()
      frameCount++

      if (now - lastFrameTime >= 1000) {
        this.trackPerformanceMetric({
          type: 'virtual_scroll_fps',
          value: Math.round((frameCount * 1000) / (now - lastFrameTime)),
          metadata: {
            frameCount,
            duration: now - lastFrameTime
          }
        })

        frameCount = 0
        lastFrameTime = now
      }

      requestAnimationFrame(measureFPS)
    }
    requestAnimationFrame(measureFPS)
  }

  private mapPerformanceEntryType(entryType: string): MetricType {
    switch (entryType) {
      case 'navigation':
        return 'bundle_load_time'
      case 'resource':
        return 'image_load_time'
      case 'measure':
        return 'timeline_render_time'
      default:
        return 'api_response_time'
    }
  }

  private setupAutoFlush() {
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flushToStorage()
      }, this.config.flushInterval)
    }

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushToStorage()
      })
    }
  }

  private loadStoredData() {
    try {
      const storedInteractions = localStorage.getItem(this.STORAGE_KEYS.INTERACTIONS)
      if (storedInteractions) {
        const parsedInteractions = JSON.parse(storedInteractions) as StoredUserInteraction[]
        this.interactions = parsedInteractions.map(({ timestamp, ...interaction }) => ({
          ...interaction,
          timestamp: new Date(timestamp)
        }))
      }

      const storedMetrics = localStorage.getItem(this.STORAGE_KEYS.METRICS)
      if (storedMetrics) {
        const parsedMetrics = JSON.parse(storedMetrics) as StoredPerformanceMetric[]
        this.performanceMetrics = parsedMetrics.map(({ timestamp, ...metric }) => ({
          ...metric,
          timestamp: new Date(timestamp)
        }))
      }

      const storedPatterns = localStorage.getItem(this.STORAGE_KEYS.PATTERNS)
      if (storedPatterns) {
        const patterns = JSON.parse(storedPatterns) as Record<string, StoredUserBehaviorPattern>
        Object.entries(patterns).forEach(([userId, pattern]) => {
          this.userPatterns.set(userId, {
            ...pattern,
            lastUpdated: new Date(pattern.lastUpdated)
          })
        })
      }
    } catch (error) {
      logger.error('Error loading stored analytics data:', { error })
    }
  }

  private flushToStorage() {
    try {
      // Check storage size
      const currentSize = this.getCurrentStorageSize()
      if (currentSize > this.config.maxStorageSize) {
        this.cleanupOldData()
      }

      localStorage.setItem(this.STORAGE_KEYS.INTERACTIONS, JSON.stringify(this.interactions))
      localStorage.setItem(this.STORAGE_KEYS.METRICS, JSON.stringify(this.performanceMetrics))

      const patternsObject = Object.fromEntries(this.userPatterns)
      localStorage.setItem(this.STORAGE_KEYS.PATTERNS, JSON.stringify(patternsObject))

      if (this.config.enableDebugMode) {
        logger.info('Analytics data flushed to storage', {
          interactions: this.interactions.length,
          metrics: this.performanceMetrics.length,
          patterns: this.userPatterns.size
        })
      }
    } catch (error) {
      logger.error('Error flushing analytics data:', error as Error | unknown)
    }
  }

  private getCurrentStorageSize(): number {
    try {
      let size = 0
      Object.values(this.STORAGE_KEYS).forEach(key => {
        const data = localStorage.getItem(key)
        if (data) {
          size += new Blob([data]).size
        }
      })
      return size
    } catch {
      return 0
    }
  }

  private cleanupOldData() {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

    this.interactions = this.interactions.filter(i => i.timestamp > cutoffDate)
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoffDate)

    logger.info('Cleaned up old analytics data')
  }

  public trackInteraction(interaction: Omit<UserInteraction, 'id' | 'timestamp' | 'sessionId' | 'context'>) {
    if (Math.random() > this.config.samplingRate) return

    const fullInteraction: UserInteraction = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      context: this.getCurrentContext(),
      ...interaction
    }

    this.interactions.push(fullInteraction)

    if (this.config.enableUserBehaviorTracking && this.userId) {
      this.updateUserPatterns(fullInteraction)
    }

    if (this.config.enableDebugMode) {
      logger.info('Interaction tracked:', fullInteraction)
    }

    // Auto-flush if batch size reached
    if (this.interactions.length >= this.config.batchSize) {
      this.flushToStorage()
    }
  }

  public trackPerformanceMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp' | 'context'>) {
    const fullMetric: PerformanceMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      context: {
        page: this.getCurrentContext()?.page || '',
        component: metric.metadata?.component || 'unknown',
        device: this.getDeviceType()
      },
      ...metric
    }

    this.performanceMetrics.push(fullMetric)

    if (this.config.enableDebugMode) {
      logger.info('Performance metric tracked:', fullMetric)
    }
  }

  public trackCustomEvent(eventName: string, eventData: Record<string, unknown>) {
    this.trackInteraction({
      type: 'performance_event',
      element: 'custom',
      metadata: {
        eventName,
        eventData
      }
    })
  }

  private updateUserPatterns(interaction: UserInteraction) {
    if (!this.userId) return

    const existing = this.userPatterns.get(this.userId)
    const hour = interaction.timestamp.getHours()
    const feature = interaction.element

    const updatedPattern: UserBehaviorPattern = {
      userId: this.userId,
      patterns: {
        mostActiveTimeOfDay: this.updateTimePattern(existing?.patterns.mostActiveTimeOfDay || [], hour),
        preferredContentTypes: existing?.patterns.preferredContentTypes || [],
        averageSessionDuration: existing?.patterns.averageSessionDuration || 0,
        mostUsedFeatures: this.updateFeaturePattern(existing?.patterns.mostUsedFeatures || [], feature),
        searchPatterns: existing?.patterns.searchPatterns || [],
        navigationFlow: existing?.patterns.navigationFlow || []
      },
      lastUpdated: new Date()
    }

    this.userPatterns.set(this.userId, updatedPattern)
  }

  private updateTimePattern(existing: { hour: number; count: number }[], hour: number) {
    const hourData = existing.find(h => h.hour === hour)
    if (hourData) {
      hourData.count++
    } else {
      existing.push({ hour, count: 1 })
    }
    return existing.sort((a, b) => b.count - a.count).slice(0, 24)
  }

  private updateFeaturePattern(existing: { feature: string; count: number }[], feature: string) {
    const featureData = existing.find(f => f.feature === feature)
    if (featureData) {
      featureData.count++
    } else {
      existing.push({ feature, count: 1 })
    }
    return existing.sort((a, b) => b.count - a.count).slice(0, 20)
  }

  public getAnalytics(): DashboardAnalytics {
    return {
      interactions: this.interactions,
      performanceMetrics: this.performanceMetrics,
      userPatterns: this.userPatterns,
      aggregatedStats: this.calculateAggregatedStats()
    }
  }

  private calculateAggregatedStats() {
    const totalInteractions = this.interactions.length

    return {
      totalInteractions,
      averageSessionDuration: this.calculateAverageSessionDuration(),
      bounceRate: this.calculateBounceRate(),
      conversionRate: this.calculateConversionRate(),
      errorRate: this.calculateErrorRate(),
      performanceScore: this.calculatePerformanceScore()
    }
  }

  private calculateAverageSessionDuration(): number {
    const sessionDurations = new Map<string, number>()

    this.interactions.forEach(interaction => {
      const existing = sessionDurations.get(interaction.sessionId) || 0
      sessionDurations.set(interaction.sessionId, Math.max(existing, interaction.timestamp.getTime()))
    })

    const sessionStarts = new Map<string, number>()

    this.interactions.forEach(interaction => {
      if (!sessionStarts.has(interaction.sessionId)) {
        sessionStarts.set(interaction.sessionId, interaction.timestamp.getTime())
      }
    })

    const actualDurations = Array.from(sessionStarts.entries()).map(([sessionId, start]) => {
      const end = sessionDurations.get(sessionId) || start
      return end - start
    })

    return actualDurations.reduce((sum, duration) => sum + duration, 0) / actualDurations.length
  }

  private calculateBounceRate(): number {
    const sessions = new Map<string, number>()
    this.interactions.forEach(interaction => {
      sessions.set(interaction.sessionId, (sessions.get(interaction.sessionId) || 0) + 1)
    })

    const bounceCount = Array.from(sessions.values()).filter(count => count === 1).length
    return sessions.size > 0 ? bounceCount / sessions.size : 0
  }

  private calculateConversionRate(): number {
    const conversions = this.interactions.filter(i =>
      i.type === 'create_update' || i.element.includes('send-update')
    ).length
    return this.interactions.length > 0 ? conversions / this.interactions.length : 0
  }

  private calculateErrorRate(): number {
    const errors = this.performanceMetrics.filter(m =>
      m.metadata?.error || m.value > 10000 // Consider >10s as error
    ).length
    return this.performanceMetrics.length > 0 ? errors / this.performanceMetrics.length : 0
  }

  private calculatePerformanceScore(): number {
    const renderMetrics = this.performanceMetrics.filter(m => m.type === 'timeline_render_time')
    if (renderMetrics.length === 0) return 100

    const avgRenderTime = renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length

    // Score out of 100, where <100ms = 100, >1000ms = 0
    return Math.max(0, Math.min(100, 100 - (avgRenderTime - 100) / 10))
  }

  public setUserId(userId: string) {
    this.userId = userId
  }

  public exportAnalytics(): string {
    return JSON.stringify(this.getAnalytics(), null, 2)
  }

  public destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
    }
    this.flushToStorage()
  }
}

// Global analytics instance
let analyticsInstance: DashboardAnalyticsManager | null = null

export function initializeDashboardAnalytics(config?: Partial<AnalyticsConfiguration>) {
  if (typeof window === 'undefined') return null

  if (!analyticsInstance) {
    analyticsInstance = new DashboardAnalyticsManager(config)
  }
  return analyticsInstance
}

export function getDashboardAnalytics() {
  return analyticsInstance
}

export function trackDashboardInteraction(interaction: Omit<UserInteraction, 'id' | 'timestamp' | 'sessionId' | 'context'>) {
  analyticsInstance?.trackInteraction(interaction)
}

export function trackDashboardPerformance(metric: Omit<PerformanceMetric, 'id' | 'timestamp' | 'context'>) {
  analyticsInstance?.trackPerformanceMetric(metric)
}

export function trackCustomDashboardEvent(eventName: string, eventData: Record<string, unknown>) {
  analyticsInstance?.trackCustomEvent(eventName, eventData)
}

export { DashboardAnalyticsManager }
