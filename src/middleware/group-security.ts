import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'

const logger = createLogger('GroupSecurity')

type RecipientGroupMembershipRow = {
  group_id: string
  is_active: boolean
}

type GroupSecurityHandlerContext = {
  params: Promise<{ groupId?: string; token?: string }>
}

type GroupAuditDetails = Record<string, unknown>

/**
 * Security context for group operations
 */
export interface GroupSecurityContext {
  user_id: string
  group_id: string
  access_level: 'owner' | 'member' | 'none'
  can_modify: boolean
  can_view: boolean
}

/**
 * Token-based security context for recipient access
 */
export interface RecipientSecurityContext {
  recipient_id: string
  token: string
  parent_id: string
  groups: string[]
  can_modify_settings: boolean
}

/**
 * Validate parent access to group resources
 */
export async function validateParentGroupAccess(
  groupId: string,
  userId?: string
): Promise<GroupSecurityContext> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Get authenticated user if not provided
  if (!userId) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Authentication required')
    }
    userId = user.id
  }

  // Check group ownership
  const { data: group, error } = await supabase
    .from('recipient_groups')
    .select('id, parent_id, name')
    .eq('id', groupId)
    .single()

  if (error || !group) {
    return {
      user_id: userId,
      group_id: groupId,
      access_level: 'none',
      can_modify: false,
      can_view: false
    }
  }

  const isOwner = group.parent_id === userId

  return {
    user_id: userId,
    group_id: groupId,
    access_level: isOwner ? 'owner' : 'none',
    can_modify: isOwner,
    can_view: isOwner
  }
}

/**
 * Validate recipient token access to their groups
 */
export async function validateRecipientTokenAccess(
  token: string
): Promise<RecipientSecurityContext> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Validate token and get recipient
  const { data: recipient, error } = await supabase
    .from('recipients')
    .select(`
      id,
      parent_id,
      group_memberships!inner(
        group_id,
        is_active
      )
    `)
    .eq('preference_token', token)
    .eq('is_active', true)
    .single()

  if (error || !recipient) {
    throw new Error('Invalid or expired access token')
  }

  // Get active group memberships
  const activeGroups = Array.isArray(recipient.group_memberships)
    ? (recipient.group_memberships as RecipientGroupMembershipRow[])
        .filter(membership => membership.is_active)
        .map(membership => membership.group_id)
    : []

  return {
    recipient_id: recipient.id,
    token,
    parent_id: recipient.parent_id,
    groups: activeGroups,
    can_modify_settings: true
  }
}

/**
 * Middleware for protecting group management API routes
 */
export function withGroupSecurity() {
  return async (
    request: NextRequest,
    context: GroupSecurityHandlerContext,
    handler: (
      req: NextRequest,
      ctx: GroupSecurityHandlerContext,
      security: GroupSecurityContext | RecipientSecurityContext
    ) => Promise<NextResponse>
  ) => {
    try {
      const params = await context.params

      // Determine access pattern - parent auth vs token auth
      if (params.token) {
        // Token-based recipient access
        const securityContext = await validateRecipientTokenAccess(params.token)
        return handler(request, context, securityContext)
      } else if (params.groupId) {
        // Parent authenticated access
        const securityContext = await validateParentGroupAccess(params.groupId)

        if (!securityContext.can_view) {
          return NextResponse.json(
            { error: 'Group not found or access denied' },
            { status: 404 }
          )
        }

        return handler(request, context, securityContext)
      } else {
        // Generic authenticated access
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }

        return handler(request, context, {
          user_id: user.id,
          group_id: '',
          access_level: 'owner' as const,
          can_modify: true,
          can_view: true
        })
      }
    } catch (error) {
      logger.errorWithStack('Group security validation failed:', error as Error)
      return NextResponse.json(
        { error: 'Access validation failed' },
        { status: 403 }
      )
    }
  }
}

/**
 * Rate limiting for group operations
 */
export class GroupOperationRateLimit {
  private static operations = new Map<string, { count: number; resetTime: number }>()
  private static readonly LIMITS = {
    create_group: { max: 10, windowMs: 60000 }, // 10 groups per minute
    add_members: { max: 50, windowMs: 60000 }, // 50 member additions per minute
    update_settings: { max: 100, windowMs: 60000 }, // 100 setting updates per minute
  }

  static check(userId: string, operation: keyof typeof GroupOperationRateLimit.LIMITS): boolean {
    const key = `${userId}:${operation}`
    const now = Date.now()
    const limit = this.LIMITS[operation]

    const current = this.operations.get(key)

    if (!current || now > current.resetTime) {
      // Reset or initialize counter
      this.operations.set(key, {
        count: 1,
        resetTime: now + limit.windowMs
      })
      return true
    }

    if (current.count >= limit.max) {
      return false
    }

    current.count++
    return true
  }
}

/**
 * Audit logging for group operations
 */
export interface GroupAuditLog {
  user_id: string
  operation: string
  group_id?: string
  recipient_id?: string
  details: GroupAuditDetails
  timestamp: string
  ip_address?: string
  user_agent?: string
}

export async function logGroupOperation(
  request: NextRequest,
  operation: string,
  userId: string,
  details: GroupAuditDetails
): Promise<void> {
  try {
    const auditLog: GroupAuditLog = {
      user_id: userId,
      operation,
      details,
      timestamp: new Date().toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    }

    // Log to your preferred audit system
    logger.info('Group operation audit', auditLog as any)

    // Could also store in database for compliance
    // await storeAuditLog(auditLog)
  } catch (error) {
    logger.errorWithStack('Failed to log group operation:', error as Error)
  }
}
