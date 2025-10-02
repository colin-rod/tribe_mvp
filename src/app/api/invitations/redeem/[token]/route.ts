import { NextRequest, NextResponse } from 'next/server'
import { redeemInvitation } from '@/lib/services/invitationService'
import { redeemInvitationSchema } from '@/lib/validation/invitations'

interface RouteContext {
  params: Promise<{ token: string }>
}

/**
 * POST /api/invitations/redeem/[token]
 *
 * Public endpoint to redeem an invitation and create a new recipient.
 * Does NOT require authentication - anyone with a valid token can redeem.
 *
 * Request body:
 * {
 *   name: string,                                    // Required
 *   email?: string,                                  // At least one required
 *   phone?: string,                                  // At least one required
 *   relationship: 'grandparent' | 'family' | 'friend' | 'other',
 *   frequency?: 'instant' | 'daily_digest' | 'weekly_digest',
 *   preferred_channels?: ('email' | 'sms' | 'whatsapp')[],
 *   content_types?: ('photos' | 'videos' | 'text' | 'milestones')[]
 * }
 *
 * @returns {
 *   success: true,
 *   recipient: { id, name, email, phone },
 *   message: string
 * }
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Get token from route params
    const { token } = await context.params

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'No invitation token provided'
        },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = redeemInvitationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    // Extract client information for tracking
    const ip_address = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip') ||
                       'unknown'

    const user_agent = request.headers.get('user-agent') || 'unknown'

    // Redeem the invitation
    const result = await redeemInvitation(token, {
      ...validation.data,
      ip_address,
      user_agent
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 400 }
      )
    }

    // Return success response
    return NextResponse.json({
      success: true,
      recipient: {
        id: result.recipient!.id,
        name: result.recipient!.name,
        email: result.recipient!.email,
        phone: result.recipient!.phone
      },
      message: 'Successfully joined! You will now receive baby updates.',
      redemption: {
        id: result.redemption!.id,
        redeemedAt: result.redemption!.redeemed_at
      }
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error redeeming invitation:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to redeem invitation. Please try again.'
      },
      { status: 500 }
    )
  }
}
