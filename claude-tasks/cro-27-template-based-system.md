# CRO-27: Template-Based AI Prompt Generation System

## Issue URL
https://linear.app/crod/issue/CRO-27/phase-41-template-based-ai-prompt-generation-system

## Agents Required
- `ai-developer` (Primary)
- `react-developer` (Supporting)
- `content-designer` (Supporting)

## Dependencies
- **CRO-32**: Notification Management System (COMPLETE)
- **CRO-19**: AI Analysis Edge Function (COMPLETE - minimal usage)
- **CRO-23**: Update Creation & AI Integration (COMPLETE)

## Objective
Implement template-based AI prompt generation system with curated prompt templates to encourage parent engagement while minimizing API costs and maximizing performance through dynamic variable substitution.

## Context
Instead of generating fresh prompts via expensive AI API calls, this system uses a curated database of prompt templates with variable substitution to create personalized, contextual prompts. This approach provides 90% cost reduction while maintaining quality and personalization.

## Approach Change: Template-Based System

**Previous approach**: Generate fresh prompts via OpenAI API calls for every user
**New approach**: Curated prompt template database with dynamic variable substitution

**Benefits:**
- 90% cost reduction vs full AI generation
- Instant prompt delivery from database
- Consistent, tested prompt quality
- Easy integration with community contributions
- Scalable and maintainable
- Better reliability and performance

## Database Schema Implementation

### Core Prompt Templates Table
```sql
-- Core prompt templates
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_type VARCHAR NOT NULL CHECK (prompt_type IN ('milestone', 'activity', 'fun', 'seasonal')),
  template_text TEXT NOT NULL, -- e.g., "Capture [child_name]'s reaction to [activity]!"
  age_range_min INTEGER, -- minimum age in months
  age_range_max INTEGER, -- maximum age in months
  category VARCHAR, -- 'newborn', 'infant', 'toddler', 'preschool', 'all_ages'
  tags VARCHAR[],
  variables JSONB NOT NULL DEFAULT '[]'::jsonb, -- Define what variables can be substituted
  usage_count INTEGER DEFAULT 0,
  effectiveness_score DECIMAL DEFAULT 0,
  is_community_contributed BOOLEAN DEFAULT false,
  community_prompt_id UUID REFERENCES community_prompts(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Updated ai_prompts table to reference templates
ALTER TABLE ai_prompts ADD COLUMN template_id UUID REFERENCES prompt_templates(id);
ALTER TABLE ai_prompts ADD COLUMN substituted_variables JSONB DEFAULT '{}'::jsonb;

-- Indexes for performance
CREATE INDEX idx_prompt_templates_type_age ON prompt_templates(prompt_type, age_range_min, age_range_max);
CREATE INDEX idx_prompt_templates_community ON prompt_templates(is_community_contributed, community_prompt_id) WHERE is_community_contributed = true;
CREATE INDEX idx_ai_prompts_template ON ai_prompts(template_id);
```

### Template Examples and Seed Data
```sql
-- Fun templates
INSERT INTO prompt_templates (prompt_type, template_text, age_range_min, age_range_max, category, variables) VALUES
('fun', 'Funny Face Friday! Capture [child_name]''s silliest expression!', 3, 36, 'all_ages', '["child_name"]'),
('fun', 'Costume time! Dress [child_name] up as their favorite animal!', 6, 60, 'toddler', '["child_name"]'),
('fun', 'Messy [meal_time]! Share that adorable food-covered face from [child_name]!', 4, 24, 'infant', '["meal_time", "child_name"]'),
('fun', 'Dance party with [child_name]! What''s their favorite song right now?', 8, 36, 'toddler', '["child_name"]'),

-- Milestone templates  
('milestone', 'Time for [child_name]''s [age_months]-month milestones! Any new developments?', 1, 24, 'all_ages', '["child_name", "age_months"]'),
('milestone', 'Has [child_name] started [milestone_activity] yet? Perfect time to capture those first attempts!', 6, 18, 'infant', '["child_name", "milestone_activity"]'),
('milestone', 'Is [child_name] saying any new words? Their vocabulary is growing so fast at [age_months] months!', 8, 24, 'toddler', '["child_name", "age_months"]'),
('milestone', 'How is [child_name] doing with [age_appropriate_skill]? Every baby develops at their own pace!', 0, 60, 'all_ages', '["child_name", "age_appropriate_skill"]'),

-- Activity templates
('activity', 'It''s been [days_since_update] days since your last update about [child_name]. What''s new?', 0, 60, 'all_ages', '["days_since_update", "child_name"]'),
('activity', 'Weekly check-in: What made you smile about [child_name] this week?', 0, 60, 'all_ages', '["child_name"]'),
('activity', '[child_name] must be keeping you busy! Share a quick moment from today.', 0, 60, 'all_ages', '["child_name"]'),
('activity', 'What''s [child_name]''s favorite [activity_type] lately?', 3, 60, 'all_ages', '["child_name", "activity_type"]'),

-- Seasonal templates
('seasonal', '[season] has arrived! Perfect time for outdoor photos with [child_name]!', 0, 60, 'all_ages', '["season", "child_name"]'),
('seasonal', 'Happy [holiday]! How is [child_name] celebrating?', 0, 60, 'all_ages', '["holiday", "child_name"]'),
('seasonal', '[weather_activity] weather is perfect for [child_name] to [outdoor_activity]!', 6, 60, 'all_ages', '["weather_activity", "child_name", "outdoor_activity"]'),
('seasonal', 'It''s [holiday] season! Time to start planning [child_name]''s [holiday_activity]!', 0, 60, 'all_ages', '["holiday", "child_name", "holiday_activity"]');
```

## Tasks

### 1. Template Database System
- [ ] Create prompt_templates table and indexes
- [ ] Seed database with 50-100 curated prompt templates
- [ ] Build template management interface for admins
- [ ] Implement template versioning and A/B testing
- [ ] Create template effectiveness tracking

### 2. Variable Substitution Engine
- [ ] Build dynamic variable substitution system
- [ ] Implement context calculation for variables
- [ ] Create age-appropriate content mapping
- [ ] Add seasonal and holiday detection
- [ ] Build milestone and activity suggestions

### 3. Template Selection Algorithm
- [ ] Implement smart template filtering by age and preferences
- [ ] Create variety enforcement to avoid repetition
- [ ] Build context-aware template scoring
- [ ] Add seasonal prioritization logic
- [ ] Implement user preference respect

### 4. Edge Function Optimization
- [ ] Refactor `generate-prompts` Edge Function for template system
- [ ] Implement efficient template querying
- [ ] Add batch processing for multiple users
- [ ] Create template performance monitoring
- [ ] Build fallback mechanisms for edge cases

### 5. Frontend Components
- [ ] Update `AIPromptCard.tsx` for template-based prompts
- [ ] Enhance `PromptFeed.tsx` with template attribution
- [ ] Create `TemplateManager.tsx` admin interface
- [ ] Build template preview and testing tools
- [ ] Add template effectiveness reporting

### 6. Community Integration
- [ ] Integrate approved community prompts as templates
- [ ] Build automatic template creation from community content
- [ ] Add community template attribution
- [ ] Create template contribution workflow
- [ ] Implement community template moderation

## Variable Substitution System

### Available Variables
```typescript
interface PromptVariables {
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
```

### Context Calculation Functions
```typescript
// src/lib/prompt-context.ts
export function calculatePromptContext(child: Child, user: User): PromptVariables {
  const ageMonths = calculateAgeInMonths(child.birth_date)
  const ageWeeks = calculateAgeInWeeks(child.birth_date)
  const lastUpdate = getLastUpdate(child.id)
  const daysSinceUpdate = calculateDaysSinceUpdate(lastUpdate)
  
  return {
    child_name: child.name,
    age_months: ageMonths,
    age_weeks: ageWeeks,
    days_since_update: daysSinceUpdate,
    last_update_type: lastUpdate?.type || 'general',
    recent_milestone: getRecentMilestone(child.id),
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

function getAgeAppropriateSkill(ageMonths: number): string {
  if (ageMonths < 3) return 'smiling and eye contact'
  if (ageMonths < 6) return 'rolling over'
  if (ageMonths < 9) return 'sitting up'
  if (ageMonths < 12) return 'crawling'
  if (ageMonths < 18) return 'walking'
  if (ageMonths < 24) return 'talking'
  return 'playing with others'
}

function getMilestoneActivity(ageMonths: number): string {
  if (ageMonths < 6) return 'tummy time'
  if (ageMonths < 9) return 'sitting practice'
  if (ageMonths < 12) return 'crawling adventures'
  if (ageMonths < 18) return 'first steps'
  if (ageMonths < 24) return 'word learning'
  return 'imaginative play'
}
```

## Template Selection Algorithm

### Smart Template Matching
```typescript
// src/lib/template-selection.ts
export async function selectTemplate(
  child: Child, 
  user: User, 
  preferences: NotificationPreferences
): Promise<PromptTemplate | null> {
  
  const context = calculatePromptContext(child, user)
  const enabledTypes = preferences.enabled_prompt_types || ['milestone', 'activity', 'fun']
  
  // Get candidate templates
  const candidates = await getTemplatesByFilters({
    age_range: context.age_months,
    enabled_types: enabledTypes,
    exclude_recent: await getRecentTemplateIds(child.id, 7) // Avoid repetition
  })
  
  // Score templates based on context
  const scoredTemplates = candidates.map(template => ({
    template,
    score: calculateTemplateScore(template, context, preferences)
  }))
  
  // Sort by score and select best match
  scoredTemplates.sort((a, b) => b.score - a.score)
  
  return scoredTemplates[0]?.template || null
}

function calculateTemplateScore(
  template: PromptTemplate, 
  context: PromptVariables, 
  preferences: NotificationPreferences
): number {
  let score = 0
  
  // Age appropriateness (high weight)
  if (context.age_months >= template.age_range_min && 
      context.age_months <= template.age_range_max) {
    score += 50
  }
  
  // Seasonal relevance
  if (template.prompt_type === 'seasonal' && context.upcoming_holiday) {
    score += 30
  }
  
  // Activity timing
  if (template.prompt_type === 'activity' && context.days_since_update > 3) {
    score += 20
  }
  
  // Milestone timing
  if (template.prompt_type === 'milestone' && shouldPromptMilestone(context)) {
    score += 40
  }
  
  // Effectiveness history
  score += template.effectiveness_score * 10
  
  // Community contribution bonus
  if (template.is_community_contributed) {
    score += 15
  }
  
  return score
}
```

## Edge Function Implementation

### Optimized generate-prompts Function
```typescript
// supabase/functions/generate-prompts/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { parent_id, force_generation } = await req.json()
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get eligible users
    const eligibleUsers = await getEligibleUsers(supabase, parent_id)
    
    let totalGenerated = 0
    let totalSent = 0

    for (const user of eligibleUsers) {
      try {
        const prompts = await generateTemplatePromptsForUser(user, supabase, force_generation)
        totalGenerated += prompts.length
        
        const sentCount = await deliverPrompts(prompts, user, supabase)
        totalSent += sentCount
        
      } catch (error) {
        console.error(`Failed to generate prompts for user ${user.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        users_processed: eligibleUsers.length,
        prompts_generated: totalGenerated,
        prompts_sent: totalSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Prompt generation error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateTemplatePromptsForUser(
  user: any, 
  supabase: any, 
  forceGeneration = false
): Promise<any[]> {
  const preferences = user.notification_preferences || {}
  const promptFrequency = preferences.prompt_frequency || 'every_3_days'
  
  // Check if user should receive prompts today
  if (!forceGeneration && !shouldGeneratePromptsToday(promptFrequency)) {
    return []
  }

  const generatedPrompts = []

  for (const child of user.children) {
    // Build context for variable substitution
    const context = await buildPromptContext(child, user, supabase)
    
    // Skip if child had prompts recently (unless forced)
    if (!forceGeneration && await hasRecentPrompts(child.id, supabase)) {
      continue
    }

    // Select best template for this child
    const template = await selectBestTemplate(child, preferences, context, supabase)
    
    if (template) {
      // Substitute variables in template
      const finalPromptText = substituteVariables(template.template_text, context)
      
      // Save generated prompt to database
      const { data: savedPrompt } = await supabase
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

      if (savedPrompt) {
        // Update template usage count
        await supabase
          .from('prompt_templates')
          .update({ 
            usage_count: supabase.rpc('increment_usage_count', { template_id: template.id })
          })
          .eq('id', template.id)
        
        generatedPrompts.push(savedPrompt)
      }
    }
  }

  return generatedPrompts
}

async function selectBestTemplate(
  child: any, 
  preferences: any, 
  context: any, 
  supabase: any
): Promise<any> {
  const enabledTypes = preferences.enabled_prompt_types || ['milestone', 'activity', 'fun']
  const ageMonths = calculateAgeInMonths(child.birth_date)
  
  // Get recent template IDs to avoid repetition
  const { data: recentPrompts } = await supabase
    .from('ai_prompts')
    .select('template_id')
    .eq('child_id', child.id)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  
  const recentTemplateIds = recentPrompts?.map(p => p.template_id).filter(Boolean) || []
  
  // Query for suitable templates
  let query = supabase
    .from('prompt_templates')
    .select('*')
    .lte('age_range_min', ageMonths)
    .gte('age_range_max', ageMonths)
    .in('prompt_type', enabledTypes)
  
  if (recentTemplateIds.length > 0) {
    query = query.not('id', 'in', `(${recentTemplateIds.join(',')})`)
  }
  
  const { data: templates } = await query
  
  if (!templates || templates.length === 0) {
    return null
  }
  
  // Score and select best template
  const scoredTemplates = templates.map(template => ({
    template,
    score: calculateTemplateScore(template, context, preferences)
  }))
  
  scoredTemplates.sort((a, b) => b.score - a.score)
  return scoredTemplates[0].template
}

function substituteVariables(templateText: string, context: any): string {
  let result = templateText
  
  // Replace all variables in the format [variable_name]
  const variableRegex = /\[([^\]]+)\]/g
  
  result = result.replace(variableRegex, (match, variableName) => {
    return context[variableName] || match // Keep original if variable not found
  })
  
  return result
}

function calculateTemplateScore(template: any, context: any, preferences: any): number {
  let score = 0
  
  // Age appropriateness (high weight)
  if (context.age_months >= template.age_range_min && 
      context.age_months <= template.age_range_max) {
    score += 50
  }
  
  // Seasonal relevance
  if (template.prompt_type === 'seasonal' && context.upcoming_holiday) {
    score += 30
  }
  
  // Activity timing
  if (template.prompt_type === 'activity' && context.days_since_update > 3) {
    score += 20
  }
  
  // Milestone timing
  if (template.prompt_type === 'milestone') {
    score += 40
  }
  
  // Effectiveness history
  score += (template.effectiveness_score || 0) * 10
  
  // Community contribution bonus
  if (template.is_community_contributed) {
    score += 15
  }
  
  // Usage frequency penalty (avoid overused templates)
  score -= Math.min(template.usage_count * 2, 20)
  
  return score
}
```

## Frontend Component Updates

### Enhanced AIPromptCard Component
```typescript
// src/components/prompts/AIPromptCard.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Lightbulb, X, Camera, Clock, Template } from 'lucide-react'

interface AIPromptCardProps {
  prompt: {
    id: string
    prompt_text: string
    prompt_type: string
    child_id: string
    child_name: string
    template_id?: string
    substituted_variables?: any
    created_at: string
    template?: {
      is_community_contributed: boolean
      created_by?: string
    }
  }
  onDismiss: (promptId: string) => void
  onActOn: (promptId: string) => void
}

export function AIPromptCard({ prompt, onDismiss, onActOn }: AIPromptCardProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const getPromptIcon = (type: string) => {
    switch (type) {
      case 'milestone': return '🎉'
      case 'activity': return '🎯'
      case 'fun': return '😄'
      case 'seasonal': return '🎄'
      default: return '💡'
    }
  }

  const getPromptColor = (type: string) => {
    switch (type) {
      case 'milestone': return 'border-purple-200 bg-purple-50'
      case 'activity': return 'border-blue-200 bg-blue-50'
      case 'fun': return 'border-yellow-200 bg-yellow-50'
      case 'seasonal': return 'border-green-200 bg-green-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const handleCreateUpdate = async () => {
    setLoading(true)
    try {
      await onActOn(prompt.id)
      router.push(`/dashboard/create-update?child=${prompt.child_id}&prompt=${prompt.id}`)
    } catch (error) {
      console.error('Failed to act on prompt:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async () => {
    setLoading(true)
    try {
      await onDismiss(prompt.id)
    } catch (error) {
      console.error('Failed to dismiss prompt:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${getPromptColor(prompt.prompt_type)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getPromptIcon(prompt.prompt_type)}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 capitalize">
                {prompt.prompt_type} suggestion
              </h3>
              {prompt.template?.is_community_contributed && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                  <Template className="h-3 w-3" />
                  Community
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              For {prompt.child_name} • {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4">
        <p className="text-gray-800 leading-relaxed">
          {prompt.prompt_text}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCreateUpdate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          <Camera className="h-4 w-4" />
          {loading ? 'Creating...' : 'Create Update'}
        </button>
        
        <button
          onClick={handleDismiss}
          disabled={loading}
          className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
        >
          Maybe later
        </button>
      </div>

      {/* Template attribution for community prompts */}
      {prompt.template?.is_community_contributed && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Template className="h-3 w-3" />
            <span>Community-contributed template</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

## AI Usage Strategy

### Minimal AI Usage (5% of prompts)
- **Monthly template creation**: Generate 5-10 new template variations
- **Seasonal content**: Create holiday-specific templates
- **Edge cases**: Handle unusual contexts not covered by templates
- **Quality improvement**: Enhance existing templates based on performance

### Template-Based Generation (95% of prompts)
- **Daily prompt generation**: All routine prompts from templates
- **Milestone prompts**: Age-appropriate developmental suggestions
- **Activity prompts**: Engagement-based suggestions
- **Community content**: User-contributed prompts as templates

## Success Criteria
- [ ] ✅ Prompts generate instantly from template database
- [ ] ✅ 90% cost reduction vs full AI generation
- [ ] ✅ Prompt quality maintained through curation
- [ ] ✅ Variable substitution creates personalized feel
- [ ] ✅ Community templates integrate seamlessly
- [ ] ✅ Template variety prevents repetition
- [ ] ✅ System scales to thousands of daily prompts
- [ ] ✅ Template effectiveness tracking shows engagement metrics
- [ ] ✅ Admin tools allow easy template management
- [ ] ✅ Performance improvements are measurable

## Testing Strategy

### Template System Tests
1. **Variable Substitution Tests**:
   - Test all variable types with valid data
   - Verify graceful handling of missing variables
   - Check age-appropriate content mapping
   - Test seasonal and holiday detection

2. **Template Selection Tests**:
   - Test age-based filtering accuracy
   - Verify variety enforcement works
   - Check scoring algorithm correctness
   - Test preference respect

3. **Performance Tests**:
   - Benchmark template selection speed
   - Test database query optimization
   - Verify scaling with large template sets
   - Check memory usage efficiency

### Integration Testing
- Test community prompt to template conversion
- Verify prompt delivery with template attribution
- Check template effectiveness tracking
- Test admin template management

## Future Enhancements
- Machine learning for template effectiveness prediction
- Dynamic template generation based on successful patterns
- Advanced personalization using user engagement history
- Multi-language template support
- Template recommendation system for admins

## Next Steps After Completion
- Template-based system ready for production scaling
- Foundation set for community template integration
- Analytics system prepared for template optimization
- Admin tools ready for template content management