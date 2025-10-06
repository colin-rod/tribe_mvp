import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RateLimiter, RATE_LIMITS } from '../_shared/rate-limiter.ts'

interface AnalyzeRequest {
  update_id: string
  content: string
  child_age_months: number
  milestone_type?: string
  parent_id: string
}

type UpdateImportance = 'all_updates' | 'milestone' | 'major_milestone'

interface AnalysisResult {
  keywords: string[]
  emotional_tone: string
  importance_level: number // Legacy - kept for backward compatibility
  suggested_importance: UpdateImportance // New categorical classification
  importance_confidence: number // Confidence in importance classification (0-1)
  importance_reasoning: string // Why AI chose this classification
  detected_milestone_type?: string // Specific milestone if detected
  suggested_recipient_types: string[]
  suggested_recipients: string[]
  confidence_score: number
}

const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Initialize rate limiter
let rateLimiter: RateLimiter | null = null
try {
  rateLimiter = new RateLimiter()
} catch (error) {
  console.warn('Rate limiter initialization failed, continuing without rate limiting:', error)
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const requestData: AnalyzeRequest = await req.json()

    // Validate required fields
    if (!requestData.update_id || !requestData.content || !requestData.parent_id) {
      throw new Error('Missing required fields: update_id, content, parent_id')
    }

    // Apply rate limiting by parent_id
    if (rateLimiter) {
      const rateLimitResult = await rateLimiter.limit(
        requestData.parent_id,
        RATE_LIMITS.AI_ANALYSIS
      )

      if (!rateLimitResult.success) {
        const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Rate limit exceeded',
            message: `Too many AI analysis requests. Please try again in ${retryAfter} seconds.`,
            retry_after: retryAfter,
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.reset,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.reset.toString(),
              'Retry-After': retryAfter.toString(),
            },
          }
        )
      }

      console.log(`Rate limit check passed for parent ${requestData.parent_id}: ${rateLimitResult.remaining}/${rateLimitResult.limit} remaining`)
    }

    // Get recipients for context
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: recipients } = await supabase
      .from('recipients')
      .select(`
        id,
        name,
        relationship,
        frequency,
        preferred_channels,
        recipient_groups(name, default_frequency)
      `)
      .eq('parent_id', requestData.parent_id)
      .eq('is_active', true)

    // Analyze content with AI
    const analysis = await analyzeContentWithAI(requestData, recipients || [])

    // Suggest specific recipients based on analysis
    const suggestedRecipients = suggestRecipients(analysis, recipients || [])

    // Update database with analysis results
    const { error: updateError } = await supabase
      .from('updates')
      .update({
        ai_analysis: analysis,
        suggested_recipients: suggestedRecipients
      })
      .eq('id', requestData.update_id)
      .eq('parent_id', requestData.parent_id) // Security check

    if (updateError) {
      throw new Error(`Failed to update database: ${updateError.message}`)
    }

    // Get current rate limit status for response headers
    const rateLimitStatus = rateLimiter
      ? await rateLimiter.status(requestData.parent_id, RATE_LIMITS.AI_ANALYSIS)
      : null

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': 'application/json',
    }

    // Add rate limit headers to response
    if (rateLimitStatus) {
      responseHeaders['X-RateLimit-Limit'] = rateLimitStatus.limit.toString()
      responseHeaders['X-RateLimit-Remaining'] = rateLimitStatus.remaining.toString()
      responseHeaders['X-RateLimit-Reset'] = rateLimitStatus.reset.toString()
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        suggested_recipients: suggestedRecipients
      }),
      {
        headers: responseHeaders
      }
    )

  } catch (error) {
    console.error('AI Analysis error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})

async function analyzeContentWithAI(
  requestData: AnalyzeRequest,
  recipients: any[]
): Promise<AnalysisResult> {
  const recipientContext = recipients.map(r => ({
    relationship: r.relationship,
    frequency_preference: r.frequency,
    group: r.recipient_groups?.name
  }))

  const analysisPrompt = `
Analyze this baby/child update and classify its importance level:

Content: "${requestData.content}"
Child age: ${requestData.child_age_months} months
Milestone type: ${requestData.milestone_type || 'none'}

Available recipients: ${JSON.stringify(recipientContext, null, 2)}

Based on this update, provide a JSON response with:
1. keywords: Array of 3-5 relevant keywords
2. emotional_tone: One of "excited", "proud", "happy", "concerned", "milestone", "routine", "funny"
3. importance_level: Number 1-10 (10 = major milestone, 1 = routine update) - LEGACY field
4. suggested_importance: One of "all_updates", "milestone", "major_milestone"
   - "major_milestone": First steps, first words, birthday, first day of school, major achievements
   - "milestone": First smile, rolling over, sitting up, crawling, first tooth, new developmental skill
   - "all_updates": Daily activities, cute moments, regular photos, routine updates
5. importance_confidence: Number 0-1 indicating confidence in importance classification
6. importance_reasoning: Brief explanation (1-2 sentences) of why this classification was chosen
7. detected_milestone_type: If a milestone, what specific type (e.g., "first_steps", "first_words", "sitting", etc.)
8. suggested_recipient_types: Array of relationship types who should receive this ("grandparent", "close_family", "extended_family", "friends")
9. confidence_score: Number 0-1 indicating AI confidence in suggestions

Classification Guidelines:
- MAJOR MILESTONE: Life-changing firsts, major celebrations, significant achievements
  Examples: first steps, first words, potty training success, birthdays, first day of school
- MILESTONE: Developmental achievements, new skills, notable firsts
  Examples: first smile, rolling over, sitting independently, crawling, first tooth
- ALL UPDATES: Everything else - daily life, cute moments, regular activities, photos
  Examples: playing at the park, wearing a cute outfit, funny face, typical day activities

Consider:
- Content keywords (e.g., "first time", "birthday", "started", "achieved")
- Age-appropriate milestones (crawling for 6-10 months, walking for 10-14 months)
- Emotional intensity in parent's language
- Significance vs routine nature of the event

Respond with ONLY valid JSON, no other text.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: analysisPrompt
      }],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const aiResult = await response.json()
  const analysisText = aiResult.choices?.[0]?.message?.content

  if (!analysisText) {
    throw new Error('No response from OpenAI')
  }

  try {
    const analysis = JSON.parse(analysisText)

    // Validate response structure
    if (!analysis.keywords || !analysis.emotional_tone || !analysis.suggested_importance) {
      throw new Error('Invalid AI response structure - missing required fields')
    }

    // Validate suggested_importance is a valid value
    const validImportance = ['all_updates', 'milestone', 'major_milestone']
    if (!validImportance.includes(analysis.suggested_importance)) {
      console.warn(`Invalid suggested_importance: ${analysis.suggested_importance}, defaulting to 'all_updates'`)
      analysis.suggested_importance = 'all_updates'
    }

    return {
      keywords: analysis.keywords,
      emotional_tone: analysis.emotional_tone,
      importance_level: analysis.importance_level || 5, // Legacy field with fallback
      suggested_importance: analysis.suggested_importance,
      importance_confidence: analysis.importance_confidence || 0.8,
      importance_reasoning: analysis.importance_reasoning || 'AI classification based on content analysis',
      detected_milestone_type: analysis.detected_milestone_type,
      suggested_recipient_types: analysis.suggested_recipient_types || [],
      suggested_recipients: [], // Will be populated by suggestRecipients
      confidence_score: analysis.confidence_score || 0.8
    }
  } catch (parseError) {
    console.error('Failed to parse AI response:', analysisText)
    throw new Error('Invalid JSON response from AI')
  }
}

function suggestRecipients(analysis: AnalysisResult, recipients: any[]): string[] {
  const suggestions: string[] = []

  // High importance items go to close family
  if (analysis.importance_level >= 8) {
    recipients
      .filter(r => ['grandparent', 'parent', 'sibling'].includes(r.relationship))
      .forEach(r => suggestions.push(r.id))
  }

  // Medium importance to extended family based on their frequency preference
  if (analysis.importance_level >= 6) {
    recipients
      .filter(r => r.relationship === 'family' &&
                  ['every_update', 'daily_digest'].includes(r.frequency))
      .forEach(r => suggestions.push(r.id))
  }

  // Match suggested recipient types from AI
  analysis.suggested_recipient_types.forEach(type => {
    const matchingRecipients = recipients.filter(r => {
      switch (type) {
        case 'grandparent':
          return r.relationship === 'grandparent'
        case 'close_family':
          return ['grandparent', 'parent', 'sibling'].includes(r.relationship)
        case 'extended_family':
          return r.relationship === 'family'
        case 'friends':
          return r.relationship === 'friend'
        default:
          return false
      }
    })

    matchingRecipients.forEach(r => {
      if (!suggestions.includes(r.id)) {
        suggestions.push(r.id)
      }
    })
  })

  // Always include recipients who want every update
  recipients
    .filter(r => r.frequency === 'every_update')
    .forEach(r => {
      if (!suggestions.includes(r.id)) {
        suggestions.push(r.id)
      }
    })

  return suggestions
}