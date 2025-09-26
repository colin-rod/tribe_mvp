'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

export interface NotificationData {
  id: string
  type: NotificationType
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number // milliseconds, 0 for persistent
}

interface NotificationFeedbackProps {
  notifications: NotificationData[]
  onDismiss: (id: string) => void
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'
}

export function NotificationFeedback({
  notifications,
  onDismiss,
  position = 'top-right'
}: NotificationFeedbackProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([])

  useEffect(() => {
    notifications.forEach(notification => {
      if (!visibleNotifications.includes(notification.id)) {
        setVisibleNotifications(prev => [...prev, notification.id])

        // Auto-dismiss if duration is set
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            onDismiss(notification.id)
            setVisibleNotifications(prev => prev.filter(id => id !== notification.id))
          }, notification.duration)
        }
      }
    })
  }, [notifications, onDismiss, visibleNotifications])

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
      case 'warning':
        return <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />
    }
  }

  const getNotificationClasses = (type: NotificationType) => {
    const baseClasses = "pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5"

    switch (type) {
      case 'success':
        return cn(baseClasses, "border-l-4 border-green-400")
      case 'error':
        return cn(baseClasses, "border-l-4 border-red-400")
      case 'warning':
        return cn(baseClasses, "border-l-4 border-yellow-400")
      case 'info':
        return cn(baseClasses, "border-l-4 border-blue-400")
      default:
        return baseClasses
    }
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50'
      case 'top-center':
        return 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50'
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50'
      case 'bottom-center':
        return 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50'
      default:
        return 'fixed top-4 right-4 z-50'
    }
  }

  const handleDismiss = (id: string) => {
    setVisibleNotifications(prev => prev.filter(visibleId => visibleId !== id))
    setTimeout(() => onDismiss(id), 150) // Small delay for animation
  }

  if (notifications.length === 0) return null

  return (
    <div className={getPositionClasses()}>
      <div className="flex flex-col gap-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "transform transition-all duration-300 ease-in-out",
              visibleNotifications.includes(notification.id)
                ? "translate-x-0 opacity-100"
                : "translate-x-full opacity-0"
            )}
          >
            <div className={getNotificationClasses(notification.type)}>
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="mt-1 text-sm text-gray-500">
                        {notification.message}
                      </p>
                    )}
                    {notification.action && (
                      <div className="mt-3">
                        <button
                          onClick={notification.action.onClick}
                          className="text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline"
                        >
                          {notification.action.label}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-shrink-0">
                    <button
                      className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      onClick={() => handleDismiss(notification.id)}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  const addNotification = (notification: Omit<NotificationData, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newNotification: NotificationData = {
      id,
      duration: 5000, // Default 5 seconds
      ...notification
    }

    setNotifications(prev => [...prev, newNotification])
    return id
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  // Convenience methods
  const showSuccess = (title: string, message?: string, options?: Partial<NotificationData>) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    })
  }

  const showError = (title: string, message?: string, options?: Partial<NotificationData>) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 0, // Persistent by default for errors
      ...options
    })
  }

  const showInfo = (title: string, message?: string, options?: Partial<NotificationData>) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    })
  }

  const showWarning = (title: string, message?: string, options?: Partial<NotificationData>) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      ...options
    })
  }

  // Group preference specific helpers
  const showGroupPreferenceSuccess = (groupName: string, action: string) => {
    return showSuccess(
      `${groupName} preferences updated`,
      `Your ${action} settings have been saved and will take effect immediately.`,
      { duration: 4000 }
    )
  }

  const showGroupMuteSuccess = (groupName: string, duration: string) => {
    return showSuccess(
      `${groupName} muted`,
      `Notifications paused for ${duration}. You can unmute anytime.`,
      { duration: 4000 }
    )
  }

  const showGroupUnmuteSuccess = (groupName: string) => {
    return showSuccess(
      `${groupName} unmuted`,
      `You'll now receive notifications according to your preferences.`,
      { duration: 4000 }
    )
  }

  const showGroupJoinSuccess = (groupName: string, isRejoin: boolean = false) => {
    return showSuccess(
      `${isRejoin ? 'Rejoined' : 'Joined'} ${groupName}`,
      `You'll now receive updates from this group.`,
      { duration: 4000 }
    )
  }

  const showGroupLeaveSuccess = (groupName: string, isDeactivate: boolean = false) => {
    return showSuccess(
      `${isDeactivate ? 'Deactivated' : 'Left'} ${groupName}`,
      `You won't receive further notifications from this group.`,
      { duration: 4000 }
    )
  }

  const showResetToDefaultsSuccess = (groupName: string) => {
    return showSuccess(
      `${groupName} reset to defaults`,
      `Your settings now match the group defaults and will update automatically.`,
      { duration: 4000 }
    )
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showGroupPreferenceSuccess,
    showGroupMuteSuccess,
    showGroupUnmuteSuccess,
    showGroupJoinSuccess,
    showGroupLeaveSuccess,
    showResetToDefaultsSuccess
  }
}

// Inline notification component for form feedback
interface InlineNotificationProps {
  type: NotificationType
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
  className?: string
}

export function InlineNotification({
  type,
  title,
  message,
  action,
  onDismiss,
  className
}: InlineNotificationProps) {
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
      case 'warning':
        return <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />
    }
  }

  const getBackgroundClasses = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getTitleClasses = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'text-green-800'
      case 'error':
        return 'text-red-800'
      case 'warning':
        return 'text-yellow-800'
      case 'info':
        return 'text-blue-800'
      default:
        return 'text-gray-800'
    }
  }

  const getMessageClasses = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'text-green-700'
      case 'error':
        return 'text-red-700'
      case 'warning':
        return 'text-yellow-700'
      case 'info':
        return 'text-blue-700'
      default:
        return 'text-gray-700'
    }
  }

  return (
    <div className={cn(
      "border rounded-lg p-4",
      getBackgroundClasses(type),
      className
    )}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getIcon(type)}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={cn("text-sm font-medium", getTitleClasses(type))}>
            {title}
          </h3>
          {message && (
            <p className={cn("mt-2 text-sm", getMessageClasses(type))}>
              {message}
            </p>
          )}
          {action && (
            <div className="mt-3">
              <button
                onClick={action.onClick}
                className={cn(
                  "text-sm font-medium focus:outline-none focus:underline",
                  type === 'success' ? 'text-green-600 hover:text-green-500' :
                  type === 'error' ? 'text-red-600 hover:text-red-500' :
                  type === 'warning' ? 'text-yellow-600 hover:text-yellow-500' :
                  'text-blue-600 hover:text-blue-500'
                )}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
        {onDismiss && (
          <div className="ml-4 flex flex-shrink-0">
            <button
              className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              onClick={onDismiss}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}