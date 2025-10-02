import { NextRequest, NextResponse } from 'next/server'
import { validateInvitationToken } from '@/lib/services/invitationService'

interface RouteContext {
  params: Promise<{ token: string }>
}

/**
 * GET /api/invitations/validate/[token]
 *
 * Public endpoint to validate an invitation token.
 * Does NOT require authentication - anyone with the token can check validity.
 *
 * This is used by the public invitation acceptance page to show:
 * - Whether the invitation is valid
 * - Parent information (name, baby name)
 * - Custom message
 * - Expiration date (for single-use invitations)
 * - Error message if invalid
 *
 * @returns {
 *   valid: boolean,
 *   invitation?: {
 *     type: 'single_use' | 'reusable',
 *     parentName: string,
 *     babyName?: string,
 *     customMessage?: string,
 *     expiresAt?: string,
 *     groupId?: string
 *   },
 *   error?: string
 * }
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Get token from route params
    const { token } = await context.params

    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          error: 'No invitation token provided'
        },
        { status: 400 }
      )
    }

    // Validate the invitation token
    const validation = await validateInvitationToken(token)

    if (!validation || !validation.is_valid) {
      return NextResponse.json(
        {
          valid: false,
          error: validation?.validation_message || 'Invalid or expired invitation'
        },
        { status: 200 } // 200 with valid: false for better UX
      )
    }

    // Return validated invitation information
    return NextResponse.json({
      valid: true,
      invitation: {
        type: validation.invitation_type,
        parentName: validation.parent_name || 'A parent',
        babyName: validation.baby_name,
        customMessage: validation.custom_message,
        expiresAt: validation.expires_at,
        groupId: validation.group_id
      }
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error validating invitation:', error)
    return NextResponse.json(
      {
        valid: false,
        error: 'Failed to validate invitation'
      },
      { status: 500 }
    )
  }
}
