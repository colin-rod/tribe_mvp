import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import {
  getInvitationById,
  revokeInvitation,
  getInvitationRedemptions
} from '@/lib/services/invitationService'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/invitations/[id]
 *
 * Fetch detailed information about a specific invitation including redemption history.
 * Requires authentication - only the parent who created the invitation can view it.
 *
 * @returns {
 *   success: true,
 *   invitation: Invitation,
 *   redemptions: InvitationRedemption[]
 * }
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Authenticate user
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get invitation ID from route params
    const { id } = await context.params

    // Fetch invitation details
    const invitation = await getInvitationById(id, user.id)

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or you do not have permission to view it' },
        { status: 404 }
      )
    }

    // Fetch redemption history
    const redemptions = await getInvitationRedemptions(id)

    return NextResponse.json({
      success: true,
      invitation,
      redemptions,
      stats: {
        total_redemptions: redemptions.length,
        use_count: invitation.use_count
      }
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching invitation details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation details' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/invitations/[id]
 *
 * Revoke an invitation, preventing any future redemptions.
 * Single-use invitations that are already used cannot be revoked.
 * Requires authentication - only the parent who created the invitation can revoke it.
 *
 * @returns { success: true, invitation: Invitation }
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Authenticate user
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get invitation ID from route params
    const { id } = await context.params

    // Revoke the invitation
    const result = await revokeInvitation(id, user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      invitation: result.invitation,
      message: 'Invitation revoked successfully'
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error revoking invitation:', error)
    return NextResponse.json(
      { error: 'Failed to revoke invitation' },
      { status: 500 }
    )
  }
}
