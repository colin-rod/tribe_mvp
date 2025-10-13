import { DashboardAnalyticsManager } from '../dashboard-analytics'

describe('DashboardAnalyticsManager cleanup', () => {
  const originalPerformanceObserver = window.PerformanceObserver
  const originalPerformanceMemory = (performance as Performance & { memory?: unknown }).memory

  beforeEach(() => {
    class MockPerformanceObserver {
      observe = jest.fn()
      disconnect = jest.fn()
    }

    Object.defineProperty(window, 'PerformanceObserver', {
      configurable: true,
      value: MockPerformanceObserver
    })

    Object.defineProperty(performance, 'memory', {
      configurable: true,
      value: {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0
      }
    })

    localStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()

    if (originalPerformanceObserver) {
      Object.defineProperty(window, 'PerformanceObserver', {
        configurable: true,
        value: originalPerformanceObserver
      })
    } else {
      delete (window as typeof window & { PerformanceObserver?: typeof PerformanceObserver }).PerformanceObserver
    }

    if (originalPerformanceMemory) {
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        value: originalPerformanceMemory
      })
    } else {
      delete (performance as Performance & { memory?: unknown }).memory
    }
  })

  it('removes registered listeners and timers on destroy', () => {
    const documentAddSpy = jest.spyOn(document, 'addEventListener')
    const documentRemoveSpy = jest.spyOn(document, 'removeEventListener')
    const windowAddSpy = jest.spyOn(window, 'addEventListener')
    const windowRemoveSpy = jest.spyOn(window, 'removeEventListener')

    let intervalId = 100
    const setIntervalSpy = jest
      .spyOn(window, 'setInterval')
      .mockImplementation(((handler: TimerHandler, timeout?: number) => {
        return (intervalId++) as unknown as number
      }) as unknown as typeof window.setInterval)
    const clearIntervalSpy = jest
      .spyOn(window, 'clearInterval')
      .mockImplementation(() => undefined)

    let frameId = 200
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(((callback: FrameRequestCallback) => {
        return (frameId++) as unknown as number
      }) as unknown as typeof window.requestAnimationFrame)
    const cancelAnimationFrameSpy = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined)

    const timeoutId = 300
    const setTimeoutSpy = jest
      .spyOn(window, 'setTimeout')
      .mockImplementation(((handler: TimerHandler, timeout?: number) => {
        return timeoutId as unknown as number
      }) as unknown as typeof window.setTimeout)
    const clearTimeoutSpy = jest
      .spyOn(window, 'clearTimeout')
      .mockImplementation(() => undefined)

    const manager = new DashboardAnalyticsManager({ flushInterval: 0 })

    const clickHandler = documentAddSpy.mock.calls.find(call => call[0] === 'click')?.[1]
    const keydownHandler = documentAddSpy.mock.calls.find(call => call[0] === 'keydown')?.[1]
    const scrollHandler = windowAddSpy.mock.calls.find(call => call[0] === 'scroll')?.[1]
    const resizeHandler = windowAddSpy.mock.calls.find(call => call[0] === 'resize')?.[1]

    expect(clickHandler).toBeInstanceOf(Function)
    expect(keydownHandler).toBeInstanceOf(Function)
    expect(scrollHandler).toBeInstanceOf(Function)
    expect(resizeHandler).toBeInstanceOf(Function)

    if (typeof scrollHandler === 'function') {
      scrollHandler(new Event('scroll'))
    }

    manager.destroy()

    expect(documentRemoveSpy).toHaveBeenCalledWith('click', clickHandler, true)
    expect(documentRemoveSpy).toHaveBeenCalledWith('keydown', keydownHandler)
    expect(windowRemoveSpy).toHaveBeenCalledWith('scroll', scrollHandler)
    expect(windowRemoveSpy).toHaveBeenCalledWith('resize', resizeHandler)
    expect(clearIntervalSpy).toHaveBeenCalledWith((intervalId - 1) as unknown as number)
    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith((frameId - 1) as unknown as number)

    if (setTimeoutSpy.mock.calls.length > 0) {
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId as unknown as number)
    }

    expect(setIntervalSpy).toHaveBeenCalled()
  })
})
