import { useId } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'

import type { SearchFilters } from '@/hooks/useSearchDebounced'
import type { CustomDateRange } from './types'

interface AdvancedFilterFormProps {
  filters: SearchFilters
  customDateRange: CustomDateRange
  onDateRangeChange: (field: 'start' | 'end', value: string) => void
  onFiltersChange: (filters: SearchFilters) => void
  hasActiveFilters: boolean
  presetName: string
  onPresetNameChange: (value: string) => void
  onSavePreset: () => void
  filtersLoading: boolean
  showHistory: boolean
  recentFilters: Array<{ filters: SearchFilters; description?: string }>
  onClearHistory: () => void
}

const contentTypeOptions = [
  { value: 'all', label: 'All Updates' },
  { value: 'photo', label: 'Photos' },
  { value: 'milestone', label: 'Milestones' },
  { value: 'video', label: 'Videos' },
  { value: 'text', label: 'Text Only' }
] as const

export function AdvancedFilterForm({
  filters,
  customDateRange,
  onDateRangeChange,
  onFiltersChange,
  hasActiveFilters,
  presetName,
  onPresetNameChange,
  onSavePreset,
  filtersLoading,
  showHistory,
  recentFilters,
  onClearHistory
}: AdvancedFilterFormProps) {
  const fromDateId = useId()
  const toDateId = useId()

  return (
    <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor={fromDateId}>
            From Date
          </label>
          <Input
            type="date"
            value={customDateRange.start}
            onChange={(event) => onDateRangeChange('start', event.target.value)}
            className="w-full"
            id={fromDateId}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor={toDateId}>
            To Date
          </label>
          <Input
            type="date"
            value={customDateRange.end}
            onChange={(event) => onDateRangeChange('end', event.target.value)}
            className="w-full"
            id={toDateId}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Content Type
        </label>
        <div className="flex flex-wrap gap-2">
          {contentTypeOptions.map((type) => (
            <button
              key={type.value}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  contentType:
                    type.value === 'all'
                      ? undefined
                      : (type.value as 'photo' | 'text' | 'video' | 'milestone')
                })
              }
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                filters.contentType === type.value || (type.value === 'all' && !filters.contentType)
                  ? 'bg-primary-100 text-primary-800 border border-primary-200'
                  : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="pt-4 border-t border-neutral-200">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Enter preset name..."
              value={presetName}
              onChange={(event) => onPresetNameChange(event.target.value)}
              className="flex-1"
            />
            <Button onClick={onSavePreset} disabled={!presetName.trim() || filtersLoading} size="sm">
              {filtersLoading ? <LoadingSpinner size="sm" /> : 'Save Preset'}
            </Button>
          </div>
        </div>
      )}

      {showHistory && recentFilters.length > 0 && (
        <div className="pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-neutral-700">Recent Filters</h4>
            <Button variant="ghost" size="sm" onClick={onClearHistory} className="text-xs">
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
  )
}
