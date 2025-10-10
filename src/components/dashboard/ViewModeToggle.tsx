'use client'

import {
  Squares2X2Icon,
  QueueListIcon,
  RectangleStackIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export type ViewMode = 'cards' | 'timeline' | 'stream' | 'digest'

interface ViewModeToggleProps {
  currentMode: ViewMode
  onChange: (mode: ViewMode) => void
  className?: string
}

export default function ViewModeToggle({
  currentMode,
  onChange,
  className = ''
}: ViewModeToggleProps) {
  const modes: Array<{
    id: ViewMode
    label: string
    icon: React.ComponentType<{ className?: string }>
    description: string
  }> = [
    {
      id: 'cards',
      label: 'Cards',
      icon: Squares2X2Icon,
      description: 'Classic card view'
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: QueueListIcon,
      description: 'Scrapbook timeline'
    },
    {
      id: 'stream',
      label: 'Stream',
      icon: RectangleStackIcon,
      description: 'Continuous feed'
    },
    {
      id: 'digest',
      label: 'Summary',
      icon: SparklesIcon,
      description: 'Weekly summary'
    }
  ]

  return (
    <div className={`inline-flex items-center space-x-1 bg-neutral-100 rounded-lg p-1 ${className}`}>
      {modes.map((mode) => {
        const Icon = mode.icon
        const isActive = currentMode === mode.id

        return (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
              transition-all duration-200
              ${isActive
                ? 'bg-white text-orange-700 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }
            `}
            title={mode.description}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}