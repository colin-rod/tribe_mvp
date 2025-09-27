'use client'

import { useState, useCallback, useMemo } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  CameraIcon,
  SparklesIcon,
  HeartIcon,
  UserGroupIcon,
  CalendarIcon,
  TrophyIcon,
  MagnifyingGlassIcon,
  FaceSmileIcon,
  SunIcon,
  MoonIcon,
  GiftIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline'

interface EnhancedEmptyStateProps {
  type: 'no-updates' | 'no-search-results' | 'no-media' | 'no-milestones' | 'no-responses'
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  showTemplates?: boolean
  showComparison?: boolean
  userStats?: {
    totalUpdates: number
    daysSinceStart: number
  }
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

interface QuickStartTemplate {
  id: string
  title: string
  description: string
  icon: IconComponent
  tags: string[]
  seasonal?: boolean
}

/**
 * Enhanced empty state component with contextual suggestions and quick-start templates
 */
export const EnhancedEmptyState: React.FC<EnhancedEmptyStateProps> = ({
  type,
  title,
  description,
  actionLabel,
  onAction,
  className,
  showTemplates = true,
  showComparison = false,
  userStats
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  // Get current time context for seasonal suggestions
  const getCurrentSeason = () => {
    const month = new Date().getMonth()
    if (month >= 2 && month <= 4) return 'spring'
    if (month >= 5 && month <= 7) return 'summer'
    if (month >= 8 && month <= 10) return 'fall'
    return 'winter'
  }

  const getTimeOfDay = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 21) return 'evening'
    return 'night'
  }

  // Quick-start templates based on type and context
  const getTemplates = useMemo((): QuickStartTemplate[] => {
    const baseTemplates: QuickStartTemplate[] = [
      {
        id: 'first-smile',
        title: 'Capture a smile',
        description: 'Share that precious moment when they light up',
        icon: FaceSmileIcon,
        tags: ['photo', 'milestone', 'joy']
      },
      {
        id: 'daily-adventure',
        title: 'Today\'s adventure',
        description: 'What made this day special?',
        icon: CalendarIcon,
        tags: ['text', 'daily', 'memory']
      },
      {
        id: 'playtime',
        title: 'Playtime fun',
        description: 'Capture them in their element',
        icon: HeartIcon,
        tags: ['photo', 'video', 'play']
      },
      {
        id: 'learning-moment',
        title: 'Learning something new',
        description: 'They\'re growing so fast!',
        icon: SparklesIcon,
        tags: ['milestone', 'growth', 'proud']
      },
      {
        id: 'family-time',
        title: 'Family moment',
        description: 'Together time is the best time',
        icon: UserGroupIcon,
        tags: ['photo', 'family', 'togetherness']
      }
    ]

    // Add seasonal templates
    const season = getCurrentSeason()
    const timeOfDay = getTimeOfDay()

    const seasonalTemplates: QuickStartTemplate[] = []

    if (season === 'spring') {
      seasonalTemplates.push({
        id: 'spring-outdoors',
        title: 'Spring adventure',
        description: 'Perfect weather for outdoor exploration',
        icon: SunIcon,
        tags: ['photo', 'outdoors', 'spring'],
        seasonal: true
      })
    } else if (season === 'summer') {
      seasonalTemplates.push({
        id: 'summer-fun',
        title: 'Summer memories',
        description: 'Making the most of sunny days',
        icon: SunIcon,
        tags: ['photo', 'summer', 'outdoors'],
        seasonal: true
      })
    } else if (season === 'fall') {
      seasonalTemplates.push({
        id: 'fall-colors',
        title: 'Autumn colors',
        description: 'Beautiful fall moments to capture',
        icon: GiftIcon,
        tags: ['photo', 'fall', 'nature'],
        seasonal: true
      })
    } else {
      seasonalTemplates.push({
        id: 'winter-cozy',
        title: 'Cozy moments',
        description: 'Warm indoor memories',
        icon: MoonIcon,
        tags: ['photo', 'cozy', 'winter'],
        seasonal: true
      })
    }

    // Time-based templates
    if (timeOfDay === 'morning') {
      seasonalTemplates.push({
        id: 'morning-routine',
        title: 'Morning routine',
        description: 'Starting the day together',
        icon: SunIcon,
        tags: ['photo', 'routine', 'morning'],
        seasonal: true
      })
    } else if (timeOfDay === 'evening') {
      seasonalTemplates.push({
        id: 'bedtime-story',
        title: 'Bedtime story',
        description: 'Peaceful evening moments',
        icon: MoonIcon,
        tags: ['photo', 'bedtime', 'peaceful'],
        seasonal: true
      })
    }

    return [...baseTemplates, ...seasonalTemplates].slice(0, 6)
  }, [])

  // Get contextual content based on type
  const getContextualContent = () => {
    switch (type) {
      case 'no-updates':
        return {
          icon: CameraIcon,
          title: title || 'Your timeline is waiting',
          description: description || 'Share your first precious moment to start building your family\'s story.',
          actionLabel: actionLabel || 'Create your first update',
          suggestions: [
            'Start with a simple photo',
            'Share what made you smile today',
            'Capture a quiet moment together'
          ]
        }

      case 'no-search-results':
        return {
          icon: MagnifyingGlassIcon,
          title: title || 'No matching memories found',
          description: description || 'Try adjusting your search or explore different time periods.',
          actionLabel: actionLabel || 'Clear search',
          suggestions: [
            'Try broader search terms',
            'Check different date ranges',
            'Browse by content type'
          ]
        }

      case 'no-media':
        return {
          icon: CameraIcon,
          title: title || 'No photos or videos yet',
          description: description || 'Start capturing those precious visual memories.',
          actionLabel: actionLabel || 'Add photos',
          suggestions: [
            'Snap a quick photo',
            'Record a short video',
            'Share multiple moments'
          ]
        }

      case 'no-milestones':
        return {
          icon: TrophyIcon,
          title: title || 'No milestones recorded',
          description: description || 'Every little achievement deserves to be celebrated and remembered.',
          actionLabel: actionLabel || 'Record milestone',
          suggestions: [
            'First words or sounds',
            'New skills learned',
            'Growth milestones'
          ]
        }

      case 'no-responses':
        return {
          icon: HeartIcon,
          title: title || 'No responses yet',
          description: description || 'Your family loves hearing from you. Keep sharing!',
          actionLabel: actionLabel || 'Share an update',
          suggestions: [
            'Share more regularly',
            'Ask questions in your updates',
            'Tag family members'
          ]
        }

      default:
        return {
          icon: HandRaisedIcon,
          title: title || 'Nothing here yet',
          description: description || 'Start creating content to see it here.',
          actionLabel: actionLabel || 'Get started',
          suggestions: []
        }
    }
  }

  const handleTemplateSelect = useCallback((template: QuickStartTemplate) => {
    setSelectedTemplate(template.id)
    // Here you would typically trigger the creation flow with pre-filled content
    if (onAction) {
      onAction()
    }
  }, [onAction])

  const content = getContextualContent()

  // Community comparison data (mock data)
  const getComparisonStats = () => {
    if (!userStats || !showComparison) return null

    const averageUpdatesPerWeek = 3.5
    const userUpdatesPerWeek = userStats.totalUpdates / Math.max(1, userStats.daysSinceStart / 7)

    return {
      userUpdatesPerWeek: Math.round(userUpdatesPerWeek * 10) / 10,
      averageUpdatesPerWeek,
      percentile: userUpdatesPerWeek > averageUpdatesPerWeek ?
        Math.min(95, Math.round((userUpdatesPerWeek / averageUpdatesPerWeek) * 50 + 50)) :
        Math.max(5, Math.round((userUpdatesPerWeek / averageUpdatesPerWeek) * 50))
    }
  }

  const comparisonStats = getComparisonStats()

  return (
    <div className={cn('text-center py-12 px-4', className)}>
      {/* Main illustration */}
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
          <content.icon className="w-8 h-8 text-primary-600" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          {content.title}
        </h2>
        <p className="text-neutral-600 leading-relaxed mb-6">
          {content.description}
        </p>

        {/* Suggestions */}
        {content.suggestions.length > 0 && (
          <div className="text-sm text-neutral-500 mb-6">
            <p className="font-medium mb-2">Here are some ideas:</p>
            <ul className="space-y-1">
              {content.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-primary-400 rounded-full mr-2" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main action */}
        {onAction && (
          <Button
            onClick={onAction}
            size="lg"
            className="mb-6"
          >
            {content.actionLabel}
          </Button>
        )}
      </div>

      {/* Community comparison */}
      {comparisonStats && (
        <div className="max-w-sm mx-auto mb-8 p-4 bg-neutral-50 rounded-xl">
          <h3 className="text-sm font-semibold text-neutral-800 mb-3">
            {"How you're doing"}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-primary-600">
                {comparisonStats.userUpdatesPerWeek}
              </div>
              <div className="text-xs text-neutral-600">Your weekly average</div>
            </div>
            <div>
              <div className="text-lg font-bold text-neutral-700">
                {comparisonStats.averageUpdatesPerWeek}
              </div>
              <div className="text-xs text-neutral-600">Community average</div>
            </div>
          </div>
          <div className="mt-3">
            <Badge
              variant={comparisonStats.percentile >= 50 ? 'success' : 'secondary'}
              size="sm"
            >
              {comparisonStats.percentile}th percentile
            </Badge>
          </div>
        </div>
      )}

      {/* Quick-start templates */}
      {showTemplates && getTemplates.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-neutral-900 mb-6">
            Get started with a template
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {getTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={cn(
                  'p-4 text-left bg-white border border-neutral-200 rounded-xl',
                  'hover:border-primary-300 hover:shadow-md transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  selectedTemplate === template.id && 'border-primary-500 bg-primary-50'
                )}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    template.seasonal ? 'bg-secondary-100 text-secondary-600' : 'bg-primary-100 text-primary-600'
                  )}>
                    <template.icon className="w-4 h-4" />
                  </div>
                  {template.seasonal && (
                    <Badge variant="secondary" size="sm" className="text-xs">
                      Seasonal
                    </Badge>
                  )}
                </div>

                <h4 className="font-semibold text-neutral-900 mb-1">
                  {template.title}
                </h4>
                <p className="text-sm text-neutral-600 mb-3">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-1">
                  {template.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedEmptyState
