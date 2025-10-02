/**
 * API Route: /api/invitations
 * Handles creating and listing invitations
 * CRO-242: Invitation System
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import {
  createSingleUseInvitation,
  createReusableLink,
  getUserInvitations
} from '@/lib/services/invitationService'
import {
  createSingleUseInvitationSchema,
  createReusableLinkSchema,
  invitationFiltersSchema
} from '@/lib/validation/invitations'
import { createLogger } from '@/lib/logger'

const logger = createLogger('InvitationsAPI')

/**
 * POST /api/invitations
 * Create a new invitation (single-use or reusable)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Determine invitation type based on payload
    const invitationType = body.invitationType || (body.email || body.phone ? 'single_use' : 'reusable')

    if (invitationType === 'single_use') {
      // Validate single-use invitation data
      const validation = createSingleUseInvitationSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validation.error.issues
          },
          { status: 400 }
        )
      }

      // Create single-use invitation
      const invitation = await createSingleUseInvitation({
        parentId: user.id,
        email: validation.data.email,
        phone: validation.data.phone,
        channel: validation.data.channel,
        groupId: validation.data.groupId,
        customMessage: validation.data.customMessage,
        expiresInDays: validation.data.expiresInDays
      })

      logger.info('Created single-use invitation', {
        invitationId: invitation.id,
        channel: invitation.channel
      })

      return NextResponse.json(
        {
          success: true,
          invitation
        },
        { status: 201 }
      )
    } else {
      // Validate reusable link data
      const validation = createReusableLinkSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validation.error.issues
          },
          { status: 400 }
        )
      }

      // Create reusable link
      const invitation = await createReusableLink({
        parentId: user.id,
        groupId: validation.data.groupId,
        customMessage: validation.data.customMessage,
        qrCodeSettings: validation.data.qrCodeSettings
      })

      logger.info('Created reusable link', {
        invitationId: invitation.id
      })

      return NextResponse.json(
        {
          success: true,
          invitation
        },
        { status: 201 }
      )
    }
  } catch (error) {
    logger.errorWithStack('Error creating invitation', error as Error)

    return NextResponse.json(
      {
        error: 'Failed to create invitation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/invitations
 * List all invitations for the authenticated user
 * Supports filtering via query parameters
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters for filters
    const searchParams = request.nextUrl.searchParams
    const filters = {
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      channel: searchParams.get('channel') || undefined,
      search: searchParams.get('search') || undefined
    }

    // Validate filters
    const validation = invitationFiltersSchema.safeParse(filters)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid filters',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    // Get invitations
    const invitations = await getUserInvitations(user.id, validation.data)

    return NextResponse.json({
      success: true,
      invitations,
      count: invitations.length
    })
  } catch (error) {
    logger.errorWithStack('Error fetching invitations', error as Error)

    return NextResponse.json(
      {
        error: 'Failed to fetch invitations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
