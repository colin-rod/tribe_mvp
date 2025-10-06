import { GridSkeleton } from '@/components/ui/SkeletonLoader'

/**
 * Loading state for children page
 */
export default function ChildrenLoading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-96 bg-neutral-200 rounded animate-pulse" />
      </div>
      <GridSkeleton columns={3} count={6} aspectRatio="square" />
    </div>
  )
}
