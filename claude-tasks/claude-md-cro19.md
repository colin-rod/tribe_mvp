# CRO-19: AI Analysis Edge Function

## Issue URL
https://linear.app/crod/issue/CRO-19/phase-23-ai-analysis-edge-function

## Agents Required
- `api-developer` (Primary)
- `supabase-developer` (Supporting)

## Dependencies
- **CRO-18**: Supabase Project Setup & Database Schema (COMPLETE)
- **CRO-20**: Next.js Project Setup & Authentication (COMPLETE) 
- **CRO-21**: Child Management System (COMPLETE)
- **CRO-22**: Recipient & Group Management (COMPLETE)

## Objective
Create and deploy the AI Analysis Edge Function using GPT-4o-mini to analyze update content and suggest appropriate recipients.

## Context
When parents create updates, the AI will analyze the content (text, milestone type, child age) and suggest which recipients should receive the update. This helps automate the distribution process while giving parents final control.

## Environment Variables Required
```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Supabase (already configured)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Tasks

### 1. Supabase CLI Setup
- [ ] Install Supabase CLI locally
- [ ] Initialize Supabase project connection
- [ ] Configure CLI with project credentials
- [ ] Test local development environment

### 2. Edge Function Development
- [ ] Create `ai-analyze-update` Edge Function
- [ ] Implement GPT-4o-mini integration
- [ ] Add content analysis logic
- [ ] Create recipient suggestion algorithm
- [ ] Add error handling and validation

### 3. Shared Utilities
- [ ] Create CORS helper for Edge Functions
- [ ] Add common validation utilities
- [ ] Create response formatting helpers
- [ ] Add logging and monitoring utilities

### 4. Testing and Deployment
- [ ] Test function locally with Supabase CLI
- [ ] Deploy function to Supabase
- [ ] Configure OpenAI API key in Supabase secrets
- [ ] Test deployed function with real data

### 5. Frontend Integration Preparation
- [ ] Document API contract for frontend
- [ ] Create TypeScript types for responses
- [ ] Add error handling patterns
- [ ] Test integration endpoints

## Edge Function Implementation

### Function Structure
```
supabase/functions/
├── _shared/
│   ├── cors.ts
│   ├── validation.ts
│   └── types.ts
└── ai-analyze-update/
    └── index.ts
```

### Main Function - `ai-analyze-update/index.ts`
```typescript
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
```

### Shared CORS Helper - `_shared/cors.ts`
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
```

### Validation Utilities - `_shared/validation.ts`
```typescript
export function validateAnalyzeRequest(data: any): boolean {
  return (
    typeof data.update_id === 'string' &&
    typeof data.content === 'string' &&
    typeof data.parent_id === 'string' &&
    typeof data.child_age_months === 'number' &&
    data.child_age_months >= 0 &&
    data.child_age_months <= 216 // Max 18 years
  )
}

export function sanitizeContent(content: string): string {
  // Remove any potentially harmful content
  return content
    .trim()
    .substring(0, 2000) // Limit length
    .replace(/<[^>]*>/g, '') // Remove HTML tags
}
```

### TypeScript Types - `_shared/types.ts`
```typescript
export interface AnalyzeUpdateRequest {
  update_id: string
  content: string
  child_age_months: number
  milestone_type?: string
  parent_id: string
}

export interface AIAnalysisResponse {
  keywords: string[]
  emotional_tone: string
  importance_level: number
  suggested_recipient_types: string[]
  confidence_score: number
}

export interface AnalyzeUpdateResponse {
  success: boolean
  analysis?: AIAnalysisResponse
  suggested_recipients?: string[]
  error?: string
}
```

## CLI Setup and Deployment

### Initialize Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to existing project
supabase link --project-ref your-project-id

# Initialize functions
supabase functions new ai-analyze-update
```

### Local Development
```bash
# Start local Supabase (with Docker)
supabase start

# Serve functions locally
supabase functions serve ai-analyze-update --env-file .env.local

# Test function locally
curl -X POST 'http://localhost:54321/functions/v1/ai-analyze-update' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "update_id": "test-uuid",
    "content": "Emma took her first steps today! So proud of our little walker!",
    "child_age_months": 13,
    "milestone_type": "first_steps",
    "parent_id": "test-parent-uuid"
  }'
```

### Deployment
```bash
# Deploy function
supabase functions deploy ai-analyze-update

# Set secrets
supabase secrets set OPENAI_API_KEY=your-openai-api-key

# Verify deployment
supabase functions list
```

## Frontend Integration Types

### TypeScript Definitions for Frontend
```typescript
// src/lib/types/ai-analysis.ts
export interface AIAnalysisRequest {
  update_id: string
  content: string
  child_age_months: number
  milestone_type?: string
}

export interface AIAnalysisResult {
  keywords: string[]
  emotional_tone: 'excited' | 'proud' | 'happy' | 'concerned' | 'milestone' | 'routine' | 'funny'
  importance_level: number
  suggested_recipient_types: string[]
  confidence_score: number
}

export interface AIAnalysisResponse {
  success: boolean
  analysis?: AIAnalysisResult
  suggested_recipients?: string[]
  error?: string
}
```

### Frontend API Call Helper
```typescript
// src/lib/ai-analysis.ts
import { createClient } from '@/lib/supabase/client'

export async function analyzeUpdate(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const supabase = createClient()
  
  const { data, error } = await supabase.functions.invoke('ai-analyze-update', {
    body: request
  })
  
  if (error) {
    throw new Error(`AI Analysis failed: ${error.message}`)
  }
  
  return data
}
```

## Testing Strategy

### Local Testing
```bash
# Test with valid request
curl -X POST 'http://localhost:54321/functions/v1/ai-analyze-update' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "update_id": "123e4567-e89b-12d3-a456-426614174000",
    "content": "Baby said mama for the first time!",
    "child_age_months": 8,
    "milestone_type": "first_words",
    "parent_id": "123e4567-e89b-12d3-a456-426614174001"
  }'

# Test with missing fields
curl -X POST 'http://localhost:54321/functions/v1/ai-analyze-update' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{"update_id": "123"}'

# Test CORS
curl -X OPTIONS 'http://localhost:54321/functions/v1/ai-analyze-update'
```

### Edge Cases to Test
- Empty content string
- Very long content (>2000 characters)
- Invalid milestone types
- Child age out of reasonable range
- Network errors from OpenAI
- Invalid OpenAI responses
- Missing recipients in database

## Security Considerations

### Input Validation
- Sanitize all text content
- Validate UUIDs format
- Check age ranges are reasonable
- Rate limiting on OpenAI calls

### Authentication
- Verify parent_id matches authenticated user
- Use service role key for database updates
- Validate update ownership before analysis

### Error Handling
- Never expose OpenAI API key in errors
- Log security violations
- Handle OpenAI rate limits gracefully
- Provide meaningful error messages

## Success Criteria
- [ ] ✅ Edge Function deployed successfully to Supabase
- [ ] ✅ GPT-4o-mini integration working with proper error handling
- [ ] ✅ Returns structured JSON analysis with required fields
- [ ] ✅ Function handles errors without crashing
- [ ] ✅ Local and remote testing passes with various inputs
- [ ] ✅ OpenAI API key configured securely in Supabase secrets
- [ ] ✅ Database updates work correctly with RLS policies
- [ ] ✅ Recipient suggestions are relevant and accurate
- [ ] ✅ CORS headers configured for frontend integration

## Monitoring and Debugging

### Logging
```typescript
// Add to function for production monitoring
console.log('AI Analysis request:', {
  update_id: requestData.update_id,
  content_length: requestData.content.length,
  child_age: requestData.child_age_months,
  milestone: requestData.milestone_type
})

console.log('AI Analysis result:', {
  keywords_count: analysis.keywords.length,
  importance: analysis.importance_level,
  suggestions_count: suggestedRecipients.length,
  confidence: analysis.confidence_score
})
```

### Error Monitoring
- Check Supabase function logs regularly
- Monitor OpenAI API usage and rate limits
- Alert on high error rates
- Track analysis accuracy over time

## Next Steps After Completion
- Ready for CRO-23 (Update Creation & AI Integration)
- AI analysis prepared for frontend integration
- Foundation set for intelligent content distribution