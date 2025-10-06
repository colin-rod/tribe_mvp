'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ProfileTab } from '@/lib/types/profile'
import {
  UserIcon,
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  LockClosedIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface ProfileTabNavigationProps {
  tabs: ProfileTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  variant: 'sidebar' | 'accordion'
}

const IconMap = {
  user: UserIcon,
  cog: CogIcon,
  shield: ShieldCheckIcon,
  bell: BellIcon,
  lock: LockClosedIcon,
  users: UsersIcon
}

export function ProfileTabNavigation({
  tabs,
  activeTab,
  onTabChange,
  variant
}: ProfileTabNavigationProps) {
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(
    new Set([activeTab])
  )

  const toggleAccordion = (tabId: string) => {
    const newExpanded = new Set(expandedAccordions)
    if (newExpanded.has(tabId)) {
      newExpanded.delete(tabId)
    } else {
      newExpanded.add(tabId)
    }
    setExpandedAccordions(newExpanded)
    onTabChange(tabId)
  }

  if (variant === 'sidebar') {
    return (
      <nav className="p-6 space-y-2" role="tablist" aria-label="Profile settings navigation">
        {tabs.map((tab) => {
          const Icon = IconMap[tab.icon]
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'w-full flex items-start p-3 rounded-lg text-left transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'hover:bg-gray-100',
                isActive
                  ? 'bg-primary-50 border-l-4 border-primary-500 text-primary-700'
                  : 'text-gray-700 hover:text-gray-900'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 mt-0.5 mr-3 shrink-0',
                  isActive ? 'text-primary-600' : 'text-gray-400'
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', isActive && 'text-primary-700')}>
                  {tab.label}
                </p>
                <p className={cn('text-xs mt-1', isActive ? 'text-primary-600' : 'text-gray-500')}>
                  {tab.description}
                </p>
              </div>
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <div className="border-b border-gray-200">
      {tabs.map((tab) => {
        const Icon = IconMap[tab.icon]
        const isActive = activeTab === tab.id
        const isExpanded = expandedAccordions.has(tab.id)

        return (
          <div key={tab.id} className="border-b border-gray-100 last:border-b-0">
            <button
              onClick={() => toggleAccordion(tab.id)}
              className={cn(
                'w-full flex items-center justify-between p-4 text-left transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
                'hover:bg-gray-50',
                isActive && 'bg-primary-50'
              )}
              aria-expanded={isExpanded}
              aria-controls={`accordion-${tab.id}`}
            >
              <div className="flex items-center min-w-0 flex-1">
                <Icon
                  className={cn(
                    'w-5 h-5 mr-3 shrink-0',
                    isActive ? 'text-primary-600' : 'text-gray-400'
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-medium', isActive && 'text-primary-700')}>
                    {tab.label}
                  </p>
                  <p className={cn('text-xs mt-1', isActive ? 'text-primary-600' : 'text-gray-500')}>
                    {tab.description}
                  </p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronDownIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
              ) : (
                <ChevronRightIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}