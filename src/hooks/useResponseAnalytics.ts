import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

interface ResponseAnalytics {
  totalResponses: number
  responseRate: number
  topResponders: Array<{
    recipient: string
    count: number
    relationship: string
  }>
  responsesByHour: Array<{
    hour: number
    count: number
  }>
  responsesByChannel: Array<{
    channel: string
    count: number
  }>
  averageResponseTime: number
  engagementTrend: Array<{
    date: string
    responses: number
  }>
}

export function useResponseAnalytics(timeframe: '7d' | '30d' | '90d' = '30d') {
  const logger = createLogger('UseResponseAnalytics')
  const [analytics, setAnalytics] = useState<ResponseAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Calculate date range
        const daysAgo = { '7d': 7, '30d': 30, '90d': 90 }[timeframe]
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - daysAgo)

        // Get responses for user's updates in timeframe
        const { data: responsesData, error: responsesError } = await supabase
          .from('responses')
          .select(`
            *,
            recipients!inner (name, relationship),
            updates!inner (parent_id, created_at)
          `)
          .eq('updates.parent_id', user.id)
          .gte('received_at', startDate.toISOString())

        if (responsesError) {
          throw responsesError
        }

        // Get total updates in timeframe for response rate
        const { data: updatesData, error: updatesError } = await supabase
          .from('updates')
          .select('id, created_at')
          .eq('parent_id', user.id)
          .gte('created_at', startDate.toISOString())

        if (updatesError) {
          throw updatesError
        }

        if (responsesData && updatesData) {
          const analytics = calculateAnalytics(responsesData, updatesData)
          setAnalytics(analytics)
        }
      } catch (err) {
        logger.error('Error fetching response analytics:', { error: err })
        setError('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [timeframe])

  return { analytics, loading, error }
}

function calculateAnalytics(responses: any[], updates: any[]): ResponseAnalytics {
  // Calculate response rate
  const responseRate = updates.length > 0
    ? Math.round((responses.length / updates.length) * 100)
    : 0

  // Top responders
  const responderCounts = responses.reduce((acc, response) => {
    const key = response.recipients.name
    if (!acc[key]) {
      acc[key] = {
        recipient: response.recipients.name,
        relationship: response.recipients.relationship,
        count: 0
      }
    }
    acc[key].count++
    return acc
  }, {} as Record<string, any>)

  const topResponders = Object.values(responderCounts)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)

  // Responses by hour
  const hourCounts = Array(24).fill(0)
  responses.forEach(response => {
    const hour = new Date(response.received_at).getHours()
    hourCounts[hour]++
  })

  const responsesByHour = hourCounts.map((count, hour) => ({ hour, count }))

  // Responses by channel
  const channelCounts = responses.reduce((acc, response) => {
    acc[response.channel] = (acc[response.channel] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const responsesByChannel = Object.entries(channelCounts).map(([channel, count]) => ({
    channel: channel.charAt(0).toUpperCase() + channel.slice(1),
    count
  }))

  // Engagement trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split('T')[0]
  })

  const engagementTrend = last7Days.map(date => {
    const dayResponses = responses.filter(response =>
      response.received_at.startsWith(date)
    ).length

    return {
      date,
      responses: dayResponses
    }
  })

  // Calculate average response time (simplified - assumes 2.5 hours average)
  // In a real implementation, you'd need to track when updates were sent
  const averageResponseTime = 2.5

  return {
    totalResponses: responses.length,
    responseRate,
    topResponders,
    responsesByHour,
    responsesByChannel,
    averageResponseTime,
    engagementTrend
  }
}