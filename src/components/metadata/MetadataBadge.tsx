/**
 * MetadataBadge Component
 * Displays a metadata tag with optional remove button
 */

import { cn } from '@/lib/utils'
import type { MetadataCategory } from '@/lib/types/memory'
import { X } from 'lucide-react'

export interface MetadataBadgeProps {
  /** The metadata value to display */
  value: string
  /** The category type (affects color) */
  category: MetadataCategory
  /** Whether the badge is removable */
  removable?: boolean
  /** Callback when remove button is clicked */
  onRemove?: (value: string) => void
  /** Whether the badge is clickable (for filtering) */
  onClick?: (value: string, category: MetadataCategory) => void
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Color mappings for different metadata categories
 */
const categoryColors: Record<MetadataCategory, { bg: string; text: string; hover: string; border: string }> = {
  milestones: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    hover: 'hover:bg-purple-200',
    border: 'border-purple-300',
  },
  locations: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    hover: 'hover:bg-blue-200',
    border: 'border-blue-300',
  },
  people: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    hover: 'hover:bg-green-200',
    border: 'border-green-300',
  },
  dates: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    hover: 'hover:bg-amber-200',
    border: 'border-amber-300',
  },
  custom: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-800',
    hover: 'hover:bg-neutral-200',
    border: 'border-neutral-300',
  },
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

/**
 * MetadataBadge displays a single metadata tag with category-specific styling
 */
export function MetadataBadge({
  value,
  category,
  removable = false,
  onRemove,
  onClick,
  className,
  size = 'md',
}: MetadataBadgeProps) {
  const colors = categoryColors[category]
  const isInteractive = !!onClick || removable

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onClick && !removable) {
      onClick(value, category)
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRemove) {
      onRemove(value)
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        sizeClasses[size],
        colors.bg,
        colors.text,
        isInteractive && 'cursor-pointer',
        onClick && !removable && colors.hover,
        className
      )}
      onClick={handleClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleClick(e as unknown as React.MouseEvent)
        }
      }}
      aria-label={`${category}: ${value}${removable ? ', press to remove' : onClick ? ', press to filter' : ''}`}
    >
      <span className="truncate max-w-[200px]">{value}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className={cn(
            'inline-flex items-center justify-center',
            'rounded-full',
            'hover:bg-black/10',
            'focus:outline-none focus:ring-2 focus:ring-black/20',
            'transition-colors',
            // Touch-friendly size (44px minimum tap target)
            'w-5 h-5 -mr-1',
            'md:w-4 md:h-4 md:-mr-0.5'
          )}
          aria-label={`Remove ${value}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

/**
 * MetadataBadgeGroup displays multiple badges for a category
 */
export interface MetadataBadgeGroupProps {
  /** Array of values to display */
  values: string[]
  /** The category type */
  category: MetadataCategory
  /** Label for the group */
  label?: string
  /** Whether badges are removable */
  removable?: boolean
  /** Callback when remove button is clicked */
  onRemove?: (value: string) => void
  /** Whether badges are clickable (for filtering) */
  onClick?: (value: string, category: MetadataCategory) => void
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Maximum number of badges to show before "+N more" */
  maxVisible?: number
}

export function MetadataBadgeGroup({
  values,
  category,
  label,
  removable,
  onRemove,
  onClick,
  className,
  size = 'md',
  maxVisible,
}: MetadataBadgeGroupProps) {
  if (!values || values.length === 0) return null

  const visibleValues = maxVisible ? values.slice(0, maxVisible) : values
  const hiddenCount = maxVisible && values.length > maxVisible ? values.length - maxVisible : 0

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <span className="text-xs font-medium text-neutral-600 capitalize">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {visibleValues.map((value) => (
          <MetadataBadge
            key={value}
            value={value}
            category={category}
            removable={removable}
            onRemove={onRemove}
            onClick={onClick}
            size={size}
          />
        ))}
        {hiddenCount > 0 && (
          <span className={cn(
            'inline-flex items-center rounded-full font-medium',
            'bg-neutral-100 text-neutral-600',
            sizeClasses[size]
          )}>
            +{hiddenCount} more
          </span>
        )}
      </div>
    </div>
  )
}
