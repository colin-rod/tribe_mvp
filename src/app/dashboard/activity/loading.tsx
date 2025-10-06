import { TimelineSkeleton } from '@/components/ui/SkeletonLoader'

/**
 * Loading state for activity feed page
 */
export default function ActivityLoading() {
  return (
    <div className="p-6">
      <TimelineSkeleton count={12} compact />
    </div>
  )
}
