'use client'

import { cn } from '@/lib/utils'
import { ReactNode, useId } from 'react'

export interface IconOption<T extends string = string> {
  value: T
  label: string
  description?: string
  icon?: ReactNode
  emoji?: string
  disabled?: boolean
}

export interface IconOptionSelectorProps<T extends string = string> {
  /** List of options to display */
  options: IconOption<T>[]
  /** Currently selected value(s) */
  value: T | T[]
  /** Callback when selection changes */
  onChange: (value: T | T[]) => void
  /** Selection mode */
  mode?: 'single' | 'multi'
  /** Grid layout configuration */
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  /** Size of the option cards */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show descriptions */
  showDescription?: boolean
  /** Custom className */
  className?: string
  /** Accessible name for the group */
  ariaLabel?: string
  /** ID referencing the element that labels this selector */
  ariaLabelledBy?: string
  /** ID referencing the element that describes this selector */
  ariaDescribedBy?: string
  /** Optional prefix for generated option IDs */
  idPrefix?: string
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Optional badge content to show on options */
  badges?: Record<T, ReactNode>
}

/**
 * IconOptionSelector Component
 *
 * A reusable component for selecting options using visual icons/emojis
 * instead of traditional dropdowns or radio buttons.
 *
 * Features:
 * - Single or multi-select modes
 * - Responsive grid layout
 * - Icons or emojis for visual representation
 * - Full keyboard navigation support
 * - ARIA accessibility
 *
 * @example
 * // Single select with icons
 * <IconOptionSelector
 *   options={[
 *     { value: 'daily', label: 'Daily', icon: <CalendarIcon />, description: 'Every day' },
 *     { value: 'weekly', label: 'Weekly', icon: <CalendarIcon />, description: 'Once a week' }
 *   ]}
 *   value="daily"
 *   onChange={setValue}
 *   mode="single"
 * />
 *
 * @example
 * // Multi-select with emojis
 * <IconOptionSelector
 *   options={[
 *     { value: 'photos', label: 'Photos', emoji: '📸' },
 *     { value: 'videos', label: 'Videos', emoji: '🎥' }
 *   ]}
 *   value={['photos']}
 *   onChange={setValues}
 *   mode="multi"
 * />
 */
export function IconOptionSelector<T extends string = string>({
  options,
  value,
  onChange,
  mode = 'single',
  columns = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  },
  size = 'md',
  showDescription = true,
  className,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  idPrefix,
  disabled = false,
  badges,
}: IconOptionSelectorProps<T>) {
  const selectedValues = Array.isArray(value) ? value : [value]
  const generatedIdPrefix = useId()
  const selectorIdPrefix = idPrefix ?? generatedIdPrefix

  const handleOptionClick = (optionValue: T) => {
    if (disabled) return

    if (mode === 'single') {
      onChange(optionValue)
    } else {
      // Multi-select mode
      const currentValues = Array.isArray(value) ? value : []
      if (currentValues.includes(optionValue)) {
        onChange(currentValues.filter(v => v !== optionValue) as T[])
      } else {
        onChange([...currentValues, optionValue] as T[])
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, optionValue: T, index: number) => {
    const gridCols = getGridColumns()

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        handleOptionClick(optionValue)
        break
      case 'ArrowRight':
        e.preventDefault()
        focusOption(index + 1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        focusOption(index - 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        focusOption(index + gridCols)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusOption(index - gridCols)
        break
      case 'Home':
        e.preventDefault()
        focusOption(0)
        break
      case 'End':
        e.preventDefault()
        focusOption(options.length - 1)
        break
    }
  }

  const focusOption = (index: number) => {
    if (index < 0 || index >= options.length) return

    const option = options[index]
    const element = document.querySelector(`[data-option-value="${option.value}"]`) as HTMLElement
    element?.focus()
  }

  const getGridColumns = (): number => {
    if (typeof window === 'undefined') return columns.mobile || 1
    if (window.innerWidth >= 1024) return columns.desktop || 3
    if (window.innerWidth >= 640) return columns.tablet || 2
    return columns.mobile || 1
  }

  // Size classes
  const sizeClasses = {
    sm: 'p-3 gap-2',
    md: 'p-4 gap-3',
    lg: 'p-5 gap-4',
  }

  const iconSizeClasses = {
    sm: 'w-5 h-5 text-lg',
    md: 'w-6 h-6 text-2xl',
    lg: 'w-8 h-8 text-3xl',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  // Grid classes
  const gridClass = cn(
    'grid gap-3',
    columns.mobile === 1 && 'grid-cols-1',
    columns.mobile === 2 && 'grid-cols-2',
    columns.mobile === 3 && 'grid-cols-3',
    columns.mobile === 4 && 'grid-cols-4',
    columns.tablet === 1 && 'sm:grid-cols-1',
    columns.tablet === 2 && 'sm:grid-cols-2',
    columns.tablet === 3 && 'sm:grid-cols-3',
    columns.tablet === 4 && 'sm:grid-cols-4',
    columns.desktop === 1 && 'lg:grid-cols-1',
    columns.desktop === 2 && 'lg:grid-cols-2',
    columns.desktop === 3 && 'lg:grid-cols-3',
    columns.desktop === 4 && 'lg:grid-cols-4'
  )

  return (
    <div
      className={cn('space-y-3', className)}
      role={mode === 'multi' ? 'group' : 'radiogroup'}
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      <div className={gridClass}>
        {options.map((option, index) => {
          const isSelected = selectedValues.includes(option.value)
          const isDisabled = disabled || option.disabled
          const optionIdBase = `${selectorIdPrefix}-${option.value}`
          const optionLabelId = `${optionIdBase}-label`
          const optionDescriptionId = option.description && showDescription
            ? `${optionIdBase}-description`
            : undefined
          const isTabStop = isSelected || (!selectedValues.length && index === 0)

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionClick(option.value)}
              onKeyDown={(e) => handleKeyDown(e, option.value, index)}
              disabled={isDisabled}
              role={mode === 'multi' ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              aria-disabled={isDisabled}
              aria-labelledby={optionLabelId}
              aria-describedby={optionDescriptionId}
              data-option-value={option.value}
              tabIndex={isTabStop ? 0 : -1}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-lg border-2 transition-all duration-200',
                sizeClasses[size],
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                isSelected
                  ? 'border-primary-600 bg-primary-50 text-primary-900 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                isDisabled && 'opacity-50 cursor-not-allowed hover:border-gray-200 hover:bg-white',
                !isDisabled && 'cursor-pointer'
              )}
            >
              {/* Badge */}
              {badges?.[option.value] && (
                <div className="absolute -top-2 -right-2">
                  {badges[option.value]}
                </div>
              )}

              {/* Icon or Emoji */}
              {(option.icon || option.emoji) && (
                <div className={cn('flex items-center justify-center', iconSizeClasses[size])}>
                  {option.emoji ? (
                    <span className="select-none" aria-hidden="true">
                      {option.emoji}
                    </span>
                  ) : (
                    <div className={cn('transition-colors', isSelected ? 'text-primary-600' : 'text-gray-500')}>
                      {option.icon}
                    </div>
                  )}
                </div>
              )}

              {/* Label */}
              <div
                id={optionLabelId}
                className={cn('font-medium text-center', textSizeClasses[size])}
              >
                {option.label}
              </div>

              {/* Description */}
              {showDescription && option.description && (
                <div
                  id={optionDescriptionId}
                  className="text-xs text-gray-500 text-center mt-1"
                >
                  {option.description}
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-primary-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
