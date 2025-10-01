// DistributionStatus type available from validation/update if needed

/**
 * Digest status workflow:
 * compiling → ready → approved → sending → sent | failed
 */
export type DigestStatus = 'compiling' | 'ready' | 'approved' | 'sending' | 'sent' | 'failed'

/**
 * Main digest entity
 */
export interface Digest {
  id: string
  parent_id: string
  title: string
  digest_date: string  // ISO date
  date_range_start: string  // ISO date
  date_range_end: string  // ISO date
  status: DigestStatus
  ai_compilation_data: AICompilationData
  recipient_breakdown: RecipientBreakdown
  parent_narrative?: ParentDigestNarrative  // CRO-267: AI-generated parent-facing narrative
  total_updates: number
  total_recipients: number
  sent_count: number
  failed_count: number
  compiled_at?: string
  approved_at?: string
  sent_at?: string
  created_at: string
  updated_at: string
}

/**
 * AI compilation metadata stored in digest
 */
export interface AICompilationData {
  digest_theme?: string  // e.g., "Emma's First Steps Week"
  dominant_emotions?: string[]  // e.g., ["excited", "proud"]
  key_milestones?: string[]  // e.g., ["first_steps", "first_words"]
  update_groupings?: UpdateGrouping[]  // How AI grouped updates
  compilation_rationale?: string  // AI's reasoning
  model_used?: string  // e.g., "gpt-4o"
  compilation_duration_ms?: number
}

/**
 * How AI grouped related updates
 */
export interface UpdateGrouping {
  theme: string  // e.g., "Learning to Walk"
  update_ids: string[]
  rationale: string
}

/**
 * Per-recipient digest summary
 */
export interface RecipientBreakdown {
  [recipient_id: string]: {
    recipient_name: string
    relationship: string
    update_count: number
    customized: boolean  // User modified from AI suggestions
    rationale?: string  // Why these updates for this person
  }
}

/**
 * Junction table: links updates to digests for specific recipients
 */
export interface DigestUpdate {
  id: string
  digest_id: string
  update_id: string
  recipient_id: string
  included: boolean
  display_order: number
  custom_caption?: string
  custom_subject?: string
  ai_rationale: AIInclusionRationale
  narrative_data?: DigestNarrative  // CRO-267: AI-generated recipient-facing narrative
  created_at: string
  updated_at: string
}

/**
 * AI's reasoning for including update in recipient's digest
 */
export interface AIInclusionRationale {
  importance_match?: number  // 0-1 score
  relationship_relevance?: string  // Why relevant to this relationship
  content_preference_match?: boolean  // Matches recipient's content prefs
  reasoning?: string  // Human-readable explanation
}

/**
 * Media reference in AI-generated narrative
 */
export interface MediaReference {
  id: string // update_id
  reference_text: string // Natural sentence referencing the media
  url: string
  type: 'photo' | 'video' | 'audio'
}

/**
 * Recipient-facing digest narrative (CRO-267)
 * AI-generated warm, personalized narrative for email/SMS/WhatsApp
 */
export interface DigestNarrative {
  intro: string // Short warm greeting
  narrative: string // Coherent, engaging narrative weaving updates together
  closing: string // Short warm closing
  media_references: MediaReference[] // Media embedded naturally in narrative
}

/**
 * Parent-facing digest narrative (CRO-267)
 * AI-generated detailed, chronological narrative for print/archival
 */
export interface ParentDigestNarrative {
  title: string // e.g., "Liam's September Highlights"
  intro: string // Welcoming paragraph
  narrative: string // Detailed chronological narrative
  closing: string // Warm closing message
  media_references: MediaReference[] // All media with descriptions
}

/**
 * Request to compile a new digest
 */
export interface CompileDigestRequest {
  parent_id: string
  date_range_start: string  // ISO date
  date_range_end: string  // ISO date
  auto_approve?: boolean  // Skip review step
  title?: string  // Optional custom title
}

/**
 * Response from digest compilation
 */
export interface CompileDigestResponse {
  success: boolean
  digest?: Digest
  preview_data?: DigestPreviewData
  error?: string
}

/**
 * Complete preview data for digest review
 */
export interface DigestPreviewData {
  digest: Digest
  recipients: RecipientDigestPreview[]
}

/**
 * What one recipient will receive
 */
export interface RecipientDigestPreview {
  recipient_id: string
  recipient_name: string
  recipient_email: string
  relationship: string
  frequency_preference: string
  updates: UpdateInDigest[]
  narrative?: DigestNarrative  // CRO-267: AI-generated narrative for this recipient
  email_subject: string
  email_preview_html: string
  ai_rationale: string  // Why these updates for this person
  customizations_made: number  // Count of user edits
}

/**
 * Update as it appears in a digest
 */
export interface UpdateInDigest {
  update_id: string
  content: string
  subject?: string
  rich_content?: Record<string, unknown>
  content_format: string
  media_urls: string[]
  child_name: string
  child_age: string
  milestone_type?: string
  created_at: string
  display_order: number
  custom_caption?: string
  ai_rationale?: AIInclusionRationale
  can_edit: boolean
  can_remove: boolean
  can_reorder: boolean
}

/**
 * Request to customize digest for recipient
 */
export interface CustomizeDigestRequest {
  digest_id: string
  recipient_id: string
  updates: DigestUpdateCustomization[]
}

/**
 * Customization for single update in digest
 */
export interface DigestUpdateCustomization {
  update_id: string
  included: boolean
  display_order?: number
  custom_caption?: string
  custom_subject?: string
}

/**
 * Request to approve and send digest
 */
export interface ApproveDigestRequest {
  digest_id: string
  send_immediately: boolean
  scheduled_for?: string  // ISO timestamp if scheduling
}

/**
 * Statistics for digest dashboard
 */
export interface DigestStats {
  total_digests: number
  sent_this_month: number
  pending_review: number  // Status: ready
  average_updates_per_digest: number
  average_recipients_per_digest: number
  last_sent_at?: string
}

/**
 * Draft-specific update fields
 */
export interface DraftUpdate {
  id: string
  parent_id: string
  child_id: string
  content: string
  subject?: string
  rich_content?: Record<string, unknown>
  content_format: 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp'
  media_urls: string[]
  milestone_type?: string
  distribution_status: 'draft' | 'ready'
  version: number
  edit_count: number
  last_edited_at: string
  created_at: string
  updated_at: string
}

/**
 * Request to create/update draft
 */
export interface DraftUpdateRequest {
  child_id: string
  content?: string
  subject?: string
  rich_content?: Record<string, unknown>
  content_format?: 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp'
  media_urls?: string[]
  milestone_type?: string
}

/**
 * Draft workspace summary
 */
export interface DraftWorkspaceSummary {
  total_drafts: number
  draft_count: number  // Status: draft
  ready_count: number  // Status: ready
  oldest_draft_date?: string
  can_compile_digest: boolean  // True if >= 1 ready update
  children_with_drafts: ChildDraftSummary[]
}

/**
 * Per-child draft summary
 */
export interface ChildDraftSummary {
  child_id: string
  child_name: string
  child_avatar?: string
  draft_count: number
  ready_count: number
  latest_draft_date: string
}

/**
 * Filter options for draft workspace
 */
export interface DraftFilters {
  status?: 'draft' | 'ready' | 'all'
  child_id?: string
  date_range?: {
    start: string
    end: string
  }
  has_media?: boolean
  has_milestone?: boolean
}

/**
 * Digest compilation progress (for real-time updates)
 */
export interface DigestCompilationProgress {
  digest_id: string
  status: 'analyzing_updates' | 'analyzing_recipients' | 'calling_ai' | 'processing_results' | 'complete' | 'error'
  progress_percent: number
  current_step: string
  updates_processed: number
  total_updates: number
  recipients_processed: number
  total_recipients: number
  error?: string
}

/**
 * Digest sending progress (for real-time updates)
 */
export interface DigestSendingProgress {
  digest_id: string
  status: 'preparing' | 'sending' | 'complete' | 'failed'
  sent_count: number
  failed_count: number
  total_count: number
  current_recipient?: string
  errors?: Array<{
    recipient_id: string
    recipient_name: string
    error: string
  }>
}