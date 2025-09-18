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