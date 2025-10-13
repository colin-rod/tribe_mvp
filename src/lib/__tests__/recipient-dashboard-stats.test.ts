import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals'

const mockLogger = {
  errorWithStack: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
}

jest.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger
}))

const mockFrom = jest.fn()
const mockAuthGetUser = jest.fn()

const mockSupabase = {
  from: mockFrom,
  auth: { getUser: mockAuthGetUser }
} as any

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: jest.fn(() => mockSupabase)
}))

let createClientMock: jest.Mock
let getRecipientStats: typeof import('@/lib/recipients').getRecipientStats
let getGroupStats: typeof import('@/lib/recipient-groups').getGroupStats

beforeAll(async () => {
  const supabaseClientModule = await import('@/lib/supabase/client')
  createClientMock = supabaseClientModule.createClient as unknown as jest.Mock

  const recipientsModule = await import('@/lib/recipients')
  getRecipientStats = recipientsModule.getRecipientStats

  const groupsModule = await import('@/lib/recipient-groups')
  getGroupStats = groupsModule.getGroupStats
})

beforeEach(() => {
  mockFrom.mockReset()
  mockAuthGetUser.mockReset()
  createClientMock.mockClear()
  createClientMock.mockReturnValue(mockSupabase)
  mockAuthGetUser.mockImplementation(async () => ({ data: { user: { id: 'user-1' } } }))
})

describe('recipient dashboard stats helpers', () => {
  it('returns aggregated recipient statistics without fetching individual rows', async () => {
    const statusEq = jest.fn().mockResolvedValue({
      data: [
        { is_active: true, count: '3' },
        { is_active: false, count: '2' }
      ],
      error: null
    })
    const statusSelect = jest.fn().mockReturnValue({ eq: statusEq })

    const relationshipFinalEq = jest.fn().mockResolvedValue({
      data: [
        { relationship: 'parent', count: '2' },
        { relationship: 'friend', count: '1' }
      ],
      error: null
    })
    const relationshipFirstEq = jest.fn().mockReturnValue({ eq: relationshipFinalEq })
    const relationshipSelect = jest.fn().mockReturnValue({ eq: relationshipFirstEq })

    const groupFinalEq = jest.fn().mockResolvedValue({
      data: [
        { group_id: 'group-1', count: '2' },
        { group_id: null, count: '1' }
      ],
      error: null
    })
    const groupFirstEq = jest.fn().mockReturnValue({ eq: groupFinalEq })
    const groupSelect = jest.fn().mockReturnValue({ eq: groupFirstEq })

    const groupNameEq = jest.fn().mockResolvedValue({
      data: [
        { id: 'group-1', name: 'Close Family' }
      ],
      error: null
    })
    const groupNameIn = jest.fn().mockReturnValue({ eq: groupNameEq })
    const groupNameSelect = jest.fn().mockReturnValue({ in: groupNameIn })

    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('recipients')
      return { select: statusSelect } as any
    })
    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('recipients')
      return { select: relationshipSelect } as any
    })
    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('recipients')
      return { select: groupSelect } as any
    })
    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('recipient_groups')
      return { select: groupNameSelect } as any
    })

    const stats = await getRecipientStats()

    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(mockAuthGetUser).toHaveBeenCalledTimes(1)

    expect(statusSelect).toHaveBeenCalledWith('is_active, count:id', { group: 'is_active' })
    expect(statusEq).toHaveBeenCalledWith('parent_id', 'user-1')

    expect(relationshipSelect).toHaveBeenCalledWith('relationship, count:id', { group: 'relationship' })
    expect(relationshipFirstEq).toHaveBeenCalledWith('parent_id', 'user-1')
    expect(relationshipFinalEq).toHaveBeenCalledWith('is_active', true)

    expect(groupSelect).toHaveBeenCalledWith('group_id, count:id', { group: 'group_id' })
    expect(groupFirstEq).toHaveBeenCalledWith('parent_id', 'user-1')
    expect(groupFinalEq).toHaveBeenCalledWith('is_active', true)

    expect(groupNameSelect).toHaveBeenCalledWith('id, name')
    expect(groupNameIn).toHaveBeenCalledWith('id', ['group-1'])
    expect(groupNameEq).toHaveBeenCalledWith('parent_id', 'user-1')

    expect(stats).toEqual({
      totalRecipients: 5,
      activeRecipients: 3,
      inactiveRecipients: 2,
      byRelationship: {
        parent: 2,
        friend: 1
      },
      byGroup: {
        'Close Family': 2,
        Unassigned: 1
      }
    })
  })

  it('returns aggregated group statistics with metadata-only queries', async () => {
    const groupsEq = jest.fn().mockResolvedValue({ data: null, error: null, count: 4 })
    const groupsSelect = jest.fn().mockReturnValue({ eq: groupsEq })

    const breakdownEq = jest.fn().mockResolvedValue({
      data: [
        { is_default_group: true, count: '2' },
        { is_default_group: false, count: '2' }
      ],
      error: null
    })
    const breakdownSelect = jest.fn().mockReturnValue({ eq: breakdownEq })

    const recipientsFinalEq = jest.fn().mockResolvedValue({ data: null, error: null, count: 5 })
    const recipientsFirstEq = jest.fn().mockReturnValue({ eq: recipientsFinalEq })
    const recipientsSelect = jest.fn().mockReturnValue({ eq: recipientsFirstEq })

    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('recipient_groups')
      return { select: groupsSelect } as any
    })
    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('recipient_groups')
      return { select: breakdownSelect } as any
    })
    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('recipients')
      return { select: recipientsSelect } as any
    })

    const stats = await getGroupStats()

    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(mockAuthGetUser).toHaveBeenCalledTimes(1)

    expect(groupsSelect).toHaveBeenCalledWith('*', { head: true, count: 'exact' })
    expect(groupsEq).toHaveBeenCalledWith('parent_id', 'user-1')

    expect(breakdownSelect).toHaveBeenCalledWith('is_default_group, count:id', { group: 'is_default_group' })
    expect(breakdownEq).toHaveBeenCalledWith('parent_id', 'user-1')

    expect(recipientsSelect).toHaveBeenCalledWith('*', { head: true, count: 'exact' })
    expect(recipientsFirstEq).toHaveBeenCalledWith('parent_id', 'user-1')
    expect(recipientsFinalEq).toHaveBeenCalledWith('is_active', true)

    expect(stats).toEqual({
      totalGroups: 4,
      totalRecipients: 5,
      defaultGroups: 2,
      customGroups: 2
    })
  })
})
