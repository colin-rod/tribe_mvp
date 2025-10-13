describe('dashboard analytics lifecycle', () => {
  let originalPerformanceObserver: typeof PerformanceObserver | undefined
  let originalMutationObserver: typeof MutationObserver | undefined
  let originalRequestAnimationFrame: typeof requestAnimationFrame | undefined

  beforeEach(() => {
    jest.resetModules()
    jest.useFakeTimers()

    const globalWithObservers = globalThis as unknown as {
      PerformanceObserver?: typeof PerformanceObserver
      MutationObserver?: typeof MutationObserver
      requestAnimationFrame?: typeof requestAnimationFrame
    }

    originalPerformanceObserver = globalWithObservers.PerformanceObserver
    class MockPerformanceObserver {
      public observe = jest.fn()
      public disconnect = jest.fn()
      public takeRecords = jest.fn(() => [])

      constructor(public callback: PerformanceObserverCallback) {}
    }
    globalWithObservers.PerformanceObserver = MockPerformanceObserver as unknown as typeof PerformanceObserver

    originalMutationObserver = globalWithObservers.MutationObserver
    class MockMutationObserver {
      public observe = jest.fn()
      public disconnect = jest.fn()
      public takeRecords = jest.fn(() => [])

      constructor(public callback: MutationCallback) {}
    }
    globalWithObservers.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver

    originalRequestAnimationFrame = globalWithObservers.requestAnimationFrame
    globalWithObservers.requestAnimationFrame = jest.fn() as unknown as typeof requestAnimationFrame
  })

  afterEach(() => {
    const globalWithObservers = globalThis as unknown as {
      PerformanceObserver?: typeof PerformanceObserver
      MutationObserver?: typeof MutationObserver
      requestAnimationFrame?: typeof requestAnimationFrame
    }

    jest.useRealTimers()
    jest.restoreAllMocks()

    if (originalPerformanceObserver) {
      globalWithObservers.PerformanceObserver = originalPerformanceObserver
    } else {
      delete globalWithObservers.PerformanceObserver
    }

    if (originalMutationObserver) {
      globalWithObservers.MutationObserver = originalMutationObserver
    } else {
      delete globalWithObservers.MutationObserver
    }

    if (originalRequestAnimationFrame) {
      globalWithObservers.requestAnimationFrame = originalRequestAnimationFrame
    } else {
      delete globalWithObservers.requestAnimationFrame
    }
  })

  it('destroys analytics instance between mounts to prevent listener accumulation', () => {
    const documentAddSpy = jest.spyOn(document, 'addEventListener')
    const documentRemoveSpy = jest.spyOn(document, 'removeEventListener')
    const windowAddSpy = jest.spyOn(window, 'addEventListener')
    const windowRemoveSpy = jest.spyOn(window, 'removeEventListener')

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const analyticsModule = require('@/lib/analytics/dashboard-analytics') as typeof import('@/lib/analytics/dashboard-analytics')

      const firstInstance = analyticsModule.initializeDashboardAnalytics()
      expect(firstInstance).not.toBeNull()

      analyticsModule.destroyDashboardAnalytics()

      const secondInstance = analyticsModule.initializeDashboardAnalytics()
      expect(secondInstance).not.toBe(firstInstance)

      analyticsModule.destroyDashboardAnalytics()
    })

    const beforeUnloadAdds = windowAddSpy.mock.calls.filter(([event]) => event === 'beforeunload')
    const beforeUnloadRemoves = windowRemoveSpy.mock.calls.filter(([event]) => event === 'beforeunload')
    expect(beforeUnloadRemoves).toHaveLength(beforeUnloadAdds.length)

    const visibilityAdds = documentAddSpy.mock.calls.filter(([event]) => event === 'visibilitychange')
    const visibilityRemoves = documentRemoveSpy.mock.calls.filter(([event]) => event === 'visibilitychange')
    expect(visibilityRemoves).toHaveLength(visibilityAdds.length)
  })
})
