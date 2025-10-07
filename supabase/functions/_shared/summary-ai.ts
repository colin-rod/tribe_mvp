/**
 * AI Narrative Generation for Memory Book Summaries
 * Updated from digest-ai.ts to align with Memory Book terminology
 *
 * Implements the two-AI workflow:
 * 1. Recipient-Facing AI: Warm, personalized narratives for email/SMS/WhatsApp
 * 2. Parent-Facing AI: Detailed, chronological narratives for print/archival
 * 3. Hybrid rendering: Gallery (3+ photos) vs Narrative (<3 photos)
 */

const openAiApiKey = Deno.env.get('OPENAI_API_KEY')

/**
 * Memory with full context for AI narrative generation
 */
export interface MemoryForNarrative {
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
  photo_count: number  // Used to determine gallery vs narrative rendering
}

/**
 * Recipient context for personalization
 */
export interface RecipientContext {
  name: string
  relationship: string
  preferences: {
    tone?: string // e.g., "warm and simple", "casual and fun"
    max_length?: 'short' | 'medium' | 'long'
  }
}

/**
 * Media reference in narrative
 */
export interface MediaReference {
  id: string // memory_id
  reference_text: string // Natural sentence referencing the media
  url: string
  type: 'photo' | 'video' | 'audio'
}

/**
 * Recipient-facing summary narrative (email/SMS/WhatsApp)
 */
export interface RecipientSummaryNarrative {
  intro: string
  narrative: string
  closing: string
  media_references: MediaReference[]
  render_style: 'gallery' | 'narrative'  // Hybrid rendering
}

/**
 * Parent-facing summary narrative (print/archival)
 */
export interface ParentSummaryNarrative {
  title: string
  intro: string
  narrative: string
  closing: string
  media_references: MediaReference[]
}

/**
 * Generate warm, personalized narrative for recipient
 * Optimized for email/SMS/WhatsApp delivery
 * Supports hybrid rendering (gallery vs narrative based on photo count)
 */
export async function generateRecipientSummaryNarrative(
  recipient: RecipientContext,
  memories: MemoryForNarrative[],
  renderStyle: 'gallery' | 'narrative' = 'narrative'
): Promise<RecipientSummaryNarrative> {

  if (!openAiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  if (memories.length === 0) {
    // Return empty narrative for recipients with no memories
    return {
      intro: '',
      narrative: '',
      closing: '',
      media_references: [],
      render_style: renderStyle
    }
  }

  // Prepare memories batch
  const memoriesBatch = memories.map(m => ({
    id: m.id,
    timestamp: m.timestamp,
    type: m.type,
    content: m.content || null,
    url: m.url || null,
    caption: m.caption || null,
    milestone: m.milestone,
    milestone_type: m.milestone_type || null,
    child_name: m.child_name,
    child_age_months: m.child_age_months,
    photo_count: m.photo_count
  }))

  const childName = memories[0]?.child_name || 'Child'
  const childAgeMonths = memories[0]?.child_age_months || 0

  // Build prompt based on render style
  let styleInstructions = ''
  if (renderStyle === 'gallery') {
    styleInstructions = `
RENDER STYLE: GALLERY MODE (3+ photos)
- Keep narrative SHORT and punchy (2-3 sentences max)
- Let the photos do the talking
- Use descriptive captions that reference media
- Focus on emotions and milestones
- Example: "What a week of firsts! ${childName} discovered the joy of splashing in puddles and couldn't stop giggling. Check out these adorable moments captured throughout the week."
`
  } else {
    styleInstructions = `
RENDER STYLE: NARRATIVE MODE (<3 photos)
- Write a fuller, richer narrative (4-6 sentences)
- Paint a picture with words
- Include sensory details and emotions
- Weave media references naturally into the story
- Example: "This week, ${childName} had a magical discovery moment. We were walking home when the rain started, and those first drops hitting the sidewalk caught ${childName === 'her' ? 'her' : 'his'} attention completely. The puddle-splashing that followed was pure joy - arms flapping, giggles echoing down the street. It's these simple moments that remind us how everything is new and wonderful through a child's eyes."
`
  }

  const narrativePrompt = `
You are a warm, empathetic AI writing personalized weekly memory summaries for family members receiving updates about ${childName} (${childAgeMonths} months old).

RECIPIENT CONTEXT:
- Name: ${recipient.name}
- Relationship: ${recipient.relationship}
- Tone: ${recipient.preferences.tone || 'warm and loving'}
- Max Length: ${recipient.preferences.max_length || 'medium'}

${styleInstructions}

MEMORIES (${memories.length} total):
${JSON.stringify(memoriesBatch, null, 2)}

YOUR TASK:
Generate a recipient-facing narrative with these sections:

1. **intro** - Opening 1-2 sentences greeting recipient
   - Address them by name
   - Set the tone and time period
   - Example: "Hi ${recipient.name}! What a week it's been with ${childName}!"

2. **narrative** - Main story (length varies by render_style)
   - Weave memories into a cohesive story
   - Mention milestones naturally
   - Reference media with descriptive text
   - Use warm, conversational tone
   - Follow style instructions above

3. **closing** - Warm sign-off (1-2 sentences)
   - Express love/connection
   - Look forward to next update
   - Example: "Can't wait to share more adventures with you soon. Sending love! 💕"

4. **media_references** - Array of media with natural references
   - Each media gets a descriptive reference_text
   - Make references feel natural, not forced
   - Example: { id: "...", reference_text: "Look at that proud smile after the first puddle jump!", url: "...", type: "photo" }

IMPORTANT:
- Write as if you're the parent sharing with this specific person
- Match the relationship (formal for boss, casual for best friend)
- Keep it natural and conversational
- Make media references feel integrated, not tacked on
- For gallery mode: Keep it SHORT
- For narrative mode: Paint a picture with words

OUTPUT FORMAT (JSON only, no markdown):
{
  "intro": "string",
  "narrative": "string",
  "closing": "string",
  "media_references": [
    {
      "id": "memory_id",
      "reference_text": "Natural sentence about this photo/video",
      "url": "media_url",
      "type": "photo|video|audio"
    }
  ]
}
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
        content: 'You are a warm, empathetic AI specializing in personalizing family memory summaries. You write in a natural, conversational tone that matches the relationship between parent and recipient. Always respond with valid JSON.'
      }, {
        role: 'user',
        content: narrativePrompt
      }],
      temperature: 0.8,  // Higher creativity for narrative
      max_tokens: renderStyle === 'gallery' ? 500 : 1000,
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
    throw new Error('No narrative response from OpenAI')
  }

  try {
    const narrative = JSON.parse(narrativeText)
    return {
      ...narrative,
      render_style: renderStyle
    }
  } catch (parseError) {
    console.error('Failed to parse narrative:', narrativeText)
    throw new Error(`Invalid JSON response: ${parseError.message}`)
  }
}

/**
 * Generate detailed parent-facing narrative for print/archival
 * This is what parents see in their Memory Book
 */
export async function generateParentSummaryNarrative(
  memories: MemoryForNarrative[],
  childName: string,
  startDate: string,
  endDate: string
): Promise<ParentSummaryNarrative> {

  if (!openAiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  if (memories.length === 0) {
    throw new Error('Cannot generate narrative with no memories')
  }

  const memoriesBatch = memories.map(m => ({
    id: m.id,
    timestamp: m.timestamp,
    type: m.type,
    content: m.content || null,
    url: m.url || null,
    caption: m.caption || null,
    milestone: m.milestone,
    milestone_type: m.milestone_type || null,
    child_name: m.child_name,
    child_age_months: m.child_age_months,
    photo_count: m.photo_count
  }))

  const childAgeMonths = memories[0]?.child_age_months || 0
  const start = new Date(startDate)
  const end = new Date(endDate)

  const narrativePrompt = `
You are an expert memory curator creating a beautiful, archival narrative for a parent's Memory Book.

CONTEXT:
- Child: ${childName} (${childAgeMonths} months old)
- Time Period: ${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
- Memories: ${memories.length} captured moments

MEMORIES:
${JSON.stringify(memoriesBatch, null, 2)}

YOUR TASK:
Create a parent-facing narrative that will be treasured for years to come.

This narrative should:
1. Tell the story of this week chronologically
2. Highlight milestones and developmental moments
3. Capture the emotions and atmosphere
4. Be rich in detail and sensory language
5. Feel timeless and literary (suitable for printing)
6. Include natural references to photos/videos

OUTPUT FORMAT (JSON only):
{
  "title": "Compelling title for this week (e.g., 'A Week of Discovery and Giggles')",
  "intro": "Opening paragraph (2-3 sentences) setting the scene",
  "narrative": "Main narrative (4-6 paragraphs, 400-600 words). Write in past tense. Be chronological. Include milestones, emotions, daily rhythms, and growth moments. Reference media naturally.",
  "closing": "Reflective closing (2-3 sentences). Look back on the week with love and forward to the future.",
  "media_references": [
    {
      "id": "memory_id",
      "reference_text": "Descriptive caption for this media in the narrative",
      "url": "media_url",
      "type": "photo|video|audio"
    }
  ]
}

TONE:
- Warm, loving, reflective
- Literary without being pretentious
- Detailed but not verbose
- Suitable for print/archival
- Should bring parents back to this moment years from now

IMPORTANT:
- Write as if narrating a family history
- Make it deeply personal and specific
- Include sensory details (sounds, sights, feelings)
- Reference milestones with context
- Weave media naturally into the story
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
        content: 'You are an expert memory curator specializing in creating beautiful, literary narratives for family Memory Books. You write with warmth, depth, and attention to detail. Always respond with valid JSON.'
      }, {
        role: 'user',
        content: narrativePrompt
      }],
      temperature: 0.85,  // High creativity for literary narrative
      max_tokens: 2000,
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
    throw new Error('No narrative response from OpenAI')
  }

  try {
    return JSON.parse(narrativeText)
  } catch (parseError) {
    console.error('Failed to parse parent narrative:', narrativeText)
    throw new Error(`Invalid JSON response: ${parseError.message}`)
  }
}
