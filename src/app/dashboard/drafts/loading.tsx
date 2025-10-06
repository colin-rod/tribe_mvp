import { StaggeredListSkeleton } from '@/components/ui/SkeletonLoader'

/**
 * Loading state for drafts page
 */
export default function DraftsLoading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-96 bg-neutral-200 rounded animate-pulse" />
      </div>
      <StaggeredListSkeleton count={5} itemHeight={140} showHeader spacing="md" />
    </div>
  )
}
