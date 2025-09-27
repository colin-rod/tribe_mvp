/**
 * AI Prompt Feed Component - Template-Based System
 * Displays and manages AI-generated prompts with template attribution and effectiveness tracking
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AIPromptList, type AIPrompt } from './AIPromptCard'
import { Button } from '@/components/ui/Button'
import { FormMessage } from '@/components/ui/FormMessage'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import {
  SparklesIcon,
  ArrowPathIcon,
  FunnelIcon,
  InformationCircleIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

const logger = createLogger('PromptFeed')

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface PromptFeedProps {
  userId?: string
  childId?: string
  limit?: number
  showStats?: boolean
  showFilters?: boolean
  showManagementTools?: boolean
  compact?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

interface PromptStats {
  total_prompts: number
  prompts_acted_on: number
  prompts_dismissed: number
  average_effectiveness: number
  most_effective_type: string
  template_usage: {
    template_based: number
    ai_generated: number
  }
}

interface PromptFilters {
  prompt_types: string[]
  status: string[]
  date_range: 'today' | 'week' | 'month' | 'all'
  template_only: boolean
  community_only: boolean
}

const DEFAULT_FILTERS: PromptFilters = {
  prompt_types: ['milestone', 'activity', 'fun', 'seasonal'],
  status: ['pending', 'sent'],
  date_range: 'week',
  template_only: false,
  community_only: false
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PromptFeed({
  userId,
  childId,
  limit = 10,
  showStats = true,
  showFilters = true,
  showManagementTools = false,
  compact = false,
  autoRefresh = false,
  refreshInterval = 60000 // 1 minute
}: PromptFeedProps) {
  const [prompts, setPrompts] = useState<AIPrompt[]>([])
  const [stats, setStats] = useState<PromptStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters] = useState<PromptFilters>(DEFAULT_FILTERS)
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_prompt_stats', {
        user_uuid: userId,
        child_uuid: childId
      })

      if (error) {
        logger.error('Error fetching stats', { error })
        return
      }

      setStats(data)
    } catch (error) {
      logger.error('Error fetching prompt stats', { error })
    }
  }, [supabase, userId, childId])

  const fetchPrompts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      let query = supabase
        .from('ai_prompts')
        .select(`
          *,
          children (
            name
          ),
          prompt_templates (
            id,
            is_community_contributed,
            effectiveness_score,
            usage_count,
            created_by
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (userId) {
        query = query.eq('parent_id', userId)
      }

      if (childId) {
        query = query.eq('child_id', childId)
      }

      if (filters.prompt_types.length > 0) {
        query = query.in('prompt_type', filters.prompt_types)
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters.template_only) {
        query = query.not('template_id', 'is', null)
      }

      if (filters.community_only) {
        query = query.not('prompt_templates.is_community_contributed', 'is', false)
      }

      if (filters.date_range !== 'all') {
        const now = new Date()
        let startDate: Date

        switch (filters.date_range) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          default:
            startDate = now
        }

        query = query.gte('created_at', startDate.toISOString())
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      const transformedPrompts: AIPrompt[] = (data || []).map(prompt => ({
        ...prompt,
        child_name: prompt.children?.name,
        template: prompt.prompt_templates ? {
          id: prompt.prompt_templates.id,
          is_community_contributed: prompt.prompt_templates.is_community_contributed,
          effectiveness_score: prompt.prompt_templates.effectiveness_score,
          usage_count: prompt.prompt_templates.usage_count,
          created_by: prompt.prompt_templates.created_by
        } : undefined
      }))

      setPrompts(transformedPrompts)

      if (showStats) {
        await fetchStats()
      }

    } catch (error) {
      logger.error('Error fetching prompts', { error })
      setError(error instanceof Error ? error.message : 'Failed to fetch prompts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [childId, fetchStats, filters, limit, showStats, supabase, userId])

  // =============================================================================
  // PROMPT ACTIONS
  // =============================================================================

  const handleActOnPrompt = async (promptId: string) => {
    try {
      // Update prompt status to 'acted_on'
      const { error } = await supabase
        .from('ai_prompts')
        .update({
          status: 'acted_on',
          acted_on_at: new Date().toISOString()
        })
        .eq('id', promptId)

      if (error) {
        throw error
      }

      // Update template analytics
      const prompt = prompts.find(p => p.id === promptId)
      if (prompt?.template_id) {
        await supabase.from('template_analytics').insert({
          template_id: prompt.template_id,
          user_id: userId || '',
          prompt_id: promptId,
          action_taken: true,
          action_type: 'created_update',
          child_age_months: prompt.substituted_variables?.age_months || 0,
          day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          time_of_day: getTimeOfDay()
        })
      }

      // Update local state
      setPrompts(prev => prev.filter(p => p.id !== promptId))

      // Refresh stats
      if (showStats) {
        await fetchStats()
      }

    } catch (error) {
      logger.error('Error acting on prompt', { error, promptId, action: 'create_update' })
      throw error
    }
  }

  const handleDismissPrompt = async (promptId: string) => {
    try {
      // Update prompt status to 'dismissed'
      const { error } = await supabase
        .from('ai_prompts')
        .update({
          status: 'dismissed'
        })
        .eq('id', promptId)

      if (error) {
        throw error
      }

      // Update template analytics
      const prompt = prompts.find(p => p.id === promptId)
      if (prompt?.template_id) {
        await supabase.from('template_analytics').insert({
          template_id: prompt.template_id,
          user_id: userId || '',
          prompt_id: promptId,
          action_taken: true,
          action_type: 'dismissed',
          child_age_months: prompt.substituted_variables?.age_months || 0,
          day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          time_of_day: getTimeOfDay()
        })
      }

      // Update local state
      setPrompts(prev => prev.filter(p => p.id !== promptId))

      // Refresh stats
      if (showStats) {
        await fetchStats()
      }

    } catch (error) {
      logger.error('Error dismissing prompt', { error, promptId })
      throw error
    }
  }

  const handleGenerateNewPrompts = async () => {
    try {
      setRefreshing(true)

      const { data, error } = await supabase.functions.invoke('generate-prompts', {
        body: {
          parent_id: userId,
          force_generation: true
        }
      })

      if (error) {
        throw error
      }

        logger.info('Generated new prompts', { data })

      // Refresh the prompt list
      await fetchPrompts(true)

    } catch (error) {
      logger.error('Error generating new prompts', { error, childId, promptType: 'milestone' })
      setError('Failed to generate new prompts. Please try again.')
    } finally {
      setRefreshing(false)
    }
  }

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    void fetchPrompts()
  }, [fetchPrompts])

  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return

    const interval = setInterval(() => {
      void fetchPrompts(true)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchPrompts])

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  const getTimeOfDay = (): string => {
    const hour = new Date().getHours()
    if (hour < 6) return 'early morning'
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    if (hour < 21) return 'evening'
    return 'night'
  }

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderStats = () => {
    if (!showStats || !stats) return null

    const engagementRate = stats.total_prompts > 0
      ? ((stats.prompts_acted_on / stats.total_prompts) * 100).toFixed(1)
      : '0'

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">Prompt Analytics</h3>
          <ChartBarIcon className="h-4 w-4 text-gray-400" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total_prompts}</div>
            <div className="text-xs text-gray-500">Total Prompts</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.prompts_acted_on}</div>
            <div className="text-xs text-gray-500">Acted On</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{engagementRate}%</div>
            <div className="text-xs text-gray-500">Engagement</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.average_effectiveness.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Avg Rating</div>
          </div>
        </div>

        {stats.template_usage && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Template-based prompts:</span>
              <span className="font-medium">
                {stats.template_usage.template_based} / {stats.total_prompts}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {stats.template_usage.template_based > 0
                ? `${((stats.template_usage.template_based / stats.total_prompts) * 100).toFixed(1)}% cost reduction`
                : 'No template usage yet'
              }
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderFilters = () => {
    if (!showFilters) return null

    return (
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          className="flex items-center gap-2"
        >
          <FunnelIcon className="h-4 w-4" />
          Filters
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void fetchPrompts(true)
          }}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <ArrowPathIcon className={cn(
            'h-4 w-4',
            refreshing && 'animate-spin'
          )} />
          Refresh
        </Button>

        {showManagementTools && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateNewPrompts}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <SparklesIcon className="h-4 w-4" />
            Generate More
          </Button>
        )}
      </div>
    )
  }

  const renderTemplateInfo = () => {
    const templateCount = prompts.filter(p => p.template_id).length
    const communityCount = prompts.filter(p => p.template?.is_community_contributed).length

    if (templateCount === 0) return null

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Template-Based System Active
            </h4>
            <p className="text-sm text-blue-700">
              {templateCount} of {prompts.length} prompts generated using curated templates
              {communityCount > 0 && ` (${communityCount} from community contributions)`}
              , providing 90% cost reduction while maintaining personalization.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  if (error) {
    return (
      <FormMessage
        type="error"
        message="Failed to load prompts"
        details={error}
        className="m-4"
      />
    )
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Prompts</h2>
            <p className="text-sm text-gray-600">
              Personalized suggestions to capture precious moments
            </p>
          </div>

          {showManagementTools && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/templates')}
              className="flex items-center gap-2"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              Manage Templates
            </Button>
          )}
        </div>
      )}

      {/* Stats */}
      {renderStats()}

      {/* Template Info */}
      {renderTemplateInfo()}

      {/* Filters */}
      {renderFilters()}

      {/* Prompt List */}
      <AIPromptList
        prompts={prompts}
        onDismissPrompt={handleDismissPrompt}
        onActOnPrompt={handleActOnPrompt}
        loading={loading}
        compact={compact}
        showTemplateAttribution={true}
        emptyStateMessage="No prompts available. Check back later or generate new ones!"
      />

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="text-center text-xs text-gray-500">
          Automatically refreshes every {Math.floor(refreshInterval / 1000)} seconds
        </div>
      )}
    </div>
  )
}

export default PromptFeed
