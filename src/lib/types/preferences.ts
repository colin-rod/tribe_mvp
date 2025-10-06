// Shared types for recipient preferences and update importance

/**
 * Update importance classification levels
 * Used by AI analysis and recipient filtering
 */
export type UpdateImportance = 'all_updates' | 'milestone' | 'major_milestone'

/**
 * Recipient importance threshold - minimum importance level they want to receive
 */
export type ImportanceThreshold = 'all_updates' | 'milestones_only' | 'major_milestones_only'

/**
 * Update frequency preferences
 */
export type UpdateFrequency = 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'

/**
 * Delivery channel options
 */
export type DeliveryChannel = 'email' | 'sms' | 'whatsapp'

/**
 * Content type preferences
 */
export type ContentType = 'photos' | 'text' | 'milestones'

/**
 * Recipient relationship types
 */
export type RecipientRelationship = 'grandparent' | 'parent' | 'sibling' | 'friend' | 'family' | 'colleague' | 'other'

/**
 * Default preferences based on relationship
 */
export interface RelationshipDefaults {
  frequency: UpdateFrequency
  importance_threshold: ImportanceThreshold
  channels: DeliveryChannel[]
}

/**
 * Helper function to check if update importance meets recipient threshold
 */
export function meetsImportanceThreshold(
  updateImportance: UpdateImportance,
  recipientThreshold: ImportanceThreshold
): boolean {
  const importanceRank: Record<UpdateImportance, number> = {
    'all_updates': 0,
    'milestone': 1,
    'major_milestone': 2
  }

  const thresholdRank: Record<ImportanceThreshold, number> = {
    'all_updates': 0,
    'milestones_only': 1,
    'major_milestones_only': 2
  }

  return importanceRank[updateImportance] >= thresholdRank[recipientThreshold]
}

/**
 * Get default preferences based on relationship
 */
export function getRelationshipDefaults(relationship: RecipientRelationship): RelationshipDefaults {
  const defaults: Record<RecipientRelationship, RelationshipDefaults> = {
    grandparent: {
      frequency: 'daily_digest',
      importance_threshold: 'milestones_only',
      channels: ['email']
    },
    parent: {
      frequency: 'every_update',
      importance_threshold: 'all_updates',
      channels: ['email', 'sms']
    },
    sibling: {
      frequency: 'weekly_digest',
      importance_threshold: 'milestones_only',
      channels: ['email']
    },
    friend: {
      frequency: 'weekly_digest',
      importance_threshold: 'milestones_only',
      channels: ['email']
    },
    family: {
      frequency: 'weekly_digest',
      importance_threshold: 'milestones_only',
      channels: ['email']
    },
    colleague: {
      frequency: 'milestones_only',
      importance_threshold: 'major_milestones_only',
      channels: ['email']
    },
    other: {
      frequency: 'weekly_digest',
      importance_threshold: 'milestones_only',
      channels: ['email']
    }
  }

  return defaults[relationship] || defaults.other
}
