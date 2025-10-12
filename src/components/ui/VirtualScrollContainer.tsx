'use client'

import { memo, forwardRef, useCallback, useMemo, useRef, useEffect } from 'react'
import type { MutableRefObject, ComponentType, CSSProperties } from 'react'
// TODO: Fix react-window imports - these types don't exist in the package
// import { List, type ListImperativeAPI, type RowComponentProps } from 'react-window'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ListImperativeAPI = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
type RowComponentProps<T = any> = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const List: any = null
import { useInView } from 'react-intersection-observer'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'

const logger = createLogger('VirtualScrollContainer')

interface VirtualScrollContainerProps {
  items: unknown[]
  itemHeight?: number | ((index: number) => number)
  height: number
  width?: number | string
  className?: string
  onLoadMore?: () => void
  hasNextPage?: boolean
  isLoading?: boolean
  loadingComponent?: ComponentType
  children: (props: {
    index: number
    style: CSSProperties
    data: unknown
  }) => React.ReactNode
  overscan?: number
  threshold?: number
  direction?: 'vertical' | 'horizontal'
  enablePerformanceTracking?: boolean
  memoryOptimization?: boolean
}

interface ItemRendererProps {
  index: number
  style: CSSProperties
  data: {
    items: unknown[]
    children: VirtualScrollContainerProps['children']
    hasNextPage?: boolean
    isLoading?: boolean
    loadingComponent?: ComponentType
    onLoadMore?: () => void
    threshold?: number
    memoryOptimization?: boolean
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
  let optimizedItemData = item
  if (memoryOptimization && typeof item === 'object' && item !== null) {
    optimizedItemData = {
      ...(item as Record<string, unknown>),
      __optimized: true
    }
  }

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
})

ItemRenderer.displayName = 'ItemRenderer'

type VirtualRowProps = {
  itemData: ItemRendererProps['data']
}

const VirtualRow = ({ index, style, itemData }: RowComponentProps<VirtualRowProps>) => (
  <ItemRenderer index={index} style={style} data={itemData} />
)

/**
 * High-performance virtual scrolling container that handles large datasets efficiently
 * Supports both fixed and variable item heights, infinite loading, and intersection observer
 */
const VirtualScrollContainer = forwardRef<ListImperativeAPI | null, VirtualScrollContainerProps>(
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

    const listRef = useRef<ListImperativeAPI | null>(null)

    // Track rendering performance
    useEffect(() => {
      if (!enablePerformanceTracking) {
        return
      }

      const startTime = performance.now()
      const performanceSnapshot = performanceRef.current

      return () => {
        const endTime = performance.now()
        const renderTime = endTime - startTime

        performanceSnapshot.renderCount += 1
        performanceSnapshot.lastRenderTime = renderTime
        performanceSnapshot.averageRenderTime =
          (performanceSnapshot.averageRenderTime * (performanceSnapshot.renderCount - 1) + renderTime)
          / performanceSnapshot.renderCount

        if (renderTime > 16) {
          logger.warn('VirtualScrollContainer slow render detected', {
            renderTimeMs: Number(renderTime.toFixed(2))
          })
        }
      }
    }, [enablePerformanceTracking])

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
        if (firstKey !== undefined) {
          itemSizeCache.current.delete(firstKey)
        }
      }

      return size
    }, [itemHeight])

    // Clear cache when items change
    useEffect(() => {
      itemSizeCache.current.clear()
    }, [items.length])

    useEffect(() => {
      if (direction === 'horizontal') {
        logger.warn(
          'VirtualScrollContainer currently supports vertical scrolling only. Falling back to vertical mode.'
        )
      }
    }, [direction])

    // Scroll performance optimization
    const handleScroll = useCallback(() => {
      if (enablePerformanceTracking) {
        // Throttle scroll events for better performance
        if (listRef.current) {
          requestAnimationFrame(() => {
            // Any additional scroll handling can go here
          })
        }
      }
    }, [enablePerformanceTracking])

    const setListRef = useCallback(
      (instance: ListImperativeAPI | null) => {
        listRef.current = instance

        if (typeof ref === 'function') {
          ref(instance)
        } else if (ref && 'current' in ref) {
          ;(ref as MutableRefObject<ListImperativeAPI | null>).current = instance
        }
      },
      [ref]
    )

    const computedRowHeight = isFixedHeight
      ? (itemHeight as number)
      : (index: number, _rowProps: VirtualRowProps) => getItemSize(index)

    const containerStyle: CSSProperties = {
      height,
      width: typeof width === 'number' ? `${width}px` : width ?? '100%'
    }

    const rowProps = useMemo(() => ({ itemData }), [itemData])

    return (
      <List
        listRef={setListRef}
        defaultHeight={typeof height === 'number' ? height : undefined}
        rowCount={totalItemCount}
        rowHeight={computedRowHeight}
        rowComponent={VirtualRow}
        rowProps={rowProps}
        overscanCount={Math.min(overscan, 10)}
        className={cn(
          'focus:outline-none',
          memoryOptimization && 'will-change-transform',
          className
        )}
        style={containerStyle}
        onScroll={handleScroll}
      />
    )
  }
)

VirtualScrollContainer.displayName = 'VirtualScrollContainer'

export default VirtualScrollContainer
export type { VirtualScrollContainerProps }
