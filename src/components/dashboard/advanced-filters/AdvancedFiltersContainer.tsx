'use client'

import React, { useCallback, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ArchiveIcon, CalendarIcon, DeleteIcon, ExportIcon, PhotoIcon, StarIcon } from '@/components/icons'
import { useAdvancedFiltering } from '@/hooks/useAdvancedFiltering'
import type { SearchFilters } from '@/hooks/useSearchDebounced'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'

import { AdvancedFilterForm } from './AdvancedFilterForm'
import { BulkActionsPanel } from './BulkActionsPanel'
import { PresetList } from './PresetList'
import type {
  AdvancedFiltersProps,
  BulkAction,
  CustomDateRange,
  FilterPreset
} from './types'

const logger = createLogger('AdvancedFilters')

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  className,
  filters,
  onFiltersChange,
  onPresetSave,
  onPresetLoad,
  onPresetDelete,
  selectedItems = [],
  onBulkAction,
  showBulkActions = true,
  showPresets = true,
  showHistory = true,
  totalCount = 0,
  filteredCount = 0
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    start: '',
    end: ''
  })
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)
  const [confirmBulkAction, setConfirmBulkAction] = useState<string | null>(null)

  const {
    filterPresets,
    recentFilters,
    saveFilterPreset,
    deleteFilterPreset,
    clearFilterHistory,
    isLoading: filtersLoading
  } = useAdvancedFiltering()

  const bulkActions: BulkAction[] = useMemo(() => [
    {
      id: 'delete',
      label: 'Delete Selected',
      description: 'Permanently delete selected updates',
      icon: DeleteIcon,
      action: async (ids: string[]) => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        onBulkAction?.('delete', ids)
      },
      requiresConfirmation: true,
      confirmationMessage: `Are you sure you want to delete ${selectedItems.length} updates? This action cannot be undone.`,
      color: 'danger'
    },
    {
      id: 'export',
      label: 'Export Selected',
      description: 'Export selected updates as JSON/CSV',
      icon: ExportIcon,
      action: async (ids: string[]) => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        onBulkAction?.('export', ids)
      },
      color: 'primary'
    },
    {
      id: 'archive',
      label: 'Archive Selected',
      description: 'Archive selected updates',
      icon: ArchiveIcon,
      action: async (ids: string[]) => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        onBulkAction?.('archive', ids)
      },
      requiresConfirmation: true,
      confirmationMessage: `Archive ${selectedItems.length} updates? They can be restored later.`,
      color: 'warning'
    }
  ], [selectedItems.length, onBulkAction])

  const systemPresets: FilterPreset[] = useMemo(() => [
    {
      id: 'recent',
      name: 'Recent Updates',
      description: 'Updates from the last 7 days',
      filters: {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      },
      isSystem: true,
      icon: CalendarIcon
    },
    {
      id: 'photos-only',
      name: 'Photos Only',
      description: 'Updates containing photos',
      filters: {
        contentType: 'photo'
      },
      isSystem: true,
      icon: PhotoIcon
    },
    {
      id: 'milestones',
      name: 'Milestones',
      description: 'Important milestone updates',
      filters: {
        contentType: 'milestone'
      },
      isSystem: true,
      icon: StarIcon
    },
    {
      id: 'today',
      name: 'Today',
      description: 'Updates from today',
      filters: {
        dateRange: {
          start: new Date(new Date().setHours(0, 0, 0, 0)),
          end: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      isSystem: true,
      icon: CalendarIcon
    }
  ], [])

  const allPresets = useMemo(() => [
    ...systemPresets,
    ...filterPresets
  ], [systemPresets, filterPresets])

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return

    const preset = {
      name: presetName.trim(),
      description: `Custom filter: ${presetName.trim()}`,
      filters,
      usageCount: 0,
      lastUsed: new Date()
    }

    saveFilterPreset(preset)
    onPresetSave(preset)
    setPresetName('')
  }, [presetName, filters, saveFilterPreset, onPresetSave])

  const handleLoadPreset = useCallback((preset: FilterPreset) => {
    onPresetLoad(preset)
    onFiltersChange(preset.filters)
  }, [onPresetLoad, onFiltersChange])

  const handleDeletePreset = useCallback((presetId: string) => {
    deleteFilterPreset(presetId)
    onPresetDelete(presetId)
  }, [deleteFilterPreset, onPresetDelete])

  const handleBulkAction = useCallback(async (action: BulkAction) => {
    if (selectedItems.length === 0) return

    if (action.requiresConfirmation) {
      setConfirmBulkAction(action.id)
      return
    }

    setBulkActionLoading(action.id)
    try {
      await action.action(selectedItems)
    } catch (error) {
      logger.error('Bulk action failed', { error, actionId: action.id, selectedItems })
    } finally {
      setBulkActionLoading(null)
    }
  }, [selectedItems])

  const handleConfirmBulkAction = useCallback(async () => {
    const action = bulkActions.find(a => a.id === confirmBulkAction)
    if (!action) return

    setBulkActionLoading(action.id)
    setConfirmBulkAction(null)

    try {
      await action.action(selectedItems)
    } catch (error) {
      logger.error('Bulk action failed', { error, actionId: action.id, selectedItems })
    } finally {
      setBulkActionLoading(null)
    }
  }, [confirmBulkAction, bulkActions, selectedItems])

  const handleDateRangeChange = useCallback((field: 'start' | 'end', value: string) => {
    const newRange: CustomDateRange = { ...customDateRange, [field]: value }
    setCustomDateRange(newRange)

    if (newRange.start && newRange.end) {
      onFiltersChange({
        ...filters,
        dateRange: {
          start: new Date(newRange.start),
          end: new Date(newRange.end)
        }
      })
    }
  }, [customDateRange, filters, onFiltersChange])

  const handleClearFilters = useCallback(() => {
    onFiltersChange({} as SearchFilters)
    setCustomDateRange({ start: '', end: '' })
  }, [onFiltersChange])

  const hasActiveFilters = useMemo(() => Object.keys(filters).length > 0, [filters])

  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).reduce((count, key) => {
      const value = filters[key as keyof SearchFilters]
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        return count + 1
      }
      return count
    }, 0)
  }, [filters])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-neutral-600">
            {filteredCount !== totalCount ? (
              <>
                Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} updates
              </>
            ) : (
              <>
                {totalCount.toLocaleString()} updates
              </>
            )}
          </div>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearFilters}
            >
              Clear All
            </Button>
          )}
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
            aria-controls="advanced-filters-panel"
          >
            {showAdvanced ? 'Fewer filters' : 'More filters'}
          </Button>
        </div>
      </div>

      {showBulkActions && selectedItems.length > 0 && (
        <BulkActionsPanel
          actions={bulkActions}
          selectedCount={selectedItems.length}
          onAction={handleBulkAction}
          loadingActionId={bulkActionLoading}
        />
      )}

      {showPresets && (
        <PresetList
          presets={allPresets}
          filters={filters}
          onLoad={handleLoadPreset}
          onDelete={handleDeletePreset}
        />
      )}

      {showAdvanced && (
        <AdvancedFilterForm
          filters={filters}
          customDateRange={customDateRange}
          onDateRangeChange={handleDateRangeChange}
          onFiltersChange={onFiltersChange}
          hasActiveFilters={hasActiveFilters}
          presetName={presetName}
          onPresetNameChange={setPresetName}
          onSavePreset={handleSavePreset}
          filtersLoading={filtersLoading}
          showHistory={showHistory}
          recentFilters={recentFilters}
          onClearHistory={clearFilterHistory}
        />
      )}

      {confirmBulkAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Confirm Action
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              {bulkActions.find(a => a.id === confirmBulkAction)?.confirmationMessage}
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setConfirmBulkAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmBulkAction}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedFilters
