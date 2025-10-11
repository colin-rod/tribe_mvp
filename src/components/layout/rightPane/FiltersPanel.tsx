/**
 * FiltersPanel Component
 * CRO-298: Right Pane - Activity View Context
 *
 * Provides filtering controls for the Activity feed:
 * - Date range picker
 * - Child filter (multi-select)
 * - Memory type filter
 * - Search input
 * - Clear all filters button
 */

'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, X, User, FileText, Image, Video, Type, Flag } from 'lucide-react';
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
  memoryTypes: UpdateType[];
  onSearchChange: (query: string) => void;
  onDateRangeChange: (range: DateRange | null) => void;
  onChildIdsChange: (ids: string[]) => void;
  onMemoryTypesChange: (types: UpdateType[]) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

const UPDATE_TYPE_OPTIONS: { value: UpdateType; label: string; icon: typeof FileText }[] = [
  { value: 'photo', label: 'Photo', icon: Image },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'text', label: 'Text', icon: Type },
  { value: 'milestone', label: 'Milestone', icon: Flag },
];

export function FiltersPanel({
  searchQuery,
  dateRange,
  childIds,
  memoryTypes,
  onSearchChange,
  onDateRangeChange,
  onChildIdsChange,
  onMemoryTypesChange,
  onClearFilters,
  activeFilterCount,
}: FiltersPanelProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showChildFilter, setShowChildFilter] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    if (memoryTypes.includes(type)) {
      onMemoryTypesChange(memoryTypes.filter((t) => t !== type));
    } else {
      onMemoryTypesChange([...memoryTypes, type]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Header with Clear All */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Filters</h3>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Search Input - WCAG 2.1 AA Compliant (44px min height) */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          type="text"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 pr-12 h-11 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-neutral-600 rounded-md hover:bg-neutral-100"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Memory Type Icons - Selectable */}
      <div>
        <h4 className="text-xs font-medium text-neutral-700 mb-2">Memory Type</h4>
        <div className="grid grid-cols-4 gap-2">
          {UPDATE_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => toggleUpdateType(value)}
              className={cn(
                'flex flex-col items-center justify-center min-h-[60px] min-w-[44px] px-2 py-2 text-xs border rounded-lg',
                'hover:bg-neutral-50 transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                memoryTypes.includes(value)
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-neutral-300 text-neutral-600'
              )}
              title={label}
              aria-label={`Filter by ${label}`}
              aria-pressed={memoryTypes.includes(value)}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="grid grid-cols-3 gap-2">
        {/* Date Range Filter */}
        <div className="relative col-span-1">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={cn(
              'w-full flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-3 text-xs border rounded',
              'hover:bg-neutral-50 transition-colors',
              dateRange ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-neutral-300 text-neutral-600'
            )}
            title={dateRange ? `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')}` : 'Date range'}
            aria-label={dateRange ? `Filter by date range: ${format(dateRange.start, 'MMM d')} to ${format(dateRange.end, 'MMM d')}` : 'Filter by date range'}
          >
            <Calendar className="h-4 w-4" />
          </button>

          {/* Date Picker Dropdown */}
          {showDatePicker && (
            <div className="absolute z-10 mt-1 w-48 p-3 bg-white border border-neutral-200 rounded-md shadow-lg left-0">
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

        {/* Child Filter (advanced) */}
        {showAdvanced && (
        <div className="relative col-span-1">
          <button
            onClick={() => setShowChildFilter(!showChildFilter)}
            className={cn(
              'w-full flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-3 text-xs border rounded',
              'hover:bg-neutral-50 transition-colors',
              childIds.length > 0 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-neutral-300 text-neutral-600'
            )}
            title={childIds.length > 0 ? `${childIds.length} child(ren)` : 'All children'}
            aria-label={childIds.length > 0 ? `Filter by children: ${childIds.length} selected` : 'Filter by children'}
          >
            <User className="h-4 w-4" />
          </button>

          {/* Child Dropdown */}
          {showChildFilter && (
            <div className="absolute z-10 mt-1 w-48 bg-white border border-neutral-200 rounded-md shadow-lg max-h-60 overflow-y-auto left-0">
              {loading ? (
                <div className="p-4 flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : children.length === 0 ? (
                <div className="p-4 text-xs text-neutral-500 text-center">
                  No children found
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => toggleChild(child.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded',
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
        )}

      </div>

      {/* Advanced toggle */}
      <div className="flex items-center justify-end">
        <button
          className="text-xs text-neutral-600 hover:text-neutral-800 font-medium"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          aria-controls="advanced-filters-rightpane"
        >
          {showAdvanced ? 'Fewer filters' : 'More filters'}
        </button>
      </div>

      {/* Active Filters Display */}
      {(childIds.length > 0 || memoryTypes.length > 0 || dateRange) && (
        <div className="flex flex-wrap gap-1.5">
          {childIds.length > 0 &&
            children
              .filter((child) => childIds.includes(child.id))
              .map((child) => (
                <Badge
                  key={child.id}
                  variant="secondary"
                  className="flex items-center gap-1.5 text-xs px-2 py-1"
                >
                  {child.name}
                  <button
                    onClick={() => toggleChild(child.id)}
                    className="p-1 rounded hover:bg-neutral-300 hover:text-neutral-900 transition-colors"
                    aria-label={`Remove ${child.name} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

          {memoryTypes.map((type) => (
            <Badge key={type} variant="secondary" className="flex items-center gap-1.5 text-xs px-2 py-1">
              {type}
              <button
                onClick={() => toggleUpdateType(type)}
                className="p-1 rounded hover:bg-neutral-300 hover:text-neutral-900 transition-colors"
                aria-label={`Remove ${type} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {dateRange && (
            <Badge variant="secondary" className="flex items-center gap-1.5 text-xs px-2 py-1">
              {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d')}
              <button
                onClick={() => onDateRangeChange(null)}
                className="p-1 rounded hover:bg-neutral-300 hover:text-neutral-900 transition-colors"
                aria-label="Remove date range filter"
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
