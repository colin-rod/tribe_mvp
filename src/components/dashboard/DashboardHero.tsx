'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronDownIcon,
  CameraIcon,
  VideoIcon,
  PencilIcon,
  TrophyIcon,
  HandRaisedIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'

interface DashboardHeroProps {
  userName?: string
  hasUnreadNotifications?: boolean
  onCreateUpdate: (type: UpdateType) => void
  showReminder?: boolean
  onDismissReminder?: () => void
  className?: string
}

type UpdateType = 'photo' | 'text' | 'video' | 'milestone'

const UPDATE_OPTIONS = [
  { id: 'photo' as UpdateType, label: 'Photo Update', icon: CameraIcon, description: 'Share a moment' },
  { id: 'text' as UpdateType, label: 'Text Update', icon: PencilIcon, description: 'Write an update' },
  { id: 'video' as UpdateType, label: 'Video Update', icon: VideoIcon, description: 'Record a video' },
  { id: 'milestone' as UpdateType, label: 'Milestone', icon: TrophyIcon, description: 'Mark a milestone' },
]

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  userName = 'there',
  hasUnreadNotifications = false,
  onCreateUpdate,
  showReminder = false,
  onDismissReminder,
  className
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [currentPrompt, setCurrentPrompt] = useState(0)

  const prompts = [
    "What made you smile today?",
    "Capture a quiet moment together",
    "Share something that amazed you",
    "What would grandparents love to see?",
    "Any new developments to celebrate?"
  ]

  // Rotate prompts every 4 seconds
  useEffect(() => {
    if (showReminder) {
      const interval = setInterval(() => {
        setCurrentPrompt(prev => (prev + 1) % prompts.length)
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [showReminder, prompts.length])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMainButtonClick = () => {
    // Analytics tracking
    if (typeof window !== 'undefined') {
      // Track the main create update button click
      window.gtag?.('event', 'dashboard_hero_create_click', {
        event_category: 'engagement',
        event_label: 'photo_default',
        value: 1
      })
    }
    onCreateUpdate('photo') // Default to photo update
  }

  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newState = !isDropdownOpen
    setIsDropdownOpen(newState)

    // Analytics tracking
    if (typeof window !== 'undefined' && newState) {
      window.gtag?.('event', 'dashboard_hero_dropdown_open', {
        event_category: 'engagement',
        event_label: 'update_options',
        value: 1
      })
    }
  }

  const handleOptionSelect = (type: UpdateType) => {
    setIsDropdownOpen(false)

    // Analytics tracking
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'dashboard_hero_option_select', {
        event_category: 'engagement',
        event_label: type,
        value: 1
      })
    }

    onCreateUpdate(type)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className={cn(
      'bg-gradient-to-br from-primary-50 to-primary-100 border-b border-neutral-200',
      'px-4 py-6 relative overflow-hidden',
      className
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <div className="absolute top-4 right-4 w-8 h-8 bg-primary-400 rounded-full animate-bounce-gentle" />
        <div className="absolute top-12 right-8 w-4 h-4 bg-secondary-400 rounded-full animate-bounce-gentle" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-8 right-16 w-6 h-6 bg-accent-400 rounded-full animate-bounce-gentle" style={{ animationDelay: '1s' }} />
      </div>

      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-1 flex items-center">
          <span>
            {getGreeting()}, {userName}!
          </span>
          <HandRaisedIcon className="ml-2 h-6 w-6 text-primary-600" aria-hidden="true" />
        </h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Ready to share what&apos;s happening with your little one?
        </p>
        {hasUnreadNotifications && (
          <div className="mt-2 flex items-center">
            <div className="w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse" />
            <span className="text-xs text-primary-700 font-medium">You have new responses</span>
          </div>
        )}
      </div>

      {/* Contextual Reminder */}
      {showReminder && (
        <div className="mb-4 bg-white/80 backdrop-blur-sm border border-primary-200 rounded-xl p-4 animate-slide-up">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <LightBulbIcon className="h-5 w-5 text-primary-600" aria-hidden="true" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-neutral-800 font-medium mb-1">
                Inspiration moment
              </div>
              <div className="text-sm text-neutral-600 transition-all duration-500">
                {prompts[currentPrompt]}
              </div>
            </div>
            {onDismissReminder && (
              <button
                onClick={onDismissReminder}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label="Dismiss reminder"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Update Button */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex rounded-xl overflow-hidden shadow-lg">
          {/* Main Create Button */}
          <button
            onClick={handleMainButtonClick}
            className={cn(
              'flex-1 bg-primary-500 hover:bg-primary-600 active:bg-primary-700',
              'text-white font-medium text-base',
              'h-14 px-4 flex items-center justify-center',
              'transition-all duration-200 transform active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
            )}
            aria-label="Create photo update"
          >
            <CameraIcon className="w-5 h-5 mr-2" />
            Create Update
          </button>

          {/* Dropdown Toggle */}
          <button
            id="update-options-button"
            onClick={handleDropdownToggle}
            className={cn(
              'w-14 bg-primary-600 hover:bg-primary-700 active:bg-primary-800',
              'text-white flex items-center justify-center',
              'transition-all duration-200 transform active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              isDropdownOpen && 'bg-primary-700'
            )}
            aria-label="More update options"
            aria-expanded={isDropdownOpen}
            aria-haspopup="menu"
            aria-controls={isDropdownOpen ? 'update-options-menu' : undefined}
          >
            <ChevronDownIcon
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isDropdownOpen && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* Dropdown Menu with improved accessibility */}
        {isDropdownOpen && (
          <div
            id="update-options-menu"
            className={cn(
              'absolute top-full left-0 right-0 mt-2 z-10',
              'bg-white rounded-xl shadow-xl border border-neutral-200',
              'py-2 animate-slide-up'
            )}
            role="menu"
            aria-labelledby="update-options-button"
          >
            {UPDATE_OPTIONS.map((option, index) => (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                className={cn(
                  'w-full px-4 py-3 flex items-center space-x-3',
                  'text-left hover:bg-neutral-50 active:bg-neutral-100',
                  'transition-colors duration-200',
                  'focus:outline-none focus:bg-neutral-50 focus:ring-2 focus:ring-primary-500 focus:ring-inset'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                role="menuitem"
                aria-label={`Create ${option.label.toLowerCase()}: ${option.description}`}
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <option.icon className="w-4 h-4 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button className="text-xs text-neutral-600 hover:text-neutral-800 transition-colors">
            View all updates
          </button>
          <button className="text-xs text-neutral-600 hover:text-neutral-800 transition-colors">
            Manage recipients
          </button>
        </div>
        <div className="text-xs text-neutral-500">
          Last update: 2 hours ago
        </div>
      </div>
    </div>
  )
}

export default DashboardHero
