'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createLogger } from '@/lib/logger'
import {
  ArrowTrendingUpIcon,
  ClockIcon,
  HeartIcon,
  SparklesIcon,
  XMarkIcon,
  ChartBarIcon,
  CameraIcon
} from '@heroicons/react/24/outline'

const logger = createLogger('PersonalizedWelcome')

interface PersonalizedWelcomeProps {
  userName?: string
  lastUpdateAt?: Date
  updateCount: number
  daysSinceStart: number
  onCreateUpdate: (type: UpdateType) => void
  onDismissReminder?: (reminderId: string) => void
  className?: string
}

type UpdateType = 'photo' | 'text' | 'video' | 'milestone'

interface SmartReminder {
  id: string
  type: 'frequency' | 'milestone' | 'seasonal' | 'engagement'
  title: string
  message: string
  action?: {
    label: string
    type: UpdateType
  }
  priority: 'low' | 'medium' | 'high'
  dismissible: boolean
  expiresAt?: Date
}

interface PersonalizationInsights {
  averageUpdatesPerWeek: number
  favoriteUpdateType: UpdateType
  longestStreak: number
  totalEngagement: number
  nextMilestone?: {
    type: string
    remaining: number
    description: string
  }
}

/**
 * Enhanced personalized welcome component with smart reminders and insights
 * Features contextual suggestions, engagement analytics, and gentle nudging
 */
export const PersonalizedWelcome: React.FC<PersonalizedWelcomeProps> = ({
  userName = 'there',
  lastUpdateAt,
  updateCount,
  daysSinceStart,
  onCreateUpdate,
  onDismissReminder,
  className
}) => {
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set())
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0)
  const [showFullStats, setShowFullStats] = useState(false)

  // Load dismissed reminders from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dismissed_reminders')
    if (saved) {
      try {
        setDismissedReminders(new Set(JSON.parse(saved)))
      } catch (error) {
        logger.error('Error loading dismissed reminders', { error })
      }
    }
  }, [])

  // Calculate personalization insights
  const insights = useMemo((): PersonalizationInsights => {
    const weeksActive = Math.max(1, daysSinceStart / 7)
    const averageUpdatesPerWeek = updateCount / weeksActive

    // Mock data - in real app, this would come from analytics
    const favoriteUpdateType: UpdateType = 'photo' // Most used type
    const longestStreak = Math.min(updateCount, 12) // Days with updates
    const totalEngagement = updateCount * 3.2 // Average responses per update

    let nextMilestone
    if (updateCount < 10) {
      nextMilestone = {
        type: 'First milestone',
        remaining: 10 - updateCount,
        description: 'Share 10 updates to unlock insights'
      }
    } else if (updateCount < 50) {
      nextMilestone = {
        type: 'Regular sharer',
        remaining: 50 - updateCount,
        description: 'Share 50 updates to unlock advanced features'
      }
    } else if (updateCount < 100) {
      nextMilestone = {
        type: 'Memory keeper',
        remaining: 100 - updateCount,
        description: 'Share 100 updates to become a memory keeper'
      }
    }

    return {
      averageUpdatesPerWeek,
      favoriteUpdateType,
      longestStreak,
      totalEngagement,
      nextMilestone
    }
  }, [updateCount, daysSinceStart])

  // Generate smart reminders based on user behavior
  const smartReminders = useMemo((): SmartReminder[] => {
    const reminders: SmartReminder[] = []
    const now = new Date()
    const daysSinceLastUpdate = lastUpdateAt
      ? Math.floor((now.getTime() - lastUpdateAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Frequency-based reminders
    if (daysSinceLastUpdate >= 3 && daysSinceLastUpdate < 7) {
      reminders.push({
        id: 'frequency_gentle',
        type: 'frequency',
        title: 'Missing precious moments?',
        message: `It's been ${daysSinceLastUpdate} days since your last update. What has ${userName === 'there' ? 'your little one' : 'been'} been up to?`,
        action: { label: 'Share a moment', type: insights.favoriteUpdateType },
        priority: 'low',
        dismissible: true
      })
    } else if (daysSinceLastUpdate >= 7) {
      reminders.push({
        id: 'frequency_concern',
        type: 'frequency',
        title: 'Your family misses you!',
        message: 'It\'s been over a week. Even a quick photo would brighten everyone\'s day.',
        action: { label: 'Quick update', type: 'photo' },
        priority: 'medium',
        dismissible: true
      })
    }

    // Milestone reminders
    if (insights.nextMilestone && insights.nextMilestone.remaining <= 3) {
      reminders.push({
        id: 'milestone_close',
        type: 'milestone',
        title: 'Almost there!',
        message: `Just ${insights.nextMilestone.remaining} more updates to unlock "${insights.nextMilestone.type}"`,
        action: { label: 'Add update', type: 'milestone' },
        priority: 'medium',
        dismissible: false
      })
    }

    // Seasonal/time-based reminders
    const hour = now.getHours()
    const dayOfWeek = now.getDay()

    if (hour >= 17 && hour <= 20 && dayOfWeek !== 0 && dayOfWeek !== 6) {
      reminders.push({
        id: 'golden_hour',
        type: 'seasonal',
        title: 'Golden hour magic ✨',
        message: 'Perfect lighting for a beautiful photo right now!',
        action: { label: 'Capture moment', type: 'photo' },
        priority: 'low',
        dismissible: true,
        expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours
      })
    }

    // Weekend family time
    if ((dayOfWeek === 0 || dayOfWeek === 6) && hour >= 10 && hour <= 16) {
      reminders.push({
        id: 'weekend_family',
        type: 'seasonal',
        title: 'Weekend family time',
        message: 'Perfect time to capture some family moments together!',
        action: { label: 'Family photo', type: 'photo' },
        priority: 'low',
        dismissible: true
      })
    }

    // Engagement-based reminders
    if (insights.totalEngagement > 10 && daysSinceLastUpdate >= 2) {
      reminders.push({
        id: 'engagement_high',
        type: 'engagement',
        title: 'Your family loves your updates!',
        message: `${Math.round(insights.totalEngagement)} total responses! They're waiting for more.`,
        action: { label: 'Share joy', type: insights.favoriteUpdateType },
        priority: 'medium',
        dismissible: true
      })
    }

    return reminders.filter(reminder => !dismissedReminders.has(reminder.id))
  }, [lastUpdateAt, userName, insights, dismissedReminders])

  // Get the highest priority reminder
  const activeReminder = useMemo(() => {
    const sortedReminders = [...smartReminders].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    return sortedReminders[0]
  }, [smartReminders])

  // Handle reminder dismissal
  const handleDismissReminder = useCallback((reminderId: string) => {
    const newDismissed = new Set([...dismissedReminders, reminderId])
    setDismissedReminders(newDismissed)

    // Save to localStorage
    localStorage.setItem('dismissed_reminders', JSON.stringify([...newDismissed]))

    if (onDismissReminder) {
      onDismissReminder(reminderId)
    }
  }, [dismissedReminders, onDismissReminder])

  // Rotate insights every 5 seconds
  const rotatingInsights = [
    {
      icon: ArrowTrendingUpIcon,
      label: 'Updates per week',
      value: insights.averageUpdatesPerWeek.toFixed(1),
      color: 'text-green-600'
    },
    {
      icon: HeartIcon,
      label: 'Total engagement',
      value: Math.round(insights.totalEngagement).toString(),
      color: 'text-pink-600'
    },
    {
      icon: SparklesIcon,
      label: 'Longest streak',
      value: `${insights.longestStreak} days`,
      color: 'text-purple-600'
    },
    {
      icon: ChartBarIcon,
      label: 'Total updates',
      value: updateCount.toString(),
      color: 'text-blue-600'
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentInsightIndex(prev => (prev + 1) % rotatingInsights.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [rotatingInsights.length])

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
      </div>

      {/* Welcome Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
            {getGreeting()}, {userName}!
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            {updateCount === 0
              ? "Ready to start sharing precious moments?"
              : `You've shared ${updateCount} beautiful ${updateCount === 1 ? 'moment' : 'moments'} so far.`
            }
          </p>
        </div>

        {/* Quick stats toggle */}
        <button
          onClick={() => setShowFullStats(!showFullStats)}
          className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
          aria-label="Toggle detailed stats"
        >
          <div className={cn(
            'flex items-center space-x-1 transition-all duration-500',
            rotatingInsights[currentInsightIndex].color
          )}>
            {React.createElement(rotatingInsights[currentInsightIndex].icon, {
              className: "w-4 h-4"
            })}
            <span className="font-medium">
              {rotatingInsights[currentInsightIndex].value}
            </span>
          </div>
          <span className="hidden sm:inline">
            {rotatingInsights[currentInsightIndex].label}
          </span>
        </button>
      </div>

      {/* Expanded stats */}
      {showFullStats && (
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 animate-slide-up">
          <h3 className="text-sm font-semibold text-neutral-800 mb-3">Your Journey</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rotatingInsights.map((insight) => (
              <div key={insight.label} className="text-center">
                <div className={cn("inline-flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 mb-2", insight.color)}>
                  {React.createElement(insight.icon, { className: "w-4 h-4" })}
                </div>
                <div className="text-lg font-semibold text-neutral-900">{insight.value}</div>
                <div className="text-xs text-neutral-600">{insight.label}</div>
              </div>
            ))}
          </div>

          {insights.nextMilestone && (
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-neutral-800">
                    Next: {insights.nextMilestone.type}
                  </h4>
                  <p className="text-xs text-neutral-600">
                    {insights.nextMilestone.description}
                  </p>
                </div>
                <Badge variant="outline" className="ml-2">
                  {insights.nextMilestone.remaining} to go
                </Badge>
              </div>
              <div className="mt-2 bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(10, ((updateCount % 50) / 50) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Smart reminder */}
      {activeReminder && (
        <div className="mb-4 bg-white/90 backdrop-blur-sm border border-primary-200 rounded-xl p-4 animate-slide-up">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                activeReminder.priority === 'high' ? 'bg-red-100 text-red-600' :
                activeReminder.priority === 'medium' ? 'bg-primary-100 text-primary-600' :
                'bg-neutral-100 text-neutral-600'
              )}>
                {activeReminder.type === 'frequency' && <ClockIcon className="h-5 w-5" />}
                {activeReminder.type === 'milestone' && <SparklesIcon className="h-5 w-5" />}
                {activeReminder.type === 'seasonal' && <CameraIcon className="h-5 w-5" />}
                {activeReminder.type === 'engagement' && <HeartIcon className="h-5 w-5" />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-neutral-800 mb-1">
                    {activeReminder.title}
                  </h3>
                  <p className="text-sm text-neutral-600 mb-3">
                    {activeReminder.message}
                  </p>
                </div>

                {activeReminder.dismissible && (
                  <button
                    onClick={() => handleDismissReminder(activeReminder.id)}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors ml-2"
                    aria-label="Dismiss reminder"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {activeReminder.action && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onCreateUpdate(activeReminder.action!.type)}
                  className="text-sm"
                >
                  {activeReminder.action.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Last update info */}
      {lastUpdateAt && (
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-4">
          <span>
            Last update: {
              new Date().getTime() - lastUpdateAt.getTime() < 24 * 60 * 60 * 1000
                ? 'Today'
                : lastUpdateAt.toLocaleDateString()
            }
          </span>
          <span>
            Day {daysSinceStart} of your journey
          </span>
        </div>
      )}
    </div>
  )
}

export default PersonalizedWelcome
