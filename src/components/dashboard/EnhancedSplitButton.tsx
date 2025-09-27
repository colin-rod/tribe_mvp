'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { createLogger } from '@/lib/logger'

const logger = createLogger('EnhancedSplitButton')

export interface SplitButtonOption {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  shortcut?: string
  usageCount?: number
  isRecent?: boolean
  isPrimary?: boolean
  isNew?: boolean
  category?: string
  action: () => void | Promise<void>
}

export interface SplitButtonAnalytics {
  mostUsed: string[]
  recentlyUsed: string[]
  totalUsage: number
  userPatterns: {
    timeOfDayUsage: { [hour: string]: number }
    dayOfWeekUsage: { [day: string]: number }
    optionPreferences: { [optionId: string]: number }
  }
}

interface EnhancedSplitButtonProps {
  className?: string
  options: SplitButtonOption[]
  primaryAction?: SplitButtonOption
  buttonText?: string
  buttonIcon?: React.ComponentType<{ className?: string }>
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  showAnalytics?: boolean
  showRecentOptions?: boolean
  showKeyboardShortcuts?: boolean
  maxRecentOptions?: number
  onOptionSelect?: (option: SplitButtonOption) => void
  onAnalyticsUpdate?: (analytics: SplitButtonAnalytics) => void
}

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const PlusIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
)

const PhotoIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const VideoIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const StarIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
)

const TextIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const STORAGE_KEY = 'split_button_analytics'
const MAX_RECENT_OPTIONS = 5

export const EnhancedSplitButton: React.FC<EnhancedSplitButtonProps> = ({
  className,
  options: propOptions,
  primaryAction,
  buttonText = 'Create Update',
  buttonIcon: ButtonIcon = PlusIcon,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  showAnalytics = true,
  showRecentOptions = true,
  showKeyboardShortcuts = true,
  maxRecentOptions = MAX_RECENT_OPTIONS,
  onOptionSelect,
  onAnalyticsUpdate
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [analytics, setAnalytics] = useState<SplitButtonAnalytics>({
    mostUsed: [],
    recentlyUsed: [],
    totalUsage: 0,
    userPatterns: {
      timeOfDayUsage: {},
      dayOfWeekUsage: {},
      optionPreferences: {}
    }
  })
  const [loadingOption, setLoadingOption] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Default update type options with enhanced metadata
  const defaultOptions: SplitButtonOption[] = useMemo(() => [
    {
      id: 'photo',
      label: 'Photo Update',
      description: 'Share a photo with family and friends',
      icon: PhotoIcon,
      shortcut: 'P',
      isPrimary: true,
      category: 'media',
      action: () => {
        // Photo update logic
      }
    },
    {
      id: 'milestone',
      label: 'Milestone',
      description: 'Record a special achievement or moment',
      icon: StarIcon,
      shortcut: 'M',
      category: 'special',
      action: () => {
        // Milestone logic
      }
    },
    {
      id: 'video',
      label: 'Video Update',
      description: 'Share a video moment',
      icon: VideoIcon,
      shortcut: 'V',
      category: 'media',
      action: () => {
        // Video update logic
      }
    },
    {
      id: 'text',
      label: 'Text Update',
      description: 'Share a quick text update',
      icon: TextIcon,
      shortcut: 'T',
      category: 'basic',
      action: () => {
        // Text update logic
      }
    }
  ], [])

  const options = propOptions.length > 0 ? propOptions : defaultOptions

  // Load analytics from localStorage
  const loadAnalytics = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedAnalytics = JSON.parse(stored)
        setAnalytics(parsedAnalytics)
      }
    } catch (error) {
      logger.error('Error loading split button analytics', { error })
    }
  }, [])

  // Save analytics to localStorage
  const saveAnalytics = useCallback((newAnalytics: SplitButtonAnalytics) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAnalytics))
      setAnalytics(newAnalytics)
      onAnalyticsUpdate?.(newAnalytics)
    } catch (error) {
      logger.error('Error saving split button analytics', { error })
    }
  }, [onAnalyticsUpdate])

  // Update analytics when option is used
  const updateAnalytics = useCallback((optionId: string) => {
    const now = new Date()
    const hour = now.getHours().toString()
    const day = now.getDay().toString()

    const newAnalytics: SplitButtonAnalytics = {
      ...analytics,
      totalUsage: analytics.totalUsage + 1,
      recentlyUsed: [
        optionId,
        ...analytics.recentlyUsed.filter(id => id !== optionId)
      ].slice(0, maxRecentOptions),
      userPatterns: {
        timeOfDayUsage: {
          ...analytics.userPatterns.timeOfDayUsage,
          [hour]: (analytics.userPatterns.timeOfDayUsage[hour] || 0) + 1
        },
        dayOfWeekUsage: {
          ...analytics.userPatterns.dayOfWeekUsage,
          [day]: (analytics.userPatterns.dayOfWeekUsage[day] || 0) + 1
        },
        optionPreferences: {
          ...analytics.userPatterns.optionPreferences,
          [optionId]: (analytics.userPatterns.optionPreferences[optionId] || 0) + 1
        }
      }
    }

    // Update most used options
    const sortedByUsage = Object.entries(newAnalytics.userPatterns.optionPreferences)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id)
      .slice(0, 5)

    newAnalytics.mostUsed = sortedByUsage

    saveAnalytics(newAnalytics)
  }, [analytics, maxRecentOptions, saveAnalytics])

  // Handle option selection
  const handleOptionSelect = useCallback(async (option: SplitButtonOption) => {
    if (disabled || loadingOption) return

    setLoadingOption(option.id)
    setIsOpen(false)

    try {
      await option.action()
      updateAnalytics(option.id)
      onOptionSelect?.(option)
    } catch (error) {
      logger.error('Error executing option action', { error, optionId: option.id })
    } finally {
      setLoadingOption(null)
    }
  }, [disabled, loadingOption, updateAnalytics, onOptionSelect])

  // Handle primary action
  const handlePrimaryAction = useCallback(async () => {
    const primary = primaryAction || options.find(opt => opt.isPrimary) || options[0]
    if (primary) {
      await handleOptionSelect(primary)
    }
  }, [primaryAction, options, handleOptionSelect])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!showKeyboardShortcuts) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      // Cmd/Ctrl + letter shortcuts
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
        const option = options.find(opt => opt.shortcut?.toLowerCase() === event.key.toLowerCase())
        if (option) {
          event.preventDefault()
          handleOptionSelect(option)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [options, showKeyboardShortcuts, handleOptionSelect])

  // Load analytics on mount
  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // Enhanced options with usage data
  const enhancedOptions = useMemo(() => {
    return options.map(option => {
      const usageCount = analytics.userPatterns.optionPreferences[option.id] || 0
      const isRecent = analytics.recentlyUsed.includes(option.id)
      const isMostUsed = analytics.mostUsed.includes(option.id)

      return {
        ...option,
        usageCount,
        isRecent,
        isMostUsed
      }
    })
  }, [options, analytics])

  // Group options by category and usage patterns
  const groupedOptions = useMemo(() => {
    const groups: { [key: string]: typeof enhancedOptions } = {}

    // Most used section (if analytics enabled and we have usage data)
    if (showAnalytics && analytics.mostUsed.length > 0) {
      groups['Most Used'] = enhancedOptions
        .filter(opt => analytics.mostUsed.includes(opt.id))
        .sort((a, b) => {
          const aIndex = analytics.mostUsed.indexOf(a.id)
          const bIndex = analytics.mostUsed.indexOf(b.id)
          return aIndex - bIndex
        })
    }

    // Recent options (if enabled and we have recent usage)
    if (showRecentOptions && analytics.recentlyUsed.length > 0) {
      groups['Recently Used'] = enhancedOptions
        .filter(opt => analytics.recentlyUsed.includes(opt.id))
        .sort((a, b) => {
          const aIndex = analytics.recentlyUsed.indexOf(a.id)
          const bIndex = analytics.recentlyUsed.indexOf(b.id)
          return aIndex - bIndex
        })
        .slice(0, maxRecentOptions)
    }

    // All options grouped by category
    const categorized: { [key: string]: typeof enhancedOptions } = {}
    enhancedOptions.forEach(option => {
      const category = option.category || 'Other'
      if (!categorized[category]) {
        categorized[category] = []
      }
      categorized[category].push(option)
    })

    // Add categorized options
    Object.entries(categorized).forEach(([category, categoryOptions]) => {
      const groupName = category === 'Other' ? 'All Options' :
                       category.charAt(0).toUpperCase() + category.slice(1)

      if (!groups[groupName]) {
        groups[groupName] = categoryOptions
      }
    })

    return groups
  }, [enhancedOptions, showAnalytics, showRecentOptions, analytics, maxRecentOptions])

  // Button size classes
  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10',
    lg: 'h-12 text-lg'
  }

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  // Map split button size to button size
  const buttonSize = size === 'md' ? 'default' : size

  return (
    <div className={cn('relative inline-flex', className)}>
      {/* Main Button */}
      <Button
        ref={buttonRef}
        variant={variant}
        size={buttonSize}
        disabled={disabled}
        onClick={handlePrimaryAction}
        className={cn(
          'rounded-r-none border-r-0 flex items-center space-x-2',
          sizeClasses[size]
        )}
      >
        {loading || loadingOption ? (
          <LoadingSpinner size="sm" />
        ) : (
          <ButtonIcon className={iconSizeClasses[size]} />
        )}
        <span>{buttonText}</span>
      </Button>

      {/* Dropdown Button */}
      <Button
        variant={variant}
        size={buttonSize}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'rounded-l-none border-l border-l-white/20 px-2',
          sizeClasses[size]
        )}
      >
        <ChevronDownIcon className={cn(
          iconSizeClasses[size],
          'transition-transform',
          isOpen && 'rotate-180'
        )} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1 w-80 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          <div className="max-h-96 overflow-y-auto">
            {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
              <div key={groupName} className="border-b border-neutral-100 last:border-b-0">
                <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-100">
                  <h4 className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                    {groupName}
                    {showAnalytics && groupOptions.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {groupOptions.length}
                      </Badge>
                    )}
                  </h4>
                </div>
                <div className="py-1">
                  {groupOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option)}
                      disabled={disabled || loadingOption === option.id}
                      className={cn(
                        'w-full px-3 py-2 text-left flex items-center justify-between group transition-colors',
                        'hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none',
                        disabled || loadingOption === option.id
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {loadingOption === option.id ? (
                            <LoadingSpinner size="sm" />
                          ) : option.icon ? (
                            <option.icon className="w-4 h-4 text-neutral-500" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-neutral-900 truncate">
                              {option.label}
                            </p>
                            {option.isNew && (
                              <Badge variant="primary" className="text-xs">
                                New
                              </Badge>
                            )}
                            {option.isRecent && (
                              <Badge variant="secondary" className="text-xs">
                                Recent
                              </Badge>
                            )}
                          </div>
                          {option.description && (
                            <p className="text-xs text-neutral-500 truncate">
                              {option.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        {showAnalytics && option.usageCount && option.usageCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {option.usageCount}
                          </Badge>
                        )}
                        {showKeyboardShortcuts && option.shortcut && (
                          <kbd className="px-1.5 py-0.5 text-xs font-mono text-neutral-500 bg-neutral-100 border border-neutral-200 rounded">
                            ⌘{option.shortcut}
                          </kbd>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Analytics Summary */}
          {showAnalytics && analytics.totalUsage > 0 && (
            <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200">
              <div className="text-xs text-neutral-500 text-center">
                {analytics.totalUsage} total uses • Most active at{' '}
                {Object.entries(analytics.userPatterns.timeOfDayUsage)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 1)
                  .map(([hour]) => {
                    const hourNum = parseInt(hour)
                    const period = hourNum >= 12 ? 'PM' : 'AM'
                    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum
                    return `${displayHour}${period}`
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default EnhancedSplitButton
