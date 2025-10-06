import { Skeleton } from '@/components/ui/SkeletonLoader'

/**
 * Loading state for settings page
 */
export default function SettingsLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="space-y-8">
        {/* Settings Sections */}
        {[1, 2, 3, 4].map((section) => (
          <div key={section} className="bg-white rounded-lg border border-neutral-200 p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-4">
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-11 w-full" />
              </div>
              <div>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
          </div>
        ))}

        {/* Save Button */}
        <div className="flex justify-end">
          <Skeleton className="h-11 w-32" />
        </div>
      </div>
    </div>
  )
}
