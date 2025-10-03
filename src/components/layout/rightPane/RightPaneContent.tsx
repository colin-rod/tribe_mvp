'use client'

/**
 * RightPaneContent Component
 * CRO-299: Right Pane - Other View Contexts
 *
 * Content router for right pane that displays context-aware content
 * based on the active navigation view.
 */

import { useNavigation } from '@/contexts/NavigationContext'
import { ActivityRightPane } from './ActivityRightPane'
import { DigestsRightPane } from './DigestsRightPane'
import { ChildrenRightPane } from './ChildrenRightPane'
import { RecipientsRightPane } from './RecipientsRightPane'
import { GroupsRightPane } from './GroupsRightPane'
import { DraftsRightPane } from './DraftsRightPane'
import { SettingsRightPane } from './SettingsRightPane'

export function RightPaneContent() {
  const { activeItemId } = useNavigation()

  switch (activeItemId) {
    case 'activity':
      return <ActivityRightPane />
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
