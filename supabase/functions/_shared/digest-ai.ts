/**
 * AI Narrative Generation for Digests
 * Implements the two-AI workflow from CRO-267:
 * 1. Recipient-Facing AI: Warm, personalized narratives for email/SMS/WhatsApp
 * 2. Parent-Facing AI: Detailed, chronological narratives for print/archival
 */

const openAiApiKey = Deno.env.get('OPENAI_API_KEY')

/**
 * Update with full context for AI narrative generation
 */
export interface UpdateForNarrative {
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
  id: string // update_id
  reference_text: string // Natural sentence referencing the media
  url: string
  type: 'photo' | 'video' | 'audio'
}

/**
 * Recipient-facing digest narrative (email/SMS/WhatsApp)
 */
export interface RecipientDigestNarrative {
  intro: string
  narrative: string
  closing: string
  media_references: MediaReference[]
}

/**
 * Parent-facing digest narrative (print/archival)
 */
export interface ParentDigestNarrative {
  title: string
  intro: string
  narrative: string
  closing: string
  media_references: MediaReference[]
}

/**
 * Generate warm, personalized narrative for recipient
 * Optimized for email/SMS/WhatsApp delivery
 */
export async function generateRecipientDigestNarrative(
  recipient: RecipientContext,
  updates: UpdateForNarrative[]
): Promise<RecipientDigestNarrative> {

  if (!openAiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  if (updates.length === 0) {
    // Return empty narrative for recipients with no updates
    return {
      intro: '',
      narrative: '',
      closing: '',
      media_references: []
    }
  }

  // Prepare updates in the format specified in CRO-267
  const updatesBatch = updates.map(u => ({
    id: u.id,
    timestamp: u.timestamp,
    type: u.type,
    content: u.content || null,
    url: u.url || null,
    caption: u.caption || null,
    milestone: u.milestone
  }))

  const toneGuidance = recipient.preferences.tone || 'warm and loving'
  const lengthGuidance = recipient.preferences.max_length === 'short'
    ? 'Keep narrative concise (2-3 paragraphs max).'
    : recipient.preferences.max_length === 'long'
    ? 'Provide detailed narrative (4-6 paragraphs).'
    : 'Keep narrative moderate length (3-4 paragraphs).'

  const systemPrompt = `You are a helpful assistant that writes warm, emotional, and engaging family digest messages.

You receive a batch of updates about a child or family, along with recipient preferences.

You must create a coherent narrative in JSON format. Always personalize for the recipient (e.g., grandparents get simple, loving phrasing).

Reference media in the narrative when it adds value, but do not repeat every media item mechanically.

Output only valid JSON.`

  const userPrompt = `Here are the updates for this digest:

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

Please return a structured JSON with the following fields:

- intro: A short warm greeting addressed to ${recipient.name}.
- narrative: A coherent, engaging, emotionally warm narrative that weaves together the updates. ${lengthGuidance}
- closing: A short warm closing message.
- media_references: An array where each item includes:
  - id: the update id
  - reference_text: one short sentence referencing the media naturally
  - url: the media link
  - type: "photo", "video", or "audio"

Rules:
- Do not invent facts. Only use the given updates.
- Summarize naturally, not mechanically listing items.
- Reference media selectively where it enhances the story.
- Use a ${toneGuidance} tone throughout.
- Address the recipient as "${recipient.name}" (${recipient.relationship}).
- If no updates are present, return an empty JSON object {}.`

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

    // Validate structure
    if (!narrative.intro && !narrative.narrative && !narrative.closing) {
      throw new Error('Invalid narrative structure from AI')
    }

    // Ensure media_references is an array
    if (!narrative.media_references) {
      narrative.media_references = []
    }

    return narrative
  } catch (error) {
    console.error('Failed to generate recipient narrative:', error)

    // Fallback: generate simple narrative from updates
    return generateFallbackRecipientNarrative(recipient, updates)
  }
}

/**
 * Generate detailed, chronological narrative for parent (print/archival)
 */
export async function generateParentDigestNarrative(
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

  // Prepare updates batch
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

  const systemPrompt = `You are a helpful assistant that compiles a full family digest for parents.

You receive a batch of updates (text, photos, audio, videos, milestones) about their child/family.

You must create a detailed, chronological narrative in JSON format suitable for print or archival.

Always be warm, emotionally engaging, and celebratory.

Reference media thoughtfully, but keep text clear and flowing.

Output only valid JSON.`

  const userPrompt = `Here are the updates for this digest:

${JSON.stringify({
  child_name: childName,
  date_range: {
    start: dateRangeStart,
    end: dateRangeEnd
  },
  updates: updatesBatch
}, null, 2)}

Please return a structured JSON with the following fields:

- title: A short title for this digest (e.g., "${childName}'s September Highlights").
- intro: A welcoming paragraph introducing the digest.
- narrative: A detailed, chronological narrative weaving together all updates.
- closing: A short warm closing message from the family.
- media_references: An array where each item includes:
  - id: the update id
  - reference_text: a sentence describing the media for inclusion in print
  - url: the media link
  - type: "photo", "video", or "audio"

Rules:
- Do not invent facts. Only use the given updates.
- Make the narrative suitable for printing (e.g., in a family memory book).
- Maintain chronological order of updates.
- Use warm, emotionally engaging language.
- If no updates are present, return an empty JSON object {}.`

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

    // Validate structure
    if (!narrative.title || !narrative.narrative) {
      throw new Error('Invalid parent narrative structure from AI')
    }

    // Ensure media_references is an array
    if (!narrative.media_references) {
      narrative.media_references = []
    }

    return narrative
  } catch (error) {
    console.error('Failed to generate parent narrative:', error)

    // Fallback: generate simple narrative from updates
    return generateFallbackParentNarrative(updates, childName, dateRangeStart, dateRangeEnd)
  }
}

/**
 * Fallback narrative generator when AI fails
 */
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

/**
 * Fallback parent narrative when AI fails
 */
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

  updates.forEach((update, index) => {
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
