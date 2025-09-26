'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('DashboardFeatureFlags')

export interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled: boolean
  rolloutPercentage: number
  enabledForUsers?: string[]
  disabledForUsers?: string[]
  enabledForGroups?: string[]
  conditions?: FeatureFlagCondition[]
  variants?: FeatureFlagVariant[]
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
}

type FeatureFlagConditionValue = string | number | boolean | Array<string | number> | null

export interface FeatureFlagCondition {
  type: 'user_property' | 'device' | 'location' | 'time' | 'custom'
  property: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: FeatureFlagConditionValue
  negated?: boolean
}

export interface FeatureFlagVariant {
  id: string
  name: string
  weight: number
  payload?: unknown
}

export interface ExperimentConfig {
  id: string
  name: string
  description: string
  flagId: string
  trafficSplitRatio: number
  targetMetrics: string[]
  startDate: Date
  endDate?: Date
  status: 'draft' | 'running' | 'paused' | 'completed'
  segments?: UserSegment[]
}

export interface UserSegment {
  id: string
  name: string
  conditions: FeatureFlagCondition[]
  percentage: number
}

export interface FeatureFlagEvaluation {
  flagId: string
  enabled: boolean
  variant?: FeatureFlagVariant
  reason: string
  metadata?: Record<string, unknown>
  evaluationTime: number
}

export interface UserContext {
  userId?: string
  email?: string
  properties: Record<string, unknown>
  device: {
    type: 'mobile' | 'tablet' | 'desktop'
    os: string
    browser: string
  }
  location?: {
    country: string
    region: string
    city: string
  }
  timestamp: Date
}

interface FeatureFlagStats {
  totalFlags: number
  enabledFlags: number
  totalEvaluations: number
  flagUsage: Map<string, number>
}

type StoredFeatureFlag = Omit<FeatureFlag, 'createdAt' | 'updatedAt' | 'expiresAt'> & {
  createdAt: string
  updatedAt: string
  expiresAt?: string
}

type StoredExperimentConfig = Omit<ExperimentConfig, 'startDate' | 'endDate'> & {
  startDate: string
  endDate?: string
}

class DashboardFeatureFlags {
  private flags: Map<string, FeatureFlag> = new Map()
  private experiments: Map<string, ExperimentConfig> = new Map()
  private evaluationCache: Map<string, FeatureFlagEvaluation> = new Map()
  private userContext?: UserContext
  private analyticsCallback?: (event: string, data: Record<string, unknown>) => void

  private readonly STORAGE_KEY = 'dashboard_feature_flags'
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.loadFromStorage()
    this.initializeDefaultFlags()
    this.setupContextDetection()
  }

  private initializeDefaultFlags() {
    // Dashboard Phase 3 feature flags
    const defaultFlags: FeatureFlag[] = [
      {
        id: 'advanced_filters',
        name: 'Advanced Filtering System',
        description: 'Enable advanced filtering with presets and bulk actions',
        enabled: true,
        rolloutPercentage: 100,
        metadata: { phase: 3, category: 'filtering' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'enhanced_split_button',
        name: 'Enhanced Split Button',
        description: 'Split button with analytics and usage tracking',
        enabled: true,
        rolloutPercentage: 100,
        metadata: { phase: 3, category: 'ui' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'performance_monitoring',
        name: 'Real-time Performance Monitoring',
        description: 'Monitor timeline rendering and user interactions',
        enabled: true,
        rolloutPercentage: 80,
        conditions: [{
          type: 'device',
          property: 'type',
          operator: 'not_equals',
          value: 'mobile'
        }],
        metadata: { phase: 3, category: 'performance' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'progressive_images',
        name: 'Progressive Image Loading',
        description: 'Enable blur-up and optimized image loading',
        enabled: true,
        rolloutPercentage: 100,
        metadata: { phase: 3, category: 'performance' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'advanced_caching',
        name: 'Advanced Caching System',
        description: 'Intelligent caching with compression and preloading',
        enabled: true,
        rolloutPercentage: 90,
        metadata: { phase: 3, category: 'performance' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'offline_timeline',
        name: 'Offline Timeline Viewing',
        description: 'Allow timeline viewing when offline using service workers',
        enabled: false,
        rolloutPercentage: 20,
        enabledForUsers: [], // Will be populated with beta users
        metadata: { phase: 3, category: 'offline', experimental: true },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'voice_control',
        name: 'Voice Control Integration',
        description: 'Enable hands-free navigation and interaction',
        enabled: false,
        rolloutPercentage: 5,
        conditions: [{
          type: 'device',
          property: 'type',
          operator: 'equals',
          value: 'desktop'
        }],
        metadata: { phase: 3, category: 'accessibility', experimental: true },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'ab_test_timeline_layout',
        name: 'A/B Test: Timeline Layout',
        description: 'Test different timeline layouts for engagement',
        enabled: true,
        rolloutPercentage: 50,
        variants: [
          { id: 'control', name: 'Current Layout', weight: 50 },
          { id: 'compact', name: 'Compact Layout', weight: 50 }
        ],
        metadata: { phase: 3, category: 'experiment' },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      {
        id: 'bulk_actions_v2',
        name: 'Bulk Actions V2',
        description: 'Enhanced bulk actions with better UX',
        enabled: false,
        rolloutPercentage: 25,
        conditions: [{
          type: 'user_property',
          property: 'accountAge',
          operator: 'greater_than',
          value: 30
        }],
        metadata: { phase: 3, category: 'productivity' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'smart_preloading',
        name: 'Smart Content Preloading',
        description: 'AI-powered content preloading based on user behavior',
        enabled: false,
        rolloutPercentage: 10,
        metadata: { phase: 3, category: 'ai', experimental: true },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    // Initialize default flags
    defaultFlags.forEach(flag => {
      if (!this.flags.has(flag.id)) {
        this.flags.set(flag.id, flag)
      }
    })

    this.saveToStorage()
  }

  private setupContextDetection() {
    if (typeof window === 'undefined') return

    const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
      const width = window.innerWidth
      if (width < 768) return 'mobile'
      if (width < 1024) return 'tablet'
      return 'desktop'
    }

    const getOS = (): string => {
      const ua = navigator.userAgent
      if (ua.includes('Mac OS X')) return 'macOS'
      if (ua.includes('Windows')) return 'Windows'
      if (ua.includes('Linux')) return 'Linux'
      if (ua.includes('Android')) return 'Android'
      if (ua.includes('iOS')) return 'iOS'
      return 'Unknown'
    }

    const getBrowser = (): string => {
      const ua = navigator.userAgent
      if (ua.includes('Chrome')) return 'Chrome'
      if (ua.includes('Firefox')) return 'Firefox'
      if (ua.includes('Safari')) return 'Safari'
      if (ua.includes('Edge')) return 'Edge'
      return 'Unknown'
    }

    this.userContext = {
      properties: {},
      device: {
        type: getDeviceType(),
        os: getOS(),
        browser: getBrowser()
      },
      timestamp: new Date()
    }

    // Update device type on resize
    window.addEventListener('resize', () => {
      if (this.userContext) {
        this.userContext.device.type = getDeviceType()
      }
    })
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const { flags, experiments } = JSON.parse(stored) as {
          flags?: Record<string, StoredFeatureFlag>
          experiments?: Record<string, StoredExperimentConfig>
        }

        if (flags) {
          Object.entries(flags).forEach(([id, flag]) => {
            this.flags.set(id, {
              ...flag,
              createdAt: new Date(flag.createdAt),
              updatedAt: new Date(flag.updatedAt),
              expiresAt: flag.expiresAt ? new Date(flag.expiresAt) : undefined
            })
          })
        }

        if (experiments) {
          Object.entries(experiments).forEach(([id, experiment]) => {
            this.experiments.set(id, {
              ...experiment,
              startDate: new Date(experiment.startDate),
              endDate: experiment.endDate ? new Date(experiment.endDate) : undefined
            })
          })
        }
      }
    } catch (error) {
      logger.error('Failed to load feature flags from storage:', error)
    }
  }

  private saveToStorage() {
    try {
      const data = {
        flags: Object.fromEntries(this.flags),
        experiments: Object.fromEntries(this.experiments),
        timestamp: Date.now()
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      logger.error('Failed to save feature flags to storage:', error)
    }
  }

  public setUserContext(context: Partial<UserContext>) {
    this.userContext = {
      ...this.userContext,
      ...context,
      timestamp: new Date()
    } as UserContext

    // Clear evaluation cache when context changes
    this.evaluationCache.clear()

    logger.info('User context updated:', this.userContext)
  }

  public setAnalyticsCallback(callback: (event: string, data: Record<string, unknown>) => void) {
    this.analyticsCallback = callback
  }

  private trackFlagEvaluation(flagId: string, evaluation: FeatureFlagEvaluation) {
    if (this.analyticsCallback) {
      this.analyticsCallback('feature_flag_evaluated', {
        flagId,
        enabled: evaluation.enabled,
        variant: evaluation.variant?.id,
        reason: evaluation.reason,
        userId: this.userContext?.userId,
        device: this.userContext?.device
      })
    }
  }

  private evaluateCondition(condition: FeatureFlagCondition): boolean {
    if (!this.userContext) return false

    let value: unknown
    switch (condition.type) {
      case 'user_property':
        value = this.userContext.properties[condition.property]
        break
      case 'device':
        value = this.userContext.device[condition.property as keyof typeof this.userContext.device]
        break
      case 'location':
        value = this.userContext.location?.[condition.property as keyof NonNullable<typeof this.userContext.location>]
        break
      case 'time':
        value = new Date()
        break
      default:
        return false
    }

    let result = false
    switch (condition.operator) {
      case 'equals':
        result = value === condition.value
        break
      case 'not_equals':
        result = value !== condition.value
        break
      case 'contains':
        result = typeof value === 'string' && typeof condition.value === 'string' && value.includes(condition.value)
        break
      case 'not_contains':
        result = typeof value === 'string' && typeof condition.value === 'string' && !value.includes(condition.value)
        break
      case 'greater_than':
        result = typeof value === 'number' && typeof condition.value === 'number' && value > condition.value
        break
      case 'less_than':
        result = typeof value === 'number' && typeof condition.value === 'number' && value < condition.value
        break
      case 'in':
        if (Array.isArray(condition.value) && (typeof value === 'string' || typeof value === 'number')) {
          result = condition.value.includes(value)
        }
        break
      case 'not_in':
        if (Array.isArray(condition.value) && (typeof value === 'string' || typeof value === 'number')) {
          result = !condition.value.includes(value)
        }
        break
    }

    return condition.negated ? !result : result
  }

  private selectVariant(variants: FeatureFlagVariant[]): FeatureFlagVariant | undefined {
    if (!variants.length) return undefined

    // Use user ID for consistent variant selection
    const userId = this.userContext?.userId || 'anonymous'
    const hash = this.hashString(userId)
    const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0)
    const normalizedHash = (hash % 10000) / 10000
    const threshold = normalizedHash * totalWeight

    let currentWeight = 0
    for (const variant of variants) {
      currentWeight += variant.weight
      if (threshold <= currentWeight) {
        return variant
      }
    }

    return variants[0] // Fallback
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  public isEnabled(flagId: string): boolean {
    return this.evaluate(flagId).enabled
  }

  public getVariant(flagId: string): FeatureFlagVariant | undefined {
    return this.evaluate(flagId).variant
  }

  public evaluate(flagId: string): FeatureFlagEvaluation {
    // Check cache first
    const cacheKey = `${flagId}_${this.userContext?.userId || 'anonymous'}`
    const cached = this.evaluationCache.get(cacheKey)
    if (cached && Date.now() - cached.evaluationTime < this.CACHE_TTL) {
      return cached
    }

    const flag = this.flags.get(flagId)
    if (!flag) {
      const evaluation: FeatureFlagEvaluation = {
        flagId,
        enabled: false,
        reason: 'Flag not found',
        evaluationTime: Date.now()
      }
      this.evaluationCache.set(cacheKey, evaluation)
      return evaluation
    }

    const evaluation: FeatureFlagEvaluation = {
      flagId,
      enabled: false,
      reason: 'Default disabled',
      evaluationTime: Date.now()
    }

    // Check if flag is expired
    if (flag.expiresAt && new Date() > flag.expiresAt) {
      evaluation.reason = 'Flag expired'
      this.evaluationCache.set(cacheKey, evaluation)
      this.trackFlagEvaluation(flagId, evaluation)
      return evaluation
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      evaluation.reason = 'Flag disabled'
      this.evaluationCache.set(cacheKey, evaluation)
      this.trackFlagEvaluation(flagId, evaluation)
      return evaluation
    }

    const userId = this.userContext?.userId

    // Check explicit user inclusion/exclusion
    if (userId) {
      if (flag.disabledForUsers?.includes(userId)) {
        evaluation.reason = 'User explicitly disabled'
        this.evaluationCache.set(cacheKey, evaluation)
        this.trackFlagEvaluation(flagId, evaluation)
        return evaluation
      }

      if (flag.enabledForUsers?.includes(userId)) {
        evaluation.enabled = true
        evaluation.reason = 'User explicitly enabled'
        if (flag.variants) {
          evaluation.variant = this.selectVariant(flag.variants)
        }
        this.evaluationCache.set(cacheKey, evaluation)
        this.trackFlagEvaluation(flagId, evaluation)
        return evaluation
      }
    }

    // Check conditions
    if (flag.conditions && flag.conditions.length > 0) {
      const conditionsMet = flag.conditions.every(condition => this.evaluateCondition(condition))
      if (!conditionsMet) {
        evaluation.reason = 'Conditions not met'
        this.evaluationCache.set(cacheKey, evaluation)
        this.trackFlagEvaluation(flagId, evaluation)
        return evaluation
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const userIdForRollout = userId || 'anonymous'
      const hash = this.hashString(`${flagId}_${userIdForRollout}`)
      const rolloutThreshold = (hash % 10000) / 100

      if (rolloutThreshold >= flag.rolloutPercentage) {
        evaluation.reason = 'Not in rollout percentage'
        this.evaluationCache.set(cacheKey, evaluation)
        this.trackFlagEvaluation(flagId, evaluation)
        return evaluation
      }
    }

    // Flag is enabled
    evaluation.enabled = true
    evaluation.reason = 'All conditions passed'

    // Select variant if available
    if (flag.variants) {
      evaluation.variant = this.selectVariant(flag.variants)
    }

    evaluation.metadata = flag.metadata

    this.evaluationCache.set(cacheKey, evaluation)
    this.trackFlagEvaluation(flagId, evaluation)
    return evaluation
  }

  public getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values())
  }

  public updateFlag(flagId: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(flagId)
    if (!flag) return false

    const updatedFlag = {
      ...flag,
      ...updates,
      updatedAt: new Date()
    }

    this.flags.set(flagId, updatedFlag)
    this.evaluationCache.clear() // Clear cache when flags change
    this.saveToStorage()

    logger.info('Feature flag updated:', { flagId, updates })
    return true
  }

  public createExperiment(experiment: ExperimentConfig): boolean {
    if (this.experiments.has(experiment.id)) {
      return false
    }

    this.experiments.set(experiment.id, experiment)
    this.saveToStorage()

    logger.info('Experiment created:', experiment)
    return true
  }

  public getActiveExperiments(): ExperimentConfig[] {
    const now = new Date()
    return Array.from(this.experiments.values()).filter(experiment =>
      experiment.status === 'running' &&
      experiment.startDate <= now &&
      (!experiment.endDate || experiment.endDate > now)
    )
  }

  public getEvaluationStats(): FeatureFlagStats {
    const stats: FeatureFlagStats = {
      totalFlags: this.flags.size,
      enabledFlags: 0,
      totalEvaluations: this.evaluationCache.size,
      flagUsage: new Map<string, number>()
    }

    // Count enabled flags
    this.flags.forEach(flag => {
      if (flag.enabled) {
        stats.enabledFlags++
      }
    })

    // Count flag usage from cache
    this.evaluationCache.forEach((evaluation, key) => {
      const flagId = evaluation.flagId
      stats.flagUsage.set(flagId, (stats.flagUsage.get(flagId) || 0) + 1)
    })

    return stats
  }

  public clearCache(): void {
    this.evaluationCache.clear()
    logger.info('Feature flag evaluation cache cleared')
  }

  public destroy(): void {
    this.saveToStorage()
    this.evaluationCache.clear()
    this.flags.clear()
    this.experiments.clear()
  }
}

// Global feature flags instance
let featureFlagsInstance: DashboardFeatureFlags | null = null

export function initializeDashboardFeatureFlags(): DashboardFeatureFlags {
  if (!featureFlagsInstance) {
    featureFlagsInstance = new DashboardFeatureFlags()
  }
  return featureFlagsInstance
}

export function getDashboardFeatureFlags(): DashboardFeatureFlags | null {
  return featureFlagsInstance
}

// Convenience functions
export function isFeatureEnabled(flagId: string): boolean {
  return featureFlagsInstance?.isEnabled(flagId) || false
}

export function getFeatureVariant(flagId: string): FeatureFlagVariant | undefined {
  return featureFlagsInstance?.getVariant(flagId)
}

export function evaluateFeature(flagId: string): FeatureFlagEvaluation | null {
  return featureFlagsInstance?.evaluate(flagId) || null
}

// React hook for feature flags
export function useFeatureFlag(flagId: string): FeatureFlagEvaluation {
  const flags = getDashboardFeatureFlags()

  if (!flags) {
    return {
      flagId,
      enabled: false,
      reason: 'Feature flags not initialized',
      evaluationTime: Date.now()
    }
  }

  return flags.evaluate(flagId)
}
