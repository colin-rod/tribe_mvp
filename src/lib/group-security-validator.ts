import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const logger = createLogger('GroupSecurityValidator')

interface QuietHoursSettings {
  start?: string
  end?: string
}

interface NotificationSettings {
  quiet_hours?: QuietHoursSettings
  digest_day?: string
  preferred_channels?: string[]
  [key: string]: unknown
}

interface SanitizableGroupInput {
  name?: string
  default_channels?: string[]
  content_types?: string[]
  [key: string]: unknown
}

interface GroupOperation {
  type: string
  recipient_id?: string
  group_id?: string
  settings?: {
    preferred_channels?: string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

type GroupSecurityEventDetails = Record<string, unknown>

/**
 * Input validation schemas for group management
 */
export const groupCreationSchema = z.object({
  name: z.string()
    .min(1, 'Group name is required')
    .max(100, 'Group name too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Group name contains invalid characters'),
  default_frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']).optional(),
  default_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).optional(),
  notification_settings: z.object({
    email_notifications: z.boolean().optional(),
    sms_notifications: z.boolean().optional(),
    push_notifications: z.boolean().optional(),
    quiet_hours: z.object({
      start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).optional(),
    digest_day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
    batch_updates: z.boolean().optional()
  }).optional()
})

export const groupUpdateSchema = groupCreationSchema.partial()

export const membershipUpdateSchema = z.object({
  notification_frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']).optional(),
  preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).optional(),
  content_types: z.array(z.enum(['photos', 'text', 'milestones'])).optional(),
  role: z.enum(['member', 'admin']).optional()
})

export const bulkMembershipSchema = z.object({
  recipient_ids: z.array(z.string().uuid()).min(1, 'At least one recipient required').max(50, 'Too many recipients'),
  default_settings: membershipUpdateSchema.optional()
})

export const recipientGroupSettingsSchema = z.object({
  group_id: z.string().uuid(),
  notification_frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']).optional(),
  preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).optional(),
  content_types: z.array(z.enum(['photos', 'text', 'milestones'])).optional()
})

/**
 * Security validation class for group operations
 */
export class GroupSecurityValidator {
  /**
   * Validate group name uniqueness and safety
   */
  static validateGroupName(name: string, userId: string, existingNames: string[]): string[] {
    const issues: string[] = []

    // Check for profanity or inappropriate content
    const inappropriateTerms = ['admin', 'system', 'root', 'test', 'debug']
    if (inappropriateTerms.some(term => name.toLowerCase().includes(term))) {
      issues.push('Group name contains restricted terms')
    }

    // Check uniqueness
    if (existingNames.some(existing => existing.toLowerCase() === name.toLowerCase())) {
      issues.push('Group name already exists')
    }

    // Check length constraints
    if (name.length < 1) {
      issues.push('Group name cannot be empty')
    }
    if (name.length > 100) {
      issues.push('Group name too long (max 100 characters)')
    }

    return issues
  }

  /**
   * Validate notification settings for security and consistency
   */
  static validateNotificationSettings(settings: NotificationSettings): string[] {
    const issues: string[] = []

    if (settings.quiet_hours) {
      const { start, end } = settings.quiet_hours
      if (start && end) {
        const startMinutes = this.timeToMinutes(start)
        const endMinutes = this.timeToMinutes(end)

        if (startMinutes === null || endMinutes === null) {
          issues.push('Invalid quiet hours format')
        }
      }
    }

    // Validate digest day
    if (settings.digest_day) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      if (!validDays.includes(settings.digest_day.toLowerCase())) {
        issues.push('Invalid digest day')
      }
    }

    return issues
  }

  /**
   * Validate bulk operations for safety
   */
  static validateBulkOperation(operation: string, count: number, userId: string): string[] {
    const issues: string[] = []

    // Rate limiting based on operation type
    const limits = {
      bulk_add_members: 50,
      bulk_update_settings: 100,
      bulk_remove_members: 30
    }

    const limit = limits[operation as keyof typeof limits] || 10
    if (count > limit) {
      issues.push(`Bulk operation exceeds limit of ${limit} items`)
    }

    // Additional validation for specific operations
    if (operation === 'bulk_add_members' && count > 20) {
      logger.warn(`Large bulk add operation by user ${userId}: ${count} members`)
    }

    return issues
  }

  /**
   * Validate recipient access permissions
   */
  static validateRecipientAccess(
    recipientId: string,
    groupId: string,
    operation: 'view' | 'update' | 'leave',
    context: { token?: string; userId?: string }
  ): string[] {
    const issues: string[] = []

    // Token-based access validation
    if (context.token && !context.userId) {
      // Additional token security checks could go here
      if (operation === 'leave' && !this.allowSelfRemoval(groupId)) {
        issues.push('Self-removal not allowed for this group')
      }
    }

    // Parent access validation
    if (context.userId && !context.token) {
      // Parent should own both recipient and group
      // This is handled at the database level, but additional checks can go here
    }

    return issues
  }

  /**
   * Sanitize user input for group operations
   */
  static sanitizeGroupInput<T extends SanitizableGroupInput>(input: T): T {
    const sanitized: T & SanitizableGroupInput = { ...input }

    // Sanitize group name
    if (sanitized.name) {
      sanitized.name = sanitized.name.trim().replace(/\s+/g, ' ')
    }

    // Ensure arrays are properly formatted
    if (sanitized.default_channels && Array.isArray(sanitized.default_channels)) {
      sanitized.default_channels = Array.from(
        new Set(
          sanitized.default_channels.filter((channel): channel is string => typeof channel === 'string')
        )
      )
    }

    if (sanitized.content_types && Array.isArray(sanitized.content_types)) {
      sanitized.content_types = Array.from(
        new Set(
          sanitized.content_types.filter((type): type is string => typeof type === 'string')
        )
      )
    }

    return sanitized
  }

  /**
   * Check if operation exceeds user limits
   */
  static checkUserLimits(userId: string, operation: string, currentCount: number): string[] {
    const issues: string[] = []

    const limits = {
      max_groups: 25,
      max_recipients_per_group: 100,
      max_custom_groups: 20
    }

    switch (operation) {
      case 'create_group':
        if (currentCount >= limits.max_groups) {
          issues.push(`Maximum number of groups (${limits.max_groups}) reached`)
        }
        break
      case 'add_recipients':
        if (currentCount >= limits.max_recipients_per_group) {
          issues.push(`Maximum recipients per group (${limits.max_recipients_per_group}) reached`)
        }
        break
    }

    return issues
  }

  /**
   * Validate that group operations maintain data consistency
   */
  static validateDataConsistency(operation: GroupOperation): string[] {
    const issues: string[] = []

    // Check for circular references or invalid relationships
    if (operation.type === 'add_member') {
      const { recipient_id, group_id } = operation
      if (recipient_id === group_id) {
        issues.push('Invalid recipient-group relationship')
      }
    }

    // Check for conflicting settings
    if (operation.settings) {
      if (operation.settings.preferred_channels?.includes('sms') &&
          !operation.settings.preferred_channels?.includes('email')) {
        logger.warn('SMS-only notification preference detected')
      }
    }

    return issues
  }

  /**
   * Private helper methods
   */
  private static timeToMinutes(time: string): number | null {
    const match = time.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null

    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null
    }

    return hours * 60 + minutes
  }

  private static allowSelfRemoval(_groupId: string): boolean {
    // In a real implementation, this would check the group's access settings
    // For now, assume self-removal is allowed for non-default groups
    return true
  }
}

/**
 * Audit trail for group security events
 */
export interface GroupSecurityEvent {
  event_type: 'group_created' | 'group_deleted' | 'member_added' | 'member_removed' | 'settings_changed' | 'access_denied'
  user_id?: string
  recipient_id?: string
  group_id?: string
  details: GroupSecurityEventDetails
  timestamp: string
  ip_address?: string
  user_agent?: string
  success: boolean
  error_message?: string
}

export class GroupSecurityAuditor {
  private static events: GroupSecurityEvent[] = []

  static logEvent(event: Omit<GroupSecurityEvent, 'timestamp'>): void {
    const auditEvent: GroupSecurityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    }

    this.events.push(auditEvent)

    // Log security events
    if (!event.success) {
      logger.warn('Group security event failed', auditEvent)
    } else {
      logger.info('Group security event', auditEvent)
    }

    // In production, you'd want to send these to a security monitoring system
    this.trimEvents()
  }

  static getEvents(userId?: string, limit: number = 100): GroupSecurityEvent[] {
    let filteredEvents = this.events

    if (userId) {
      filteredEvents = this.events.filter(e => e.user_id === userId)
    }

    return filteredEvents.slice(-limit)
  }

  private static trimEvents(): void {
    // Keep only the last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }
  }

  static clearEvents(): void {
    this.events = []
  }
}

/**
 * Data Loss Prevention for group operations
 */
export class GroupDataLossPreventor {
  /**
   * Check if group deletion would cause data loss
   */
  static async validateGroupDeletion(_groupId: string): Promise<{
    canDelete: boolean
    warnings: string[]
    blockers: string[]
  }> {
    const warnings: string[] = []
    const blockers: string[] = []

    // These checks would be implemented with actual database queries
    const memberCount = 0 // await getMemberCount(groupId)
    const isDefault = false // await isDefaultGroup(groupId)
    const hasActiveDeliveries = false // await hasActiveDeliveries(groupId)

    if (isDefault) {
      blockers.push('Cannot delete default groups')
    }

    if (memberCount > 0) {
      warnings.push(`Group has ${memberCount} active members who will be reassigned`)
    }

    if (hasActiveDeliveries) {
      warnings.push('Group has pending delivery jobs that will be affected')
    }

    return {
      canDelete: blockers.length === 0,
      warnings,
      blockers
    }
  }

  /**
   * Create backup before destructive operations
   */
  static async createGroupBackup(groupId: string): Promise<{ backupId: string; data: GroupSecurityEventDetails }> {
    // In a real implementation, this would create a backup of group data
    const backupId = `backup_${groupId}_${Date.now()}`

    logger.info(`Creating group backup: ${backupId}`)

    return {
      backupId,
      data: {
        // group data would be serialized here
        timestamp: new Date().toISOString(),
        groupId
      }
    }
  }
}
