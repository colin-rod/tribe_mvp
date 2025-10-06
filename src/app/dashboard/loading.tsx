import { DashboardHeroSkeleton, TimelineSkeleton } from '@/components/ui/SkeletonLoader'

/**
 * Loading state for main dashboard page
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <DashboardHeroSkeleton />
      <TimelineSkeleton count={5} />
    </div>
  )
}
