'use client'

import { useState } from 'react'
import { useResponseAnalytics } from '@/hooks/useResponseAnalytics'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  ArrowTrendingUpIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  ChartBarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

interface ResponseAnalyticsProps {
  updateId?: string
  timeframe?: '7d' | '30d' | '90d'
}

export function ResponseAnalytics({
  updateId,
  timeframe: defaultTimeframe = '30d'
}: ResponseAnalyticsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>(defaultTimeframe)
  const { analytics, loading, error } = useResponseAnalytics(selectedTimeframe)

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  }

  const maxHourlyResponses = Math.max(...analytics.responsesByHour.map(h => h.count))

  return (
    <div className="space-y-6">
      {/* Header with Timeframe Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5" />
          Response Analytics
        </h2>

        <div className="flex rounded-lg border border-gray-200 bg-white">
          {(['7d', '30d', '90d'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedTimeframe(period)}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                selectedTimeframe === period
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChatBubbleLeftIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalResponses}</p>
              <p className="text-sm text-gray-600">Total Responses</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{analytics.responseRate}%</p>
              <p className="text-sm text-gray-600">Response Rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ClockIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{analytics.averageResponseTime}h</p>
              <p className="text-sm text-gray-600">Avg Response Time</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UsersIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{analytics.topResponders.length}</p>
              <p className="text-sm text-gray-600">Active Responders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Responders */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Top Responders
          </h3>

          {analytics.topResponders.length > 0 ? (
            <div className="space-y-3">
              {analytics.topResponders.map((responder, index) => (
                <div key={responder.recipient} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {responder.recipient.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{responder.recipient}</p>
                      <p className="text-xs text-gray-500 capitalize">{responder.relationship}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{responder.count}</p>
                    <p className="text-xs text-gray-500">responses</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No responses yet</p>
          )}
        </div>

        {/* Response by Channel */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChatBubbleLeftIcon className="h-5 w-5" />
            Response Channels
          </h3>

          {analytics.responsesByChannel.length > 0 ? (
            <div className="space-y-3">
              {analytics.responsesByChannel.map((channel) => (
                <div key={channel.channel} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      channel.channel === 'Email' ? 'bg-blue-500' :
                      channel.channel === 'Whatsapp' ? 'bg-green-500' :
                      'bg-purple-500'
                    }`} />
                    <span className="font-medium text-gray-900">{channel.channel}</span>
                  </div>
                  <span className="text-gray-600">{channel.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No responses yet</p>
          )}
        </div>
      </div>

      {/* Response Activity by Hour */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Response Activity by Hour
        </h3>

        <div className="space-y-2">
          {analytics.responsesByHour.map((hourData) => (
            <div key={hourData.hour} className="flex items-center gap-3">
              <div className="w-16 text-xs text-gray-600 text-right">
                {formatHour(hourData.hour)}
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                <div
                  className="bg-blue-500 h-4 rounded-full"
                  style={{
                    width: maxHourlyResponses > 0 ? `${(hourData.count / maxHourlyResponses) * 100}%` : '0%'
                  }}
                />
              </div>
              <div className="w-8 text-xs text-gray-600">
                {hourData.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Trend */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarDaysIcon className="h-5 w-5" />
          7-Day Engagement Trend
        </h3>

        <div className="grid grid-cols-7 gap-2">
          {analytics.engagementTrend.map((day) => {
            const maxDayResponses = Math.max(...analytics.engagementTrend.map(d => d.responses))
            const height = maxDayResponses > 0 ? Math.max((day.responses / maxDayResponses) * 100, 5) : 5

            return (
              <div key={day.date} className="flex flex-col items-center">
                <div className="w-full bg-gray-100 rounded-t" style={{ height: '60px' }}>
                  <div
                    className="bg-blue-500 rounded-t w-full"
                    style={{ height: `${height}%`, marginTop: `${100 - height}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-xs font-medium text-gray-900">
                  {day.responses}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}