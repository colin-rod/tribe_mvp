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

// Email Distribution Types
export interface DistributeEmailRequest {
  update_id: string
  recipient_ids: string[]
}

export interface DistributeEmailResponse {
  success: boolean
  delivery_jobs?: DeliveryJobInfo[]
  error?: string
}

export interface DeliveryJobInfo {
  id: string
  recipient_id: string
  status: 'queued' | 'sent' | 'delivered' | 'failed'
  external_id?: string
  error_message?: string
}

export interface EmailTemplateData {
  recipient_name: string
  relationship: string
  child_name: string
  child_age: string
  content?: string
  milestone_type?: string
  media_urls?: string[]
  reply_to_address: string
  update_id: string
}

export interface SendGridWebhookEvent {
  email: string
  timestamp: number
  event: 'delivered' | 'bounce' | 'dropped' | 'processed' | 'deferred' | 'open' | 'click' | 'spamreport' | 'unsubscribe' | 'group_unsubscribe' | 'group_resubscribe'
  sg_event_id?: string
  sg_message_id?: string
  useragent?: string
  ip?: string
  url?: string
  reason?: string
  status?: string
  response?: string
  attempt?: string
  category?: string[]
  asm_group_id?: number
}

export interface UpdateWithDetails {
  id: string
  content?: string
  milestone_type?: string
  media_urls?: string[]
  created_at: string
  child: {
    id: string
    name: string
    birth_date: string
    profile_photo_url?: string
  }
  parent: {
    id: string
    name: string
    email: string
  }
}

export interface RecipientWithDetails {
  id: string
  name: string
  email?: string
  relationship: string
  frequency: string
  preferred_channels: string[]
  is_active: boolean
}

// Email Webhook Types
export interface InboundEmail {
  to: string
  from: string
  subject: string
  text: string
  html: string
  attachments: number
  attachment_info: Record<string, AttachmentInfo>
  envelope: string
  charsets: string
  SPF: string
  dkim?: string
  'message-id'?: string
  'in-reply-to'?: string
  references?: string
}

export interface AttachmentInfo {
  filename: string
  name: string
  type: string
  content: string // base64 encoded
  'content-id'?: string
  size?: number
}

export interface EmailProcessingResult {
  success: boolean
  type: 'memory' | 'response' | 'unknown'
  entity_id?: string // update_id for responses, parent_id for memory emails
  error?: string
}

export interface MemoryEmailData {
  sender_email: string
  parent_id: string
  child_id?: string
  child_name?: string
  content: string
  media_urls: string[]
  raw_subject: string
}

export interface ResponseEmailData {
  sender_email: string
  update_id: string
  recipient_id: string
  content: string
  media_urls: string[]
  message_id: string
}