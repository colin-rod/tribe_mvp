import { NextRequest } from 'next/server'

import { POST } from '@/app/api/recipients/duplicate-check/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server')
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({}),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('POST /api/recipients/duplicate-check', () => {
  let mockSupabase: {
    auth: { getUser: jest.Mock }
    from: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    }

    mockCreateClient.mockReturnValue(mockSupabase as never)
  })

  it('requires authentication', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authorized' },
    })

    const request = new NextRequest('http://localhost:3000/api/recipients/duplicate-check', {
      method: 'POST',
      body: JSON.stringify({ name: 'Grandma Sue' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('returns contact matches when email or phone is duplicated', async () => {
    const mockUser = { id: 'parent-1' }
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'recipient-1',
            name: 'Grandma Sue',
            email: 'grandma@example.com',
            phone: '+1 (555) 100-2000',
            relationship: 'grandparent',
          },
        ],
        error: null,
      }),
    })

    const request = new NextRequest('http://localhost:3000/api/recipients/duplicate-check', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Grandma Susan',
        email: 'Grandma@example.com',
        phone: '15551002000',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.candidates).toHaveLength(1)
    expect(data.candidates[0].metadata.contact).toEqual({ email: true, phone: true })
    expect(data.candidates[0].score).toBe(0)
  })

  it('returns fuzzy matches for similar names', async () => {
    const mockUser = { id: 'parent-1' }
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'recipient-1',
            name: 'Grandma Sue',
            email: 'grandma@example.com',
            phone: null,
            relationship: 'grandparent',
          },
          {
            id: 'recipient-2',
            name: 'Uncle Bob',
            email: 'bob@example.com',
            phone: null,
            relationship: 'family',
          },
        ],
        error: null,
      }),
    })

    const request = new NextRequest('http://localhost:3000/api/recipients/duplicate-check', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Gramma Sue',
        nicknames: ['Grandma Sue'],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.candidates.length).toBeGreaterThan(0)
    const grandmaMatch = data.candidates.find((candidate: any) => candidate.recipient.id === 'recipient-1')
    expect(grandmaMatch).toBeDefined()
    expect(grandmaMatch.metadata.fields.length).toBeGreaterThan(0)
    expect(grandmaMatch.metadata.terms).toContain('Gramma Sue')
  })
})
