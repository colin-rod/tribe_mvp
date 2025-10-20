import type { Metadata } from 'next'
import { Suspense } from 'react'
import InviteAcceptanceForm from './InviteAcceptanceForm'

const FALLBACK_IMAGE_PATH = '/placeholder-child.png'

interface InvitationMetadata {
  parentName: string
  babyName?: string | null
  customMessage?: string | null
}

interface ValidationResponse {
  valid: boolean
  invitation?: InvitationMetadata
}

interface PageProps {
  params: Promise<{ token: string }>
}

function getAppUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)

  return envUrl ?? 'http://localhost:3000'
}

async function getInvitationDetails(token: string) {
  if (!token) {
    return null
  }

  try {
    const appUrl = getAppUrl()
    const requestUrl = new URL(
      `/api/invitations/validate/${encodeURIComponent(token)}`,
      appUrl
    )
    const response = await fetch(
      requestUrl,
      {
        headers: {
          Accept: 'application/json'
        },
        cache: 'no-store'
      }
    )

    if (!response.ok) {
      return null
    }

    const validation = (await response.json()) as ValidationResponse

    if (!validation.valid || !validation.invitation) {
      return null
    }

    return validation.invitation
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Failed to load invitation metadata', error)
    }
    return null
  }
}

function buildDescription(invitation: InvitationMetadata) {
  const segments: string[] = []

  segments.push(`${invitation.parentName} invited you to join their Tribe.`)

  if (invitation.babyName) {
    segments.push(`Follow ${invitation.babyName}'s journey together.`)
  }

  if (invitation.customMessage?.trim()) {
    segments.push(invitation.customMessage.trim())
  }

  return segments.join(' ')
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const appUrl = getAppUrl()
  const invitationUrl = new URL(`/invite/${encodeURIComponent(token)}`, appUrl).toString()
  const imageUrl = new URL(FALLBACK_IMAGE_PATH, appUrl).toString()

  const invitation = await getInvitationDetails(token)

  if (!invitation) {
    const fallbackTitle = 'Join Tribe - Private Family Sharing'
    const fallbackDescription =
      'Create a private space to keep family and friends up to date with secure baby updates.'

    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        url: invitationUrl,
        type: 'website',
        siteName: 'Tribe',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: 'Tribe invitation preview'
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title: fallbackTitle,
        description: fallbackDescription,
        images: [imageUrl]
      }
    }
  }

  const normalizedInvitation: InvitationMetadata = {
    parentName: invitation.parentName || 'A parent',
    babyName: invitation.babyName?.trim() || undefined,
    customMessage: invitation.customMessage?.trim() || undefined
  }

  const title = `${normalizedInvitation.parentName} invited you to join Tribe`
  const description = buildDescription(normalizedInvitation)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: invitationUrl,
      type: 'website',
      siteName: 'Tribe',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'Tribe invitation preview'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl]
    }
  }
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <InviteAcceptanceForm token={token} />
      </Suspense>
    </div>
  )
}
