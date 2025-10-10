'use client'

import { useRouter } from 'next/navigation'
import CreateMemoryWizard from '@/components/updates/CreateMemoryWizard'

export default function CreateUpdatePage() {
  const router = useRouter()

  return (
    <CreateMemoryWizard
      variant="page"
      onCancel={() => router.push('/dashboard')}
      onMemorySent={() => router.push('/dashboard?memory_sent=true')}
      onMemoryScheduled={() => router.push('/dashboard?scheduled=true')}
    />
  )
}
