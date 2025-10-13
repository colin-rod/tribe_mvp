import { describe, it, expect, jest } from '@jest/globals'

import {
  fetchDigestById,
  fetchDigestPreviewRows,
  fetchDigestsForUser
} from '../digestRepository'
import type { SupabaseClientType } from '../supabaseClient'

describe('digestRepository', () => {
  it('fetchDigestById returns digest data', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'digest-1' }, error: null })
    const secondEq = jest.fn(() => ({ single }))
    const firstEq = jest.fn(() => ({ eq: secondEq }))
    const select = jest.fn(() => ({ eq: firstEq }))
    const from = jest.fn(() => ({ select }))

    const supabase = { from } as unknown as SupabaseClientType

    const digest = await fetchDigestById(supabase, 'digest-1', 'user-1')

    expect(digest).toEqual({ id: 'digest-1' })
    expect(from).toHaveBeenCalledWith('summaries')
    expect(select).toHaveBeenCalledWith('*')
    expect(firstEq).toHaveBeenCalledWith('id', 'digest-1')
    expect(secondEq).toHaveBeenCalledWith('parent_id', 'user-1')
  })

  it('fetchDigestById returns null when digest not found', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
    const secondEq = jest.fn(() => ({ single }))
    const firstEq = jest.fn(() => ({ eq: secondEq }))
    const select = jest.fn(() => ({ eq: firstEq }))
    const from = jest.fn(() => ({ select }))

    const supabase = { from } as unknown as SupabaseClientType

    const digest = await fetchDigestById(supabase, 'digest-1', 'user-1')

    expect(digest).toBeNull()
  })

  it('fetchDigestById throws on unexpected error', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: '123', message: 'Boom' } })
    const secondEq = jest.fn(() => ({ single }))
    const firstEq = jest.fn(() => ({ eq: secondEq }))
    const select = jest.fn(() => ({ eq: firstEq }))
    const from = jest.fn(() => ({ select }))

    const supabase = { from } as unknown as SupabaseClientType

    await expect(fetchDigestById(supabase, 'digest-1', 'user-1')).rejects.toThrow('Failed to fetch summary: Boom')
  })

  it('fetchDigestPreviewRows returns joined preview rows', async () => {
    const previewRows = [{ id: 'row-1', digest_id: 'digest-1' }]
    const finalOrder = jest.fn().mockResolvedValue({ data: previewRows, error: null })
    const firstOrder = jest.fn(() => ({ order: finalOrder }))
    const eq = jest.fn(() => ({ order: firstOrder }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn((table: string) => {
      if (table === 'summary_memories') {
        return { select }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const supabase = { from } as unknown as SupabaseClientType

    const rows = await fetchDigestPreviewRows(supabase, 'digest-1')

    expect(rows).toEqual(previewRows)
    expect(from).toHaveBeenCalledWith('summary_memories')
    expect(select).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith('digest_id', 'digest-1')
    expect(firstOrder).toHaveBeenCalledWith('recipient_id')
    expect(finalOrder).toHaveBeenCalledWith('display_order')
  })

  it('fetchDigestPreviewRows throws when query fails', async () => {
    const finalOrder = jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } })
    const firstOrder = jest.fn(() => ({ order: finalOrder }))
    const eq = jest.fn(() => ({ order: firstOrder }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))

    const supabase = { from } as unknown as SupabaseClientType

    await expect(fetchDigestPreviewRows(supabase, 'digest-1')).rejects.toThrow('Failed to fetch summary memories: Query failed')
  })

  it('fetchDigestsForUser returns digests ordered by creation date', async () => {
    const digests = [{ id: 'digest-1' }, { id: 'digest-2' }]
    const order = jest.fn().mockResolvedValue({ data: digests, error: null })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))

    const supabase = { from } as unknown as SupabaseClientType

    const result = await fetchDigestsForUser(supabase, 'user-1')

    expect(result).toEqual(digests)
    expect(eq).toHaveBeenCalledWith('parent_id', 'user-1')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('fetchDigestsForUser throws when the query fails', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'oops' } })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))

    const supabase = { from } as unknown as SupabaseClientType

    await expect(fetchDigestsForUser(supabase, 'user-1')).rejects.toThrow('Failed to fetch summaries: oops')
  })
})
