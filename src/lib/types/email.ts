export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface EmailOptions {
  to: string
  from?: string
  fromName?: string
  replyTo?: string
  subject: string
  html: string
  text: string
  templateData?: Record<string, unknown>
  categories?: string[]
  customArgs?: Record<string, string>
}

export interface EmailDeliveryResult {
  success: boolean
  messageId?: string
  error?: string
  statusCode?: number
}
