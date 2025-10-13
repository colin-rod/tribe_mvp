/**
 * Template-Based AI Prompt Generation Edge Function
 * Generates personalized prompts using curated templates with 90% cost reduction
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseConfig } from '../_shared/supabase-config.ts'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface PromptVariables {
  child_name: string
  age_months: number
  age_weeks: number
  days_since_update: number
  last_update_type: string
  recent_milestone: string
  age_appropriate_skill: string
  milestone_activity: string
  activity_type: string
  season: string
  month: string
  day_of_week: string
  upcoming_holiday: string
  holiday: string
  holiday_activity: string
  weather_activity: string
  outdoor_activity: string
  meal_time: string
  time_of_day: string
}

interface PromptTemplate {
  id: string
  prompt_type: 'milestone' | 'activity' | 'fun' | 'seasonal'
  template_text: string
  age_range_min: number | null
  age_range_max: number | null
  category: string | null
  variables: string[]
  usage_count: number
  effectiveness_score: number
  is_community_contributed: boolean
}

interface GenerationResult {
  success: boolean
  users_processed: number
  prompts_generated: number
  prompts_sent: number
  error?: string
  details?: any
}

// =============================================================================
// EDGE FUNCTION HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { parent_id, force_generation } = await req.json()

    const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig()
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('Starting template-based prompt generation', {
      parent_id,
      force_generation,
      timestamp: new Date().toISOString()
    })

    // Get eligible users for prompt generation
    const eligibleUsers = await getEligibleUsers(supabase, parent_id)
    console.log(`Found ${eligibleUsers.length} eligible users`)

    let totalGenerated = 0
    let totalSent = 0
    const processingDetails = []

    for (const user of eligibleUsers) {
      try {
        console.log(`Processing user ${user.id} (${user.email})`)

        const userResult = await generateTemplatePromptsForUser(user, supabase, force_generation)
        totalGenerated += userResult.prompts.length

        if (userResult.prompts.length > 0) {
          const sentCount = await deliverPrompts(userResult.prompts, user, supabase)
          totalSent += sentCount

          processingDetails.push({
            user_id: user.id,
            email: user.email,
            prompts_generated: userResult.prompts.length,
            prompts_sent: sentCount,
            children_processed: userResult.children_processed
          })
        }

      } catch (error) {
        console.error(`Failed to generate prompts for user ${user.id}:`, error)
        processingDetails.push({
          user_id: user.id,
          email: user.email,
          error: error.message,
          prompts_generated: 0,
          prompts_sent: 0
        })
      }
    }

    const result: GenerationResult = {
      success: true,
      users_processed: eligibleUsers.length,
      prompts_generated: totalGenerated,
      prompts_sent: totalSent,
      details: processingDetails
    }

    console.log('Template prompt generation completed:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Prompt generation error:', error)

    const errorResult: GenerationResult = {
      success: false,
      users_processed: 0,
      prompts_generated: 0,
      prompts_sent: 0,
      error: error.message
    }

    return new Response(
      JSON.stringify(errorResult),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// =============================================================================
// USER ELIGIBILITY FUNCTIONS
// =============================================================================

async function getEligibleUsers(supabase: SupabaseClient, parentId?: string) {
  let query = supabase
    .from('profiles')
    .select(`
      id,
      email,
      notification_preferences,
      children (
        id,
        name,
        birth_date,
        parent_id
      )
    `)
    .not('children', 'is', null) // Only users with children

  if (parentId) {
    query = query.eq('id', parentId)
  }

  const { data: users, error } = await query

  if (error) {
    console.error('Error fetching eligible users:', error)
    return []
  }

  return users?.filter(user => user.children && user.children.length > 0) || []
}

function shouldGeneratePromptsToday(promptFrequency: string): boolean {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.

  switch (promptFrequency) {
    case 'daily':
      return true
    case 'every_2_days':
      return today.getDate() % 2 === 0
    case 'every_3_days':
      return today.getDate() % 3 === 0
    case 'weekly':
      return dayOfWeek === 1 // Monday
    case 'twice_weekly':
      return dayOfWeek === 1 || dayOfWeek === 4 // Monday and Thursday
    default:
      return true
  }
}

// =============================================================================
// TEMPLATE PROMPT GENERATION
// =============================================================================

async function generateTemplatePromptsForUser(
  user: any,
  supabase: SupabaseClient,
  forceGeneration = false
): Promise<{ prompts: any[], children_processed: number }> {
  const preferences = user.notification_preferences || {}
  const promptFrequency = preferences.prompt_frequency || 'every_3_days'

  // Check if user should receive prompts today
  if (!forceGeneration && !shouldGeneratePromptsToday(promptFrequency)) {
    console.log(`User ${user.id} not scheduled for prompts today (frequency: ${promptFrequency})`)
    return { prompts: [], children_processed: 0 }
  }

  const generatedPrompts = []
  let childrenProcessed = 0

  for (const child of user.children) {
    try {
      childrenProcessed++

      // Build context for variable substitution
      const context = await buildPromptContext(child, user, supabase)

      // Skip if child had prompts recently (unless forced)
      if (!forceGeneration && await hasRecentPrompts(child.id, supabase)) {
        console.log(`Child ${child.id} already has recent prompts, skipping`)
        continue
      }

      // Select best template for this child
      const template = await selectBestTemplate(child, preferences, context, supabase)

      if (template) {
        // Substitute variables in template
        const finalPromptText = substituteVariables(template.template_text, context)

        // Save generated prompt to database
        const { data: savedPrompt, error } = await supabase
          .from('ai_prompts')
          .insert({
            parent_id: user.id,
            child_id: child.id,
            template_id: template.id,
            prompt_type: template.prompt_type,
            prompt_text: finalPromptText,
            substituted_variables: context,
            status: 'pending'
          })
          .select()
          .single()

        if (error) {
          console.error(`Error saving prompt for child ${child.id}:`, error)
          continue
        }

        if (savedPrompt) {
          // Update template usage count
          await supabase.rpc('increment_template_usage', { template_uuid: template.id })

          // Log template analytics
          await supabase.from('template_analytics').insert({
            template_id: template.id,
            user_id: user.id,
            prompt_id: savedPrompt.id,
            child_age_months: context.age_months,
            day_of_week: context.day_of_week,
            time_of_day: context.time_of_day
          })

          generatedPrompts.push(savedPrompt)
          console.log(`Generated prompt for ${child.name} using template ${template.id}`)
        }
      } else {
        console.log(`No suitable template found for child ${child.id} (${child.name})`)
      }
    } catch (error) {
      console.error(`Error processing child ${child.id}:`, error)
    }
  }

  return { prompts: generatedPrompts, children_processed: childrenProcessed }
}

// =============================================================================
// CONTEXT BUILDING FUNCTIONS
// =============================================================================

async function buildPromptContext(child: any, user: any, supabase: SupabaseClient): Promise<PromptVariables> {
  const now = new Date()
  const birthDate = new Date(child.birth_date)
  const ageMonths = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  const ageWeeks = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 7))

  // Get last update for this child
  const { data: lastUpdate } = await supabase
    .from('memories')
    .select('type, created_at, content')
    .eq('child_id', child.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const daysSinceUpdate = lastUpdate
    ? Math.floor((now.getTime() - new Date(lastUpdate.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 7

  return {
    child_name: child.name,
    age_months: ageMonths,
    age_weeks: ageWeeks,
    days_since_update: daysSinceUpdate,
    last_update_type: lastUpdate?.type || 'general',
    recent_milestone: getRecentMilestone(ageMonths),
    age_appropriate_skill: getAgeAppropriateSkill(ageMonths),
    milestone_activity: getMilestoneActivity(ageMonths),
    activity_type: getActivityType(ageMonths),
    season: getCurrentSeason(),
    month: getCurrentMonth(),
    day_of_week: getCurrentDayOfWeek(),
    upcoming_holiday: getUpcomingHoliday(),
    holiday: getCurrentHoliday(),
    holiday_activity: getHolidayActivity(),
    weather_activity: getWeatherActivity(),
    outdoor_activity: getOutdoorActivity(ageMonths),
    meal_time: getMealTime(),
    time_of_day: getTimeOfDay()
  }
}

// =============================================================================
// TEMPLATE SELECTION FUNCTIONS
// =============================================================================

async function selectBestTemplate(
  child: any,
  preferences: any,
  context: PromptVariables,
  supabase: SupabaseClient
): Promise<PromptTemplate | null> {
  const enabledTypes = preferences.enabled_prompt_types || ['milestone', 'activity', 'fun']

  // Get recent template IDs to avoid repetition
  const { data: recentPrompts } = await supabase
    .from('ai_prompts')
    .select('template_id')
    .eq('child_id', child.id)
    .not('template_id', 'is', null)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const recentTemplateIds = recentPrompts?.map(p => p.template_id).filter(Boolean) || []

  // Use the database function to get suitable templates
  const { data: templates, error } = await supabase.rpc('get_templates_by_filters', {
    age_months: context.age_months,
    enabled_types: enabledTypes,
    exclude_template_ids: recentTemplateIds,
    limit_count: 20
  })

  if (error) {
    console.error('Error fetching templates:', error)
    return null
  }

  if (!templates || templates.length === 0) {
    console.log('No templates found for criteria:', { age_months: context.age_months, enabledTypes })
    return null
  }

  // Score and select best template
  const scoredTemplates = templates.map((template: PromptTemplate) => ({
    template,
    score: calculateTemplateScore(template, context, preferences)
  }))

  scoredTemplates.sort((a, b) => b.score - a.score)

  const selectedTemplate = scoredTemplates[0]?.template
  console.log('Template selection result:', {
    candidatesFound: templates.length,
    selectedTemplateId: selectedTemplate?.id,
    selectedTemplateType: selectedTemplate?.prompt_type,
    topScore: scoredTemplates[0]?.score
  })

  return selectedTemplate || null
}

function calculateTemplateScore(
  template: PromptTemplate,
  context: PromptVariables,
  preferences: any
): number {
  let score = 0

  // Age appropriateness (high weight - 50 points)
  if (
    (template.age_range_min === null || context.age_months >= template.age_range_min) &&
    (template.age_range_max === null || context.age_months <= template.age_range_max)
  ) {
    score += 50
  }

  // Seasonal relevance (30 points)
  if (template.prompt_type === 'seasonal' && (context.upcoming_holiday || context.holiday)) {
    score += 30
  }

  // Activity timing (25 points)
  if (template.prompt_type === 'activity' && context.days_since_update > 3) {
    score += Math.min(context.days_since_update * 5, 25)
  }

  // Milestone timing (35 points)
  if (template.prompt_type === 'milestone') {
    if (context.days_since_update > 5) {
      score += 35
    } else if (context.days_since_update > 3) {
      score += 20
    }
  }

  // Effectiveness history (20 points max)
  score += Math.min((template.effectiveness_score || 0) * 2, 20)

  // Community contribution bonus (10 points)
  if (template.is_community_contributed) {
    score += 10
  }

  // Usage frequency penalty (up to -15 points)
  score -= Math.min((template.usage_count || 0) * 0.5, 15)

  return score
}

// =============================================================================
// VARIABLE SUBSTITUTION
// =============================================================================

function substituteVariables(templateText: string, context: PromptVariables): string {
  let result = templateText

  // Replace all variables in the format [variable_name]
  const variableRegex = /\[([^\]]+)\]/g

  result = result.replace(variableRegex, (match, variableName) => {
    const value = context[variableName as keyof PromptVariables]
    return value !== undefined && value !== null ? String(value) : match
  })

  return result
}

// =============================================================================
// PROMPT DELIVERY
// =============================================================================

async function hasRecentPrompts(childId: string, supabase: SupabaseClient): boolean {
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('id')
    .eq('child_id', childId)
    .gte('created_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
    .limit(1)

  if (error) {
    console.error('Error checking recent prompts:', error)
    return false
  }

  return data && data.length > 0
}

async function deliverPrompts(prompts: any[], user: any, supabase: SupabaseClient): Promise<number> {
  // Mark prompts as sent
  const promptIds = prompts.map(p => p.id)

  const { error } = await supabase
    .from('ai_prompts')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .in('id', promptIds)

  if (error) {
    console.error('Error updating prompt status:', error)
    return 0
  }

  // Here you could integrate with notification system
  // For now, we'll just mark them as sent in the database

  console.log(`Delivered ${prompts.length} prompts to user ${user.id}`)
  return prompts.length
}

// =============================================================================
// HELPER FUNCTIONS (Context Calculation)
// =============================================================================

function getAgeAppropriateSkill(ageMonths: number): string {
  if (ageMonths < 1) return 'focusing on faces and voices'
  if (ageMonths < 3) return 'smiling and eye contact'
  if (ageMonths < 6) return 'rolling over and reaching'
  if (ageMonths < 9) return 'sitting up and exploring'
  if (ageMonths < 12) return 'crawling and pulling to stand'
  if (ageMonths < 18) return 'walking and first words'
  if (ageMonths < 24) return 'talking and running'
  if (ageMonths < 36) return 'playing with others'
  return 'imaginative play and social skills'
}

function getMilestoneActivity(ageMonths: number): string {
  if (ageMonths < 3) return 'tummy time practice'
  if (ageMonths < 6) return 'reaching and grasping'
  if (ageMonths < 9) return 'sitting practice'
  if (ageMonths < 12) return 'crawling adventures'
  if (ageMonths < 18) return 'first steps practice'
  if (ageMonths < 24) return 'word learning'
  if (ageMonths < 36) return 'imaginative play'
  return 'complex learning activities'
}

function getActivityType(ageMonths: number): string {
  if (ageMonths < 6) return 'sensory activity'
  if (ageMonths < 12) return 'motor skill activity'
  if (ageMonths < 18) return 'exploration activity'
  if (ageMonths < 24) return 'learning activity'
  return 'creative activity'
}

function getOutdoorActivity(ageMonths: number): string {
  if (ageMonths < 6) return 'enjoy fresh air'
  if (ageMonths < 12) return 'explore the garden'
  if (ageMonths < 18) return 'practice walking outside'
  if (ageMonths < 24) return 'play in the park'
  return 'run around and play'
}

function getRecentMilestone(ageMonths: number): string {
  if (ageMonths < 2) return 'social smiles'
  if (ageMonths < 4) return 'holding head steady'
  if (ageMonths < 6) return 'rolling over'
  if (ageMonths < 8) return 'sitting without support'
  if (ageMonths < 10) return 'crawling'
  if (ageMonths < 12) return 'pulling to stand'
  if (ageMonths < 15) return 'first words'
  if (ageMonths < 18) return 'walking independently'
  if (ageMonths < 24) return 'two-word phrases'
  return 'complex sentences'
}

function getCurrentSeason(): string {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}

function getCurrentMonth(): string {
  return new Date().toLocaleString('default', { month: 'long' })
}

function getCurrentDayOfWeek(): string {
  return new Date().toLocaleString('default', { weekday: 'long' })
}

function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'early morning'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

function getMealTime(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 10) return 'breakfast'
  if (hour >= 11 && hour < 14) return 'lunch'
  if (hour >= 17 && hour < 20) return 'dinner'
  return 'snack time'
}

function getCurrentHoliday(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()

  if (month === 12 && day >= 20) return 'Christmas'
  if (month === 1 && day === 1) return 'New Year\'s Day'
  if (month === 2 && day === 14) return 'Valentine\'s Day'
  if (month === 7 && day === 4) return 'Independence Day'
  if (month === 10 && day === 31) return 'Halloween'

  return ''
}

function getUpcomingHoliday(): string {
  const month = new Date().getMonth() + 1

  if (month === 1) return 'Valentine\'s Day'
  if (month === 6) return 'Independence Day'
  if (month === 9) return 'Halloween'
  if (month === 11) return 'Christmas'
  if (month === 12) return 'New Year\'s Day'

  return ''
}

function getHolidayActivity(): string {
  const holiday = getCurrentHoliday() || getUpcomingHoliday()

  switch (holiday) {
    case 'Christmas': return 'Christmas photos'
    case 'Halloween': return 'costume fun'
    case 'Valentine\'s Day': return 'love-themed photos'
    case 'Independence Day': return 'patriotic celebration'
    default: return 'seasonal celebration'
  }
}

function getWeatherActivity(): string {
  const season = getCurrentSeason()
  return season === 'Summer' ? 'Warm summer' :
         season === 'Winter' ? 'Cozy winter' :
         season === 'Spring' ? 'Mild spring' : 'Cool autumn'
}