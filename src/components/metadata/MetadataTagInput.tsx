/**
 * MetadataTagInput Component
 * Tag input with autocomplete for adding metadata to memories
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { MetadataCategory, MetadataAutocompleteSuggestion } from '@/lib/types/memory'
import { getMetadataAutocomplete } from '@/lib/api/metadata'
import { MetadataBadge } from './MetadataBadge'

export interface MetadataTagInputProps {
  /** The metadata category */
  category: MetadataCategory
  /** Current tag values */
  values: string[]
  /** Callback when values change */
  onChange: (values: string[]) => void
  /** Label for the input */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Maximum number of tags allowed */
  maxTags?: number
  /** Maximum characters per tag */
  maxLength?: number
  /** Whether the input is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * MetadataTagInput provides tag entry with autocomplete from user's vocabulary
 * Touch-optimized for mobile devices
 */
export function MetadataTagInput({
  category,
  values,
  onChange,
  label,
  placeholder = 'Type to add...',
  maxTags = 10,
  maxLength = 50,
  disabled = false,
  className,
  size = 'md',
}: MetadataTagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<MetadataAutocompleteSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  const canAddMore = values.length < maxTags

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (!inputValue.trim() || !canAddMore) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce autocomplete requests
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await getMetadataAutocomplete(category, inputValue, 10)

        // Filter out values already selected
        const filteredSuggestions = response.suggestions.filter(
          (s) => !values.includes(s.value)
        )

        setSuggestions(filteredSuggestions)
        setShowSuggestions(filteredSuggestions.length > 0)
        setSelectedIndex(-1)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch autocomplete suggestions:', error)
        setSuggestions([])
      }
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [inputValue, category, values, canAddMore])

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addTag = (value: string) => {
    const trimmedValue = value.trim()
    if (!trimmedValue) return
    if (values.includes(trimmedValue)) return
    if (values.length >= maxTags) return
    if (trimmedValue.length > maxLength) return

    onChange([...values, trimmedValue])
    setInputValue('')
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const removeTag = (value: string) => {
    onChange(values.filter((v) => v !== value))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter key
    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex].value)
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
      return
    }

    // Handle Escape key
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
      return
    }

    // Handle Backspace on empty input
    if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      removeTag(values[values.length - 1])
      return
    }

    // Handle Arrow Down
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
      return
    }

    // Handle Arrow Up
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      return
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setInputValue(value)
    }
  }

  const sizeClasses = {
    sm: 'text-sm py-1.5',
    md: 'text-base py-2',
    lg: 'text-lg py-2.5',
  }

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {label}
          {values.length > 0 && (
            <span className="ml-2 text-xs text-neutral-500">
              ({values.length}/{maxTags})
            </span>
          )}
        </label>
      )}

      {/* Tags Display + Input */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5',
          'border border-neutral-300 rounded-lg',
          'bg-white',
          'px-3',
          sizeClasses[size],
          'focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500',
          'transition-colors',
          disabled && 'bg-neutral-50 cursor-not-allowed opacity-60',
          // Touch-friendly minimum height
          'min-h-[44px]'
        )}
      >
        {/* Existing Tags */}
        {values.map((value) => (
          <MetadataBadge
            key={value}
            value={value}
            category={category}
            removable={!disabled}
            onRemove={removeTag}
            size="sm"
          />
        ))}

        {/* Input Field */}
        {canAddMore && !disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            placeholder={values.length === 0 ? placeholder : ''}
            disabled={disabled}
            className={cn(
              'flex-1 min-w-[120px] outline-none bg-transparent',
              'placeholder:text-neutral-400',
              disabled && 'cursor-not-allowed'
            )}
            aria-label={`Add ${category}`}
            aria-autocomplete="list"
          />
        )}

        {!canAddMore && (
          <span className="text-xs text-neutral-500 italic">
            Maximum {maxTags} tags reached
          </span>
        )}
      </div>

      {/* Autocomplete Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          id={`${category}-suggestions`}
          role="listbox"
          className={cn(
            'absolute z-50 w-full mt-1',
            'bg-white rounded-lg shadow-lg border border-neutral-200',
            'max-h-60 overflow-y-auto',
            // Smooth scrolling on mobile
            'overscroll-contain'
          )}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.value}
              id={`${category}-suggestion-${index}`}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => addTag(suggestion.value)}
              className={cn(
                'w-full px-4 py-3 text-left',
                'flex items-center justify-between gap-2',
                'hover:bg-neutral-50',
                'focus:bg-neutral-50 focus:outline-none',
                'transition-colors',
                // Touch-friendly size
                'min-h-[44px]',
                index === selectedIndex && 'bg-neutral-50',
                index !== suggestions.length - 1 && 'border-b border-neutral-100'
              )}
            >
              <span className="flex-1 truncate">{suggestion.value}</span>
              <span className="text-xs text-neutral-500">
                Used {suggestion.usage_count}x
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Character count for current input */}
      {inputValue && inputValue.length > maxLength * 0.8 && (
        <p className="mt-1 text-xs text-neutral-500">
          {inputValue.length}/{maxLength} characters
        </p>
      )}

      {/* Helper text */}
      {!disabled && values.length === 0 && (
        <p className="mt-1.5 text-xs text-neutral-500">
          Press Enter to add a tag, or select from suggestions
        </p>
      )}
    </div>
  )
}
