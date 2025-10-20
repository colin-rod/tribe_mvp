import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

import type { FilterPreset } from './types'
import type { SearchFilters } from '@/hooks/useSearchDebounced'

interface PresetListProps {
  presets: FilterPreset[]
  filters: SearchFilters
  onLoad: (preset: FilterPreset) => void
  onDelete: (presetId: string) => void
}

const areFiltersEqual = (a: SearchFilters, b: SearchFilters) =>
  JSON.stringify(a) === JSON.stringify(b)

export function PresetList({ presets, filters, onLoad, onDelete }: PresetListProps) {
  if (presets.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-neutral-700">Quick Filters</h3>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = areFiltersEqual(preset.filters, filters)

          return (
            <button
              key={preset.id}
              onClick={() => onLoad(preset)}
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
                    onDelete(preset.id)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      onDelete(preset.id)
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
  )
}
