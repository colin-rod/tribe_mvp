import { describe, expect, it } from '@jest/globals'
import { mapRecipientRecord } from '@/lib/recipients'
import type { Database } from '@/lib/types/database'
import type { RecipientGroup } from '@/lib/recipient-groups'


type RecipientRow = Database['public']['Tables']['recipients']['Row']

const baseRecipientRow: RecipientRow = {
  id: 'rec-1',
  parent_id: 'parent-1',
  name: 'Grandma',
  email: 'grandma@example.com',
  phone: null,
  relationship: 'grandparent',
  group_id: null,
  frequency: 'weekly_digest',
  preferred_channels: ['email'],
  content_types: ['photos', 'text'],
  importance_threshold: 'medium',
  overrides_group_default: null,
  preference_token: 'token-123',
  is_active: null,
  created_at: '2024-01-01T00:00:00.000Z',
  digest_preferences: null,
  updated_at: null
}

const sampleGroup: RecipientGroup = {
  id: 'group-1',
  parent_id: 'parent-1',
  name: 'Close Family',
  default_frequency: 'weekly_digest',
  default_channels: ['email'],
  is_default_group: false,
  created_at: '2024-01-01T00:00:00.000Z'
}

describe('mapRecipientRecord', () => {
  it('maps a recipient when recipient_groups is an array', () => {
    const mapped = mapRecipientRecord({
      ...baseRecipientRow,
      recipient_groups: [sampleGroup]
    } as RecipientRow & { recipient_groups: unknown })

    expect(mapped.group).toEqual(sampleGroup)
    expect(mapped.is_active).toBe(true)
    expect(mapped.overrides_group_default).toBe(false)
    expect(mapped.preferred_channels).toEqual(['email'])
    expect(mapped.content_types).toEqual(['photos', 'text'])
  })

  it('maps a recipient when recipient_groups is a single object', () => {
    const mapped = mapRecipientRecord({
      ...baseRecipientRow,
      recipient_groups: sampleGroup
    } as RecipientRow & { recipient_groups: unknown })

    expect(mapped.group).toEqual(sampleGroup)
    expect(mapped.is_active).toBe(true)
    expect(mapped.overrides_group_default).toBe(false)
  })
})
