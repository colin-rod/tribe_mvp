import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import {
  getInvitationById,
  sendInvitation
} from '@/lib/services/invitationService'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/invitations/[id]/send
 *
 * Send (or resend) an invitation via email, SMS, or WhatsApp.
 * Only applicable for single-use invitations with a recipient_email or recipient_phone.
 * Reusable links are shared manually via the link/QR code.
 *
 * Request body (optional):
 * {
 *   channel?: 'email' | 'sms' | 'whatsapp', // Override the invitation's default channel
 *   customMessage?: string                   // Override the invitation's custom message
 * }
 *
 * @returns { success: true, deliveryResult: { success: boolean, messageId?: string, error?: string } }
 */
export async function POST(
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

    // Fetch invitation to verify ownership and validate it can be sent
    const invitation = await getInvitationById(id, user.id)

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or you do not have permission to send it' },
        { status: 404 }
      )
    }

    // Validate invitation type
    if (invitation.invitation_type !== 'single_use') {
      return NextResponse.json(
        { error: 'Only single-use invitations can be sent. Reusable links are shared via the link or QR code.' },
        { status: 400 }
      )
    }

    // Validate invitation status
    if (invitation.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot send ${invitation.status} invitation` },
        { status: 400 }
      )
    }

    // Validate recipient information
    if (!invitation.recipient_email && !invitation.recipient_phone) {
      return NextResponse.json(
        { error: 'Invitation must have recipient_email or recipient_phone to be sent' },
        { status: 400 }
      )
    }

    // Parse request body for optional overrides
    const body = await request.json().catch(() => ({}))
    const channelOverride = body.channel as 'email' | 'sms' | 'whatsapp' | undefined
    const customMessageOverride = body.customMessage as string | undefined

    // Determine channel to use (filter out 'link' as it's not a sendable channel)
    const invitationChannel = invitation.channel === 'link' ? null : invitation.channel
    const channelToUse = channelOverride || invitationChannel

    if (!channelToUse) {
      return NextResponse.json(
        { error: 'No channel specified for sending invitation' },
        { status: 400 }
      )
    }

    // Validate channel matches recipient information
    if (channelToUse === 'email' && !invitation.recipient_email) {
      return NextResponse.json(
        { error: 'Cannot send email invitation without recipient_email' },
        { status: 400 }
      )
    }

    if ((channelToUse === 'sms' || channelToUse === 'whatsapp') && !invitation.recipient_phone) {
      return NextResponse.json(
        { error: `Cannot send ${channelToUse} invitation without recipient_phone` },
        { status: 400 }
      )
    }

    // Send the invitation
    const deliveryResult = await sendInvitation(
      invitation,
      channelToUse,
      customMessageOverride
    )

    if (!deliveryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send invitation',
          details: deliveryResult.error
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deliveryResult,
      message: `Invitation sent via ${channelToUse}`,
      invitation: {
        id: invitation.id,
        token: invitation.token,
        channel: channelToUse
      }
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}
