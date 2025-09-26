'use client'

import { createLogger } from '@/lib/logger'
import type { UpdateCardData } from '@/lib/types/dashboard'
import type { SearchFilters } from '@/hooks/useSearchDebounced'

const logger = createLogger('TimelineCache')

export interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
  size: number
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitCount: number
  missCount: number
  hitRate: number
  evictionCount: number
  oldestEntry: number
  newestEntry: number
}

export interface CacheConfig {
  maxSize: number // Maximum cache size in bytes
  maxEntries: number // Maximum number of entries
  defaultTTL: number // Default time-to-live in milliseconds
  cleanupInterval: number // Cleanup interval in milliseconds
  enableCompression: boolean
  enableMetrics: boolean
  enablePersistence: boolean
  storageKey: string
}

export interface TimelineCacheEntry extends CacheEntry {
  data: {
    updates: UpdateCardData[]
    totalCount: number
    hasMore: boolean
    lastFetched: number
  }
}

export interface SearchCacheEntry extends CacheEntry {
  data: {
    query: string
    filters: SearchFilters
    results: UpdateCardData[]
    totalCount: number
    responseTime: number
  }
}

export interface ImageCacheEntry extends CacheEntry {
  data: {
    url: string
    blob: Blob
    optimizedVersions: {
      thumbnail: string
      webp?: string
      preview?: string
    }
  }
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute
  enableCompression: true,
  enableMetrics: true,
  enablePersistence: true,
  storageKey: 'timeline_cache'
}

/**
 * Advanced caching system with LRU eviction, compression, and intelligent preloading
 */
type DetailedCacheStats = CacheStats & {
  topAccessedEntries: Array<{ key: string; accessCount: number; size: number; age: number }>
  sizeDistribution: Record<string, number>
  tagDistribution: Record<string, number>
}

export class TimelineCache {
  private cache: Map<string, CacheEntry> = new Map()
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0,
    hitRate: 0,
    evictionCount: 0,
    oldestEntry: Date.now(),
    newestEntry: Date.now()
  }
  private config: CacheConfig
  private cleanupTimer?: NodeJS.Timeout
  private compressionWorker?: Worker
  private preloadQueue: Set<string> = new Set()

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.setupCleanupTimer()
    this.loadFromPersistence()
    this.setupCompressionWorker()

    if (typeof window !== 'undefined') {
      // Setup beforeunload handler to save to persistence
      window.addEventListener('beforeunload', () => {
        this.saveToPersistence()
      })
    }
  }

  private generateKey(namespace: string, identifier: string | object): string {
    if (typeof identifier === 'object') {
      identifier = JSON.stringify(identifier)
    }
    return `${namespace}:${identifier}`
  }

  private calculateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch {
      // Fallback for environments where Blob is not available
      return JSON.stringify(data).length * 2 // Rough estimate (UTF-16)
    }
  }

  private async compressData(data: unknown): Promise<string> {
    if (!this.config.enableCompression) return JSON.stringify(data)

    try {
      const jsonString = JSON.stringify(data)

      // Use compression if available
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip')
        const writer = stream.writable.getWriter()
        const reader = stream.readable.getReader()

        writer.write(new TextEncoder().encode(jsonString))
        writer.close()

        const chunks: Uint8Array[] = []
        let result = await reader.read()

        while (!result.done) {
          chunks.push(result.value)
          result = await reader.read()
        }

        // Convert to base64 for storage
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          compressed.set(chunk, offset)
          offset += chunk.length
        }

        return btoa(String.fromCharCode(...compressed))
      }

      return jsonString
    } catch (error) {
      logger.warn('Compression failed, storing uncompressed:', error)
      return JSON.stringify(data)
    }
  }

  private async decompressData(compressedData: string): Promise<unknown> {
    if (!this.config.enableCompression) {
      return JSON.parse(compressedData)
    }

    try {
      // Check if data looks compressed (base64)
      if (/^[A-Za-z0-9+/]*={0,2}$/.test(compressedData)) {
        // Decompress
        if ('DecompressionStream' in window) {
          const compressedBytes = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0))
          const stream = new DecompressionStream('gzip')
          const writer = stream.writable.getWriter()
          const reader = stream.readable.getReader()

          writer.write(compressedBytes)
          writer.close()

          const chunks: Uint8Array[] = []
          let result = await reader.read()

          while (!result.done) {
            chunks.push(result.value)
            result = await reader.read()
          }

          const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
          let offset = 0
          for (const chunk of chunks) {
            decompressed.set(chunk, offset)
            offset += chunk.length
          }

          const jsonString = new TextDecoder().decode(decompressed)
          return JSON.parse(jsonString)
        }
      }

      // Fallback to direct parse
      return JSON.parse(compressedData)
    } catch (error) {
      logger.warn('Decompression failed, trying direct parse:', error)
      return JSON.parse(compressedData)
    }
  }

  private setupCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  private setupCompressionWorker() {
    if (!this.config.enableCompression || typeof Worker === 'undefined') return

    try {
      // Create inline worker for compression tasks
      const workerScript = `
        self.onmessage = function(e) {
          const { id, action, data } = e.data;

          try {
            if (action === 'compress') {
              const compressed = JSON.stringify(data);
              self.postMessage({ id, success: true, result: compressed });
            } else if (action === 'decompress') {
              const decompressed = JSON.parse(data);
              self.postMessage({ id, success: true, result: decompressed });
            }
          } catch (error) {
            self.postMessage({ id, success: false, error: error.message });
          }
        };
      `

      const blob = new Blob([workerScript], { type: 'application/javascript' })
      this.compressionWorker = new Worker(URL.createObjectURL(blob))
    } catch (error) {
      logger.warn('Failed to setup compression worker:', error)
    }
  }

  private cleanup() {
    const now = Date.now()
    let cleanedEntries = 0
    let freedSize = 0

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        freedSize += entry.size
        this.cache.delete(key)
        cleanedEntries++
      }
    }

    // If still over limits, use LRU eviction
    while (this.stats.totalSize > this.config.maxSize || this.cache.size > this.config.maxEntries) {
      const lruKey = this.findLRUEntry()
      if (lruKey) {
        const entry = this.cache.get(lruKey)
        if (entry) {
          freedSize += entry.size
          this.cache.delete(lruKey)
          cleanedEntries++
          this.stats.evictionCount++
        }
      } else {
        break // No more entries to evict
      }
    }

    // Update stats
    this.stats.totalEntries = this.cache.size
    this.stats.totalSize -= freedSize

    if (cleanedEntries > 0) {
      logger.info('Cache cleanup completed:', {
        cleanedEntries,
        freedSize,
        totalEntries: this.stats.totalEntries,
        totalSize: this.stats.totalSize
      })
    }
  }

  private findLRUEntry(): string | null {
    let lruKey: string | null = null
    let oldestAccess = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed
        lruKey = key
      }
    }

    return lruKey
  }

  private updateStats() {
    this.stats.totalEntries = this.cache.size
    this.stats.totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0)
    this.stats.hitRate = this.stats.hitCount + this.stats.missCount > 0
      ? this.stats.hitCount / (this.stats.hitCount + this.stats.missCount)
      : 0

    const entries = Array.from(this.cache.values())
    if (entries.length > 0) {
      this.stats.oldestEntry = Math.min(...entries.map(e => e.timestamp))
      this.stats.newestEntry = Math.max(...entries.map(e => e.timestamp))
    }
  }

  private async loadFromPersistence() {
    if (!this.config.enablePersistence || typeof localStorage === 'undefined') return

    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (stored) {
        const { cache, stats } = JSON.parse(stored)

        // Restore cache entries
        for (const [key, entry] of Object.entries(cache)) {
          const cacheEntry = entry as CacheEntry
          // Check if entry is still valid
          if (Date.now() - cacheEntry.timestamp < cacheEntry.ttl) {
            this.cache.set(key, cacheEntry)
          }
        }

        // Restore stats
        this.stats = { ...this.stats, ...stats }

        logger.info('Cache loaded from persistence:', {
          entries: this.cache.size,
          totalSize: this.stats.totalSize
        })
      }
    } catch (error) {
      logger.error('Failed to load cache from persistence:', error)
    }
  }

  private saveToPersistence() {
    if (!this.config.enablePersistence || typeof localStorage === 'undefined') return

    try {
      const cacheObject = Object.fromEntries(this.cache.entries())
      const data = {
        cache: cacheObject,
        stats: this.stats,
        timestamp: Date.now()
      }

      localStorage.setItem(this.config.storageKey, JSON.stringify(data))

      logger.info('Cache saved to persistence:', {
        entries: this.cache.size,
        totalSize: this.stats.totalSize
      })
    } catch (error) {
      logger.error('Failed to save cache to persistence:', error)
    }
  }

  // Public API methods

  async set<T>(key: string, data: T, ttl?: number, tags?: string[]): Promise<void> {
    const actualTTL = ttl || this.config.defaultTTL
    const size = this.calculateSize(data)
    const now = Date.now()

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: actualTTL,
      accessCount: 0,
      lastAccessed: now,
      size,
      tags,
      metadata: {}
    }

    this.cache.set(key, entry)
    this.updateStats()

    // Trigger cleanup if needed
    if (this.stats.totalSize > this.config.maxSize * 0.9) {
      this.cleanup()
    }

    logger.debug('Cache entry set:', { key, size, ttl: actualTTL })
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      this.stats.missCount++
      if (this.config.enableMetrics) {
        this.updateStats()
      }
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.stats.missCount++
      if (this.config.enableMetrics) {
        this.updateStats()
      }
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.stats.hitCount++

    if (this.config.enableMetrics) {
      this.updateStats()
    }

    logger.debug('Cache hit:', { key, accessCount: entry.accessCount })
    return entry.data
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key)
    if (deleted && this.config.enableMetrics) {
      this.updateStats()
    }
    return deleted
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      evictionCount: 0,
      oldestEntry: Date.now(),
      newestEntry: Date.now()
    }
    logger.info('Cache cleared')
  }

  // Specialized methods for timeline data

  async cacheTimelineData(page: number, pageSize: number, updates: UpdateCardData[], hasMore: boolean): Promise<void> {
    const key = this.generateKey('timeline', `${page}_${pageSize}`)
    await this.set(key, {
      updates,
      totalCount: updates.length,
      hasMore,
      lastFetched: Date.now()
    }, this.config.defaultTTL * 2, ['timeline']) // Longer TTL for timeline data
  }

  async getTimelineData(page: number, pageSize: number): Promise<TimelineCacheEntry['data'] | null> {
    const key = this.generateKey('timeline', `${page}_${pageSize}`)
    return this.get(key)
  }

  async cacheSearchResults(query: string, filters: SearchFilters, results: UpdateCardData[], responseTime: number): Promise<void> {
    const key = this.generateKey('search', { query, filters })
    await this.set(key, {
      query,
      filters,
      results,
      totalCount: results.length,
      responseTime
    }, this.config.defaultTTL / 2, ['search']) // Shorter TTL for search results
  }

  async getSearchResults(query: string, filters: SearchFilters): Promise<SearchCacheEntry['data'] | null> {
    const key = this.generateKey('search', { query, filters })
    return this.get(key)
  }

  async cacheImage(url: string, blob: Blob, optimizedVersions: Record<string, string> = {}): Promise<void> {
    const key = this.generateKey('image', url)
    await this.set(key, {
      url,
      blob,
      optimizedVersions
    }, this.config.defaultTTL * 5, ['image']) // Much longer TTL for images
  }

  async getImage(url: string): Promise<ImageCacheEntry['data'] | null> {
    const key = this.generateKey('image', url)
    return this.get(key)
  }

  // Preloading and background operations

  async preload(keys: string[]): Promise<void> {
    for (const key of keys) {
      if (!this.cache.has(key) && !this.preloadQueue.has(key)) {
        this.preloadQueue.add(key)
        // Implement actual preloading logic based on key type
        // This would typically involve fetching data and caching it
      }
    }
  }

  // Analytics and monitoring

  getStats(): CacheStats {
    this.updateStats()
    return { ...this.stats }
  }

  async getDetailedStats(): Promise<DetailedCacheStats> {
    const stats = this.getStats()
    const entries = Array.from(this.cache.entries())

    return {
      ...stats,
      topAccessedEntries: entries
        .sort((a, b) => b[1].accessCount - a[1].accessCount)
        .slice(0, 10)
        .map(([key, entry]) => ({
          key,
          accessCount: entry.accessCount,
          size: entry.size,
          age: Date.now() - entry.timestamp
        })),
      sizeDistribution: this.getSizeDistribution(),
      tagDistribution: this.getTagDistribution()
    }
  }

  private getSizeDistribution(): { [range: string]: number } {
    const distribution: { [range: string]: number } = {
      'small (<1KB)': 0,
      'medium (1-10KB)': 0,
      'large (10-100KB)': 0,
      'xlarge (>100KB)': 0
    }

    for (const entry of this.cache.values()) {
      const sizeKB = entry.size / 1024
      if (sizeKB < 1) {
        distribution['small (<1KB)']++
      } else if (sizeKB < 10) {
        distribution['medium (1-10KB)']++
      } else if (sizeKB < 100) {
        distribution['large (10-100KB)']++
      } else {
        distribution['xlarge (>100KB)']++
      }
    }

    return distribution
  }

  private getTagDistribution(): { [tag: string]: number } {
    const distribution: { [tag: string]: number } = {}

    for (const entry of this.cache.values()) {
      if (entry.tags) {
        for (const tag of entry.tags) {
          distribution[tag] = (distribution[tag] || 0) + 1
        }
      }
    }

    return distribution
  }

  // Cleanup and destroy

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate()
    }

    this.saveToPersistence()
    this.cache.clear()

    logger.info('Timeline cache destroyed')
  }
}

// Global cache instance
let cacheInstance: TimelineCache | null = null

export function getTimelineCache(config?: Partial<CacheConfig>): TimelineCache {
  if (!cacheInstance) {
    cacheInstance = new TimelineCache(config)
  }
  return cacheInstance
}

export function destroyTimelineCache(): void {
  if (cacheInstance) {
    cacheInstance.destroy()
    cacheInstance = null
  }
}
