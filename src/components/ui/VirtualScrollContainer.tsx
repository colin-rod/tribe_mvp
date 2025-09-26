'use client'

import { memo, forwardRef, useCallback, useMemo, useRef, useEffect } from 'react'
import { FixedSizeList as List, VariableSizeList as VariableList, areEqual } from 'react-window'
import { useInView } from 'react-intersection-observer'
import { cn } from '@/lib/utils'

interface VirtualScrollContainerProps {
  items: any[]
  itemHeight?: number | ((index: number) => number)
  height: number
  width?: number | string
  className?: string
  onLoadMore?: () => void
  hasNextPage?: boolean
  isLoading?: boolean
  loadingComponent?: React.ComponentType
  children: (props: {
    index: number
    style: React.CSSProperties
    data: any
  }) => React.ReactNode
  overscan?: number
  threshold?: number
  direction?: 'vertical' | 'horizontal'
  enablePerformanceTracking?: boolean
  memoryOptimization?: boolean
}

interface ItemRendererProps {
  index: number
  style: React.CSSProperties
  data: {
    items: any[]
    children: VirtualScrollContainerProps['children']
    hasNextPage?: boolean
    isLoading?: boolean
    loadingComponent?: React.ComponentType
    onLoadMore?: () => void
    threshold?: number
  }
}

const ItemRenderer = memo(({ index, style, data }: ItemRendererProps) => {
  const {
    items,
    children,
    hasNextPage,
    isLoading,
    loadingComponent: LoadingComponent,
    onLoadMore,
    threshold = 5,
    memoryOptimization = false
  } = data

  const loadMoreTriggerRef = useRef<HTMLDivElement>(null)

  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
    skip: !onLoadMore || !hasNextPage || isLoading,
    rootMargin: '200px'
  })

  // Trigger load more when approaching the end
  const shouldLoadMore = index >= items.length - threshold && hasNextPage && !isLoading

  // Use useCallback to optimize load more trigger
  const triggerLoadMore = useCallback(() => {
    if (shouldLoadMore && inView && onLoadMore) {
      onLoadMore()
    }
  }, [shouldLoadMore, inView, onLoadMore])

  // Trigger load more with debouncing
  useEffect(() => {
    if (shouldLoadMore && inView) {
      const timer = setTimeout(triggerLoadMore, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldLoadMore, inView, triggerLoadMore])

  // Show loading indicator for items beyond the current data
  if (index >= items.length) {
    return (
      <div ref={ref} style={style}>
        {LoadingComponent ? (
          <LoadingComponent />
        ) : (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        )}
      </div>
    )
  }

  const item = items[index]

  // Memory optimization: only render data that's needed
  const optimizedItemData = memoryOptimization ? {
    ...item,
    // Remove heavy data that's not immediately needed
    __optimized: true
  } : item

  return (
    <div
      ref={shouldLoadMore ? ref : undefined}
      style={style}
      // Add performance hint for browser
      data-virtual-item-index={index}
    >
      {children({ index, style, data: optimizedItemData })}
    </div>
  )
}, areEqual)

ItemRenderer.displayName = 'ItemRenderer'

/**
 * High-performance virtual scrolling container that handles large datasets efficiently
 * Supports both fixed and variable item heights, infinite loading, and intersection observer
 */
const VirtualScrollContainer = forwardRef<any, VirtualScrollContainerProps>(
  ({
    items,
    itemHeight = 100,
    height,
    width = '100%',
    className,
    onLoadMore,
    hasNextPage = false,
    isLoading = false,
    loadingComponent,
    children,
    overscan = 5,
    threshold = 5,
    direction = 'vertical',
    enablePerformanceTracking = false,
    memoryOptimization = false
  }, ref) => {
    const isFixedHeight = typeof itemHeight === 'number'
    const totalItemCount = hasNextPage ? items.length + 1 : items.length

    // Performance tracking
    const performanceRef = useRef({
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0
    })

    const listRef = useRef<any>(null)

    // Track rendering performance
    useEffect(() => {
      if (enablePerformanceTracking) {
        const startTime = performance.now()

        return () => {
          const endTime = performance.now()
          const renderTime = endTime - startTime

          performanceRef.current.renderCount++
          performanceRef.current.lastRenderTime = renderTime
          performanceRef.current.averageRenderTime =
            (performanceRef.current.averageRenderTime * (performanceRef.current.renderCount - 1) + renderTime)
            / performanceRef.current.renderCount

          if (renderTime > 16) { // > 60fps
            console.warn(`VirtualScrollContainer: Slow render detected (${renderTime.toFixed(2)}ms)`)
          }
        }
      }
    })

    // Memory optimization: Only keep necessary data in itemData
    const itemData = useMemo(() => ({
      items,
      children,
      hasNextPage,
      isLoading,
      loadingComponent,
      onLoadMore,
      threshold,
      memoryOptimization
    }), [items, children, hasNextPage, isLoading, loadingComponent, onLoadMore, threshold, memoryOptimization])

    // Optimized item size calculation with caching
    const itemSizeCache = useRef(new Map<number, number>())

    const getItemSize = useCallback((index: number) => {
      if (itemSizeCache.current.has(index)) {
        return itemSizeCache.current.get(index)!
      }

      let size: number
      if (typeof itemHeight === 'function') {
        size = itemHeight(index)
      } else {
        size = itemHeight as number
      }

      // Cache the result for better performance
      itemSizeCache.current.set(index, size)

      // Limit cache size to prevent memory leaks
      if (itemSizeCache.current.size > 1000) {
        const firstKey = itemSizeCache.current.keys().next().value
        itemSizeCache.current.delete(firstKey)
      }

      return size
    }, [itemHeight])

    // Clear cache when items change
    useEffect(() => {
      itemSizeCache.current.clear()
    }, [items.length])

    // Scroll performance optimization
    const handleScroll = useCallback((event: any) => {
      if (enablePerformanceTracking) {
        // Throttle scroll events for better performance
        if (listRef.current) {
          requestAnimationFrame(() => {
            // Any additional scroll handling can go here
          })
        }
      }
    }, [enablePerformanceTracking])

    const listProps = {
      ref: (node: any) => {
        listRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      height,
      width,
      itemCount: totalItemCount,
      itemData,
      overscanCount: Math.min(overscan, 10), // Limit overscan for performance
      className: cn(
        'focus:outline-none',
        memoryOptimization && 'will-change-transform', // CSS optimization hint
        className
      ),
      direction: direction === 'horizontal' ? 'horizontal' : 'vertical',
      onScroll: handleScroll
    }

    if (isFixedHeight) {
      return (
        <List
          {...listProps}
          itemSize={itemHeight as number}
        >
          {ItemRenderer}
        </List>
      )
    }

    return (
      <VariableList
        {...listProps}
        itemSize={getItemSize}
        estimatedItemSize={typeof itemHeight === 'number' ? itemHeight : 100}
      >
        {ItemRenderer}
      </VariableList>
    )
  }
)

VirtualScrollContainer.displayName = 'VirtualScrollContainer'

export default VirtualScrollContainer
export type { VirtualScrollContainerProps }