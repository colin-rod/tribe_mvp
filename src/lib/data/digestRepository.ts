import type { Json } from '@/lib/types/database'
import type { Digest } from '@/lib/types/digest'
import type { SupabaseClientType } from './supabaseClient'

export type DigestRecord = Digest

export interface DigestPreviewRecipient {
  id: string
  name: string
  email: string
  relationship: string
  frequency: string | null
}

export interface DigestPreviewChild {
  name: string | null
  birth_date: string | null
  profile_photo_url: string | null
}

export interface DigestPreviewUpdate {
  id: string
  content: string | null
  subject: string | null
  rich_content: Record<string, unknown> | null
  content_format: string | null
  media_urls: string[] | null
  milestone_type: string | null
  created_at: string | null
  display_order: number | null
  child_id: string | null
  children: DigestPreviewChild | null
}

export interface DigestPreviewRow {
  id: string
  digest_id: string
  recipient_id: string
  update_id: string
  included: boolean | null
  display_order: number | null
  custom_caption: string | null
  custom_subject: string | null
  narrative_data: Json | null
  ai_rationale: Json | null
  recipients: DigestPreviewRecipient | null
  updates: DigestPreviewUpdate | null
}

export type DigestListResult = DigestRecord[]

/**
 * Fetches a digest for the provided user. Returns null when the digest
 * does not exist or the user does not have access.
 */
export async function fetchDigestById(
  supabase: SupabaseClientType,
  digestId: string,
  userId: string
): Promise<DigestRecord | null> {
  const { data, error } = await supabase
    .from('summaries')
    .select('*')
    .eq('id', digestId)
    .eq('parent_id', userId)
    .single()

  if (error) {
    if ('code' in error && error.code === 'PGRST116') {
      return null
    }

    throw new Error(`Failed to fetch summary: ${error.message}`)
  }

  return data as unknown as DigestRecord
}

/**
 * Ensures the digest exists for the provided user, throwing a consistent
 * error message when it does not.
 */
export async function requireDigestOwnership(
  supabase: SupabaseClientType,
  digestId: string,
  userId: string
): Promise<DigestRecord> {
  const digest = await fetchDigestById(supabase, digestId, userId)

  if (!digest) {
    throw new Error('Summary not found or access denied')
  }

  return digest
}

/**
 * Retrieves the joined preview data for a digest, including update and
 * recipient records ordered consistently for rendering.
 */
export async function fetchDigestPreviewRows(
  supabase: SupabaseClientType,
  digestId: string
): Promise<DigestPreviewRow[]> {
  const { data, error } = await supabase
    .from('summary_memories')
    .select(`
      *,
      updates:update_id (
        *,
        children:child_id (
          name,
          birth_date,
          profile_photo_url
        )
      ),
      recipients:recipient_id (
        id,
        name,
        email,
        relationship,
        frequency
      )
    `)
    .eq('digest_id', digestId)
    .order('recipient_id')
    .order('display_order')

  if (error) {
    throw new Error(`Failed to fetch summary memories: ${error.message}`)
  }

  return (data ?? []) as unknown as DigestPreviewRow[]
}

/**
 * Lists digests for a user ordered from newest to oldest.
 */
export async function fetchDigestsForUser(
  supabase: SupabaseClientType,
  userId: string
): Promise<DigestListResult> {
  const { data, error } = await supabase
    .from('summaries')
    .select('*')
    .eq('parent_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch summaries: ${error.message}`)
  }

  return (data as unknown as DigestListResult) ?? []
}
