// TypeScript definitions for AI Analysis Edge Function

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

// For internal Edge Function use
export interface EdgeFunctionAnalyzeRequest extends AIAnalysisRequest {
  parent_id: string
}

// Recipient data structure returned from database
export interface RecipientData {
  id: string
  name: string
  relationship: 'grandparent' | 'parent' | 'sibling' | 'family' | 'friend'
  frequency: 'every_update' | 'daily_digest' | 'weekly_digest' | 'monthly_digest'
  preferred_channels: string[]
  recipient_groups?: {
    name: string
    default_frequency: string
  }
}