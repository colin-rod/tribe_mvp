/**
 * Variable substitution engine and context calculation for template-based AI prompts
 * Provides 90% cost reduction by using curated templates with dynamic variable substitution
 */

import { differenceInDays, differenceInWeeks, differenceInMonths, format, getDay } from 'date-fns'
import { createLogger } from './logger'

const logger = createLogger('PromptContext')

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface PromptVariables {
  // Child-specific
  child_name: string
  age_months: number
  age_weeks: number

  // Activity context
  days_since_update: number
  last_update_type: string
  recent_milestone: string
  age_appropriate_skill: string
  milestone_activity: string
  activity_type: string

  // Temporal context
  season: string
  month: string
  day_of_week: string
  upcoming_holiday: string
  holiday: string
  holiday_activity: string

  // Environmental
  weather_activity: string
  outdoor_activity: string
  meal_time: string
  time_of_day: string
}

export interface Child {
  id: string
  name: string
  birth_date: string
  parent_id: string
}

export interface User {
  id: string
  email: string
  name?: string
  user_metadata?: Record<string, unknown>
}

export interface LastUpdate {
  id: string
  type: string
  created_at: string
  content?: string
}

// =============================================================================
// MAIN CONTEXT CALCULATION FUNCTION
// =============================================================================

export function calculatePromptContext(child: Child, user: User, lastUpdate?: LastUpdate): PromptVariables {
  const birthDate = new Date(child.birth_date)
  const ageMonths = calculateAgeInMonths(birthDate)
  const ageWeeks = calculateAgeInWeeks(birthDate)
  const daysSinceUpdate = lastUpdate ? calculateDaysSinceUpdate(new Date(lastUpdate.created_at)) : 7

  return {
    // Child-specific
    child_name: child.name,
    age_months: ageMonths,
    age_weeks: ageWeeks,

    // Activity context
    days_since_update: daysSinceUpdate,
    last_update_type: lastUpdate?.type || 'general',
    recent_milestone: getRecentMilestone(ageMonths),
    age_appropriate_skill: getAgeAppropriateSkill(ageMonths),
    milestone_activity: getMilestoneActivity(ageMonths),
    activity_type: getActivityType(ageMonths),

    // Temporal context
    season: getCurrentSeason(),
    month: getCurrentMonth(),
    day_of_week: getCurrentDayOfWeek(),
    upcoming_holiday: getUpcomingHoliday(),
    holiday: getCurrentHoliday(),
    holiday_activity: getHolidayActivity(),

    // Environmental
    weather_activity: getWeatherActivity(),
    outdoor_activity: getOutdoorActivity(ageMonths),
    meal_time: getMealTime(),
    time_of_day: getTimeOfDay()
  }
}

// =============================================================================
// AGE CALCULATION FUNCTIONS
// =============================================================================

export function calculateAgeInMonths(birthDate: Date): number {
  return differenceInMonths(new Date(), birthDate)
}

export function calculateAgeInWeeks(birthDate: Date): number {
  return differenceInWeeks(new Date(), birthDate)
}

export function calculateDaysSinceUpdate(lastUpdateDate: Date): number {
  return differenceInDays(new Date(), lastUpdateDate)
}

// =============================================================================
// AGE-APPROPRIATE CONTENT FUNCTIONS
// =============================================================================

export function getAgeAppropriateSkill(ageMonths: number): string {
  if (ageMonths < 1) return 'focusing on faces and voices'
  if (ageMonths < 3) return 'smiling and eye contact'
  if (ageMonths < 6) return 'rolling over and reaching for objects'
  if (ageMonths < 9) return 'sitting up and exploring with hands'
  if (ageMonths < 12) return 'crawling and pulling to stand'
  if (ageMonths < 18) return 'walking and saying first words'
  if (ageMonths < 24) return 'talking and running'
  if (ageMonths < 36) return 'playing with others and using sentences'
  return 'imaginative play and social skills'
}

export function getMilestoneActivity(ageMonths: number): string {
  if (ageMonths < 3) return 'tummy time practice'
  if (ageMonths < 6) return 'reaching and grasping toys'
  if (ageMonths < 9) return 'sitting practice and exploration'
  if (ageMonths < 12) return 'crawling adventures and standing'
  if (ageMonths < 18) return 'first steps and walking practice'
  if (ageMonths < 24) return 'word learning and communication'
  if (ageMonths < 36) return 'imaginative play and social interaction'
  return 'complex play and learning activities'
}

export function getActivityType(ageMonths: number): string {
  if (ageMonths < 3) return 'sensory activity'
  if (ageMonths < 6) return 'motor skill activity'
  if (ageMonths < 12) return 'exploration activity'
  if (ageMonths < 18) return 'movement activity'
  if (ageMonths < 24) return 'learning activity'
  if (ageMonths < 36) return 'creative activity'
  return 'social activity'
}

export function getOutdoorActivity(ageMonths: number): string {
  if (ageMonths < 6) return 'enjoy some fresh air'
  if (ageMonths < 12) return 'explore the garden'
  if (ageMonths < 18) return 'practice walking outside'
  if (ageMonths < 24) return 'play in the park'
  if (ageMonths < 36) return 'run around outside'
  return 'ride bikes or play sports'
}

export function getRecentMilestone(ageMonths: number): string {
  if (ageMonths < 2) return 'social smiles'
  if (ageMonths < 4) return 'holding head steady'
  if (ageMonths < 6) return 'rolling over'
  if (ageMonths < 8) return 'sitting without support'
  if (ageMonths < 10) return 'crawling'
  if (ageMonths < 12) return 'pulling to stand'
  if (ageMonths < 15) return 'first words'
  if (ageMonths < 18) return 'walking independently'
  if (ageMonths < 24) return 'two-word phrases'
  if (ageMonths < 30) return 'running and jumping'
  return 'complex sentences'
}

// =============================================================================
// TEMPORAL CONTEXT FUNCTIONS
// =============================================================================

export function getCurrentSeason(): string {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}

export function getCurrentMonth(): string {
  return format(new Date(), 'MMMM')
}

export function getCurrentDayOfWeek(): string {
  return format(new Date(), 'EEEE')
}

export function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'early morning'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

export function getMealTime(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 10) return 'breakfast'
  if (hour >= 11 && hour < 14) return 'lunch'
  if (hour >= 17 && hour < 20) return 'dinner'
  return 'snack time'
}

// =============================================================================
// HOLIDAY AND SEASONAL FUNCTIONS
// =============================================================================

export function getCurrentHoliday(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()

  // Major holidays
  if (month === 12 && day >= 20 && day <= 31) return 'Christmas'
  if (month === 1 && day === 1) return 'New Year\'s Day'
  if (month === 2 && day === 14) return 'Valentine\'s Day'
  if (month === 3 && day === 17) return 'St. Patrick\'s Day'
  if (month === 7 && day === 4) return 'Independence Day'
  if (month === 10 && day === 31) return 'Halloween'
  if (month === 11 && day >= 22 && day <= 28 && getDay(now) === 4) return 'Thanksgiving'

  // Easter (approximate - second Sunday in April)
  if (month === 4 && day >= 8 && day <= 14 && getDay(now) === 0) return 'Easter'

  return ''
}

export function getUpcomingHoliday(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()

  // Check upcoming holidays within 30 days
  if (month === 1 && day < 14) return 'Valentine\'s Day'
  if (month === 2 && day < 17) return 'St. Patrick\'s Day'
  if (month === 3 && day < 31) return 'Easter'
  if (month === 6 && day < 4) return 'Independence Day'
  if (month === 9) return 'Halloween'
  if (month === 10 && day < 31) return 'Halloween'
  if (month === 10 && day >= 31) return 'Thanksgiving'
  if (month === 11) return 'Christmas'
  if (month === 12 && day < 25) return 'Christmas'

  return ''
}

export function getHolidayActivity(): string {
  const holiday = getCurrentHoliday() || getUpcomingHoliday()

  switch (holiday) {
    case 'Christmas':
      return 'Christmas photos or tree decorating'
    case 'Halloween':
      return 'costume try-on or pumpkin fun'
    case 'Thanksgiving':
      return 'gratitude moments or family gathering'
    case 'Easter':
      return 'egg hunt or spring activities'
    case 'Valentine\'s Day':
      return 'love-themed photos'
    case 'Independence Day':
      return 'patriotic celebration'
    case 'New Year\'s Day':
      return 'New Year memories'
    default:
      return 'seasonal celebration'
  }
}

export function getWeatherActivity(): string {
  const season = getCurrentSeason()

  switch (season) {
    case 'Spring':
      return 'Mild spring'
    case 'Summer':
      return 'Warm summer'
    case 'Fall':
      return 'Cool autumn'
    case 'Winter':
      return 'Cozy winter'
    default:
      return 'Pleasant'
  }
}

// =============================================================================
// VARIABLE SUBSTITUTION ENGINE
// =============================================================================

/**
 * Substitutes variables in template text with actual values
 * @param templateText - Template with [variable_name] placeholders
 * @param context - PromptVariables object with substitution values
 * @returns Template with variables replaced by actual values
 */
export function substituteVariables(templateText: string, context: PromptVariables): string {
  let result = templateText

  // First, replace all properly formatted variables [variable_name]
  const variableRegex = /\[([^\]]+)\]/g
  result = result.replace(variableRegex, (match, variableName) => {
    const value = context[variableName as keyof PromptVariables]

    // Handle different value types
    if (value === undefined || value === null) {
      logger.warn('Variable not found in context, keeping placeholder', { variableName })
      return match // Keep original placeholder if variable not found
    }

    if (typeof value === 'number') {
      return value.toString()
    }

    if (typeof value === 'string') {
      return value
    }

    // For any other type, convert to string
    return String(value)
  })

  // Handle malformed variables: [variable_name followed by other characters without closing ]
  const malformedRegex = /\[([a-zA-Z_][a-zA-Z0-9_]*)[^a-zA-Z0-9_\]]/g
  result = result.replace(malformedRegex, (match, variableName) => {
    const value = context[variableName as keyof PromptVariables]

    if (value !== undefined && value !== null) {
      // Replace just the variable part, keep the rest
      return match.replace(`[${variableName}`, String(value))
    }

    return match // Keep original if variable not found
  })

  return result
}

/**
 * Validates that all required variables in a template are available in context
 * @param templateText - Template text to validate
 * @param context - Available context variables
 * @returns Array of missing variable names, empty if all are available
 */
export function validateTemplateVariables(templateText: string, context: PromptVariables): string[] {
  const variableRegex = /\[([^\]]+)\]/g
  const requiredVariables: string[] = []
  const missingVariables: string[] = []

  let match
  while ((match = variableRegex.exec(templateText)) !== null) {
    const variableName = match[1]
    if (!requiredVariables.includes(variableName)) {
      requiredVariables.push(variableName)
    }
  }

  for (const variableName of requiredVariables) {
    const value = context[variableName as keyof PromptVariables]
    if (value === undefined || value === null || value === '') {
      missingVariables.push(variableName)
    }
  }

  return missingVariables
}

/**
 * Extracts all variable names from a template text
 * @param templateText - Template text to analyze
 * @returns Array of unique variable names found in the template
 */
export function extractVariableNames(templateText: string): string[] {
  const variableRegex = /\[([^\]]+)\]/g
  const variables: string[] = []

  let match
  while ((match = variableRegex.exec(templateText)) !== null) {
    const variableName = match[1]
    if (!variables.includes(variableName)) {
      variables.push(variableName)
    }
  }

  return variables
}

// =============================================================================
// UTILITY FUNCTIONS FOR TESTING AND DEVELOPMENT
// =============================================================================

/**
 * Creates a sample context for testing purposes
 */
export function createSampleContext(overrides: Partial<PromptVariables> = {}): PromptVariables {
  const baseContext: PromptVariables = {
    child_name: 'Emma',
    age_months: 8,
    age_weeks: 32,
    days_since_update: 4,
    last_update_type: 'milestone',
    recent_milestone: 'sitting without support',
    age_appropriate_skill: 'sitting up and exploring with hands',
    milestone_activity: 'sitting practice and exploration',
    activity_type: 'exploration activity',
    season: getCurrentSeason(),
    month: getCurrentMonth(),
    day_of_week: getCurrentDayOfWeek(),
    upcoming_holiday: getUpcomingHoliday(),
    holiday: getCurrentHoliday(),
    holiday_activity: getHolidayActivity(),
    weather_activity: getWeatherActivity(),
    outdoor_activity: 'explore the garden',
    meal_time: getMealTime(),
    time_of_day: getTimeOfDay()
  }

  return { ...baseContext, ...overrides }
}

/**
 * Tests template substitution with sample data
 */
export function testTemplateSubstitution(templateText: string): {
  originalTemplate: string
  substitutedText: string
  variablesFound: string[]
  missingVariables: string[]
} {
  const context = createSampleContext()
  const variablesFound = extractVariableNames(templateText)
  const missingVariables = validateTemplateVariables(templateText, context)
  const substitutedText = substituteVariables(templateText, context)

  return {
    originalTemplate: templateText,
    substitutedText,
    variablesFound,
    missingVariables
  }
}
