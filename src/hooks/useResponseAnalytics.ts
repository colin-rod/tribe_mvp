import { useState, useEffect, useRef } from 'react'
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

interface ResponseRow {
  channel: string
  received_at: string
  recipients: {
    name: string
    relationship: string
  }
}

interface UpdateRow {
  id: string
  created_at: string
}

export function useResponseAnalytics(timeframe: '7d' | '30d' | '90d' = '30d') {
  const loggerRef = useRef(createLogger('UseResponseAnalytics'))
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

        // Get responses for user's memories in timeframe
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

        // Get total memories in timeframe for response rate
        const { data: updatesData, error: updatesError } = await supabase
          .from('memories')
          .select('id, created_at')
          .eq('parent_id', user.id)
          .gte('created_at', startDate.toISOString())

        if (updatesError) {
          throw updatesError
        }

        if (responsesData && updatesData) {
          const analytics = calculateAnalytics(
            responsesData as ResponseRow[],
            updatesData as UpdateRow[]
          )
          setAnalytics(analytics)
        }
      } catch (err) {
        loggerRef.current.error('Error fetching response analytics:', { error: err })
        setError('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [timeframe])

  return { analytics, loading, error }
}

function calculateAnalytics(responses: ResponseRow[], updates: UpdateRow[]): ResponseAnalytics {
  // Calculate response rate
  const responseRate = updates.length > 0
    ? Math.round((responses.length / updates.length) * 100)
    : 0

  // Top responders
  const responderCounts = responses.reduce<Record<string, { recipient: string; relationship: string; count: number }>>((acc, response) => {
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
  }, {})

  const topResponders = Object.values(responderCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Responses by hour
  const hourCounts = Array(24).fill(0)
  responses.forEach(response => {
    const hour = new Date(response.received_at).getHours()
    hourCounts[hour]++
  })

  const responsesByHour = hourCounts.map((count, hour) => ({ hour, count }))

  // Responses by channel
  const channelCounts = responses.reduce<Record<string, number>>((acc, response) => {
    acc[response.channel] = (acc[response.channel] || 0) + 1
    return acc
  }, {})

  const responsesByChannel = Object.entries(channelCounts).map(([channel, count]) => ({
    channel: channel.charAt(0).toUpperCase() + channel.slice(1),
    count
  }))

  // Engagement trend (last 7 days)
  const today = new Date()
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - i))
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
  // In a real implementation, you'd need to track when memories were sent
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
