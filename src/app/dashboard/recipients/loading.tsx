import { StaggeredListSkeleton } from '@/components/ui/SkeletonLoader'

/**
 * Loading state for recipients page
 */
export default function RecipientsLoading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-96 bg-neutral-200 rounded animate-pulse" />
      </div>
      <StaggeredListSkeleton count={8} itemHeight={100} showHeader spacing="md" />
    </div>
  )
}
