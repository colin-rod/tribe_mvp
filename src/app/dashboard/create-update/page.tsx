'use client'

import { useRouter } from 'next/navigation'
import CreateUpdateWizard from '@/components/updates/CreateUpdateWizard'

export default function CreateUpdatePage() {
  const router = useRouter()

  return (
    <CreateUpdateWizard
      variant="page"
      onCancel={() => router.push('/dashboard')}
      onSent={() => router.push('/dashboard?memory_sent=true')}
      onScheduled={() => router.push('/dashboard?scheduled=true')}
    />
  )
}
