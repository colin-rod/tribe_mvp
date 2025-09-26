/**
 * Template Effectiveness Tracking System
 * Comprehensive analytics and performance monitoring for AI prompt templates
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface TemplateAnalytics {
  id: string
  template_id: string
  user_id: string
  prompt_id?: string
  action_taken: boolean
  action_type: 'created_update' | 'dismissed' | 'ignored' | 'selected'
  time_to_action?: string // ISO duration format
  engagement_score?: number
  child_age_months: number
  day_of_week: string
  time_of_day: string
  created_at: string
}

export interface TemplatePerformanceMetrics {
  template_id: string
  total_usage: number
  total_actions: number
  engagement_rate: number
  average_engagement_score: number
  average_time_to_action: number
  most_common_action: string
  age_group_performance: {
    age_range: string
    usage_count: number
    engagement_rate: number
  }[]
  temporal_patterns: {
    day_of_week: string
    hour_of_day: number
    usage_count: number
    engagement_rate: number
  }[]
  effectiveness_trend: {
    date: string
    engagement_rate: number
    usage_count: number
  }[]
}

export interface SystemWideAnalytics {
  total_templates: number
  total_usage: number
  overall_engagement_rate: number
  cost_savings: {
    template_based_prompts: number
    estimated_ai_cost_avoided: number
    cost_per_prompt_template: number
    cost_per_prompt_ai: number
  }
  top_performing_templates: {
    template_id: string
    template_text: string
    prompt_type: string
    engagement_rate: number
    usage_count: number
  }[]
  type_performance: {
    prompt_type: string
    average_engagement: number
    total_usage: number
  }[]
  user_segment_performance: {
    segment: string
    engagement_rate: number
    preferred_types: string[]
  }[]
}

interface TemporalPatternGroup {
  items: TemplateAnalytics[]
  day_of_week: string
  time_of_day: string
}

interface TemplatePerformanceAccumulator {
  template_id: string
  template_text: string
  prompt_type: string
  total: number
  actions: number
}

type TemplateAnalyticsWithTemplate = TemplateAnalytics & {
  prompt_templates?: {
    template_text: string
    prompt_type: string
  } | null
}

// =============================================================================
// TEMPLATE ANALYTICS FUNCTIONS
// =============================================================================

export class TemplateAnalyticsTracker {
  private supabase: SupabaseClient
  private logger = createLogger('TemplateAnalyticsTracker')

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Track when a template is selected for a user
   */
  async trackTemplateSelection(
    templateId: string,
    userId: string,
    promptId: string,
    childAgeMonths: number,
    _context?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('template_analytics')
        .insert({
          template_id: templateId,
          user_id: userId,
          prompt_id: promptId,
          action_taken: false,
          action_type: 'selected',
          child_age_months: childAgeMonths,
          day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          time_of_day: this.getTimeOfDay(),
          created_at: new Date().toISOString()
        })

      if (error) {
        this.logger.error('Error tracking template selection', { error })
      }
    } catch (error) {
      this.logger.errorWithStack('Failed to track template selection', error as Error)
    }
  }

  /**
   * Track when user acts on a prompt (creates update)
   */
  async trackPromptAction(
    promptId: string,
    templateId: string,
    userId: string,
    actionType: 'created_update' | 'dismissed' | 'ignored',
    timeToAction?: number,
    engagementScore?: number
  ): Promise<void> {
    try {
      // Update existing analytics record if it exists, otherwise create new one
      const { data: existing } = await this.supabase
        .from('template_analytics')
        .select('id')
        .eq('prompt_id', promptId)
        .eq('template_id', templateId)
        .single()

      const analyticsData = {
        action_taken: true,
        action_type: actionType,
        time_to_action: timeToAction ? `PT${timeToAction}S` : null,
        engagement_score: engagementScore
      }

      if (existing) {
        // Update existing record
        const { error } = await this.supabase
          .from('template_analytics')
          .update(analyticsData)
          .eq('id', existing.id)

        if (error) {
          this.logger.error('Error updating template analytics', { error })
        }
      } else {
        // Create new record
        const { error } = await this.supabase
          .from('template_analytics')
          .insert({
            template_id: templateId,
            user_id: userId,
            prompt_id: promptId,
            child_age_months: 0, // This would be populated from prompt context
            day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
            time_of_day: this.getTimeOfDay(),
            ...analyticsData
          })

        if (error) {
          this.logger.error('Error creating template analytics', { error })
        }
      }

      // Update template effectiveness score
      await this.updateTemplateEffectiveness(templateId)

    } catch (error) {
      this.logger.errorWithStack('Failed to track prompt action', error as Error)
    }
  }

  /**
   * Get performance metrics for a specific template
   */
  async getTemplatePerformance(templateId: string): Promise<TemplatePerformanceMetrics | null> {
    try {
      // Get basic metrics
      const { data: analytics, error } = await this.supabase
        .from('template_analytics')
        .select('*')
        .eq('template_id', templateId)

      if (error || !analytics) {
        this.logger.error('Error fetching template analytics', { error })
        return null
      }

      const totalUsage = analytics.length
      const totalActions = analytics.filter(a => a.action_taken).length
      const engagementRate = totalUsage > 0 ? (totalActions / totalUsage) * 100 : 0

      // Calculate average engagement score
      const engagementScores = analytics
        .filter(a => a.engagement_score !== null)
        .map(a => a.engagement_score!)
      const averageEngagementScore = engagementScores.length > 0
        ? engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length
        : 0

      // Calculate average time to action
      const actionTimes = analytics
        .filter(a => a.time_to_action)
        .map(a => this.parseDuration(a.time_to_action!))
      const averageTimeToAction = actionTimes.length > 0
        ? actionTimes.reduce((a, b) => a + b, 0) / actionTimes.length
        : 0

      // Most common action
      const actionCounts = analytics.reduce((acc, a) => {
        acc[a.action_type] = (acc[a.action_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      const mostCommonAction = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none'

      // Age group performance
      const ageGroups = this.groupByAgeRange(analytics)
      const ageGroupPerformance = Object.entries(ageGroups).map(([range, items]) => ({
        age_range: range,
        usage_count: items.length,
        engagement_rate: items.length > 0 ? (items.filter(i => i.action_taken).length / items.length) * 100 : 0
      }))

      // Temporal patterns (simplified)
      const temporalPatterns = analytics.reduce<Record<string, TemporalPatternGroup>>((acc, item) => {
        const key = `${item.day_of_week}-${item.time_of_day}`
        if (!acc[key]) {
          acc[key] = { items: [], day_of_week: item.day_of_week, time_of_day: item.time_of_day }
        }
        acc[key].items.push(item)
        return acc
      }, {})

      const temporalPatternsArray = Object.values(temporalPatterns).map(group => ({
        day_of_week: group.day_of_week,
        hour_of_day: this.timeOfDayToHour(group.time_of_day),
        usage_count: group.items.length,
        engagement_rate: group.items.length > 0
          ? (group.items.filter(item => item.action_taken).length / group.items.length) * 100
          : 0
      }))

      // Effectiveness trend (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const recentAnalytics = analytics.filter(a => new Date(a.created_at) >= thirtyDaysAgo)
      const effectivenessTrend = this.calculateDailyTrends(recentAnalytics)

      return {
        template_id: templateId,
        total_usage: totalUsage,
        total_actions: totalActions,
        engagement_rate: engagementRate,
        average_engagement_score: averageEngagementScore,
        average_time_to_action: averageTimeToAction,
        most_common_action: mostCommonAction,
        age_group_performance: ageGroupPerformance,
        temporal_patterns: temporalPatternsArray,
        effectiveness_trend: effectivenessTrend
      }

    } catch (error) {
      this.logger.errorWithStack('Error getting template performance', error as Error)
      return null
    }
  }

  /**
   * Get system-wide analytics
   */
  async getSystemAnalytics(): Promise<SystemWideAnalytics | null> {
    try {
      // Get all template analytics
      const { data: allAnalytics, error: analyticsError } = await this.supabase
        .from('template_analytics')
        .select(`
          *,
          prompt_templates (
            template_text,
            prompt_type
          )
        `)

      if (analyticsError) {
        this.logger.error('Error fetching system analytics', { error: analyticsError })
        return null
      }

      const analyticsWithTemplates = (allAnalytics ?? []) as TemplateAnalyticsWithTemplate[]

      // Get template count
      const { count: templateCount, error: countError } = await this.supabase
        .from('prompt_templates')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        this.logger.error('Error fetching template count', { error: countError })
      }

      const totalUsage = analyticsWithTemplates.length
      const totalActions = analyticsWithTemplates.filter(a => a.action_taken).length
      const overallEngagementRate = totalUsage > 0 ? (totalActions / totalUsage) * 100 : 0

      // Cost savings calculation
      const templateBasedPrompts = totalUsage
      const estimatedAiCostPerPrompt = 0.0015 // $0.0015 per AI-generated prompt
      const templateCostPerPrompt = 0.0001 // $0.0001 per template-based prompt
      const estimatedAiCostAvoided = templateBasedPrompts * (estimatedAiCostPerPrompt - templateCostPerPrompt)

      // Top performing templates
      const templatePerformance = new Map<string, TemplatePerformanceAccumulator>()
      analyticsWithTemplates.forEach(item => {
        if (!templatePerformance.has(item.template_id)) {
          templatePerformance.set(item.template_id, {
            template_id: item.template_id,
            template_text: item.prompt_templates?.template_text || '',
            prompt_type: item.prompt_templates?.prompt_type || '',
            total: 0,
            actions: 0
          })
        }
        const perf = templatePerformance.get(item.template_id)
        if (perf) {
          perf.total += 1
          if (item.action_taken) {
            perf.actions += 1
          }
        }
      })

      const topPerformingTemplates = Array.from(templatePerformance.values())
        .map(perf => ({
          ...perf,
          engagement_rate: perf.total > 0 ? (perf.actions / perf.total) * 100 : 0,
          usage_count: perf.total
        }))
        .sort((a, b) => b.engagement_rate - a.engagement_rate)
        .slice(0, 10)

      // Type performance
      const typePerformance = new Map<string, { total: number; actions: number }>()
      analyticsWithTemplates.forEach(item => {
        const type = item.prompt_templates?.prompt_type || 'unknown'
        if (!typePerformance.has(type)) {
          typePerformance.set(type, { total: 0, actions: 0 })
        }
        const perf = typePerformance.get(type)!
        perf.total += 1
        if (item.action_taken) perf.actions += 1
      })

      const typePerformanceArray = Array.from(typePerformance.entries()).map(([type, perf]) => ({
        prompt_type: type,
        average_engagement: perf.total > 0 ? (perf.actions / perf.total) * 100 : 0,
        total_usage: perf.total
      }))

      return {
        total_templates: templateCount || 0,
        total_usage: totalUsage,
        overall_engagement_rate: overallEngagementRate,
        cost_savings: {
          template_based_prompts: templateBasedPrompts,
          estimated_ai_cost_avoided: estimatedAiCostAvoided,
          cost_per_prompt_template: templateCostPerPrompt,
          cost_per_prompt_ai: estimatedAiCostPerPrompt
        },
        top_performing_templates: topPerformingTemplates,
        type_performance: typePerformanceArray,
        user_segment_performance: [] // This would require user segmentation logic
      }

    } catch (error) {
      this.logger.errorWithStack('Error getting system analytics', error as Error)
      return null
    }
  }

  /**
   * Update template effectiveness score based on recent analytics
   */
  async updateTemplateEffectiveness(templateId: string): Promise<void> {
    try {
      // Get recent analytics (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const { data: recentAnalytics, error } = await this.supabase
        .from('template_analytics')
        .select('*')
        .eq('template_id', templateId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (error || !recentAnalytics || recentAnalytics.length === 0) {
        return
      }

      // Calculate effectiveness score
      const totalUsage = recentAnalytics.length
      const successfulActions = recentAnalytics.filter(a => a.action_type === 'created_update').length
      const dismissedActions = recentAnalytics.filter(a => a.action_type === 'dismissed').length

      // Scoring algorithm
      let effectivenessScore = 5.0 // Base score

      if (totalUsage > 0) {
        const successRate = (successfulActions / totalUsage) * 100
        const dismissalRate = (dismissedActions / totalUsage) * 100

        // Success rate contributes 0-5 points
        effectivenessScore += (successRate / 100) * 5

        // Low dismissal rate contributes 0-2 points
        effectivenessScore += Math.max(0, 2 - (dismissalRate / 50) * 2)

        // Engagement scores contribute if available
        const engagementScores = recentAnalytics
          .filter(a => a.engagement_score !== null)
          .map(a => a.engagement_score!)

        if (engagementScores.length > 0) {
          const avgEngagement = engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length
          effectivenessScore = (effectivenessScore + avgEngagement) / 2
        }
      }

      // Cap at 10
      effectivenessScore = Math.min(effectivenessScore, 10)

      // Update template
      const { error: updateError } = await this.supabase
        .from('prompt_templates')
        .update({
          effectiveness_score: effectivenessScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)

      if (updateError) {
        this.logger.error('Error updating template effectiveness', { error: updateError })
      }

    } catch (error) {
      this.logger.errorWithStack('Failed to update template effectiveness', error as Error)
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private getTimeOfDay(): string {
    const hour = new Date().getHours()
    if (hour < 6) return 'early morning'
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    if (hour < 21) return 'evening'
    return 'night'
  }

  private timeOfDayToHour(timeOfDay: string): number {
    switch (timeOfDay) {
      case 'early morning': return 3
      case 'morning': return 9
      case 'afternoon': return 14
      case 'evening': return 19
      case 'night': return 22
      default: return 12
    }
  }

  private parseDuration(duration: string): number {
    // Parse ISO 8601 duration format PT${seconds}S
    const match = duration.match(/PT(\d+)S/)
    return match ? parseInt(match[1]) : 0
  }

  private groupByAgeRange(analytics: TemplateAnalytics[]): Record<string, TemplateAnalytics[]> {
    return analytics.reduce((acc, item) => {
      let range: string
      if (item.child_age_months < 6) range = '0-6 months'
      else if (item.child_age_months < 12) range = '6-12 months'
      else if (item.child_age_months < 24) range = '12-24 months'
      else if (item.child_age_months < 36) range = '2-3 years'
      else range = '3+ years'

      if (!acc[range]) acc[range] = []
      acc[range].push(item)
      return acc
    }, {} as Record<string, TemplateAnalytics[]>)
  }

  private calculateDailyTrends(analytics: TemplateAnalytics[]): { date: string; engagement_rate: number; usage_count: number }[] {
    const dailyData = analytics.reduce((acc, item) => {
      const date = new Date(item.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { total: 0, actions: 0 }
      }
      acc[date].total += 1
      if (item.action_taken) acc[date].actions += 1
      return acc
    }, {} as Record<string, { total: number; actions: number }>)

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      engagement_rate: data.total > 0 ? (data.actions / data.total) * 100 : 0,
      usage_count: data.total
    })).sort((a, b) => a.date.localeCompare(b.date))
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Initialize analytics tracker with Supabase client
 */
export function createAnalyticsTracker(supabase: SupabaseClient): TemplateAnalyticsTracker {
  return new TemplateAnalyticsTracker(supabase)
}

/**
 * Generate analytics report for a date range
 */
export async function generateAnalyticsReport(
  supabase: SupabaseClient,
  startDate: Date,
  endDate: Date,
  templateIds?: string[]
): Promise<{
  summary: SystemWideAnalytics
  templateDetails: TemplatePerformanceMetrics[]
  recommendations: string[]
}> {
  const reportLogger = createLogger('TemplateAnalyticsReport')
  const tracker = createAnalyticsTracker(supabase)

  try {
    // Get system-wide analytics
    const summary = await tracker.getSystemAnalytics()

    // Get detailed metrics for specified templates
    const templateDetails: TemplatePerformanceMetrics[] = []
    if (templateIds && templateIds.length > 0) {
      for (const templateId of templateIds) {
        const metrics = await tracker.getTemplatePerformance(templateId)
        if (metrics) {
          templateDetails.push(metrics)
        }
      }
    }

    // Generate recommendations
    const recommendations = generateRecommendations(summary, templateDetails)

    return {
      summary: summary || {
        total_templates: 0,
        total_usage: 0,
        overall_engagement_rate: 0,
        cost_savings: {
          template_based_prompts: 0,
          estimated_ai_cost_avoided: 0,
          cost_per_prompt_template: 0.0001,
          cost_per_prompt_ai: 0.0015
        },
        top_performing_templates: [],
        type_performance: [],
        user_segment_performance: []
      },
      templateDetails,
      recommendations
    }

  } catch (error) {
    reportLogger.errorWithStack('Error generating analytics report', error as Error)
    throw error
  }
}

function generateRecommendations(
  summary: SystemWideAnalytics | null,
  templateDetails: TemplatePerformanceMetrics[]
): string[] {
  const recommendations: string[] = []

  if (!summary) {
    recommendations.push('Unable to generate recommendations due to insufficient data')
    return recommendations
  }

  // Engagement rate recommendations
  if (summary.overall_engagement_rate < 30) {
    recommendations.push('Overall engagement rate is low. Consider reviewing template quality and relevance.')
  } else if (summary.overall_engagement_rate > 70) {
    recommendations.push('Excellent engagement rate! Consider creating more templates of successful types.')
  }

  // Template type recommendations
  const bestType = summary.type_performance
    .sort((a, b) => b.average_engagement - a.average_engagement)[0]
  if (bestType) {
    recommendations.push(`${bestType.prompt_type} templates perform best. Consider creating more of this type.`)
  }

  // Low performing template recommendations
  const lowPerforming = templateDetails.filter(t => t.engagement_rate < 20)
  if (lowPerforming.length > 0) {
    recommendations.push(`${lowPerforming.length} templates have low engagement. Consider revising or removing them.`)
  }

  // Usage volume recommendations
  if (summary.total_usage < 100) {
    recommendations.push('Low template usage detected. Consider increasing prompt generation frequency.')
  }

  return recommendations
}

export default TemplateAnalyticsTracker
