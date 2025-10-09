import { TimelineSkeleton } from '@/components/ui/SkeletonLoader'

/**
 * Loading state for updates list page
 */
export default function UpdatesLoading() {
  return (
    <div className="p-6">
      <TimelineSkeleton count={8} />
    </div>
  )
}
