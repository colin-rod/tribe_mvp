'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filtersRef = useRef(filters)

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      const trimmedSearch = localSearch.trim() || undefined

      if (trimmedSearch === filtersRef.current.search) {
        return
      }

      onFiltersChange({
        ...filtersRef.current,
        search: trimmedSearch
      })
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }
    }
  }, [localSearch, onFiltersChange])

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
            variant="secondary"
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

      {/* Quick Status Filters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleStatusFilter(true)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              filters.is_active === true
                ? 'bg-primary-100 text-primary-800 border-primary-200'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => handleStatusFilter(false)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              filters.is_active === false
                ? 'bg-primary-100 text-primary-800 border-primary-200'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {showAdvanced ? 'Showing advanced filters' : 'More filters available'}
        </div>
        <Button
          variant="tertiary"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          aria-controls="recipient-advanced-filters"
        >
          {showAdvanced ? 'Fewer filters' : 'More filters'}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div id="recipient-advanced-filters" className="grid grid-cols-1 md:grid-cols-2 gap-4" role="region" aria-label="Advanced recipient filters">
          {/* Group Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Group
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleGroupFilter(group.id)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    filters.group_id === group.id
                      ? 'bg-primary-100 text-primary-800 border-primary-200'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                  title={`${group.recipient_count} recipients`}
                >
                  {group.name}
                </button>
              ))}
            </div>
          </div>

          {/* Relationship Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Relationship
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {RELATIONSHIP_OPTIONS.map((relationship) => (
                <button
                  key={relationship.value}
                  type="button"
                  onClick={() => handleRelationshipFilter(relationship.value)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    filters.relationship === relationship.value
                      ? 'bg-primary-100 text-primary-800 border-primary-200'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {relationship.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Active filters:</span>

            {filters.search && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                Search: {filters.search}
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
