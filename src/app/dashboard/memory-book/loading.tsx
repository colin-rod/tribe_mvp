/**
 * Memory Book Loading State
 * CRO-534: Memory Book Experience
 */

import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner size="lg" />
    </div>
  )
}
