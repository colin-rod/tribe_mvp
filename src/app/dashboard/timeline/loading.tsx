import { TimelineSkeleton } from '@/components/ui/SkeletonLoader'

/**
 * Loading state for timeline page
 */
export default function TimelineLoading() {
  return (
    <div className="p-6">
      <TimelineSkeleton count={10} compact />
    </div>
  )
}
