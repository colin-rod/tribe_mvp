'use client'

import { useEffect, useState } from 'react'
import { useResponseNotifications } from '@/hooks/useResponseNotifications'
import { XMarkIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

interface NotificationItem {
  id: string
  recipientName: string
  childName: string
  content: string
  timestamp: Date
  updateId: string
}

export function ResponseNotifications() {
  useResponseNotifications()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  // This is a simplified version - in a real app, you'd want to connect this
  // to a global notification state management system like Zustand or Redux
  useEffect(() => {
    // Listen for browser notifications and convert them to in-app notifications
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tribe-notifications') {
        try {
          const newNotification = JSON.parse(e.newValue || '{}')
          if (newNotification.id) {
            setNotifications(prev => [newNotification, ...prev.slice(0, 4)]) // Keep max 5
          }
        } catch {
          // Ignore invalid JSON
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const navigateToUpdate = (updateId: string) => {
    window.location.href = `/dashboard/memories/${updateId}`
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 transform animate-slide-in-right"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <ChatBubbleLeftIcon className="h-4 w-4 text-blue-600" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div
                className="cursor-pointer"
                onClick={() => navigateToUpdate(notification.updateId)}
              >
                <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                  New Response
                </p>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {notification.recipientName} replied to {notification.childName}&rsquo;s update
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>

            <button
              onClick={() => dismissNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Add CSS classes for animations if not already present in your Tailwind config
const styles = `
  .animate-slide-in-right {
    animation: slideInRight 0.3s ease-out;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`

// Inject styles if they don't exist
if (typeof document !== 'undefined' && !document.getElementById('response-notifications-styles')) {
  const styleElement = document.createElement('style')
  styleElement.id = 'response-notifications-styles'
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}
