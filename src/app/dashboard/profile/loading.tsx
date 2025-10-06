import { Skeleton } from '@/components/ui/SkeletonLoader'

/**
 * Loading state for profile page
 */
export default function ProfileLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-neutral-200 mb-6">
        <div className="flex space-x-8">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Profile Content */}
      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-6">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-32 mt-2" />
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div>
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div>
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-6">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-24" />
        </div>
      </div>
    </div>
  )
}
