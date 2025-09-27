import { createClient } from './supabase/client'
import { createLogger } from '@/lib/logger'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

const logger = createLogger('GroupCache')

type UnknownRecord = Record<string, unknown>

interface CacheEntry<T> {
  data: T
  expiry: number
}

/**
 * Group cache management for high-performance group operations
 */
export class GroupCacheManager {
  private static cache = new Map<string, CacheEntry<unknown>>()
  private static readonly CACHE_DURATION = {
    GROUP_LIST: 5 * 60 * 1000, // 5 minutes
    GROUP_MEMBERS: 2 * 60 * 1000, // 2 minutes
    RECIPIENT_GROUPS: 3 * 60 * 1000, // 3 minutes
    GROUP_SETTINGS: 10 * 60 * 1000, // 10 minutes
  }

  /**
   * Get cached data or fetch if expired
   */
  private static async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    duration: number
  ): Promise<T> {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined
    const now = Date.now()

    if (cached && now < cached.expiry) {
      return cached.data
    }

    try {
      const data = await fetcher()
      this.cache.set(key, { data, expiry: now + duration })
      return data
    } catch (error) {
      // Return stale data if available during error
      if (cached) {
        logger.warn(`Using stale cache for ${key} due to error:`, error)
        return cached.data
      }
      throw error
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  private static invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    })
  }

  /**
   * Cache user's groups with member counts
   */
  static async getUserGroups(userId: string): Promise<UnknownRecord[]> {
    return this.getCached(
      `user:${userId}:groups`,
      async () => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('recipient_groups')
          .select(`
            *,
            group_memberships!inner(count)
          `)
          .eq('parent_id', userId)
          .order('is_default_group', { ascending: false })
          .order('name')

        if (error) throw error
        return data || []
      },
      this.CACHE_DURATION.GROUP_LIST
    )
  }

  /**
   * Cache group members with their settings
   */
  static async getGroupMembers(groupId: string, _userId: string): Promise<UnknownRecord[]> {
    return this.getCached(
      `group:${groupId}:members`,
      async () => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('group_memberships')
          .select(`
            *,
            recipients!inner(
              id,
              name,
              email,
              phone,
              relationship
            )
          `)
          .eq('group_id', groupId)
          .eq('is_active', true)
          .order('joined_at')

        if (error) throw error
        return data || []
      },
      this.CACHE_DURATION.GROUP_MEMBERS
    )
  }

  /**
   * Cache recipient's group memberships (for token access)
   */
  static async getRecipientGroups(recipientId: string): Promise<UnknownRecord[]> {
    return this.getCached(
      `recipient:${recipientId}:groups`,
      async () => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('group_memberships')
          .select(`
            *,
            recipient_groups!inner(
              id,
              name,
              default_frequency,
              default_channels,
              notification_settings
            )
          `)
          .eq('recipient_id', recipientId)
          .eq('is_active', true)

        if (error) throw error
        return data || []
      },
      this.CACHE_DURATION.RECIPIENT_GROUPS
    )
  }

  /**
   * Cache group settings and notification preferences
   */
  static async getGroupSettings(groupId: string): Promise<UnknownRecord | null> {
    return this.getCached(
      `group:${groupId}:settings`,
      async () => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('recipient_groups')
          .select('*')
          .eq('id', groupId)
          .single()

        if (error) throw error
        return data
      },
      this.CACHE_DURATION.GROUP_SETTINGS
    )
  }

  /**
   * Invalidate user-related caches after group operations
   */
  static invalidateUserCache(userId: string): void {
    this.invalidatePattern(`user:${userId}`)
  }

  /**
   * Invalidate group-related caches after membership changes
   */
  static invalidateGroupCache(groupId: string): void {
    this.invalidatePattern(`group:${groupId}`)
  }

  /**
   * Invalidate recipient caches after settings changes
   */
  static invalidateRecipientCache(recipientId: string): void {
    this.invalidatePattern(`recipient:${recipientId}`)
  }

  /**
   * Clear all caches (useful for testing or memory management)
   */
  static clearAll(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  static getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

/**
 * Performance monitoring for group operations
 */
export class GroupPerformanceMonitor {
  private static metrics = new Map<string, { count: number; totalTime: number; maxTime: number }>()

  static async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()

    try {
      const result = await fn()
      const duration = performance.now() - start

      this.recordMetric(operation, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordMetric(`${operation}_error`, duration)
      throw error
    }
  }

  private static recordMetric(operation: string, duration: number): void {
    const current = this.metrics.get(operation) || { count: 0, totalTime: 0, maxTime: 0 }

    this.metrics.set(operation, {
      count: current.count + 1,
      totalTime: current.totalTime + duration,
      maxTime: Math.max(current.maxTime, duration)
    })
  }

  static getMetrics(): Record<string, { count: number; avgTime: number; maxTime: number }> {
    const result: Record<string, { count: number; avgTime: number; maxTime: number }> = {}

    for (const [operation, metric] of this.metrics.entries()) {
      result[operation] = {
        count: metric.count,
        avgTime: metric.totalTime / metric.count,
        maxTime: metric.maxTime
      }
    }

    return result
  }

  static reset(): void {
    this.metrics.clear()
  }
}

/**
 * Database query optimization helpers
 */
export class GroupQueryOptimizer {
  /**
   * Batch load groups for multiple users
   */
  static async batchLoadUserGroups(userIds: string[]): Promise<Map<string, UnknownRecord[]>> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('recipient_groups')
      .select(`
        *,
        group_memberships!inner(count)
      `)
      .in('parent_id', userIds)
      .order('parent_id')
      .order('is_default_group', { ascending: false })

    if (error) throw error

    // Group results by user ID
    const result = new Map<string, UnknownRecord[]>()
    userIds.forEach(userId => result.set(userId, []))

    data?.forEach(group => {
      const userId = group.parent_id
      const userGroups = result.get(userId) || []
      userGroups.push(group)
      result.set(userId, userGroups)
    })

    return result
  }

  /**
   * Efficient bulk membership operations
   */
  static async bulkUpdateMemberships(
    operations: Array<{
      type: 'insert' | 'update' | 'delete'
      recipient_id: string
      group_id: string
      settings?: UnknownRecord
    }>
  ): Promise<void> {
    const supabase = createClient()

    // Group operations by type for efficiency
    const inserts = operations.filter(op => op.type === 'insert')
    const updates = operations.filter(op => op.type === 'update')
    const deletes = operations.filter(op => op.type === 'delete')

    // Execute operations in parallel where possible
    const promises: Promise<unknown>[] = []

    if (inserts.length > 0) {
      promises.push(
        supabase
          .from('group_memberships')
          .upsert(inserts.map(op => ({
            recipient_id: op.recipient_id,
            group_id: op.group_id,
            ...op.settings
          })))
      )
    }

    if (updates.length > 0) {
      // Updates need to be done individually due to different settings
      updates.forEach(op => {
        promises.push(
          supabase
            .from('group_memberships')
            .update(op.settings)
            .eq('recipient_id', op.recipient_id)
            .eq('group_id', op.group_id)
        )
      })
    }

    if (deletes.length > 0) {
      promises.push(
        supabase
          .from('group_memberships')
          .update({ is_active: false })
          .in('recipient_id', deletes.map(op => op.recipient_id))
          .in('group_id', deletes.map(op => op.group_id))
      )
    }

    await Promise.all(promises)
  }

  /**
   * Get aggregated group statistics efficiently
   */
  static async getGroupStatistics(userId: string): Promise<{
    total_groups: number
    total_members: number
    avg_group_size: number
    largest_group_size: number
    most_active_group: string | null
  }> {
    const supabase = createClient()

    const { data, error } = await supabase
      .rpc('get_user_group_statistics', { user_id: userId })

    if (error) throw error

    return data || {
      total_groups: 0,
      total_members: 0,
      avg_group_size: 0,
      largest_group_size: 0,
      most_active_group: null
    }
  }
}

/**
 * Real-time subscription management for group updates
 */
export class GroupRealtimeManager {
  private static subscriptions = new Map<string, RealtimeChannel>()

  static subscribeToUserGroups(
    userId: string,
    callback: (payload: RealtimePostgresChangesPayload<UnknownRecord>) => void
  ): () => void {
    const supabase = createClient()

    const subscription = supabase
      .channel(`user_groups_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipient_groups',
          filter: `parent_id=eq.${userId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_memberships'
        },
        callback
      )
      .subscribe()

    const key = `user_groups_${userId}`
    this.subscriptions.set(key, subscription)

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe()
      this.subscriptions.delete(key)
    }
  }

  static subscribeToGroupMembers(
    groupId: string,
    callback: (payload: RealtimePostgresChangesPayload<UnknownRecord>) => void
  ): () => void {
    const supabase = createClient()

    const subscription = supabase
      .channel(`group_members_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_memberships',
          filter: `group_id=eq.${groupId}`
        },
        callback
      )
      .subscribe()

    const key = `group_members_${groupId}`
    this.subscriptions.set(key, subscription)

    return () => {
      subscription.unsubscribe()
      this.subscriptions.delete(key)
    }
  }

  static unsubscribeAll(): void {
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe()
    }
    this.subscriptions.clear()
  }
}
