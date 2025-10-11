/**
 * Memory Book Summary Detail Page
 * CRO-534: Memory Book Experience - Unified Dashboard Navigation
 *
 * Individual summary detail view within dashboard layout
 */

'use client'

import { use } from 'react'
import { MemoryBookDetailView } from '@/components/views/MemoryBookDetailView'

interface PageProps {
  params: Promise<{ summaryId: string }>
}

export default function MemoryBookSummaryPage({ params }: PageProps) {
  const { summaryId } = use(params)

  return <MemoryBookDetailView summaryId={summaryId} />
}
