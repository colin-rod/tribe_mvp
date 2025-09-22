'use client'

import { useState } from 'react'
import { useResponses } from '@/hooks/useResponses'
import { ResponseThread } from './ResponseThread'
import { ResponseAnalytics } from './ResponseAnalytics'
import { formatDistanceToNow } from 'date-fns'
import { ChatBubbleLeftIcon, ArrowTrendingUpIcon, UsersIcon, CalendarDaysIcon, PhotoIcon } from '@heroicons/react/24/outline'
import ChildImage from '@/components/ui/ChildImage'

interface Update {
  id: string
  content: string
  created_at: string
  child_id: string
  parent_id: string
  media_urls: string[]
  confirmed_recipients?: any[]
  children: {
    id: string
    name: string
    birth_date: string
    profile_photo_url: string | null
  }
}

interface ConversationViewProps {
  updateId: string
  update: Update
  showAnalytics?: boolean
}

export function ConversationView({
  updateId,
  update,
  showAnalytics = false
}: ConversationViewProps) {
  const { responses, loading, newResponseCount, markResponsesAsRead } = useResponses(updateId)
  const [activeTab, setActiveTab] = useState<'conversation' | 'analytics'>('conversation')

  // Mark responses as read when user views them
  const handleTabClick = (tab: 'conversation' | 'analytics') => {
    setActiveTab(tab)
    if (tab === 'conversation' && newResponseCount > 0) {
      markResponsesAsRead()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab Navigation */}
      {showAnalytics && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => handleTabClick('conversation')}
            className={`flex items-center px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'conversation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
            Conversation
            {newResponseCount > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                {newResponseCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabClick('analytics')}
            className={`flex items-center px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ArrowTrendingUpIcon className="h-4 w-4 mr-2" />
            Insights
          </button>
        </div>
      )}

      {activeTab === 'conversation' ? (
        <div className="space-y-6">
          {/* Original Update */}
          <div className="bg-blue-50 rounded-lg p-1">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Update Header */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mr-4">
                      <ChildImage
                        childId={update.children.id}
                        photoUrl={update.children.profile_photo_url}
                        alt={`${update.children.name}'s profile`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Update from {update.children.name}
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CalendarDaysIcon className="h-4 w-4" />
                        <span>
                          {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Update Content */}
              <div className="p-6">
                {/* Update Text */}
                <div className="mb-6">
                  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {update.content}
                  </p>
                </div>

                {/* Update Photos */}
                {update.media_urls && update.media_urls.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <PhotoIcon className="h-4 w-4 text-gray-600" />
                      <h4 className="text-sm font-medium text-gray-700">
                        Photos ({update.media_urls.length})
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {update.media_urls.map((url, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={url}
                            alt={`Update photo ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(url, '_blank')}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Response Stats */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700">
                  {responses.length} {responses.length === 1 ? 'response' : 'responses'}
                </span>
              </div>

              {responses.length > 0 && (
                <div className="text-sm text-gray-500">
                  Latest: {formatDistanceToNow(new Date(responses[responses.length - 1]?.received_at), { addSuffix: true })}
                </div>
              )}
            </div>

            <div className="text-sm text-gray-500">
              Sent to {update.confirmed_recipients?.length || 0} recipients
            </div>
          </div>

          {/* Responses Thread */}
          <ResponseThread
            updateId={updateId}
            responses={responses}
            loading={loading}
            showNotifications={true}
          />
        </div>
      ) : (
        <ResponseAnalytics updateId={updateId} />
      )}
    </div>
  )
}