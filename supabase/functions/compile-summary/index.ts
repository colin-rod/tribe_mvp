/**
 * Compile Summary Edge Function
 *
 * Updated from compile-digest to align with Memory Book terminology:
 * - Updates → Memories
 * - Digests → Summaries
 * - digest_updates → summary_memories
 *
 * This function compiles ready memories into a personalized summary for recipients.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  generateRecipientSummaryNarrative,
  generateParentSummaryNarrative,
  type MemoryForNarrative,
  type RecipientContext
} from '../_shared/summary-ai.ts'

interface CompileSummaryRequest {
  parent_id: string
  date_range_start: string  // ISO date
  date_range_end: string    // ISO date
  auto_approve?: boolean
  title?: string
}

interface Memory {
  id: string
  content: string
  subject?: string
  media_urls: string[]
  milestone_type?: string
  ai_analysis: {
    keywords?: string[]
    emotional_tone?: string
    importance_level?: number
    suggested_recipient_types?: string[]
  }
  children: {
    name: string
    birth_date: string
  }
  photo_count: number
  created_at: string
}

interface Recipient {
  id: string
  name: string
  relationship: string
  frequency: string
  summary_preferences: {
    include_in_summaries?: boolean
    max_memories_per_summary?: number | null
    preferred_content_types?: string[]
    min_importance_level?: number
    exclude_routine_memories?: boolean
    personalization_level?: string
  }
}

interface AISummaryResponse {
  summary_theme: string
  recipients: Array<{
    recipient_id: string
    recipient_name: string
    rationale: string
    memories: Array<{
      memory_id: string
      include: boolean
      order: number
      custom_caption?: string
      reason: string
    }>
  }>
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
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const requestData: CompileSummaryRequest = await req.json()

    // Validate required fields
    if (!requestData.parent_id || !requestData.date_range_start || !requestData.date_range_end) {
      throw new Error('Missing required fields: parent_id, date_range_start, date_range_end')
    }

    console.log('Starting summary compilation', {
      parent_id: requestData.parent_id,
      date_range: `${requestData.date_range_start} to ${requestData.date_range_end}`
    })

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Step 1: Create summary record
    const { data: summary, error: summaryError } = await supabase
      .from('summaries')
      .insert({
        parent_id: requestData.parent_id,
        title: requestData.title || generateDefaultTitle(requestData.date_range_start, requestData.date_range_end),
        summary_date: new Date().toISOString().split('T')[0],
        date_range_start: requestData.date_range_start,
        date_range_end: requestData.date_range_end,
        status: 'compiling',
        auto_publish_hours: 168  // Default 7 days
      })
      .select()
      .single()

    if (summaryError) {
      throw new Error(`Failed to create summary: ${summaryError.message}`)
    }

    console.log('Summary created', { summary_id: summary.id })

    // Step 2: Fetch approved memories in date range
    const { data: memories, error: memoriesError } = await supabase
      .from('memories')
      .select(`
        *,
        children:child_id (
          name,
          birth_date
        )
      `)
      .eq('parent_id', requestData.parent_id)
      .eq('distribution_status', 'approved')
      .gte('created_at', requestData.date_range_start)
      .lte('created_at', requestData.date_range_end)
      .order('created_at', { ascending: false })

    if (memoriesError) {
      throw new Error(`Failed to fetch memories: ${memoriesError.message}`)
    }

    if (!memories || memories.length === 0) {
      throw new Error('No approved memories found in date range')
    }

    console.log('Memories fetched', { count: memories.length })

    // Step 3: Fetch active recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('recipients')
      .select('*')
      .eq('parent_id', requestData.parent_id)
      .eq('is_active', true)

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`)
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No active recipients found')
    }

    console.log('Recipients fetched', { count: recipients.length })

    // Step 4: Call OpenAI to compile summary
    const aiResponse = await compileSummaryWithAI(
      memories as Memory[],
      recipients as Recipient[],
      requestData.parent_id
    )

    console.log('AI compilation complete', { theme: aiResponse.summary_theme })

    // Step 5: Save AI compilation data
    const { error: updateSummaryError } = await supabase
      .from('summaries')
      .update({
        status: 'compiled',
        compiled_at: new Date().toISOString(),
        title: aiResponse.summary_theme,
        ai_compilation_data: {
          summary_theme: aiResponse.summary_theme,
          model_used: 'gpt-4o',
          compilation_duration_ms: 0
        },
        total_updates: memories.length,
        total_recipients: recipients.length
      })
      .eq('id', summary.id)

    if (updateSummaryError) {
      throw new Error(`Failed to update summary: ${updateSummaryError.message}`)
    }

    // Step 6: Create summary_memories records
    const summaryMemories: Array<{
      summary_id: string
      memory_id: string
      recipient_id: string
      included: boolean
      display_order: number
      custom_caption?: string
      ai_rationale: Record<string, unknown>
    }> = []

    aiResponse.recipients.forEach(recipientData => {
      recipientData.memories.forEach(memoryData => {
        if (memoryData.include) {
          summaryMemories.push({
            summary_id: summary.id,
            memory_id: memoryData.memory_id,
            recipient_id: recipientData.recipient_id,
            included: true,
            display_order: memoryData.order,
            custom_caption: memoryData.custom_caption,
            ai_rationale: {
              reason: memoryData.reason,
              recipient_rationale: recipientData.rationale
            }
          })
        }
      })
    })

    const { error: summaryMemoriesError } = await supabase
      .from('summary_memories')
      .insert(summaryMemories)

    if (summaryMemoriesError) {
      throw new Error(`Failed to create summary memories: ${summaryMemoriesError.message}`)
    }

    console.log('Summary memories created', { count: summaryMemories.length })

    // Step 7: Update memories to 'compiled' status
    const memoryIds = memories.map(m => m.id)
    const { error: updateStatusError } = await supabase
      .from('memories')
      .update({
        distribution_status: 'compiled',
        summary_id: summary.id
      })
      .in('id', memoryIds)

    if (updateStatusError) {
      throw new Error(`Failed to update status: ${updateStatusError.message}`)
    }

    // Step 8: Generate AI narratives
    console.log('Generating AI narratives...')

    try {
      // Generate parent-facing narrative
      const parentNarrative = await generateParentNarrativeForSummary(
        memories as Memory[],
        recipients as Recipient[],
        requestData
      )

      // Save parent narrative to summary
      await supabase
        .from('summaries')
        .update({ parent_narrative: parentNarrative })
        .eq('id', summary.id)

      console.log('Parent narrative generated')

      // Generate recipient-facing narratives
      await generateRecipientNarratives(
        supabase,
        summary.id,
        memories as Memory[],
        aiResponse.recipients
      )

      console.log('All narratives generated successfully')
    } catch (narrativeError) {
      console.error('Failed to generate narratives:', narrativeError)
      // Non-fatal, summary can still be used without narratives
    }

    // Step 9: Auto-approve if requested
    if (requestData.auto_approve) {
      const { error: approveError } = await supabase
        .from('summaries')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', summary.id)

      if (approveError) {
        console.error('Failed to auto-approve:', approveError)
        // Non-fatal, continue
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary_id: summary.id,
        summary: {
          ...summary,
          status: requestData.auto_approve ? 'approved' : 'compiled',
          title: aiResponse.summary_theme
        },
        stats: {
          total_memories: memories.length,
          total_recipients: recipients.length,
          total_summary_entries: summaryMemories.length
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Summary compilation error:', error)

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

async function compileSummaryWithAI(
  memories: Memory[],
  recipients: Recipient[],
  parent_id: string
): Promise<AISummaryResponse> {

  const memoriesContext = memories.map(m => ({
    id: m.id,
    content: m.content.substring(0, 200), // Truncate for token efficiency
    child_name: m.children.name,
    media_count: m.media_urls?.length || 0,
    has_media: (m.media_urls?.length || 0) > 0,
    photo_count: m.photo_count || 0,
    milestone: m.milestone_type || null,
    importance: m.ai_analysis?.importance_level || 5,
    emotional_tone: m.ai_analysis?.emotional_tone || 'happy',
    keywords: m.ai_analysis?.keywords || [],
    created_at: m.created_at
  }))

  const recipientsContext = recipients.map(r => ({
    id: r.id,
    name: r.name,
    relationship: r.relationship,
    frequency: r.frequency,
    include_in_summaries: r.summary_preferences?.include_in_summaries !== false,
    max_memories: r.summary_preferences?.max_memories_per_summary || null,
    preferred_content: r.summary_preferences?.preferred_content_types || ['photos', 'milestones', 'text'],
    min_importance: r.summary_preferences?.min_importance_level || 1,
    exclude_routine: r.summary_preferences?.exclude_routine_memories || false,
    personalization: r.summary_preferences?.personalization_level || 'high'
  }))

  const compilationPrompt = `
You are an expert family memory curator for the Memory Book app. Your task is to analyze baby/child memories and create personalized summaries for each recipient.

CONTEXT:
- Parent has ${memories.length} approved memories from their child
- There are ${recipients.length} recipients with different preferences
- Each recipient should receive a tailored selection based on their relationship and preferences

MEMORIES (${memories.length} total):
${JSON.stringify(memoriesContext, null, 2)}

RECIPIENTS:
${JSON.stringify(recipientsContext, null, 2)}

TASK: Create personalized summaries for each recipient following these rules:

RELATIONSHIP RULES:
1. **Grandparents & Close Family** - Get ALL milestones + daily highlights (importance >= 7)
2. **Extended Family** - Get milestones + weekly highlights (importance >= 6)
3. **Friends** - Get major milestones + cute/funny moments (importance >= 5)
4. **every_update** frequency - Gets everything regardless of importance
5. **daily_summary** frequency - Gets today's highlights
6. **weekly_summary** frequency - Gets 3-5 best moments of the week
7. **milestones_only** frequency - ONLY milestone memories

CONTENT PREFERENCES:
- Respect preferred_content_types (only include matching types)
- Filter by min_importance_level
- Exclude routine memories if exclude_routine is true
- Respect max_memories limit per recipient

ORDERING RULES:
1. Milestones always first (order by importance desc)
2. Then photos/videos by importance
3. Then text memories
4. Chronological within each category

OUTPUT FORMAT:
Respond with ONLY valid JSON (no markdown, no explanation):
{
  "summary_theme": "Brief catchy title (e.g., 'Emma's Big Week of Firsts')",
  "recipients": [
    {
      "recipient_id": "uuid",
      "recipient_name": "string",
      "rationale": "1-2 sentences explaining why these memories for this person",
      "memories": [
        {
          "memory_id": "uuid",
          "include": true,
          "order": 1,
          "custom_caption": "optional: enhanced caption for this recipient",
          "reason": "why this memory is included for this recipient"
        }
      ]
    }
  ]
}

IMPORTANT:
- Every recipient in RECIPIENTS list MUST appear in your response
- If a recipient should receive 0 memories (due to preferences), include them with empty memories array
- Ensure memory_id values match the IDs from MEMORIES
- Order values should be sequential starting from 1
- Keep rationale and reason concise but meaningful
`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: 'You are an expert family memory curator specializing in personalizing baby/child memory summaries based on recipient relationships and preferences. Always respond with valid JSON.'
      }, {
        role: 'user',
        content: compilationPrompt
      }],
      temperature: 0.7,
      max_tokens: 4000,
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
    const aiResponse: AISummaryResponse = JSON.parse(analysisText)

    // Validate response structure
    if (!aiResponse.summary_theme || !aiResponse.recipients) {
      throw new Error('Invalid AI response structure')
    }

    // Ensure all recipients are included
    const responseRecipientIds = new Set(aiResponse.recipients.map(r => r.recipient_id))
    recipients.forEach(r => {
      if (!responseRecipientIds.has(r.id)) {
        console.warn(`Recipient ${r.name} missing from AI response, adding with empty memories`)
        aiResponse.recipients.push({
          recipient_id: r.id,
          recipient_name: r.name,
          rationale: 'No memories match this recipient\'s preferences',
          memories: []
        })
      }
    })

    return aiResponse
  } catch (parseError) {
    console.error('Failed to parse AI response:', analysisText)
    throw new Error(`Invalid JSON response from AI: ${parseError.message}`)
  }
}

function generateDefaultTitle(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  if (start.getMonth() === end.getMonth()) {
    return `Week of ${monthNames[start.getMonth()]} ${start.getDate()}-${end.getDate()}`
  } else {
    return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}`
  }
}

/**
 * Generate parent-facing narrative for the entire summary
 */
async function generateParentNarrativeForSummary(
  memories: Memory[],
  recipients: Recipient[],
  request: CompileSummaryRequest
) {
  const childName = memories[0]?.children?.name || 'Child'

  // Transform memories to narrative format
  const memoriesForNarrative: MemoryForNarrative[] = memories.map(m => ({
    id: m.id,
    timestamp: m.created_at,
    type: (m.media_urls && m.media_urls.length > 0)
      ? (m.media_urls[0].includes('.mp4') || m.media_urls[0].includes('video') ? 'video' : 'photo')
      : 'text',
    content: m.content,
    url: m.media_urls?.[0],
    caption: m.subject,
    milestone: !!m.milestone_type,
    milestone_type: m.milestone_type,
    child_name: childName,
    child_age_months: calculateAgeInMonths(m.children?.birth_date),
    photo_count: m.photo_count || 0
  }))

  return await generateParentSummaryNarrative(
    memoriesForNarrative,
    childName,
    request.date_range_start,
    request.date_range_end
  )
}

/**
 * Generate recipient-facing narratives for all recipients
 */
async function generateRecipientNarratives(
  supabase: any,
  summaryId: string,
  memories: Memory[],
  recipientsData: AISummaryResponse['recipients']
) {
  // Process each recipient
  for (const recipientData of recipientsData) {
    // Get recipient memories
    const recipientMemories = recipientData.memories
      .filter(m => m.include)
      .map(m => {
        const memory = memories.find(mem => mem.id === m.memory_id)
        if (!memory) return null

        return {
          id: memory.id,
          timestamp: memory.created_at,
          type: (memory.media_urls && memory.media_urls.length > 0)
            ? (memory.media_urls[0].includes('.mp4') || memory.media_urls[0].includes('video') ? 'video' : 'photo')
            : 'text',
          content: memory.content,
          url: memory.media_urls?.[0],
          caption: memory.subject,
          milestone: !!memory.milestone_type,
          milestone_type: memory.milestone_type,
          child_name: memory.children?.name || 'Child',
          child_age_months: calculateAgeInMonths(memory.children?.birth_date),
          photo_count: memory.photo_count || 0
        } as MemoryForNarrative
      })
      .filter((m): m is MemoryForNarrative => m !== null)

    // Skip if no memories
    if (recipientMemories.length === 0) {
      continue
    }

    // Determine render style based on photo count
    const totalPhotos = recipientMemories.reduce((sum, m) => sum + m.photo_count, 0)
    const renderStyle: 'gallery' | 'narrative' = totalPhotos >= 3 ? 'gallery' : 'narrative'

    // Generate narrative for this recipient
    const recipientContext: RecipientContext = {
      name: recipientData.recipient_name,
      relationship: recipientData.recipient_name,
      preferences: {
        tone: 'warm and loving',
        max_length: recipientMemories.length > 5 ? 'long' : 'medium'
      }
    }

    try {
      const narrative = await generateRecipientSummaryNarrative(
        recipientContext,
        recipientMemories,
        renderStyle
      )

      // Update summary_memories with narrative and render style
      const { error: updateError } = await supabase
        .from('summary_memories')
        .update({
          narrative_data: narrative,
          render_style: renderStyle
        })
        .eq('summary_id', summaryId)
        .eq('recipient_id', recipientData.recipient_id)

      if (updateError) {
        console.error(`Failed to save narrative for recipient ${recipientData.recipient_name}:`, updateError)
      } else {
        console.log(`Narrative saved for recipient ${recipientData.recipient_name} (render: ${renderStyle})`)
      }
    } catch (error) {
      console.error(`Failed to generate narrative for recipient ${recipientData.recipient_name}:`, error)
      // Continue with other recipients
    }
  }
}

/**
 * Calculate age in months from birth date
 */
function calculateAgeInMonths(birthDate?: string): number {
  if (!birthDate) return 0

  const birth = new Date(birthDate)
  const now = new Date()

  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()
  const days = now.getDate() - birth.getDate()

  let ageMonths = years * 12 + months
  if (days < 0) {
    ageMonths--
  }

  return Math.max(0, ageMonths)
}
