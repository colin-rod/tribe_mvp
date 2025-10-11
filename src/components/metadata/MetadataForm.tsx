/**
 * MetadataForm Component
 * Complete form for adding/editing metadata across all categories
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { MemoryMetadata } from '@/lib/types/memory'
import { MetadataTagInput } from './MetadataTagInput'
import { MapPin, Users, Calendar, Award } from 'lucide-react'

export interface MetadataFormProps {
  /** Current metadata values */
  metadata: MemoryMetadata
  /** Callback when metadata changes */
  onChange: (metadata: MemoryMetadata) => void
  /** Whether the form is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Whether to show all categories or minimal set */
  compact?: boolean
}

const defaultMetadata: MemoryMetadata = {
  milestones: [],
  locations: [],
  dates: [],
  people: [],
  custom: {},
}

/**
 * MetadataForm provides a comprehensive interface for editing memory metadata
 */
export function MetadataForm({
  metadata = defaultMetadata,
  onChange,
  disabled = false,
  className,
  compact = false,
}: MetadataFormProps) {
  const handleCategoryChange = (
    category: keyof Omit<MemoryMetadata, 'custom'>,
    values: string[]
  ) => {
    onChange({
      ...metadata,
      [category]: values,
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Milestones */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-purple-600" />
          <MetadataTagInput
            category="milestones"
            values={metadata.milestones}
            onChange={(values) => handleCategoryChange('milestones', values)}
            label="Milestones"
            placeholder="e.g., first steps, first words..."
            disabled={disabled}
            size="md"
          />
        </div>
        {!compact && (
          <p className="text-xs text-neutral-500 ml-6">
            Mark special achievements and developmental milestones
          </p>
        )}
      </div>

      {/* Locations */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <MetadataTagInput
            category="locations"
            values={metadata.locations}
            onChange={(values) => handleCategoryChange('locations', values)}
            label="Locations"
            placeholder="e.g., park, grandma's house..."
            disabled={disabled}
            size="md"
          />
        </div>
        {!compact && (
          <p className="text-xs text-neutral-500 ml-6">
            Add places where this memory happened
          </p>
        )}
      </div>

      {/* People */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-green-600" />
          <MetadataTagInput
            category="people"
            values={metadata.people}
            onChange={(values) => handleCategoryChange('people', values)}
            label="People"
            placeholder="e.g., Grandma, Uncle John..."
            disabled={disabled}
            size="md"
          />
        </div>
        {!compact && (
          <p className="text-xs text-neutral-500 ml-6">
            Tag people who were present or mentioned
          </p>
        )}
      </div>

      {/* Dates (optional - less commonly used) */}
      {!compact && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <MetadataTagInput
              category="dates"
              values={metadata.dates}
              onChange={(values) => handleCategoryChange('dates', values)}
              label="Significant Dates (optional)"
              placeholder="e.g., 2024-10-11..."
              disabled={disabled}
              size="md"
            />
          </div>
          <p className="text-xs text-neutral-500 ml-6">
            Add specific dates mentioned in this memory
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * MetadataFormSection is a collapsible section wrapper for metadata forms
 */
export interface MetadataFormSectionProps {
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Whether the section starts expanded */
  defaultExpanded?: boolean
  /** Metadata form props */
  metadata: MemoryMetadata
  onChange: (metadata: MemoryMetadata) => void
  disabled?: boolean
  compact?: boolean
  className?: string
}

export function MetadataFormSection({
  title = 'Add Tags & Details',
  description = 'Help organize and find this memory later',
  defaultExpanded = true,
  metadata,
  onChange,
  disabled,
  compact,
  className,
}: MetadataFormSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const hasAnyMetadata =
    metadata.milestones.length > 0 ||
    metadata.locations.length > 0 ||
    metadata.people.length > 0 ||
    metadata.dates.length > 0

  const metadataCount =
    metadata.milestones.length +
    metadata.locations.length +
    metadata.people.length +
    metadata.dates.length

  return (
    <div className={cn('border border-neutral-200 rounded-lg', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between',
          'hover:bg-neutral-50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500',
          'rounded-t-lg'
        )}
        aria-expanded={isExpanded}
        aria-controls="metadata-form-content"
      >
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-900">{title}</span>
            {hasAnyMetadata && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                {metadataCount}
              </span>
            )}
          </div>
          {description && (
            <span className="text-sm text-neutral-600">{description}</span>
          )}
        </div>
        <svg
          className={cn(
            'w-5 h-5 text-neutral-500 transition-transform',
            isExpanded && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div
          id="metadata-form-content"
          className="px-4 pb-4 border-t border-neutral-200"
        >
          <div className="pt-4">
            <MetadataForm
              metadata={metadata}
              onChange={onChange}
              disabled={disabled}
              compact={compact}
            />
          </div>
        </div>
      )}
    </div>
  )
}
