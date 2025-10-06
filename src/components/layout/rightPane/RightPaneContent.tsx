'use client'

/**
 * RightPaneContent Component
 * CRO-299: Right Pane - Other View Contexts
 * CRO-303: Performance Optimization & Code Splitting
 *
 * Content router for right pane that displays context-aware content
 * based on the active navigation view.
 *
 * Performance optimizations:
 * - Lazy loading with next/dynamic for all pane components
 * - Skeleton loading states during component load
 * - Reduced initial bundle size
 */

import dynamic from 'next/dynamic'
import { useNavigation } from '@/contexts/NavigationContext'
import { useDashboardActions } from '@/contexts/DashboardActionsContext'

// Lazy load all right pane components with loading states
const ActivityRightPane = dynamic(
  () => import('./ActivityRightPane').then(mod => ({ default: mod.ActivityRightPane })),
  { loading: () => <RightPaneSkeleton /> }
)

const DigestsRightPane = dynamic(
  () => import('./DigestsRightPane').then(mod => ({ default: mod.DigestsRightPane })),
  { loading: () => <RightPaneSkeleton /> }
)

const ChildrenRightPane = dynamic(
  () => import('./ChildrenRightPane').then(mod => ({ default: mod.ChildrenRightPane })),
  { loading: () => <RightPaneSkeleton /> }
)

const RecipientsRightPane = dynamic(
  () => import('./RecipientsRightPane').then(mod => ({ default: mod.RecipientsRightPane })),
  { loading: () => <RightPaneSkeleton /> }
)

const GroupsRightPane = dynamic(
  () => import('./GroupsRightPane').then(mod => ({ default: mod.GroupsRightPane })),
  { loading: () => <RightPaneSkeleton /> }
)

const DraftsRightPane = dynamic(
  () => import('./DraftsRightPane').then(mod => ({ default: mod.DraftsRightPane })),
  { loading: () => <RightPaneSkeleton /> }
)

const SettingsRightPane = dynamic(
  () => import('./SettingsRightPane').then(mod => ({ default: mod.SettingsRightPane })),
  { loading: () => <RightPaneSkeleton /> }
)

/**
 * Skeleton loading state for right pane components
 */
function RightPaneSkeleton() {
  return (
    <div className="h-full bg-white animate-pulse">
      <div className="p-4 space-y-4">
        <div className="h-8 bg-neutral-200 rounded" />
        <div className="h-32 bg-neutral-200 rounded" />
        <div className="h-24 bg-neutral-200 rounded" />
      </div>
    </div>
  )
}

export function RightPaneContent() {
  const { activeItemId } = useNavigation()
  const { onCreateUpdate, onCompileDigest } = useDashboardActions()

  const handleSelectAIPrompt = (prompt: { id: string; prompt: string; category: string }) => {
    // Open create update modal prefilled with prompt text
    onCreateUpdate?.(undefined, prompt.prompt)
  }

  switch (activeItemId) {
    case 'activity':
      return (
        <ActivityRightPane
          onCreateUpdate={onCreateUpdate}
          onCompileDigest={onCompileDigest}
          onSelectAIPrompt={handleSelectAIPrompt}
        />
      )
    case 'digests':
      return <DigestsRightPane />
    case 'children':
      return <ChildrenRightPane />
    case 'recipients':
      return <RecipientsRightPane />
    case 'groups':
      return <GroupsRightPane />
    case 'drafts':
      return <DraftsRightPane />
    case 'settings':
      return <SettingsRightPane />
    default:
      return (
        <div className="flex items-center justify-center h-full p-8 text-center text-neutral-500">
          <p className="text-sm">
            Context-aware tools and filters will appear here
          </p>
        </div>
      )
  }
}
