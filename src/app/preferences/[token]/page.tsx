import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import PreferencesPageClient from './PreferencesPageClient'
import { getRecipientByTokenServer } from '@/lib/preference-server'

export const metadata: Metadata = {
  title: 'Update Your Preferences - Tribe',
  description: 'Manage your baby update preferences',
  robots: 'noindex, nofollow',
}

interface PreferencesPageProps {
  params: Promise<{
    token: string
  }>
}

export default async function PreferencesPage({ params }: PreferencesPageProps) {
  const { token } = await params

  // Validate token and get recipient data
  const recipient = await getRecipientByTokenServer(token)

  if (!recipient) {
    notFound()
  }

  return <PreferencesPageClient recipient={recipient} token={token} />
}