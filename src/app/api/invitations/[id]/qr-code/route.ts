import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import {
  getInvitationById,
  generateInvitationQRCode
} from '@/lib/services/invitationService'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/invitations/[id]/qr-code
 *
 * Generate a QR code image for an invitation's redemption URL.
 * Supports both PNG (data URL) and SVG formats.
 * Only works for reusable link invitations.
 *
 * Query parameters:
 * - format: 'png' | 'svg' (default: 'png')
 * - size: number (default: 300, valid range: 100-1000)
 * - download: 'true' | 'false' (default: 'false') - if true, returns as downloadable file
 *
 * @returns QR code image (PNG data URL, SVG string, or file download)
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const format = (searchParams.get('format') || 'png') as 'png' | 'svg'
    const sizeParam = searchParams.get('size')
    const size = sizeParam ? Math.min(Math.max(parseInt(sizeParam, 10), 100), 1000) : 300
    const download = searchParams.get('download') === 'true'

    // Validate format
    if (format !== 'png' && format !== 'svg') {
      return NextResponse.json(
        { error: 'Invalid format. Must be "png" or "svg"' },
        { status: 400 }
      )
    }

    // Fetch invitation to verify ownership
    const invitation = await getInvitationById(id, user.id)

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or you do not have permission to view it' },
        { status: 404 }
      )
    }

    // Validate invitation type (QR codes only make sense for reusable links)
    if (invitation.invitation_type !== 'reusable') {
      return NextResponse.json(
        { error: 'QR codes are only available for reusable link invitations' },
        { status: 400 }
      )
    }

    // Generate QR code
    const qrResult = await generateInvitationQRCode(
      invitation.token,
      format,
      { size }
    )

    if (!qrResult.success) {
      return NextResponse.json(
        { error: 'Failed to generate QR code', details: qrResult.error },
        { status: 500 }
      )
    }

    // If download mode, return as file
    if (download) {
      const filename = `invitation-${invitation.id.substring(0, 8)}.${format}`

      if (format === 'png') {
        // Convert data URL to buffer
        const base64Data = qrResult.data!.replace(/^data:image\/png;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'public, max-age=3600'
          }
        })
      } else {
        // SVG string
        return new NextResponse(qrResult.data, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'public, max-age=3600'
          }
        })
      }
    }

    // Return JSON response with QR code data
    return NextResponse.json({
      success: true,
      qrCode: {
        format,
        data: qrResult.data,
        contentType: qrResult.contentType,
        invitationUrl: qrResult.url
      },
      invitation: {
        id: invitation.id,
        token: invitation.token,
        type: invitation.invitation_type
      }
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error generating QR code:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}
