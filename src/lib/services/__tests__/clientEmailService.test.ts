import { ClientEmailService } from '@/lib/services/clientEmailService'

describe('ClientEmailService fetchApi', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({}) as unknown as typeof fetch
  })

  afterEach(() => {
    jest.resetAllMocks()
    global.fetch = originalFetch
  })

  it('merges default content type header with provided headers', async () => {
    const service = new ClientEmailService()

    await (service as unknown as { fetchApi: (endpoint: string, options?: RequestInit) => Promise<unknown> }).fetchApi(
      '/api/test',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
        },
      }
    )

    const fetchMock = global.fetch as unknown as jest.Mock

    expect(fetchMock).toHaveBeenCalledWith('/api/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
    })
  })
})
