import { NextRequest } from 'next/server'

type MockLogger = {
  errorWithStack: jest.Mock
  info: jest.Mock
  warn: jest.Mock
  debug: jest.Mock
}

const mockLogger: MockLogger = {
  errorWithStack: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}

jest.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger
}))

const mockCheckEnvironmentHealth = jest.fn(() => ({
  isValid: true,
  missingRequired: [],
  missingOptional: [],
  errors: []
}))

jest.mock('@/lib/env', () => ({
  getEnv: jest.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(60),
    SENDGRID_API_KEY: 'sg-key',
    LINEAR_API_KEY: 'linear-key',
    LINEAR_PROJECT_ID: 'proj-123',
    DATABASE_URL: 'postgres://user:pass@host/db',
    NODE_ENV: 'test',
    PORT: 3000,
    NEXT_PUBLIC_APP_URL: 'https://app.example.com',
    SENDGRID_FROM_EMAIL: 'noreply@example.com',
    SENDGRID_FROM_NAME: 'Example Sender'
  })),
  getClientEnv: jest.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(60),
    NEXT_PUBLIC_APP_URL: 'https://app.example.com',
    NODE_ENV: 'test'
  })),
  checkEnvironmentHealth: mockCheckEnvironmentHealth,
  getFeatureFlags: jest.fn(() => ({
    supabaseEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    whatsappEnabled: false,
    linearEnabled: true,
    directDbEnabled: true
  }))
}))

describe('debug env route security', () => {
  let originalNodeEnv: string | undefined

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV
  })

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NODE_ENV = 'test'
    mockCheckEnvironmentHealth.mockImplementation(() => ({
      isValid: true,
      missingRequired: [],
      missingOptional: [],
      errors: []
    }))
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('does not include stack traces in error responses when the handler fails', async () => {
    const { GET } = await import('../route')

    mockCheckEnvironmentHealth.mockImplementationOnce(() => {
      throw new Error('health failure')
    })

    const request = new NextRequest('http://localhost:3000/api/debug-env')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      status: 'error',
      message: 'Unable to generate debug report'
    })
    expect(typeof body.requestId).toBe('string')
    expect(body.requestId.length).toBeGreaterThan(0)
    expect(body.stack).toBeUndefined()

    expect(mockLogger.errorWithStack).toHaveBeenCalledWith(
      'Failed to generate debug environment report',
      expect.any(Error),
      expect.objectContaining({
        requestId: body.requestId,
        path: '/api/debug-env',
        method: 'GET'
      })
    )
  })

  it('does not leak stack traces when blocked in production', async () => {
    const { GET } = await import('../route')

    process.env.NODE_ENV = 'production'

    const request = new NextRequest('https://example.com/api/debug-env')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.stack).toBeUndefined()
    expect(body).toMatchObject({ error: 'Endpoint not available in production' })
  })
})
