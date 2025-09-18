'use client'

import { useState, useEffect } from 'react'
import { RecipientGroup } from '@/lib/recipient-groups'
import { RecipientFilters } from '@/lib/recipients'
import { RELATIONSHIP_OPTIONS } from '@/lib/validation/recipients'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface RecipientSearchProps {
  groups: RecipientGroup[]
  filters: RecipientFilters
  onFiltersChange: (filters: RecipientFilters) => void
  onClearFilters: () => void
  totalResults?: number
  loading?: boolean
}

export default function RecipientSearch({
  groups,
  filters,
  onFiltersChange,
  onClearFilters,
  totalResults,
  loading = false
}: RecipientSearchProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || '')
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(() => {
      onFiltersChange({ ...filters, search: localSearch.trim() || undefined })
    }, 300)

    setSearchTimeout(timeout)

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [localSearch])

  // Update local search when filters change externally
  useEffect(() => {
    setLocalSearch(filters.search || '')
  }, [filters.search])

  const handleGroupFilter = (groupId: string) => {
    onFiltersChange({
      ...filters,
      group_id: groupId === filters.group_id ? undefined : groupId
    })
  }

  const handleRelationshipFilter = (relationship: string) => {
    onFiltersChange({
      ...filters,
      relationship: relationship === filters.relationship ? undefined : relationship
    })
  }

  const handleStatusFilter = (isActive: boolean) => {
    onFiltersChange({
      ...filters,
      is_active: isActive === filters.is_active ? undefined : isActive
    })
  }

  const hasActiveFilters = !!(
    filters.search ||
    filters.group_id ||
    filters.relationship ||
    filters.is_active !== undefined
  )

  const activeFilterCount = [
    filters.search,
    filters.group_id,
    filters.relationship,
    filters.is_active !== undefined ? 'status' : null
  ].filter(Boolean).length

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Search & Filter Recipients</h3>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            disabled={loading}
          >
            Clear Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
        )}
      </div>

      {/* Search Input */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
          Search Recipients
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <Input
            id="search"
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pl-10"
            disabled={loading}
          />
          {localSearch && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Group Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Group
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {groups.map((group) => (
              <label key={group.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.group_id === group.id}
                  onChange={() => handleGroupFilter(group.id)}
                  disabled={loading}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-600 border-gray-300 rounded"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-900 truncate block">
                    {group.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {group.recipient_count} recipients
                    {group.is_default_group && ' • Default'}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Relationship Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Relationship
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {RELATIONSHIP_OPTIONS.map((relationship) => (
              <label key={relationship.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.relationship === relationship.value}
                  onChange={() => handleRelationshipFilter(relationship.value)}
                  disabled={loading}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-900">{relationship.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Status
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.is_active === true}
                onChange={() => handleStatusFilter(true)}
                disabled={loading}
                className="w-4 h-4 text-primary-600 focus:ring-primary-600 border-gray-300 rounded"
              />
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="text-sm text-gray-900">Active Recipients</span>
              </div>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.is_active === false}
                onChange={() => handleStatusFilter(false)}
                disabled={loading}
                className="w-4 h-4 text-primary-600 focus:ring-primary-600 border-gray-300 rounded"
              />
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-sm text-gray-900">Inactive Recipients</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Active filters:</span>

            {filters.search && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                Search: "{filters.search}"
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, search: undefined })}
                  className="ml-1 text-primary-600 hover:text-primary-800"
                  disabled={loading}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}

            {filters.group_id && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Group: {groups.find(g => g.id === filters.group_id)?.name}
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, group_id: undefined })}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  disabled={loading}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}

            {filters.relationship && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Relationship: {RELATIONSHIP_OPTIONS.find(r => r.value === filters.relationship)?.label}
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, relationship: undefined })}
                  className="ml-1 text-green-600 hover:text-green-800"
                  disabled={loading}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}

            {filters.is_active !== undefined && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Status: {filters.is_active ? 'Active' : 'Inactive'}
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, is_active: undefined })}
                  className="ml-1 text-gray-600 hover:text-gray-800"
                  disabled={loading}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {totalResults !== undefined && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {loading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Searching...</span>
              </span>
            ) : (
              <>
                {totalResults === 0 ? (
                  hasActiveFilters ? (
                    <span className="text-amber-600">No recipients match your current filters.</span>
                  ) : (
                    <span className="text-gray-500">No recipients found.</span>
                  )
                ) : (
                  <>
                    Showing {totalResults} {totalResults === 1 ? 'recipient' : 'recipients'}
                    {hasActiveFilters && ' matching your filters'}
                  </>
                )}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}