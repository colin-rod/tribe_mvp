import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

import type { BulkAction } from './types'

interface BulkActionsPanelProps {
  actions: BulkAction[]
  selectedCount: number
  onAction: (action: BulkAction) => void
  loadingActionId: string | null
}

export function BulkActionsPanel({
  actions,
  selectedCount,
  onAction,
  loadingActionId
}: BulkActionsPanelProps) {
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="text-sm text-blue-800">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </div>
        <div className="flex items-center space-x-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={
                action.color === 'danger'
                  ? 'destructiveOutline'
                  : action.color === 'warning'
                    ? 'secondary'
                    : 'primary'
              }
              size="sm"
              onClick={() => onAction(action)}
              disabled={loadingActionId === action.id}
              className="flex items-center space-x-1"
            >
              {loadingActionId === action.id ? (
                <LoadingSpinner size="sm" />
              ) : (
                <action.icon className="w-3 h-3" />
              )}
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
