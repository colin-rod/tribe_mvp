/**
 * STANDALONE VERSION - compile-digest Edge Function
 * All dependencies inlined for manual Supabase Dashboard deployment
 *
 * To deploy via Dashboard:
 * 1. Go to Supabase Dashboard → Edge Functions
 * 2. Create new function: compile-digest
 * 3. Copy and paste this entire file
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// CORS Headers (from _shared/cors.ts)
// ============================================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================================================
// Type Definitions
// ============================================================================
interface CompileDigestRequest {
  parent_id: string
  date_range_start: string  // ISO date
  date_range_end: string    // ISO date
  auto_approve?: boolean
  title?: string
}

interface Update {
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
  created_at: string
}

interface Recipient {
  id: string
  name: string
  relationship: string
  frequency: string
  digest_preferences: {
    include_in_digests?: boolean
    max_updates_per_digest?: number | null
    preferred_content_types?: string[]
    min_importance_level?: number
    exclude_routine_updates?: boolean
    personalization_level?: string
  }
}

interface AIDigestResponse {
  digest_theme: string
  recipients: Array<{
    recipient_id: string
    recipient_name: string
    rationale: string
    updates: Array<{
      update_id: string
      include: boolean
      order: number
      custom_caption?: string
      reason: string
    }>
  }>
}

interface UpdateForNarrative {
  id: string
  timestamp: string
  type: 'text' | 'photo' | 'video' | 'audio'
  content?: string
  url?: string
  caption?: string
  milestone: boolean
  milestone_type?: string
  child_name: string
  child_age_months: number
}

interface RecipientContext {
  name: string
  relationship: string
  preferences: {
    tone?: string
    max_length?: 'short' | 'medium' | 'long'
  }
}

interface MediaReference {
  id: string
  reference_text: string
  url: string
  type: 'photo' | 'video' | 'audio'
}

interface RecipientDigestNarrative {
  intro: string
  narrative: string
  closing: string
  media_references: MediaReference[]
}

interface ParentDigestNarrative {
  title: string
  intro: string
  narrative: string
  closing: string
  media_references: MediaReference[]
}

// ============================================================================
// Environment Variables
// ============================================================================
const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ============================================================================
// AI Narrative Generation Functions (from _shared/digest-ai.ts)
// ============================================================================

async function generateRecipientDigestNarrative(
  recipient: RecipientContext,
  updates: UpdateForNarrative[]
): Promise<RecipientDigestNarrative> {

  if (!openAiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  if (updates.length === 0) {
    return {
      intro: '',
      narrative: '',
      closing: '',
      media_references: []
    }
  }

  const updatesBatch = updates.map(u => ({
    id: u.id,
    timestamp: u.timestamp,
    type: u.type,
    content: u.content || null,
    url: u.url || null,
    caption: u.caption || null,
    milestone: u.milestone
  }))

  const toneGuidance = recipient.preferences.tone || 'friendly and concise'
  const lengthGuidance = recipient.preferences.max_length === 'short'
    ? 'Keep narrative brief (1-2 paragraphs).'
    : recipient.preferences.max_length === 'long'
    ? 'Provide detailed narrative (3-4 paragraphs).'
    : 'Keep narrative moderate (2-3 paragraphs).'

  const systemPrompt = `You write clear, concise family update summaries.

Create a brief narrative in JSON format. Be personalized but direct.

Reference media only when relevant. Keep it short and to the point.

Output only valid JSON.`

  const userPrompt = `Updates for this digest:

${JSON.stringify({
  recipient: {
    name: recipient.name,
    relationship: recipient.relationship,
    preferences: {
      tone: toneGuidance
    }
  },
  updates: updatesBatch
}, null, 2)}

Return JSON with these fields:

- intro: Simple greeting to ${recipient.name} (1 sentence)
- narrative: Brief summary of the updates. ${lengthGuidance}
- closing: Short closing (1 sentence)
- media_references: Array with:
  - id: update id
  - reference_text: short description
  - url: media link
  - type: "photo", "video", or "audio"

Rules:
- Be factual and concise
- No flowery language
- Reference key media only
- Use a ${toneGuidance} tone
- If no updates, return empty JSON {}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const aiResult = await response.json()
    const narrativeText = aiResult.choices?.[0]?.message?.content

    if (!narrativeText) {
      throw new Error('No response from OpenAI')
    }

    const narrative: RecipientDigestNarrative = JSON.parse(narrativeText)

    if (!narrative.intro && !narrative.narrative && !narrative.closing) {
      throw new Error('Invalid narrative structure from AI')
    }

    if (!narrative.media_references) {
      narrative.media_references = []
    }

    return narrative
  } catch (error) {
    console.error('Failed to generate recipient narrative:', error)
    return generateFallbackRecipientNarrative(recipient, updates)
  }
}

async function generateParentDigestNarrative(
  updates: UpdateForNarrative[],
  childName: string,
  dateRangeStart: string,
  dateRangeEnd: string
): Promise<ParentDigestNarrative> {

  if (!openAiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  if (updates.length === 0) {
    throw new Error('Cannot generate parent narrative with no updates')
  }

  const updatesBatch = updates.map(u => ({
    id: u.id,
    timestamp: u.timestamp,
    type: u.type,
    content: u.content || null,
    url: u.url || null,
    caption: u.caption || null,
    milestone: u.milestone,
    milestone_type: u.milestone_type || null
  }))

  const systemPrompt = `You compile family digest summaries for parents.

Create a chronological summary in JSON format suitable for archival.

Be clear and factual. Keep it concise.

Output only valid JSON.`

  const userPrompt = `Updates for this digest:

${JSON.stringify({
  child_name: childName,
  date_range: {
    start: dateRangeStart,
    end: dateRangeEnd
  },
  updates: updatesBatch
}, null, 2)}

Return JSON with these fields:

- title: Short title (e.g., "${childName}'s Week")
- intro: Brief intro (1-2 sentences)
- narrative: Chronological summary of all updates (2-4 paragraphs)
- closing: Short closing (1 sentence)
- media_references: Array with:
  - id: update id
  - reference_text: brief description
  - url: media link
  - type: "photo", "video", or "audio"

Rules:
- Be factual and concise
- Chronological order
- No flowery language
- If no updates, return empty JSON {}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const aiResult = await response.json()
    const narrativeText = aiResult.choices?.[0]?.message?.content

    if (!narrativeText) {
      throw new Error('No response from OpenAI')
    }

    const narrative: ParentDigestNarrative = JSON.parse(narrativeText)

    if (!narrative.title || !narrative.narrative) {
      throw new Error('Invalid parent narrative structure from AI')
    }

    if (!narrative.media_references) {
      narrative.media_references = []
    }

    return narrative
  } catch (error) {
    console.error('Failed to generate parent narrative:', error)
    return generateFallbackParentNarrative(updates, childName, dateRangeStart, dateRangeEnd)
  }
}

function generateFallbackRecipientNarrative(
  recipient: RecipientContext,
  updates: UpdateForNarrative[]
): RecipientDigestNarrative {
  const childName = updates[0]?.child_name || 'your loved one'
  const milestones = updates.filter(u => u.milestone)

  let narrative = `This week, ${childName} has been up to so many wonderful things! `

  if (milestones.length > 0) {
    narrative += `There ${milestones.length === 1 ? 'was' : 'were'} ${milestones.length} special milestone${milestones.length > 1 ? 's' : ''} to celebrate. `
  }

  const photoCount = updates.filter(u => u.type === 'photo').length
  if (photoCount > 0) {
    narrative += `We've captured ${photoCount} precious moment${photoCount > 1 ? 's' : ''} in photos. `
  }

  narrative += `Check out the updates below to see all the details!`

  const mediaReferences: MediaReference[] = updates
    .filter(u => u.url)
    .map(u => ({
      id: u.id,
      reference_text: u.caption || `${u.type === 'photo' ? 'Photo' : u.type === 'video' ? 'Video' : 'Recording'} from ${new Date(u.timestamp).toLocaleDateString()}`,
      url: u.url!,
      type: u.type as 'photo' | 'video' | 'audio'
    }))

  return {
    intro: `Hello ${recipient.name}!`,
    narrative,
    closing: `We can't wait to share more soon! Sending love from all of us.`,
    media_references: mediaReferences
  }
}

function generateFallbackParentNarrative(
  updates: UpdateForNarrative[],
  childName: string,
  dateRangeStart: string,
  dateRangeEnd: string
): ParentDigestNarrative {
  const startDate = new Date(dateRangeStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const endDate = new Date(dateRangeEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  let narrative = `During this period from ${startDate} to ${endDate}, ${childName} experienced many memorable moments. `

  updates.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  updates.forEach((update) => {
    const date = new Date(update.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (update.content) {
      narrative += `On ${date}, ${update.content} `
    }
    if (update.milestone) {
      narrative += `This was a special milestone! `
    }
  })

  const mediaReferences: MediaReference[] = updates
    .filter(u => u.url)
    .map(u => ({
      id: u.id,
      reference_text: `${u.type === 'photo' ? 'Photo' : u.type === 'video' ? 'Video' : 'Recording'}: ${u.caption || new Date(u.timestamp).toLocaleDateString()}`,
      url: u.url!,
      type: u.type as 'photo' | 'video' | 'audio'
    }))

  return {
    title: `${childName}'s Journey: ${startDate} - ${endDate}`,
    intro: `This digest captures ${childName}'s wonderful journey during this memorable period.`,
    narrative,
    closing: `These precious moments are forever preserved in our family's story.`,
    media_references: mediaReferences
  }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const requestData: CompileDigestRequest = await req.json()

    // Validate required fields
    if (!requestData.parent_id || !requestData.date_range_start || !requestData.date_range_end) {
      throw new Error('Missing required fields: parent_id, date_range_start, date_range_end')
    }

    console.log('Starting digest compilation', {
      parent_id: requestData.parent_id,
      date_range: `${requestData.date_range_start} to ${requestData.date_range_end}`
    })

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Step 1: Create digest record
    const { data: digest, error: digestError } = await supabase
      .from('summaries')
      .insert({
        parent_id: requestData.parent_id,
        title: requestData.title || generateDefaultTitle(requestData.date_range_start, requestData.date_range_end),
        digest_date: new Date().toISOString().split('T')[0],
        date_range_start: requestData.date_range_start,
        date_range_end: requestData.date_range_end,
        status: 'compiling'
      })
      .select()
      .single()

    if (digestError) {
      throw new Error(`Failed to create digest: ${digestError.message}`)
    }

    console.log('Digest created', { digest_id: digest.id })

    // Step 2: Fetch ready updates in date range
    const { data: updates, error: updatesError } = await supabase
      .from('memories')
      .select(`
        *,
        children:child_id (
          name,
          birth_date
        )
      `)
      .eq('parent_id', requestData.parent_id)
      .eq('distribution_status', 'ready')
      .gte('created_at', requestData.date_range_start)
      .lte('created_at', requestData.date_range_end)
      .order('created_at', { ascending: false })

    if (updatesError) {
      throw new Error(`Failed to fetch updates: ${updatesError.message}`)
    }

    if (!updates || updates.length === 0) {
      throw new Error('No ready updates found in date range')
    }

    console.log('Updates fetched', { count: updates.length })

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

    // Step 4: Call OpenAI to compile digest
    const aiResponse = await compileDigestWithAI(
      updates as Update[],
      recipients as Recipient[],
      requestData.parent_id
    )

    console.log('AI compilation complete', { theme: aiResponse.digest_theme })

    // Step 5: Save AI compilation data
    const { error: updateDigestError } = await supabase
      .from('summaries')
      .update({
        status: 'ready',
        compiled_at: new Date().toISOString(),
        title: aiResponse.digest_theme,
        ai_compilation_data: {
          digest_theme: aiResponse.digest_theme,
          model_used: 'gpt-4o',
          compilation_duration_ms: 0
        },
        total_updates: updates.length,
        total_recipients: recipients.length
      })
      .eq('id', digest.id)

    if (updateDigestError) {
      throw new Error(`Failed to update digest: ${updateDigestError.message}`)
    }

    // Step 6: Create digest_updates records
    const digestUpdates: Array<{
      digest_id: string
      update_id: string
      recipient_id: string
      included: boolean
      display_order: number
      custom_caption?: string
      ai_rationale: Record<string, unknown>
    }> = []

    aiResponse.recipients.forEach(recipientData => {
      recipientData.updates.forEach(updateData => {
        if (updateData.include) {
          digestUpdates.push({
            digest_id: digest.id,
            update_id: updateData.update_id,
            recipient_id: recipientData.recipient_id,
            included: true,
            display_order: updateData.order,
            custom_caption: updateData.custom_caption,
            ai_rationale: {
              reason: updateData.reason,
              recipient_rationale: recipientData.rationale
            }
          })
        }
      })
    })

    const { error: digestUpdatesError } = await supabase
      .from('summary_memories')
      .insert(digestUpdates)

    if (digestUpdatesError) {
      throw new Error(`Failed to create digest updates: ${digestUpdatesError.message}`)
    }

    console.log('Digest updates created', { count: digestUpdates.length })

    // Step 7: Update updates to 'in_digest' status
    const updateIds = updates.map(u => u.id)
    const { error: updateStatusError } = await supabase
      .from('memories')
      .update({
        distribution_status: 'in_digest',
        digest_id: digest.id
      })
      .in('id', updateIds)

    if (updateStatusError) {
      throw new Error(`Failed to update status: ${updateStatusError.message}`)
    }

    // Step 8: Generate AI narratives
    console.log('Generating AI narratives...')

    try {
      // Generate parent-facing narrative
      const parentNarrative = await generateParentNarrativeForDigest(
        updates as Update[],
        recipients as Recipient[],
        requestData
      )

      // Save parent narrative to digest
      await supabase
        .from('summaries')
        .update({ parent_narrative: parentNarrative })
        .eq('id', digest.id)

      console.log('Parent narrative generated')

      // Generate recipient-facing narratives
      await generateRecipientNarratives(
        supabase,
        digest.id,
        updates as Update[],
        aiResponse.recipients
      )

      console.log('All narratives generated successfully')
    } catch (narrativeError) {
      console.error('Failed to generate narratives:', narrativeError)
      // Non-fatal, digest can still be used without narratives
    }

    // Step 9: Auto-approve if requested
    if (requestData.auto_approve) {
      const { error: approveError } = await supabase
        .from('summaries')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', digest.id)

      if (approveError) {
        console.error('Failed to auto-approve:', approveError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        digest_id: digest.id,
        digest: {
          ...digest,
          status: requestData.auto_approve ? 'approved' : 'ready',
          title: aiResponse.digest_theme
        },
        stats: {
          total_updates: updates.length,
          total_recipients: recipients.length,
          total_digest_entries: digestUpdates.length
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
    console.error('Digest compilation error:', error)

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

// ============================================================================
// Helper Functions
// ============================================================================

async function compileDigestWithAI(
  updates: Update[],
  recipients: Recipient[],
  parent_id: string
): Promise<AIDigestResponse> {

  const updatesContext = updates.map(u => ({
    id: u.id,
    content: u.content ? u.content.substring(0, 200) : '',
    child_name: u.children.name,
    media_count: u.media_urls?.length || 0,
    has_media: (u.media_urls?.length || 0) > 0,
    milestone: u.milestone_type || null,
    importance: u.ai_analysis?.importance_level || 5,
    emotional_tone: u.ai_analysis?.emotional_tone || 'happy',
    keywords: u.ai_analysis?.keywords || [],
    created_at: u.created_at
  }))

  const recipientsContext = recipients.map(r => ({
    id: r.id,
    name: r.name,
    relationship: r.relationship,
    frequency: r.frequency,
    include_in_digests: r.digest_preferences?.include_in_digests !== false,
    max_updates: r.digest_preferences?.max_updates_per_digest || null,
    preferred_content: r.digest_preferences?.preferred_content_types || ['photos', 'milestones', 'text'],
    min_importance: r.digest_preferences?.min_importance_level || 1,
    exclude_routine: r.digest_preferences?.exclude_routine_updates || false,
    personalization: r.digest_preferences?.personalization_level || 'high'
  }))

  const compilationPrompt = `
You are an expert family update curator. Your task is to analyze baby/child updates and create personalized digests for each recipient.

CONTEXT:
- Parent has ${updates.length} ready updates from their child
- There are ${recipients.length} recipients with different preferences
- Each recipient should receive a tailored selection based on their relationship and preferences

UPDATES (${updates.length} total):
${JSON.stringify(updatesContext, null, 2)}

RECIPIENTS:
${JSON.stringify(recipientsContext, null, 2)}

TASK: Create personalized digests for each recipient following these rules:

RELATIONSHIP RULES:
1. **Grandparents & Close Family** - Get ALL milestones + daily highlights (importance >= 7)
2. **Extended Family** - Get milestones + weekly highlights (importance >= 6)
3. **Friends** - Get major milestones + cute/funny moments (importance >= 5)
4. **every_update** frequency - Gets everything regardless of importance
5. **daily_digest** frequency - Gets today's highlights
6. **weekly_digest** frequency - Gets 3-5 best moments of the week
7. **milestones_only** frequency - ONLY milestone updates

CONTENT PREFERENCES:
- Respect preferred_content_types (only include matching types)
- Filter by min_importance_level
- Exclude routine updates if exclude_routine is true
- Respect max_updates limit per recipient

ORDERING RULES:
1. Milestones always first (order by importance desc)
2. Then photos/videos by importance
3. Then text updates
4. Chronological within each category

OUTPUT FORMAT:
Respond with ONLY valid JSON (no markdown, no explanation):
{
  "digest_theme": "Brief catchy title (e.g., 'Emma's Big Week of Firsts')",
  "recipients": [
    {
      "recipient_id": "uuid",
      "recipient_name": "string",
      "rationale": "1-2 sentences explaining why these updates for this person",
      "updates": [
        {
          "update_id": "uuid",
          "include": true,
          "order": 1,
          "custom_caption": "optional: enhanced caption for this recipient",
          "reason": "why this update is included for this recipient"
        }
      ]
    }
  ]
}

IMPORTANT:
- Every recipient in RECIPIENTS list MUST appear in your response
- If a recipient should receive 0 updates (due to preferences), include them with empty updates array
- Ensure update_id values match the IDs from UPDATES
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
        content: 'You are an expert family update curator specializing in personalizing baby/child update digests based on recipient relationships and preferences. Always respond with valid JSON.'
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
    const aiResponse: AIDigestResponse = JSON.parse(analysisText)

    if (!aiResponse.digest_theme || !aiResponse.recipients) {
      throw new Error('Invalid AI response structure')
    }

    const responseRecipientIds = new Set(aiResponse.recipients.map(r => r.recipient_id))
    recipients.forEach(r => {
      if (!responseRecipientIds.has(r.id)) {
        console.warn(`Recipient ${r.name} missing from AI response, adding with empty updates`)
        aiResponse.recipients.push({
          recipient_id: r.id,
          recipient_name: r.name,
          rationale: 'No updates match this recipient\'s preferences',
          updates: []
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

async function generateParentNarrativeForDigest(
  updates: Update[],
  recipients: Recipient[],
  request: CompileDigestRequest
) {
  const childName = updates[0]?.children?.name || 'Child'

  const updatesForNarrative: UpdateForNarrative[] = updates.map(u => ({
    id: u.id,
    timestamp: u.created_at,
    type: (u.media_urls && u.media_urls.length > 0)
      ? (u.media_urls[0].includes('.mp4') || u.media_urls[0].includes('video') ? 'video' : 'photo')
      : 'text',
    content: u.content,
    url: u.media_urls?.[0],
    caption: u.subject,
    milestone: !!u.milestone_type,
    milestone_type: u.milestone_type,
    child_name: childName,
    child_age_months: calculateAgeInMonths(u.children?.birth_date)
  }))

  return await generateParentDigestNarrative(
    updatesForNarrative,
    childName,
    request.date_range_start,
    request.date_range_end
  )
}

async function generateRecipientNarratives(
  supabase: any,
  digestId: string,
  updates: Update[],
  recipientsData: AIDigestResponse['recipients']
) {
  for (const recipientData of recipientsData) {
    const recipientUpdates = recipientData.updates
      .filter(u => u.include)
      .map(u => {
        const update = updates.find(upd => upd.id === u.update_id)
        if (!update) return null

        return {
          id: update.id,
          timestamp: update.created_at,
          type: (update.media_urls && update.media_urls.length > 0)
            ? (update.media_urls[0].includes('.mp4') || update.media_urls[0].includes('video') ? 'video' : 'photo')
            : 'text',
          content: update.content,
          url: update.media_urls?.[0],
          caption: update.subject,
          milestone: !!update.milestone_type,
          milestone_type: update.milestone_type,
          child_name: update.children?.name || 'Child',
          child_age_months: calculateAgeInMonths(update.children?.birth_date)
        } as UpdateForNarrative
      })
      .filter((u): u is UpdateForNarrative => u !== null)

    if (recipientUpdates.length === 0) {
      continue
    }

    const recipientContext: RecipientContext = {
      name: recipientData.recipient_name,
      relationship: recipientData.recipient_name,
      preferences: {
        tone: 'warm and loving',
        max_length: recipientUpdates.length > 5 ? 'long' : 'medium'
      }
    }

    try {
      const narrative = await generateRecipientDigestNarrative(
        recipientContext,
        recipientUpdates
      )

      const { error: updateError } = await supabase
        .from('summary_memories')
        .update({ narrative_data: narrative })
        .eq('digest_id', digestId)
        .eq('recipient_id', recipientData.recipient_id)

      if (updateError) {
        console.error(`Failed to save narrative for recipient ${recipientData.recipient_name}:`, updateError)
      } else {
        console.log(`Narrative saved for recipient ${recipientData.recipient_name}`)
      }
    } catch (error) {
      console.error(`Failed to generate narrative for recipient ${recipientData.recipient_name}:`, error)
    }
  }
}

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
