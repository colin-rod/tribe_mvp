import type React from 'react'

import type { SearchFilters } from '@/hooks/useSearchDebounced'

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

export interface AdvancedFiltersProps {
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

export type CustomDateRange = {
  start: string
  end: string
}
