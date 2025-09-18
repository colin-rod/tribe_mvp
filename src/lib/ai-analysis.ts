// AI Analysis API helper for frontend integration
import { createClient } from '@/lib/supabase/client'
import type { AIAnalysisRequest, AIAnalysisResponse } from '@/lib/types/ai-analysis'

/**
 * Analyze update content using AI and get recipient suggestions
 * @param request - Update analysis request data
 * @returns Promise<AIAnalysisResponse> - Analysis results and recipient suggestions
 */
export async function analyzeUpdate(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const supabase = createClient()

  try {
    // Get the current user to include parent_id
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    // Add parent_id to the request
    const requestWithParentId = {
      ...request,
      parent_id: user.id
    }

    const { data, error } = await supabase.functions.invoke('ai-analyze-update', {
      body: requestWithParentId
    })

    if (error) {
      throw new Error(`AI Analysis failed: ${error.message}`)
    }

    return data as AIAnalysisResponse
  } catch (error) {
    console.error('AI Analysis error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Example usage:
 *
 * const analysisRequest: AIAnalysisRequest = {
 *   update_id: "123e4567-e89b-12d3-a456-426614174000",
 *   content: "Emma took her first steps today! So proud of our little walker!",
 *   child_age_months: 13,
 *   milestone_type: "first_steps"
 * }
 *
 * const result = await analyzeUpdate(analysisRequest)
 *
 * if (result.success) {
 *   console.log('Analysis:', result.analysis)
 *   console.log('Suggested recipients:', result.suggested_recipients)
 * } else {
 *   console.error('Error:', result.error)
 * }
 */