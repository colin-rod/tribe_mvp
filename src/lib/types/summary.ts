/**
 * Summary status workflow:
 * compiling → ready → approved → sending → sent | failed
 */
export type SummaryStatus = 'compiling' | 'ready' | 'approved' | 'sending' | 'sent' | 'failed'

/**
 * Render style for recipient experience
 * Content-based switching: 3+ photos = gallery, <3 photos = narrative
 */
export type RenderStyle = 'gallery' | 'narrative'

/**
 * Main summary entity (weekly Memory Book page)
 */
export interface Summary {
  id: string
  parent_id: string
  title: string
  digest_date: string  // ISO date (keeping column name for DB compatibility)
  date_range_start: string  // ISO date
  date_range_end: string  // ISO date
  status: SummaryStatus
  ai_compilation_data: AICompilationData
  recipient_breakdown: RecipientBreakdown
  parent_narrative?: ParentSummaryNarrative  // AI-generated parent-facing narrative for Memory Book
  total_updates: number  // Total memories in this summary
  total_recipients: number
  sent_count: number
  failed_count: number
  compiled_at?: string
  approved_at?: string
  sent_at?: string
  auto_publish_hours: number  // Hours to wait before auto-publish (default 168 = 7 days)
  last_reminder_sent_at?: string  // Last reminder notification timestamp
  reminder_count: number  // Number of reminders sent (max 2: 48hr and 24hr)
  created_at: string
  updated_at: string
}

/**
 * AI compilation metadata stored in summary
 */
export interface AICompilationData {
  summary_theme?: string  // e.g., "Emma's First Steps Week"
  dominant_emotions?: string[]  // e.g., ["excited", "proud"]
  key_milestones?: string[]  // e.g., ["first_steps", "first_words"]
  memory_groupings?: MemoryGrouping[]  // How AI grouped memories
  compilation_rationale?: string  // AI's reasoning
  model_used?: string  // e.g., "gpt-4o"
  compilation_duration_ms?: number
}

/**
 * How AI grouped related memories
 */
export interface MemoryGrouping {
  theme: string  // e.g., "Learning to Walk"
  memory_ids: string[]
  rationale: string
}

/**
 * Per-recipient summary breakdown
 */
export interface RecipientBreakdown {
  [recipient_id: string]: {
    recipient_name: string
    relationship: string
    memory_count: number
    customized: boolean  // User modified from AI suggestions
    rationale?: string  // Why these memories for this person
  }
}

/**
 * Junction table: links memories to summaries for specific recipients
 */
export interface SummaryMemory {
  id: string
  summary_id: string
  memory_id: string
  recipient_id: string
  included: boolean
  display_order: number
  custom_caption?: string
  custom_subject?: string
  ai_rationale: AIInclusionRationale
  narrative_data?: SummaryNarrative  // AI-generated recipient-facing narrative
  photo_count: number  // Number of photos in this memory
  render_style: RenderStyle  // 'gallery' (3+ photos) or 'narrative' (<3 photos)
  created_at: string
  updated_at: string
}

/**
 * AI's reasoning for including memory in recipient's summary
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
  id: string // memory_id
  reference_text: string // Natural sentence referencing the media
  url: string
  type: 'photo' | 'video' | 'audio'
}

/**
 * Recipient-facing summary narrative
 * AI-generated warm, personalized narrative for email/SMS/WhatsApp
 * Content-based switching: used when <3 photos (narrative style)
 */
export interface SummaryNarrative {
  intro: string // Short warm greeting
  narrative: string // Coherent, engaging narrative weaving memories together
  closing: string // Short warm closing
  media_references: MediaReference[] // Media embedded naturally in narrative
}

/**
 * Parent-facing summary narrative (Memory Book page)
 * AI-generated detailed, chronological narrative for print/archival
 */
export interface ParentSummaryNarrative {
  title: string // e.g., "Liam's September Highlights"
  intro: string // Welcoming paragraph
  narrative: string // Detailed chronological narrative
  closing: string // Warm closing message
  media_references: MediaReference[] // All media with descriptions
}

/**
 * Request to compile a new summary
 */
export interface CompileSummaryRequest {
  parent_id: string
  date_range_start: string  // ISO date
  date_range_end: string  // ISO date
  auto_approve?: boolean  // Skip review step
  title?: string  // Optional custom title
  auto_publish_hours?: number  // Custom auto-publish window (default 168)
}

/**
 * Response from summary compilation
 */
export interface CompileSummaryResponse {
  success: boolean
  summary?: Summary
  preview_data?: SummaryPreviewData
  error?: string
}

/**
 * Complete preview data for summary review
 */
export interface SummaryPreviewData {
  summary: Summary
  recipients: RecipientSummaryPreview[]
}

/**
 * What one recipient will receive
 */
export interface RecipientSummaryPreview {
  recipient_id: string
  recipient_name: string
  recipient_email: string
  relationship: string
  frequency_preference: string
  memories: MemoryInSummary[]
  narrative?: SummaryNarrative  // AI-generated narrative (if <3 photos)
  render_style: RenderStyle  // 'gallery' or 'narrative' based on photo count
  email_subject: string
  email_preview_html: string
  ai_rationale: string  // Why these memories for this person
  customizations_made: number  // Count of user edits
}

/**
 * Memory as it appears in a summary
 */
export interface MemoryInSummary {
  memory_id: string
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
 * Request to customize summary for recipient
 */
export interface CustomizeSummaryRequest {
  summary_id: string
  recipient_id: string
  memories: SummaryMemoryCustomization[]
}

/**
 * Customization for single memory in summary
 */
export interface SummaryMemoryCustomization {
  memory_id: string
  included: boolean
  display_order?: number
  custom_caption?: string
  custom_subject?: string
}

/**
 * Request to approve and send summary
 */
export interface ApproveSummaryRequest {
  summary_id: string
  send_immediately: boolean
  scheduled_for?: string  // ISO timestamp if scheduling
}

/**
 * Statistics for summary dashboard
 */
export interface SummaryStats {
  total_summaries: number
  sent_this_month: number
  pending_review: number  // Status: ready
  average_memories_per_summary: number
  average_recipients_per_summary: number
  last_sent_at?: string
}

/**
 * Summary compilation progress (for real-time updates)
 */
export interface SummaryCompilationProgress {
  summary_id: string
  status: 'analyzing_memories' | 'analyzing_recipients' | 'calling_ai' | 'processing_results' | 'complete' | 'error'
  progress_percent: number
  current_step: string
  memories_processed: number
  total_memories: number
  recipients_processed: number
  total_recipients: number
  error?: string
}

/**
 * Summary sending progress (for real-time updates)
 */
export interface SummarySendingProgress {
  summary_id: string
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

/**
 * Auto-publish reminder notification data
 */
export interface AutoPublishReminder {
  summary_id: string
  parent_id: string
  hours_remaining: number
  reminder_type: '48hr' | '24hr'
  summary_title: string
  memory_count: number
  recipient_count: number
}
