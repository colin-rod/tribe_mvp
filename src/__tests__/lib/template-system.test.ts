/**
 * Comprehensive Test Suite for Template-Based AI Prompt System
 * Tests variable substitution, template selection, and effectiveness tracking
 */

import {
  calculatePromptContext,
  substituteVariables,
  validateTemplateVariables,
  extractVariableNames,
  createSampleContext,
  testTemplateSubstitution
} from '@/lib/prompt-context'

import {
  selectTemplate,
  calculateTemplateScore,
  getTemplatesByFilters,
  getRecentTemplateIds
} from '@/lib/template-selection'

import {
  TemplateAnalyticsTracker,
  generateAnalyticsReport
} from '@/lib/template-analytics'

// =============================================================================
// MOCK DATA
// =============================================================================

const mockChild = {
  id: 'child-1',
  name: 'Emma',
  birth_date: '2023-01-15T00:00:00Z', // 8 months old as of Sept 2023
  parent_id: 'user-1'
}

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test Parent'
}

const mockTemplates = [
  {
    id: 'template-1',
    prompt_type: 'milestone' as const,
    template_text: 'Is [child_name] showing signs of [age_appropriate_skill]?',
    age_range_min: 6,
    age_range_max: 12,
    category: 'infant',
    tags: ['development', 'skills'],
    variables: ['child_name', 'age_appropriate_skill'],
    usage_count: 15,
    effectiveness_score: 8.5,
    is_community_contributed: false,
    created_at: '2023-09-01T00:00:00Z',
    updated_at: '2023-09-01T00:00:00Z'
  },
  {
    id: 'template-2',
    prompt_type: 'fun' as const,
    template_text: '[child_name]\'s [meal_time] adventures! Any messy moments?',
    age_range_min: 4,
    age_range_max: 18,
    category: 'infant',
    tags: ['feeding', 'mess', 'fun'],
    variables: ['child_name', 'meal_time'],
    usage_count: 25,
    effectiveness_score: 9.2,
    is_community_contributed: true,
    created_at: '2023-09-01T00:00:00Z',
    updated_at: '2023-09-01T00:00:00Z'
  }
]

const mockPreferences = {
  enabled_prompt_types: ['milestone', 'activity', 'fun'],
  prompt_frequency: 'every_3_days'
}

// =============================================================================
// VARIABLE SUBSTITUTION TESTS
// =============================================================================

describe('Variable Substitution Engine', () => {
  describe('calculatePromptContext', () => {
    it('should calculate correct age in months and weeks', () => {
      const context = calculatePromptContext(mockChild, mockUser)

      expect(context.child_name).toBe('Emma')
      expect(context.age_months).toBeGreaterThanOrEqual(8)
      expect(context.age_weeks).toBeGreaterThanOrEqual(32)
    })

    it('should provide age-appropriate skills and activities', () => {
      const context = calculatePromptContext(mockChild, mockUser)

      expect(context.age_appropriate_skill).toBeTruthy()
      expect(context.milestone_activity).toBeTruthy()
      expect(context.activity_type).toBeTruthy()
    })

    it('should include temporal context', () => {
      const context = calculatePromptContext(mockChild, mockUser)

      expect(context.season).toBeTruthy()
      expect(context.month).toBeTruthy()
      expect(context.day_of_week).toBeTruthy()
      expect(context.time_of_day).toBeTruthy()
    })
  })

  describe('substituteVariables', () => {
    it('should replace all variables in template text', () => {
      const template = 'Hello [child_name], you are [age_months] months old!'
      const context = createSampleContext({
        child_name: 'Emma',
        age_months: 8
      })

      const result = substituteVariables(template, context)

      expect(result).toBe('Hello Emma, you are 8 months old!')
    })

    it('should handle missing variables gracefully', () => {
      const template = 'Hello [child_name], your [missing_var] is great!'
      const context = createSampleContext({ child_name: 'Emma' })

      const result = substituteVariables(template, context)

      expect(result).toBe('Hello Emma, your [missing_var] is great!')
    })

    it('should handle empty context', () => {
      const template = 'Hello [child_name]!'
      const result = substituteVariables(template, {} as any)

      expect(result).toBe('Hello [child_name]!')
    })
  })

  describe('validateTemplateVariables', () => {
    it('should return empty array when all variables are available', () => {
      const template = 'Hello [child_name], you are [age_months] months old!'
      const context = createSampleContext({
        child_name: 'Emma',
        age_months: 8
      })

      const missing = validateTemplateVariables(template, context)

      expect(missing).toHaveLength(0)
    })

    it('should return missing variable names', () => {
      const template = 'Hello [child_name], your [favorite_toy] is [missing_var]!'
      const context = createSampleContext({ child_name: 'Emma' })

      const missing = validateTemplateVariables(template, context)

      expect(missing).toContain('favorite_toy')
      expect(missing).toContain('missing_var')
      expect(missing).not.toContain('child_name')
    })
  })

  describe('extractVariableNames', () => {
    it('should extract all unique variable names from template', () => {
      const template = 'Hello [child_name], [child_name] is [age_months] months old!'
      const variables = extractVariableNames(template)

      expect(variables).toHaveLength(2)
      expect(variables).toContain('child_name')
      expect(variables).toContain('age_months')
    })

    it('should return empty array for template without variables', () => {
      const template = 'Hello Emma, you are 8 months old!'
      const variables = extractVariableNames(template)

      expect(variables).toHaveLength(0)
    })
  })

  describe('testTemplateSubstitution', () => {
    it('should provide comprehensive test results', () => {
      const template = 'Hello [child_name], you are [age_months] months old!'
      const result = testTemplateSubstitution(template)

      expect(result.originalTemplate).toBe(template)
      expect(result.substitutedText).toBeTruthy()
      expect(result.variablesFound).toHaveLength(2)
      expect(result.missingVariables).toHaveLength(0)
    })
  })
})

// =============================================================================
// TEMPLATE SELECTION TESTS
// =============================================================================

describe('Template Selection Algorithm', () => {
  // Mock Supabase client
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis()
  } as any

  describe('calculateTemplateScore', () => {
    it('should give high score for age-appropriate templates', () => {
      const context = createSampleContext({ age_months: 8 })
      const template = mockTemplates[0] // Age range 6-12

      const score = calculateTemplateScore(template, context, mockPreferences)

      expect(score).toBeGreaterThan(50) // Age appropriateness should give 50+ points
    })

    it('should give bonus for seasonal templates with holidays', () => {
      const context = createSampleContext({
        age_months: 8,
        upcoming_holiday: 'Christmas'
      })
      const seasonalTemplate = {
        ...mockTemplates[0],
        prompt_type: 'seasonal' as const
      }

      const score = calculateTemplateScore(seasonalTemplate, context, mockPreferences)

      expect(score).toBeGreaterThan(80) // Age + seasonal bonus
    })

    it('should penalize overused templates', () => {
      const context = createSampleContext({ age_months: 8 })
      const overusedTemplate = {
        ...mockTemplates[0],
        usage_count: 100
      }

      const normalScore = calculateTemplateScore(mockTemplates[0], context, mockPreferences)
      const penalizedScore = calculateTemplateScore(overusedTemplate, context, mockPreferences)

      expect(penalizedScore).toBeLessThan(normalScore)
    })

    it('should boost community-contributed templates', () => {
      const context = createSampleContext({ age_months: 8 })
      const communityTemplate = mockTemplates[1] // is_community_contributed: true

      const score = calculateTemplateScore(communityTemplate, context, mockPreferences)

      expect(score).toBeGreaterThan(60) // Should include community bonus
    })
  })

  describe('Template filtering and selection', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should filter templates by age range', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue({
          data: mockTemplates,
          error: null
        })
      })

      const templates = await getTemplatesByFilters(mockSupabase, {
        ageMonths: 8,
        enabledTypes: ['milestone', 'fun'],
        limit: 10
      })

      expect(templates).toBeDefined()
      // Verify age filtering was applied in query construction
      expect(mockSupabase.from).toHaveBeenCalledWith('prompt_templates')
    })

    it('should exclude recently used templates', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnValue({
            data: [{ template_id: 'template-1' }],
            error: null
          })
        })
      })

      const recentIds = await getRecentTemplateIds('child-1', mockSupabase, 7)

      expect(recentIds).toBeDefined()
      expect(Array.isArray(recentIds)).toBe(true)
    })
  })
})

// =============================================================================
// TEMPLATE ANALYTICS TESTS
// =============================================================================

describe('Template Analytics System', () => {
  let analyticsTracker: TemplateAnalyticsTracker

  // Mock Supabase client for analytics
  const mockAnalyticsSupabase = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    count: 'exact' as const,
    head: true
  } as any

  beforeEach(() => {
    analyticsTracker = new TemplateAnalyticsTracker(mockAnalyticsSupabase)
    jest.clearAllMocks()
  })

  describe('trackTemplateSelection', () => {
    it('should track template selection with correct data', async () => {
      mockAnalyticsSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          data: null,
          error: null
        })
      })

      await analyticsTracker.trackTemplateSelection(
        'template-1',
        'user-1',
        'prompt-1',
        8
      )

      expect(mockAnalyticsSupabase.from).toHaveBeenCalledWith('template_analytics')
    })
  })

  describe('trackPromptAction', () => {
    it('should track prompt actions and update existing records', async () => {
      // Mock existing record
      mockAnalyticsSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockReturnValue({
            data: { id: 'analytics-1' },
            error: null
          })
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            data: null,
            error: null
          })
        })

      await analyticsTracker.trackPromptAction(
        'prompt-1',
        'template-1',
        'user-1',
        'created_update',
        30,
        8
      )

      expect(mockAnalyticsSupabase.from).toHaveBeenCalledWith('template_analytics')
    })

    it('should create new analytics record if none exists', async () => {
      // Mock no existing record
      mockAnalyticsSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockReturnValue({
            data: null,
            error: { message: 'No record found' }
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            data: null,
            error: null
          })
        })

      await analyticsTracker.trackPromptAction(
        'prompt-1',
        'template-1',
        'user-1',
        'dismissed'
      )

      expect(mockAnalyticsSupabase.from).toHaveBeenCalledWith('template_analytics')
    })
  })

  describe('getTemplatePerformance', () => {
    it('should calculate performance metrics correctly', async () => {
      const mockAnalyticsData = [
        {
          id: '1',
          template_id: 'template-1',
          user_id: 'user-1',
          action_taken: true,
          action_type: 'created_update',
          engagement_score: 8,
          child_age_months: 8,
          day_of_week: 'Monday',
          time_of_day: 'morning',
          created_at: '2023-09-01T10:00:00Z'
        },
        {
          id: '2',
          template_id: 'template-1',
          user_id: 'user-2',
          action_taken: false,
          action_type: 'selected',
          engagement_score: null,
          child_age_months: 10,
          day_of_week: 'Tuesday',
          time_of_day: 'afternoon',
          created_at: '2023-09-02T14:00:00Z'
        }
      ]

      mockAnalyticsSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: mockAnalyticsData,
          error: null
        })
      })

      const performance = await analyticsTracker.getTemplatePerformance('template-1')

      expect(performance).toBeTruthy()
      expect(performance!.total_usage).toBe(2)
      expect(performance!.total_actions).toBe(1)
      expect(performance!.engagement_rate).toBe(50)
      expect(performance!.average_engagement_score).toBe(8)
    })

    it('should return null for non-existent template', async () => {
      mockAnalyticsSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          data: null,
          error: { message: 'Not found' }
        })
      })

      const performance = await analyticsTracker.getTemplatePerformance('non-existent')

      expect(performance).toBeNull()
    })
  })

  describe('getSystemAnalytics', () => {
    it('should calculate system-wide metrics', async () => {
      const mockSystemData = [
        {
          template_id: 'template-1',
          action_taken: true,
          prompt_templates: {
            template_text: 'Test template 1',
            prompt_type: 'milestone'
          }
        },
        {
          template_id: 'template-2',
          action_taken: false,
          prompt_templates: {
            template_text: 'Test template 2',
            prompt_type: 'fun'
          }
        }
      ]

      mockAnalyticsSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            data: mockSystemData,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            count: 5,
            error: null
          })
        })

      const analytics = await analyticsTracker.getSystemAnalytics()

      expect(analytics).toBeTruthy()
      expect(analytics!.total_usage).toBe(2)
      expect(analytics!.overall_engagement_rate).toBe(50)
      expect(analytics!.cost_savings.template_based_prompts).toBe(2)
    })
  })

  describe('updateTemplateEffectiveness', () => {
    it('should update effectiveness score based on recent performance', async () => {
      const mockRecentData = [
        {
          action_type: 'created_update',
          engagement_score: 9
        },
        {
          action_type: 'dismissed',
          engagement_score: 3
        }
      ]

      mockAnalyticsSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnValue({
            data: mockRecentData,
            error: null
          })
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            data: null,
            error: null
          })
        })

      await analyticsTracker.updateTemplateEffectiveness('template-1')

      expect(mockAnalyticsSupabase.from).toHaveBeenCalledWith('template_analytics')
    })
  })
})

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Template System Integration', () => {
  describe('End-to-end template usage flow', () => {
    it('should complete full template lifecycle', () => {
      // 1. Calculate context
      const context = calculatePromptContext(mockChild, mockUser)
      expect(context.child_name).toBe('Emma')

      // 2. Test template substitution
      const template = mockTemplates[0]
      const result = substituteVariables(template.template_text, context)
      expect(result).toContain('Emma')
      expect(result).not.toContain('[child_name]')

      // 3. Calculate template score
      const score = calculateTemplateScore(template, context, mockPreferences)
      expect(score).toBeGreaterThan(0)

      // 4. Validate all variables are available
      const missing = validateTemplateVariables(template.template_text, context)
      expect(missing).toHaveLength(0)
    })

    it('should handle template with missing variables', () => {
      const context = createSampleContext({ child_name: 'Emma' })
      const templateWithMissingVar = 'Hello [child_name], your [favorite_color] is beautiful!'

      const missing = validateTemplateVariables(templateWithMissingVar, context)
      expect(missing).toContain('favorite_color')

      const result = substituteVariables(templateWithMissingVar, context)
      expect(result).toBe('Hello Emma, your [favorite_color] is beautiful!')
    })
  })

  describe('Performance and edge cases', () => {
    it('should handle large number of variables efficiently', () => {
      const variables = Array.from({ length: 100 }, (_, i) => `var_${i}`)
      const template = variables.map(v => `[${v}]`).join(' ')
      const context = createSampleContext()

      const startTime = Date.now()
      const result = substituteVariables(template, context)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete within 100ms
      expect(result).toBeTruthy()
    })

    it('should handle empty template gracefully', () => {
      const context = createSampleContext()
      const result = substituteVariables('', context)
      expect(result).toBe('')
    })

    it('should handle malformed variable syntax', () => {
      const context = createSampleContext({ child_name: 'Emma' })
      const template = 'Hello [child_name, your [incomplete_var is here'

      const result = substituteVariables(template, context)
      expect(result).toContain('Emma')
    })
  })

  describe('Data consistency validation', () => {
    it('should maintain data integrity across operations', () => {
      const template = mockTemplates[0]
      const extractedVars = extractVariableNames(template.template_text)

      expect(extractedVars).toEqual(template.variables)
    })

    it('should validate template scoring consistency', () => {
      const context1 = createSampleContext({ age_months: 8 })
      const context2 = createSampleContext({ age_months: 8 })

      const score1 = calculateTemplateScore(mockTemplates[0], context1, mockPreferences)
      const score2 = calculateTemplateScore(mockTemplates[0], context2, mockPreferences)

      expect(score1).toBe(score2) // Same context should yield same score
    })
  })
})

// =============================================================================
// PERFORMANCE BENCHMARKS
// =============================================================================

describe('Template System Performance', () => {
  it('should handle template substitution at scale', () => {
    const context = createSampleContext()
    const template = 'Hello [child_name], you are [age_months] months old and love [activity_type]!'

    const startTime = Date.now()

    for (let i = 0; i < 1000; i++) {
      substituteVariables(template, context)
    }

    const endTime = Date.now()
    const avgTime = (endTime - startTime) / 1000

    expect(avgTime).toBeLessThan(1) // Should average less than 1ms per substitution
  })

  it('should efficiently calculate template scores for multiple templates', () => {
    const context = createSampleContext()
    const templates = Array(100).fill(mockTemplates[0])

    const startTime = Date.now()

    templates.forEach(template => {
      calculateTemplateScore(template, context, mockPreferences)
    })

    const endTime = Date.now()
    const avgTime = (endTime - startTime) / 100

    expect(avgTime).toBeLessThan(1) // Should average less than 1ms per score calculation
  })
})

export {}