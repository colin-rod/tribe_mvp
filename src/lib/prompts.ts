/**
 * Prompt Suggestions Service
 * Fetches database-driven prompt suggestions for creating updates
 */

import { createClient } from '@/lib/supabase/client';

export interface PromptSuggestion {
  id: string;
  prompt_text: string;
  category: string;
}

/**
 * Fetches a single weighted-random prompt suggestion from the database
 * Uses the get_random_prompt_suggestion() database function
 */
export async function getRandomPromptSuggestion(): Promise<PromptSuggestion | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc('get_random_prompt_suggestion')
    .single();

  if (error) {
    // Silently fail - error handling done at UI level
    return null;
  }

  return data as PromptSuggestion;
}

/**
 * Track when a prompt is displayed to the user
 * Increments the times_shown counter
 */
export async function trackPromptShown(promptId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('track_prompt_shown', {
    prompt_id: promptId,
  });

  if (error) {
    // Silently fail - tracking is non-critical
  }
}

/**
 * Track when a prompt is clicked by the user
 * Increments the times_clicked counter
 */
export async function trackPromptClicked(promptId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('track_prompt_clicked', {
    prompt_id: promptId,
  });

  if (error) {
    // Silently fail - tracking is non-critical
  }
}

/**
 * Fetch prompt analytics (admin use)
 * Returns engagement metrics for all prompts
 */
export async function getPromptAnalytics() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('prompt_analytics')
    .select('*')
    .order('times_shown', { ascending: false });

  if (error) {
    // Return empty array on error - analytics is non-critical
    return [];
  }

  return data;
}
