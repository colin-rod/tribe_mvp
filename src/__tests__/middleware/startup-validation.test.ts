import type { Env } from '@/lib/env'
import { getEnv, getFeatureFlags } from '@/lib/env'
import { ensureStartupConfiguration, resetStartupValidationCache } from '@/middleware/startup-validation'

jest.mock('@/lib/env', () => ({
  getEnv: jest.fn(),
  getFeatureFlags: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    errorWithStack: jest.fn(),
  })),
}))

type FeatureFlags = {
  supabaseEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  whatsappEnabled: boolean
  linearEnabled: boolean
  directDbEnabled: boolean
}

const mockGetEnv = getEnv as jest.MockedFunction<typeof getEnv>
const mockGetFeatureFlags = getFeatureFlags as jest.MockedFunction<typeof getFeatureFlags>

const originalNodeEnv = process.env.NODE_ENV

beforeEach(() => {
  resetStartupValidationCache()
  mockGetEnv.mockReset()
  mockGetFeatureFlags.mockReset()
  process.env.NODE_ENV = originalNodeEnv
})

afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv
})

describe('ensureStartupConfiguration', () => {
  it('returns cached configuration after initial validation', () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(60),
    } as unknown as Env

    const featureFlags = {
      supabaseEnabled: true,
      emailEnabled: false,
      smsEnabled: false,
      whatsappEnabled: false,
      linearEnabled: false,
      directDbEnabled: false,
    } satisfies FeatureFlags

    mockGetEnv.mockReturnValue(env)
    mockGetFeatureFlags.mockReturnValue(featureFlags)

    const firstResult = ensureStartupConfiguration()
    const secondResult = ensureStartupConfiguration()

    expect(firstResult).toBe(secondResult)
    expect(firstResult.env).toBe(env)
    expect(firstResult.features).toBe(featureFlags)
    expect(mockGetEnv).toHaveBeenCalledTimes(1)
    expect(mockGetFeatureFlags).toHaveBeenCalledTimes(1)
  })

  it('throws and caches error when Supabase is not enabled', () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(60),
    } as unknown as Env

    const featureFlags = {
      supabaseEnabled: false,
      emailEnabled: false,
      smsEnabled: false,
      whatsappEnabled: false,
      linearEnabled: false,
      directDbEnabled: false,
    } satisfies FeatureFlags

    mockGetEnv.mockReturnValue(env)
    mockGetFeatureFlags.mockReturnValue(featureFlags)

    expect(() => ensureStartupConfiguration()).toThrow(
      'Application startup failed: Supabase is not properly configured.'
    )

    expect(() => ensureStartupConfiguration()).toThrow(
      'Application startup failed: Supabase is not properly configured.'
    )

    expect(mockGetEnv).toHaveBeenCalledTimes(1)
    expect(mockGetFeatureFlags).toHaveBeenCalledTimes(1)
  })

  it('throws when production environment uses localhost Supabase URL', () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(60),
    } as unknown as Env

    const featureFlags = {
      supabaseEnabled: true,
      emailEnabled: false,
      smsEnabled: false,
      whatsappEnabled: false,
      linearEnabled: false,
      directDbEnabled: false,
    } satisfies FeatureFlags

    process.env.NODE_ENV = 'production'

    mockGetEnv.mockReturnValue(env)
    mockGetFeatureFlags.mockReturnValue(featureFlags)

    expect(() => ensureStartupConfiguration()).toThrow(
      'Production environment detected but Supabase URL is set to localhost.'
    )
  })
})
