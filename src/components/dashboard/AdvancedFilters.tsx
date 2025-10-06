'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAdvancedFiltering } from '@/hooks/useAdvancedFiltering'
import type { SearchFilters } from '@/hooks/useSearchDebounced'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AdvancedFilters')

export interface FilterPreset {
  id: string
  name: string
  description: string
  filters: SearchFilters
  isDefault?: boolean
  isSystem?: boolean
  usageCount?: number
  lastUsed?: Date
  icon?: React.ComponentType<{ className?: string }>
}

export interface BulkAction {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: (selectedIds: string[]) => Promise<void>
  requiresConfirmation?: boolean
  confirmationMessage?: string
  color?: 'primary' | 'danger' | 'warning'
}

interface AdvancedFiltersProps {
  className?: string
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onPresetSave: (preset: Omit<FilterPreset, 'id'>) => void
  onPresetLoad: (preset: FilterPreset) => void
  onPresetDelete: (presetId: string) => void
  selectedItems?: string[]
  onBulkAction?: (actionId: string, selectedIds: string[]) => void
  showBulkActions?: boolean
  showPresets?: boolean
  showHistory?: boolean
  totalCount?: number
  filteredCount?: number
}

const CalendarIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const PhotoIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const StarIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
)

const DeleteIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const ExportIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const ArchiveIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6m0-6l-6 6M21 12H9m12 0l-3-3m3 3l-3 3" />
  </svg>
)

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
  // Progressive disclosure: collapse advanced by default
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [customDateRange, setCustomDateRange] = useState({
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

  // Default bulk actions
  const bulkActions: BulkAction[] = useMemo(() => [
    {
      id: 'delete',
      label: 'Delete Selected',
      description: 'Permanently delete selected updates',
      icon: DeleteIcon,
      action: async (ids: string[]) => {
        // Implement bulk delete logic
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
        // Implement bulk export logic
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
        // Implement bulk archive logic
        await new Promise(resolve => setTimeout(resolve, 1000))
        onBulkAction?.('archive', ids)
      },
      requiresConfirmation: true,
      confirmationMessage: `Archive ${selectedItems.length} updates? They can be restored later.`,
      color: 'warning'
    }
  ], [selectedItems.length, onBulkAction])

  // System filter presets
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

  // Combined presets
  const allPresets = useMemo(() => [
    ...systemPresets,
    ...filterPresets
  ], [systemPresets, filterPresets])

  // Handle preset save
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

  // Handle preset load
  const handleLoadPreset = useCallback((preset: FilterPreset) => {
    onPresetLoad(preset)
    onFiltersChange(preset.filters)
  }, [onPresetLoad, onFiltersChange])

  const handleDeletePreset = useCallback((presetId: string) => {
    deleteFilterPreset(presetId)
    onPresetDelete(presetId)
  }, [deleteFilterPreset, onPresetDelete])

  // Handle bulk action execution
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

  // Confirm bulk action
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

  // Handle date range changes
  const handleDateRangeChange = useCallback((field: 'start' | 'end', value: string) => {
    const newRange = { ...customDateRange, [field]: value }
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

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    onFiltersChange({})
    setCustomDateRange({ start: '', end: '' })
  }, [onFiltersChange])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).length > 0
  }, [filters])

  // Get active filter count
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
      {/* Filter Summary */}
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

      {/* Bulk Actions */}
      {showBulkActions && selectedItems.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
            </div>
            <div className="flex items-center space-x-2">
              {bulkActions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.color === 'danger' ? 'destructiveOutline' :
                          action.color === 'warning' ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => handleBulkAction(action)}
                  disabled={bulkActionLoading === action.id}
                  className="flex items-center space-x-1"
                >
                  {bulkActionLoading === action.id ? (
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
      )}

      {/* Quick Filter Presets */}
      {showPresets && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-neutral-700">Quick Filters</h3>
          <div className="flex flex-wrap gap-2">
            {allPresets.map((preset) => {
              const isActive = JSON.stringify(preset.filters) === JSON.stringify(filters)
              return (
                <button
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset)}
                  className={cn(
                    'inline-flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-800 border border-primary-200'
                      : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
                  )}
                >
                  {preset.icon && <preset.icon className="w-3 h-3" />}
                  <span>{preset.name}</span>
                  {preset.usageCount && preset.usageCount > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      {preset.usageCount}
                    </Badge>
                  )}
                  {!preset.isSystem && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDeletePreset(preset.id)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          handleDeletePreset(preset.id)
                        }
                      }}
                      aria-label={`Delete preset ${preset.name}`}
                      className="ml-2 text-xs text-neutral-500 hover:text-neutral-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 rounded"
                    >
                      ×
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div id="advanced-filters-panel" className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-4">
          {/* Date Range Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                From Date
              </label>
              <Input
                type="date"
                value={customDateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                To Date
              </label>
              <Input
                type="date"
                value={customDateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Content Type Filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Content Type
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Updates' },
                { value: 'photo', label: 'Photos' },
                { value: 'milestone', label: 'Milestones' },
                { value: 'video', label: 'Videos' },
                { value: 'text', label: 'Text Only' }
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => onFiltersChange({
                    ...filters,
                    contentType: type.value === 'all' ? undefined : type.value as ('photo' | 'text' | 'video' | 'milestone')
                  })}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    (filters.contentType === type.value ||
                     (type.value === 'all' && !filters.contentType))
                      ? 'bg-primary-100 text-primary-800 border border-primary-200'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save Current Filters as Preset */}
          {hasActiveFilters && (
            <div className="pt-4 border-t border-neutral-200">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Enter preset name..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim() || filtersLoading}
                  size="sm"
                >
                  {filtersLoading ? <LoadingSpinner size="sm" /> : 'Save Preset'}
                </Button>
              </div>
            </div>
          )}

          {/* Recent Filters */}
          {showHistory && recentFilters.length > 0 && (
            <div className="pt-4 border-t border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-neutral-700">Recent Filters</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilterHistory}
                  className="text-xs"
                >
                  Clear History
                </Button>
              </div>
              <div className="space-y-1">
                {recentFilters.slice(0, 5).map((filter, index) => (
                  <button
                    key={index}
                    onClick={() => onFiltersChange(filter.filters)}
                    className="block w-full text-left px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 rounded"
                  >
                    {filter.description || `Filter ${index + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
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
