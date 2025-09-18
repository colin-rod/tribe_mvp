import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AnalyzeRequest {
  update_id: string
  content: string
  child_age_months: number
  milestone_type?: string
  parent_id: string
}

interface AnalysisResult {
  keywords: string[]
  emotional_tone: string
  importance_level: number
  suggested_recipient_types: string[]
  suggested_recipients: string[]
  confidence_score: number
}

const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        suggested_recipients: suggestedRecipients
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
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
Analyze this baby/child update and provide recipient suggestions:

Content: "${requestData.content}"
Child age: ${requestData.child_age_months} months
Milestone type: ${requestData.milestone_type || 'none'}

Available recipients: ${JSON.stringify(recipientContext, null, 2)}

Based on this update, provide a JSON response with:
1. keywords: Array of 3-5 relevant keywords
2. emotional_tone: One of "excited", "proud", "happy", "concerned", "milestone", "routine", "funny"
3. importance_level: Number 1-10 (10 = major milestone, 1 = routine update)
4. suggested_recipient_types: Array of relationship types who should receive this ("grandparent", "close_family", "extended_family", "friends")
5. confidence_score: Number 0-1 indicating AI confidence in suggestions

Consider:
- Milestones and firsts should go to close family and grandparents
- Routine updates can go to friends who want frequent updates
- Funny/cute moments appeal to all recipient types
- Medical concerns should go to close family only
- Age-appropriate content (crawling news not relevant for newborns)

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
    if (!analysis.keywords || !analysis.emotional_tone || !analysis.importance_level) {
      throw new Error('Invalid AI response structure')
    }

    return {
      keywords: analysis.keywords,
      emotional_tone: analysis.emotional_tone,
      importance_level: analysis.importance_level,
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