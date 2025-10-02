import { Suspense } from 'react'
import InviteAcceptanceForm from './InviteAcceptanceForm'

interface PageProps {
  params: Promise<{ token: string }>
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
