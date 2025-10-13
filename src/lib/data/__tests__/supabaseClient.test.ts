import { describe, it, expect, beforeEach, jest } from '@jest/globals'

import { getAuthenticatedSupabaseContext } from '../supabaseClient'
import type { SupabaseClientType } from '../supabaseClient'

const mockGetUser = jest.fn()

function createSupabaseClient(): SupabaseClientType {
  return {
    auth: {
      getUser: mockGetUser
    }
  } as unknown as SupabaseClientType
}

describe('supabaseClient helpers', () => {
  let supabase: SupabaseClientType

  beforeEach(() => {
    mockGetUser.mockReset()
    supabase = createSupabaseClient()
  })

  it('returns supabase client and authenticated user', async () => {
    const user = { id: 'user-123' }
    mockGetUser.mockResolvedValue({ data: { user }, error: null })

    const result = await getAuthenticatedSupabaseContext(supabase)

    expect(result.user).toEqual(user)
    expect(result.supabase).toBe(supabase)
    expect(mockGetUser).toHaveBeenCalled()
  })

  it('throws when user lookup fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Auth error' } })

    await expect(getAuthenticatedSupabaseContext(supabase)).rejects.toThrow('Failed to retrieve authenticated user: Auth error')
  })

  it('throws when no user is returned', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(getAuthenticatedSupabaseContext(supabase)).rejects.toThrow('Not authenticated')
  })
})
