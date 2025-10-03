/**
 * FiltersPanel Component
 * CRO-298: Right Pane - Activity View Context
 *
 * Provides filtering controls for the Activity feed:
 * - Date range picker
 * - Child filter (multi-select)
 * - Update type filter
 * - Search input
 * - Clear all filters button
 */

'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, X, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Child, getChildren } from '@/lib/children';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { UpdateType, DateRange } from '@/hooks/useActivityFilters';
import { cn } from '@/lib/utils';

export interface FiltersPanelProps {
  searchQuery: string;
  dateRange: DateRange | null;
  childIds: string[];
  updateTypes: UpdateType[];
  onSearchChange: (query: string) => void;
  onDateRangeChange: (range: DateRange | null) => void;
  onChildIdsChange: (ids: string[]) => void;
  onUpdateTypesChange: (types: UpdateType[]) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

const UPDATE_TYPE_OPTIONS: { value: UpdateType; label: string; icon: typeof FileText }[] = [
  { value: 'photo', label: 'Photo', icon: FileText },
  { value: 'video', label: 'Video', icon: FileText },
  { value: 'text', label: 'Text', icon: FileText },
  { value: 'milestone', label: 'Milestone', icon: FileText },
];

export function FiltersPanel({
  searchQuery,
  dateRange,
  childIds,
  updateTypes,
  onSearchChange,
  onDateRangeChange,
  onChildIdsChange,
  onUpdateTypesChange,
  onClearFilters,
  activeFilterCount,
}: FiltersPanelProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showChildFilter, setShowChildFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);

  // Load children on mount
  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const childrenData = await getChildren();
      setChildren(childrenData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle child selection
  const toggleChild = (childId: string) => {
    if (childIds.includes(childId)) {
      onChildIdsChange(childIds.filter((id) => id !== childId));
    } else {
      onChildIdsChange([...childIds, childId]);
    }
  };

  // Toggle update type selection
  const toggleUpdateType = (type: UpdateType) => {
    if (updateTypes.includes(type)) {
      onUpdateTypesChange(updateTypes.filter((t) => t !== type));
    } else {
      onUpdateTypesChange([...updateTypes, type]);
    }
  };

  return (
    <div className="p-4 space-y-4 border-b border-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Filters</h3>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 px-2 text-xs"
          >
            Clear all
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          type="text"
          placeholder="Search updates..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9 h-9 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="relative">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md',
            'hover:bg-neutral-50 transition-colors',
            dateRange ? 'border-blue-500 bg-blue-50' : 'border-neutral-300'
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-500" />
            <span className={dateRange ? 'text-blue-700' : 'text-neutral-600'}>
              {dateRange
                ? `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')}`
                : 'Date range'}
            </span>
          </div>
          {dateRange && (
            <X
              className="h-4 w-4 text-neutral-400 hover:text-neutral-600"
              onClick={(e) => {
                e.stopPropagation();
                onDateRangeChange(null);
              }}
            />
          )}
        </button>

        {/* Date Picker Dropdown - Simple version */}
        {showDatePicker && (
          <div className="absolute z-10 mt-1 w-full p-3 bg-white border border-neutral-200 rounded-md shadow-lg">
            <p className="text-xs text-neutral-500 mb-2">Date range picker coming soon</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDatePicker(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </div>

      {/* Child Filter */}
      <div className="relative">
        <button
          onClick={() => setShowChildFilter(!showChildFilter)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md',
            'hover:bg-neutral-50 transition-colors',
            childIds.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-neutral-300'
          )}
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-neutral-500" />
            <span className={childIds.length > 0 ? 'text-blue-700' : 'text-neutral-600'}>
              {childIds.length > 0 ? `${childIds.length} child(ren)` : 'All children'}
            </span>
          </div>
          {childIds.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {childIds.length}
            </Badge>
          )}
        </button>

        {/* Child Dropdown */}
        {showChildFilter && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 flex items-center justify-center">
                <LoadingSpinner size="sm" />
              </div>
            ) : children.length === 0 ? (
              <div className="p-4 text-sm text-neutral-500 text-center">
                No children found
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => toggleChild(child.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm rounded',
                      'hover:bg-neutral-50 transition-colors text-left',
                      childIds.includes(child.id) && 'bg-blue-50 text-blue-700'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={childIds.includes(child.id)}
                      onChange={() => toggleChild(child.id)}
                      className="rounded border-neutral-300"
                    />
                    <span className="flex-1">{child.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Update Type Filter */}
      <div className="relative">
        <button
          onClick={() => setShowTypeFilter(!showTypeFilter)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md',
            'hover:bg-neutral-50 transition-colors',
            updateTypes.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-neutral-300'
          )}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-neutral-500" />
            <span className={updateTypes.length > 0 ? 'text-blue-700' : 'text-neutral-600'}>
              {updateTypes.length > 0 ? `${updateTypes.length} type(s)` : 'All types'}
            </span>
          </div>
          {updateTypes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {updateTypes.length}
            </Badge>
          )}
        </button>

        {/* Type Dropdown */}
        {showTypeFilter && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg">
            <div className="p-2 space-y-1">
              {UPDATE_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleUpdateType(value)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded',
                    'hover:bg-neutral-50 transition-colors text-left',
                    updateTypes.includes(value) && 'bg-blue-50 text-blue-700'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={updateTypes.includes(value)}
                    onChange={() => toggleUpdateType(value)}
                    className="rounded border-neutral-300"
                  />
                  <span className="flex-1">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {(childIds.length > 0 || updateTypes.length > 0 || dateRange) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
          {childIds.length > 0 &&
            children
              .filter((child) => childIds.includes(child.id))
              .map((child) => (
                <Badge
                  key={child.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {child.name}
                  <button
                    onClick={() => toggleChild(child.id)}
                    className="hover:text-neutral-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

          {updateTypes.map((type) => (
            <Badge key={type} variant="secondary" className="flex items-center gap-1">
              {type}
              <button
                onClick={() => toggleUpdateType(type)}
                className="hover:text-neutral-900"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {dateRange && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d')}
              <button
                onClick={() => onDateRangeChange(null)}
                className="hover:text-neutral-900"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
