import { logPreferenceAccess } from '@/lib/preference-links'
import {
  getPreferenceTelemetryHistory,
  resetPreferenceTelemetryHistory
} from '@/lib/analytics/preference-telemetry'

describe('logPreferenceAccess telemetry', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    resetPreferenceTelemetryHistory()
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
  })

  afterEach(() => {
    jest.clearAllMocks()

    if (originalFetch) {
      global.fetch = originalFetch
    } else {
      delete (global as typeof global & { fetch?: typeof fetch }).fetch
    }
  })

  it('records a telemetry event with a hashed token when a preference link is viewed', async () => {
    await logPreferenceAccess('test-preference-token-123456', 'view')

    const history = getPreferenceTelemetryHistory()
    expect(history).toHaveLength(1)

    const [event] = history
    expect(event.action).toBe('view')
    expect(event.tokenPrefix).toBe('test-p')
    expect(event.tokenHash).not.toEqual('test-preference-token-123456')
    expect(event.tokenHash.length).toBeGreaterThanOrEqual(8)
  })

  it('emits distinct telemetry events for updates', async () => {
    await logPreferenceAccess('token-update-abcdef', 'view')
    await logPreferenceAccess('token-update-abcdef', 'update')

    const history = getPreferenceTelemetryHistory()
    expect(history).toHaveLength(2)

    const updateEvent = history.find(event => event.action === 'update')
    expect(updateEvent).toBeDefined()
    expect(updateEvent?.tokenHash).toBeDefined()
  })

  it('skips telemetry logging when the token is missing', async () => {
    await logPreferenceAccess('', 'view')
    await logPreferenceAccess('   ', 'update')

    expect(getPreferenceTelemetryHistory()).toHaveLength(0)
  })
})
