/**
 * Smart template selection algorithm for template-based AI prompts
 * Selects the best template based on age, context, preferences, and variety enforcement
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { PromptVariables, Child, User } from './prompt-context'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface PromptTemplate {
  id: string
  prompt_type: 'milestone' | 'activity' | 'fun' | 'seasonal'
  template_text: string
  age_range_min: number | null
  age_range_max: number | null
  category: string | null
  tags: string[]
  variables: string[]
  usage_count: number
  effectiveness_score: number
  is_community_contributed: boolean
  community_prompt_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  enabled_prompt_types: string[]
  prompt_frequency: string
  quiet_hours?: {
    start: string
    end: string
  }
  [key: string]: any
}

export interface TemplateScore {
  template: PromptTemplate
  score: number
  scoreBreakdown: {
    ageAppropriatenesss: number
    seasonalRelevance: number
    activityTiming: number
    milestoneTiming: number
    effectivenessHistory: number
    communityBonus: number
    usagePenalty: number
    varietyBonus: number
  }
}

// =============================================================================
// MAIN TEMPLATE SELECTION FUNCTION
// =============================================================================

export async function selectTemplate(
  child: Child,
  user: User,
  context: PromptVariables,
  _preferences: NotificationPreferences,
  supabase: SupabaseClient
): Promise<PromptTemplate | null> {
  try {
    const enabledTypes = _preferences.enabled_prompt_types || ['milestone', 'activity', 'fun']

    // Get recent template IDs to avoid repetition
    const recentTemplateIds = await getRecentTemplateIds(child.id, supabase, 7)

    // Get candidate templates
    const candidates = await getTemplatesByFilters(supabase, {
      ageMonths: context.age_months,
      enabledTypes,
      excludeTemplateIds: recentTemplateIds,
      limit: 50
    })

    if (!candidates || candidates.length === 0) {
      // console.log('No candidate templates found for child', child.id)
      return null
    }

    // Score templates based on context
    const scoredTemplates = candidates.map(template => ({
      template,
      score: calculateTemplateScore(template, context, _preferences),
      scoreBreakdown: calculateDetailedTemplateScore(template, context, _preferences)
    }))

    // Sort by score (highest first)
    scoredTemplates.sort((a, b) => b.score - a.score)

    // Template selection completed

    return scoredTemplates[0]?.template || null
  } catch (error) {
    // console.error('Error in template selection:', error)
    return null
  }
}

// =============================================================================
// TEMPLATE SCORING FUNCTIONS
// =============================================================================

export function calculateTemplateScore(
  template: PromptTemplate,
  context: PromptVariables,
  preferences: NotificationPreferences
): number {
  const breakdown = calculateDetailedTemplateScore(template, context, preferences)

  return (
    breakdown.ageAppropriatenesss +
    breakdown.seasonalRelevance +
    breakdown.activityTiming +
    breakdown.milestoneTiming +
    breakdown.effectivenessHistory +
    breakdown.communityBonus +
    breakdown.usagePenalty +
    breakdown.varietyBonus
  )
}

export function calculateDetailedTemplateScore(
  template: PromptTemplate,
  context: PromptVariables,
  preferences: NotificationPreferences
): TemplateScore['scoreBreakdown'] {
  const breakdown = {
    ageAppropriatenesss: 0,
    seasonalRelevance: 0,
    activityTiming: 0,
    milestoneTiming: 0,
    effectivenessHistory: 0,
    communityBonus: 0,
    usagePenalty: 0,
    varietyBonus: 0
  }

  // Age appropriateness (high weight - 0-50 points)
  if (isAgeAppropriate(template, context.age_months)) {
    const ageMatchQuality = calculateAgeMatchQuality(template, context.age_months)
    breakdown.ageAppropriatenesss = 30 + (ageMatchQuality * 20) // 30-50 points
  }

  // Seasonal relevance (0-30 points)
  if (template.prompt_type === 'seasonal') {
    if (context.upcoming_holiday || context.holiday) {
      breakdown.seasonalRelevance = 30
    } else if (isSeasonallyRelevant(template, context)) {
      breakdown.seasonalRelevance = 20
    }
  }

  // Activity timing (0-25 points)
  if (template.prompt_type === 'activity') {
    if (context.days_since_update > 5) {
      breakdown.activityTiming = 25
    } else if (context.days_since_update > 3) {
      breakdown.activityTiming = 15
    } else if (context.days_since_update > 1) {
      breakdown.activityTiming = 10
    }
  }

  // Milestone timing (0-35 points)
  if (template.prompt_type === 'milestone') {
    if (shouldPromptMilestone(context)) {
      breakdown.milestoneTiming = 35
    } else if (isMilestoneRelevant(template, context)) {
      breakdown.milestoneTiming = 20
    }
  }

  // Effectiveness history (0-20 points)
  const effectivenessScore = template.effectiveness_score || 0
  breakdown.effectivenessHistory = Math.min(effectivenessScore * 2, 20)

  // Community contribution bonus (0-10 points)
  if (template.is_community_contributed) {
    breakdown.communityBonus = 10
  }

  // Usage frequency penalty (0 to -15 points)
  const usageCount = template.usage_count || 0
  breakdown.usagePenalty = -Math.min(usageCount * 0.5, 15)

  // Variety bonus for less common types (0-15 points)
  if (template.prompt_type === 'fun' && Math.random() > 0.7) {
    breakdown.varietyBonus = 15 // Randomly boost fun prompts for variety
  } else if (template.prompt_type === 'seasonal' && (context.upcoming_holiday || context.holiday)) {
    breakdown.varietyBonus = 10
  }

  return breakdown
}

// =============================================================================
// SCORING HELPER FUNCTIONS
// =============================================================================

function isAgeAppropriate(template: PromptTemplate, ageMonths: number): boolean {
  const minAge = template.age_range_min
  const maxAge = template.age_range_max

  // If no age restrictions, it's appropriate for all ages
  if (minAge === null && maxAge === null) return true

  // Check age bounds
  if (minAge !== null && ageMonths < minAge) return false
  if (maxAge !== null && ageMonths > maxAge) return false

  return true
}

function calculateAgeMatchQuality(template: PromptTemplate, ageMonths: number): number {
  const minAge = template.age_range_min || 0
  const maxAge = template.age_range_max || 60

  // Calculate how well the age fits within the range (0-1)
  const rangeSize = maxAge - minAge
  const distanceFromCenter = Math.abs(ageMonths - (minAge + maxAge) / 2)
  const maxDistance = rangeSize / 2

  if (maxDistance === 0) return 1 // Single age target

  return Math.max(0, 1 - (distanceFromCenter / maxDistance))
}

function isSeasonallyRelevant(template: PromptTemplate, context: PromptVariables): boolean {
  const templateText = template.template_text.toLowerCase()
  const season = context.season.toLowerCase()

  // Check if template mentions current season
  if (templateText.includes(season)) return true

  // Check for seasonal keywords
  const seasonalKeywords = {
    spring: ['flowers', 'garden', 'fresh air', 'bloom'],
    summer: ['outdoor', 'sun', 'park', 'swimming'],
    fall: ['leaves', 'autumn', 'harvest', 'colors'],
    winter: ['snow', 'cozy', 'warm', 'indoors']
  }

  const keywords = seasonalKeywords[season.toLowerCase() as keyof typeof seasonalKeywords] || []
  return keywords.some(keyword => templateText.includes(keyword))
}

function shouldPromptMilestone(context: PromptVariables): boolean {
  // Prompt milestones more frequently for younger children
  if (context.age_months < 12) {
    return context.days_since_update >= 5 // More frequent for infants
  } else if (context.age_months < 24) {
    return context.days_since_update >= 7 // Weekly for toddlers
  } else {
    return context.days_since_update >= 10 // Less frequent for older children
  }
}

function isMilestoneRelevant(template: PromptTemplate, context: PromptVariables): boolean {
  const templateText = template.template_text.toLowerCase()
  const recentMilestone = context.recent_milestone.toLowerCase()

  // Check if template is related to recent milestone
  return templateText.includes(recentMilestone) ||
         templateText.includes(context.age_appropriate_skill.toLowerCase())
}

// =============================================================================
// DATABASE QUERY FUNCTIONS
// =============================================================================

interface TemplateFilters {
  ageMonths?: number
  enabledTypes?: string[]
  excludeTemplateIds?: string[]
  limit?: number
}

export async function getTemplatesByFilters(
  supabase: SupabaseClient,
  filters: TemplateFilters
): Promise<PromptTemplate[]> {
  try {
    let query = supabase.from('prompt_templates').select('*')

    // Age range filter
    if (filters.ageMonths !== undefined) {
      query = query.or(
        `age_range_min.is.null,age_range_min.lte.${filters.ageMonths}`
      ).or(
        `age_range_max.is.null,age_range_max.gte.${filters.ageMonths}`
      )
    }

    // Prompt type filter
    if (filters.enabledTypes && filters.enabledTypes.length > 0) {
      query = query.in('prompt_type', filters.enabledTypes)
    }

    // Exclusion filter
    if (filters.excludeTemplateIds && filters.excludeTemplateIds.length > 0) {
      query = query.not('id', 'in', `(${filters.excludeTemplateIds.map(id => `"${id}"`).join(',')})`)
    }

    // Limit and ordering
    query = query
      .order('effectiveness_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(filters.limit || 50)

    const { data, error } = await query

    if (error) {
      // console.error('Error fetching templates:', error)
      return []
    }

    return data || []
  } catch (error) {
    // console.error('Error in getTemplatesByFilters:', error)
    return []
  }
}

export async function getRecentTemplateIds(
  childId: string,
  supabase: SupabaseClient,
  daysBack: number = 7
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('template_id')
      .eq('child_id', childId)
      .not('template_id', 'is', null)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

    if (error) {
      // console.error('Error fetching recent template IDs:', error)
      return []
    }

    return data?.map(item => item.template_id).filter(Boolean) || []
  } catch (error) {
    // console.error('Error in getRecentTemplateIds:', error)
    return []
  }
}

// =============================================================================
// TEMPLATE SELECTION STRATEGIES
// =============================================================================

export interface SelectionStrategy {
  name: string
  description: string
  selectTemplate(
    candidates: PromptTemplate[],
    context: PromptVariables,
    preferences: NotificationPreferences
  ): PromptTemplate | null
}

export const defaultStrategy: SelectionStrategy = {
  name: 'balanced',
  description: 'Balanced scoring considering age, context, effectiveness, and variety',
  selectTemplate(candidates, context, preferences) {
    if (!candidates.length) return null

    const scored = candidates.map(template => ({
      template,
      score: calculateTemplateScore(template, context, preferences)
    }))

    scored.sort((a, b) => b.score - a.score)
    return scored[0].template
  }
}

export const varietyStrategy: SelectionStrategy = {
  name: 'variety',
  description: 'Emphasizes template variety and avoids repetitive patterns',
  selectTemplate(candidates, context, preferences) {
    if (!candidates.length) return null

    // Group by type and pick randomly from top performers in each type
    const typeGroups = candidates.reduce((groups, template) => {
      const type = template.prompt_type
      if (!groups[type]) groups[type] = []
      groups[type].push(template)
      return groups
    }, {} as Record<string, PromptTemplate[]>)

    // Score within each type
    const topByType = Object.entries(typeGroups).map(([type, templates]) => {
      const scored = templates.map(template => ({
        template,
        score: calculateTemplateScore(template, context, preferences)
      }))

      scored.sort((a, b) => b.score - a.score)
      return scored.slice(0, 3) // Top 3 from each type
    }).flat()

    // Randomly select from top performers for variety
    const randomIndex = Math.floor(Math.random() * Math.min(topByType.length, 5))
    return topByType[randomIndex]?.template || null
  }
}

export const effectivenessStrategy: SelectionStrategy = {
  name: 'effectiveness',
  description: 'Prioritizes templates with highest historical effectiveness',
  selectTemplate(candidates, context, preferences) {
    if (!candidates.length) return null

    // Filter age-appropriate first
    const ageAppropriate = candidates.filter(template =>
      isAgeAppropriate(template, context.age_months)
    )

    if (!ageAppropriate.length) return null

    // Sort by effectiveness score
    ageAppropriate.sort((a, b) => (b.effectiveness_score || 0) - (a.effectiveness_score || 0))

    return ageAppropriate[0]
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export async function logTemplateSelection(
  templateId: string,
  childId: string,
  selectionReason: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    await supabase.from('template_analytics').insert({
      template_id: templateId,
      user_id: childId, // This would be parent_id in real usage
      action_taken: false,
      action_type: 'selected',
      child_age_months: 0, // This would be calculated from context
      created_at: new Date().toISOString()
    })
  } catch (error) {
    // console.error('Error logging template selection:', error)
  }
}

export function getStrategyByName(strategyName: string): SelectionStrategy {
  switch (strategyName) {
    case 'variety':
      return varietyStrategy
    case 'effectiveness':
      return effectivenessStrategy
    default:
      return defaultStrategy
  }
}