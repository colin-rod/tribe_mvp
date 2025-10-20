jest.mock('@/lib/analytics/dashboard-analytics', () => ({
  initializeDashboardAnalytics: jest.fn(() => ({})),
  destroyDashboardAnalytics: jest.fn(),
}))

import { render } from '@testing-library/react'

import { DashboardAnalyticsInitializer } from '../DashboardAnalyticsInitializer'
import {
  destroyDashboardAnalytics,
  initializeDashboardAnalytics,
} from '@/lib/analytics/dashboard-analytics'

const mockedInitializeDashboardAnalytics = initializeDashboardAnalytics as jest.MockedFunction<
  typeof initializeDashboardAnalytics
>
const mockedDestroyDashboardAnalytics = destroyDashboardAnalytics as jest.MockedFunction<
  typeof destroyDashboardAnalytics
>

describe('DashboardAnalyticsInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes analytics on mount and destroys on unmount', () => {
    const { unmount } = render(<DashboardAnalyticsInitializer />)

    expect(mockedInitializeDashboardAnalytics).toHaveBeenCalledTimes(1)

    unmount()

    expect(mockedDestroyDashboardAnalytics).toHaveBeenCalledTimes(1)
  })

  it('cleans up analytics between repeated mounts', () => {
    const firstRender = render(<DashboardAnalyticsInitializer />)
    firstRender.unmount()

    const secondRender = render(<DashboardAnalyticsInitializer />)
    secondRender.unmount()

    expect(mockedInitializeDashboardAnalytics).toHaveBeenCalledTimes(2)
    expect(mockedDestroyDashboardAnalytics).toHaveBeenCalledTimes(2)
  })
})
