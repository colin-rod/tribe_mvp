import * as sgMail from '@sendgrid/mail'
import { randomUUID } from 'crypto'
import { createLogger } from '@/lib/logger'
import { getEnv, getFeatureFlags } from '@/lib/env'
import { sanitizeHtml, sanitizeText, emailSchema } from '@/lib/validation/security'
import { z } from 'zod'
import { getEmailQueue, type EmailJobData } from './emailQueue'

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

interface DigestUpdate {
  senderName?: string
  content?: string
  timestamp?: string
}

type TemplateData = Record<string, unknown> & {
  senderName?: string
  updateContent?: string
  babyName?: string
  replyUrl?: string
  promptText?: string
  responseUrl?: string
  period?: string
  unreadCount?: number
  digestUrl?: string
  updates?: DigestUpdate[]
  title?: string
  content?: string
  actionUrl?: string
  actionText?: string
  recipientName?: string
  preferenceUrl?: string
}

type TemplateRecord = Record<string, unknown>

// Zod schemas for template data validation
const digestUpdateSchema = z.object({
  senderName: z.string().max(255).optional(),
  content: z.string().max(10000).optional(),
  timestamp: z.string().max(100).optional()
})

const responseTemplateDataSchema = z.object({
  senderName: z.string().max(255).default('Someone'),
  updateContent: z.string().max(10000).default(''),
  babyName: z.string().max(255).default(''),
  replyUrl: z.string().max(2000).default('#')
})

const promptTemplateDataSchema = z.object({
  promptText: z.string().max(5000).default(''),
  babyName: z.string().max(255).default(''),
  responseUrl: z.string().max(2000).default('#')
})

const digestTemplateDataSchema = z.object({
  updates: z.array(digestUpdateSchema).max(50).default([]),
  period: z.enum(['daily', 'weekly', 'monthly', 'instant']).default('daily'),
  unreadCount: z.number().int().min(0).max(10000).default(0),
  digestUrl: z.string().max(2000).default('#')
})

const systemTemplateDataSchema = z.object({
  title: z.string().max(255).default('System Notification'),
  content: z.string().max(10000).default(''),
  actionUrl: z.string().max(2000).default(''),
  actionText: z.string().max(100).default('View Details')
})

const preferenceTemplateDataSchema = z.object({
  recipientName: z.string().max(255).default(''),
  senderName: z.string().max(255).default(''),
  preferenceUrl: z.string().max(2000).default('#'),
  babyName: z.string().max(255).default('')
})

interface SendGridError extends Error {
  response?: {
    status: number
    body?: {
      errors?: Array<{ message?: string }>
    }
  }
}

/**
 * ServerEmailService - Secure Email Service with XSS Protection
 *
 * Security Features:
 * 1. HTML Entity Escaping: All user inputs are escaped before interpolation into HTML
 * 2. DOMPurify Sanitization: HTML content fields are sanitized using DOMPurify
 * 3. URL Validation: All URLs are validated and dangerous protocols (javascript:, data:) are blocked
 * 4. Input Validation: Zod schemas validate structure and enforce length limits on all template data
 * 5. Email Validation: Comprehensive email address validation with security checks
 *
 * XSS Prevention Strategy:
 * - escapeHtml(): Converts HTML special characters to entities (&, <, >, ", ', /)
 * - sanitizeUrl(): Blocks javascript:, data:, vbscript:, and file: protocols
 * - sanitizeHtml(): Uses DOMPurify with strict configuration for content fields
 * - Zod validation: Enforces type safety and maximum length limits on all inputs
 *
 * Content Security Policy (CSP):
 * - Email templates are static HTML with inline styles only
 * - No external resources, scripts, or dynamic content
 * - CSP headers are set by the application middleware for web pages
 *
 * @see {@link https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html OWASP XSS Prevention}
 */
export class ServerEmailService {
  private initialized = false
  private logger = createLogger('ServerEmailService')
  private useQueue = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    try {
      const env = getEnv()
      const features = getFeatureFlags()

      if (!features.emailEnabled) {
        throw new Error('Email service not properly configured - SENDGRID_API_KEY is required')
      }

      // Redis is now required for production environments
      const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production'
      if (isProduction && !env.REDIS_URL) {
        throw new Error('Redis is required for production - REDIS_URL must be configured')
      }

      this.logger.debug('Initializing SendGrid with API key', {
        hasApiKey: !!env.SENDGRID_API_KEY,
        fromEmail: env.SENDGRID_FROM_EMAIL,
        fromName: env.SENDGRID_FROM_NAME,
        hasRedis: !!env.REDIS_URL,
        environment: process.env.NEXT_PUBLIC_APP_ENV
      })

      sgMail.setApiKey(env.SENDGRID_API_KEY)
      this.initialized = true

      // Enable queue if Redis is available
      if (env.REDIS_URL) {
        this.useQueue = true
        this.logger.info('Email queue enabled - using Redis for reliability')

        // Initialize queue worker
        this.initializeQueueWorker()
      } else {
        // Development mode without Redis - warn but allow
        this.logger.warn('Redis not configured - emails will send synchronously (development only)')
      }

      this.logger.info('ServerEmailService initialized successfully', {
        fromEmail: env.SENDGRID_FROM_EMAIL,
        fromName: env.SENDGRID_FROM_NAME,
        queueEnabled: this.useQueue
      })
    } catch (error) {
      this.logger.errorWithStack('Failed to initialize ServerEmailService', error as Error)
      this.initialized = false
    }
  }

  private async initializeQueueWorker() {
    try {
      const emailQueue = getEmailQueue()

      // Start worker to process emails from the queue
      await emailQueue.startWorker(async (options: EmailOptions) => {
        return await this.sendEmailDirect(options)
      })

      this.logger.info('Email queue worker started successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('Email queue service not available')) {
        this.logger.warn('Email queue unavailable - continuing without background worker')
      } else {
        this.logger.error('Failed to start email queue worker', { error: message })
      }
      // Disable queue if worker fails to start
      this.useQueue = false
    }
  }

  private getDefaultFrom(): { email: string; name?: string } {
    try {
      const env = getEnv()
      return {
        email: env.SENDGRID_FROM_EMAIL,
        name: env.SENDGRID_FROM_NAME
      }
    } catch (error) {
      this.logger.warn('Failed to get validated environment, using fallbacks', { error: (error as Error).message })
      return {
        email: 'updates@colinrodrigues.com',
        name: 'Tribe'
      }
    }
  }

  private generateMessageId(): string {
    return `tribe-${Date.now()}-${randomUUID()}`
  }

  /**
   * Escape HTML entities to prevent XSS in template interpolation
   */
  private escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }

    return text.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char)
  }

  /**
   * Sanitize and escape URL to prevent javascript: and data: protocols
   */
  private sanitizeUrl(url: string): string {
    if (!url) return '#'

    const trimmedUrl = url.trim()
    const lowerUrl = trimmedUrl.toLowerCase()

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
    if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
      return '#'
    }

    // Allow relative URLs and safe absolute URLs
    if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return this.escapeHtml(trimmedUrl)
    }

    return '#'
  }

  /**
   * Sanitize template data to prevent XSS and other security issues
   */
  private sanitizeTemplateData<T extends TemplateRecord>(data: T): T {
    const sanitized: TemplateRecord = {}

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Sanitize string values based on their context
        if (key.toLowerCase().includes('html') || key.toLowerCase().includes('content')) {
          // Allow some HTML in content fields, but sanitize it
          sanitized[key] = sanitizeHtml(value)
        } else {
          // Plain text sanitization for other fields
          sanitized[key] = sanitizeText(value)
        }
      } else if (Array.isArray(value)) {
        // Recursively sanitize array elements
        sanitized[key] = value.map(item => {
          if (typeof item === 'object' && item !== null) {
            return this.sanitizeTemplateData(item as TemplateRecord)
          }
          return typeof item === 'string' ? sanitizeText(item) : item
        })
      } else if (value && typeof value === 'object') {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeTemplateData(value as TemplateRecord)
      } else {
        // Keep other types as-is (numbers, booleans, null)
        sanitized[key] = value
      }
    }

    return sanitized as T
  }

  /**
   * Validate email address with enhanced security checks
   */
  private validateEmailAddress(email: string): boolean {
    try {
      emailSchema.parse(email)
      return true
    } catch (error) {
      this.logger.warn('Email validation failed', { email, error: (error as Error).message })
      return false
    }
  }

  /**
   * Send email with automatic retry logic and error handling
   * Uses queue-based delivery if Redis is available, otherwise sends directly
   */
  async sendEmail(options: EmailOptions): Promise<EmailDeliveryResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Email service not properly initialized'
      }
    }

    // Validate email addresses upfront
    if (!this.validateEmailAddress(options.to)) {
      return {
        success: false,
        error: 'Invalid recipient email address'
      }
    }

    if (options.from && !this.validateEmailAddress(options.from)) {
      return {
        success: false,
        error: 'Invalid sender email address'
      }
    }

    if (options.replyTo && !this.validateEmailAddress(options.replyTo)) {
      return {
        success: false,
        error: 'Invalid reply-to email address'
      }
    }

    // Use queue for reliability if available
    if (this.useQueue) {
      try {
        const emailQueue = getEmailQueue()
        const messageId = this.generateMessageId()

        const jobData: EmailJobData = {
          ...options,
          jobId: messageId
        }

        await emailQueue.addEmail(jobData)

        this.logger.info('Email queued for delivery', {
          to: options.to,
          messageId,
          subject: options.subject
        })

        return {
          success: true,
          messageId,
          statusCode: 202 // Accepted for processing
        }
      } catch (error) {
        this.logger.error('Failed to queue email', {
          error: error instanceof Error ? error.message : String(error),
          to: options.to
        })

        return {
          success: false,
          error: 'Email queue unavailable. Please try again later.',
          statusCode: 503 // Service Unavailable
        }
      }
    }

    // Development mode without queue - send directly but warn
    this.logger.warn('Sending email directly without queue (development only)', {
      to: options.to,
      subject: options.subject
    })
    return await this.sendEmailDirect(options)
  }

  /**
   * Send email directly without queue (used by queue worker)
   */
  private async sendEmailDirect(options: EmailOptions): Promise<EmailDeliveryResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Email service not properly initialized'
      }
    }

    try {
      const defaultFrom = this.getDefaultFrom()
      const messageId = this.generateMessageId()

      // Sanitize email content
      const sanitizedOptions = {
        ...options,
        subject: sanitizeText(options.subject),
        html: sanitizeHtml(options.html),
        text: sanitizeText(options.text)
      }

      const msg = {
        to: sanitizedOptions.to,
        from: {
          email: sanitizedOptions.from || defaultFrom.email,
          name: sanitizeText(sanitizedOptions.fromName || defaultFrom.name || '')
        },
        replyTo: sanitizedOptions.replyTo,
        subject: sanitizedOptions.subject,
        html: sanitizedOptions.html,
        text: sanitizedOptions.text,
        categories: options.categories || ['tribe-notification'],
        customArgs: {
          ...options.customArgs,
          messageId,
          service: 'tribe-mvp'
        },
        headers: {
          'X-Tribe-Message-ID': messageId
        }
      }

      const [response] = await sgMail.send(msg)

      return {
        success: true,
        messageId,
        statusCode: response.statusCode
      }
    } catch (error) {
      this.logger.errorWithStack('SendGrid email error', error as Error, {
        to: options.to,
        subject: options.subject
      })

      let errorMessage = 'Unknown email delivery error'
      let statusCode: number | undefined

      const sendgridError = error as SendGridError

      if (sendgridError.response) {
        statusCode = sendgridError.response.status
        errorMessage = sendgridError.response.body?.errors?.[0]?.message || sendgridError.message
      } else if (sendgridError instanceof Error) {
        errorMessage = sendgridError.message
      }

      return {
        success: false,
        error: errorMessage,
        statusCode
      }
    }
  }

  async sendBulkEmails(emails: EmailOptions[]): Promise<EmailDeliveryResult[]> {
    if (!this.initialized) {
      return emails.map(() => ({
        success: false,
        error: 'Email service not properly initialized'
      }))
    }

    // Use queue for bulk emails if available
    if (this.useQueue) {
      try {
        const emailQueue = getEmailQueue()

        const jobsData: EmailJobData[] = emails.map(email => ({
          ...email,
          jobId: this.generateMessageId()
        }))

        await emailQueue.addBulkEmails(jobsData)

        this.logger.info('Bulk emails queued for delivery', {
          count: emails.length
        })

        return jobsData.map(job => ({
          success: true,
          messageId: job.jobId,
          statusCode: 202 // Accepted for processing
        }))
      } catch (error) {
        this.logger.error('Failed to queue bulk emails', {
          error: error instanceof Error ? error.message : String(error),
          count: emails.length
        })

        return emails.map(() => ({
          success: false,
          error: 'Email queue unavailable. Please try again later.',
          statusCode: 503 // Service Unavailable
        }))
      }
    }

    // Development mode without queue - send directly but warn
    this.logger.warn('Sending bulk emails directly without queue (development only)', {
      count: emails.length
    })

    const results: EmailDeliveryResult[] = []

    // SendGrid recommends sending up to 1000 emails in a single request
    const BATCH_SIZE = 100

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(email => this.sendEmail(email))
      )
      results.push(...batchResults)
    }

    return results
  }

  async sendTemplatedEmail(
    to: string,
    templateType: 'response' | 'prompt' | 'digest' | 'system' | 'preference',
    templateData: TemplateData = {},
    options: Partial<EmailOptions> = {}
  ): Promise<EmailDeliveryResult> {
    // Sanitize template data before processing
    const sanitizedData = this.sanitizeTemplateData(templateData)
    const template = this.getEmailTemplate(templateType, sanitizedData)

    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      categories: [`tribe-${templateType}`, 'tribe-notification'],
      customArgs: {
        templateType,
        ...options.customArgs
      },
      ...options
    })
  }

  getEmailTemplate(
    type: 'response' | 'prompt' | 'digest' | 'system' | 'preference',
    data: TemplateData
  ): EmailTemplate {
    switch (type) {
      case 'response':
        return this.getResponseTemplate(data)
      case 'prompt':
        return this.getPromptTemplate(data)
      case 'digest':
        return this.getDigestTemplate(data)
      case 'system':
        return this.getSystemTemplate(data)
      case 'preference':
        return this.getPreferenceTemplate(data)
      default:
        throw new Error(`Unknown email template type: ${type}`)
    }
  }

  private getResponseTemplate(data: TemplateData): EmailTemplate {
    // Validate and sanitize input data
    const validatedData = responseTemplateDataSchema.parse(data)
    const { senderName, updateContent, babyName, replyUrl } = validatedData

    // Escape all user-controlled values for HTML context
    const escapedSenderName = this.escapeHtml(String(senderName))
    const escapedBabyName = babyName ? this.escapeHtml(String(babyName)) : ''
    const escapedUpdateContent = this.escapeHtml(String(updateContent))
    const safeReplyUrl = this.sanitizeUrl(String(replyUrl))

    return {
      subject: `${escapedSenderName} responded to your update${escapedBabyName ? ` about ${escapedBabyName}` : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Response - Tribe</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">Tribe</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Smart baby update sharing</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937;">New Response</h2>
            <p style="margin: 0 0 10px 0;"><strong>${escapedSenderName}</strong> responded to your update:</p>
            <div style="background: white; border-left: 4px solid #6366f1; padding: 15px; margin: 15px 0; border-radius: 4px;">
              <p style="margin: 0; font-style: italic;">"${escapedUpdateContent}"</p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${safeReplyUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">View Response</a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>You're receiving this because you opted in to response notifications.</p>
            <p><a href="{{{unsubscribe_url}}}" style="color: #6366f1;">Manage preferences</a> • <a href="{{{unsubscribe_url}}}" style="color: #6366f1;">Unsubscribe</a></p>
          </div>
        </body>
        </html>
      `,
      text: `
        New Response - Tribe

        ${escapedSenderName} responded to your update${escapedBabyName ? ` about ${escapedBabyName}` : ''}:

        "${escapedUpdateContent}"

        View response: ${safeReplyUrl}

        ---
        You're receiving this because you opted in to response notifications.
        Manage preferences: {{{unsubscribe_url}}}
      `
    }
  }

  private getPromptTemplate(data: TemplateData): EmailTemplate {
    // Validate and sanitize input data
    const validatedData = promptTemplateDataSchema.parse(data)
    const { promptText, babyName, responseUrl } = validatedData

    // Escape all user-controlled values for HTML context
    const escapedPromptText = promptText ? this.escapeHtml(String(promptText)) : ''
    const escapedBabyName = babyName ? this.escapeHtml(String(babyName)) : ''
    const safeResponseUrl = this.sanitizeUrl(String(responseUrl))

    return {
      subject: `Update request${escapedBabyName ? ` about ${escapedBabyName}` : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Update Request - Tribe</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">Tribe</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Smart baby update sharing</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937;">Update Request</h2>
            <p style="margin: 0 0 15px 0;">Someone would love to hear an update${escapedBabyName ? ` about ${escapedBabyName}` : ''}!</p>
            ${escapedPromptText ? `<div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; border-radius: 4px;">
              <p style="margin: 0; font-style: italic;">"${escapedPromptText}"</p>
            </div>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${safeResponseUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Share Update</a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>You're receiving this because you opted in to prompt notifications.</p>
            <p><a href="{{{unsubscribe_url}}}" style="color: #6366f1;">Manage preferences</a> • <a href="{{{unsubscribe_url}}}" style="color: #6366f1;">Unsubscribe</a></p>
          </div>
        </body>
        </html>
      `,
      text: `
        Update Request - Tribe

        Someone would love to hear an update${escapedBabyName ? ` about ${escapedBabyName}` : ''}!

        ${escapedPromptText ? `"${escapedPromptText}"` : ''}

        Share update: ${safeResponseUrl}

        ---
        You're receiving this because you opted in to prompt notifications.
        Manage preferences: {{{unsubscribe_url}}}
      `
    }
  }

  private getDigestTemplate(data: TemplateData): EmailTemplate {
    // Validate and sanitize input data
    const validatedData = digestTemplateDataSchema.parse(data)
    const { updates, period, unreadCount, digestUrl } = validatedData

    // Escape period and digestUrl
    const escapedPeriod = this.escapeHtml(String(period))
    const safeDigestUrl = this.sanitizeUrl(String(digestUrl))
    const escapedUnreadCount = Number(unreadCount) || 0

    // Escape all values in digest updates
    const escapedDigestUpdates = updates.map((update) => ({
      senderName: this.escapeHtml(String(update.senderName || 'Someone')),
      timestamp: this.escapeHtml(String(update.timestamp || '')),
      content: this.escapeHtml(String(update.content || ''))
    }))

    return {
      subject: `Your ${escapedPeriod} update digest (${escapedUnreadCount} new updates)`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${escapedPeriod.charAt(0).toUpperCase() + escapedPeriod.slice(1)} Digest - Tribe</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">Tribe</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Smart baby update sharing</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937;">${escapedPeriod.charAt(0).toUpperCase() + escapedPeriod.slice(1)} Digest</h2>
            <p style="margin: 0 0 15px 0;">You have ${escapedUnreadCount} new updates from your family and friends.</p>

            ${escapedDigestUpdates.length > 0 ? `
              <div style="margin: 20px 0;">
                ${escapedDigestUpdates.map((update) => `
                  <div style="background: white; border-radius: 6px; padding: 15px; margin: 10px 0; border-left: 4px solid #6366f1;">
                    <div style="font-weight: 500; color: #1f2937; margin-bottom: 5px;">${update.senderName}</div>
                    <div style="color: #666; font-size: 14px; margin-bottom: 8px;">${update.timestamp}</div>
                    <div style="color: #374151;">${update.content}</div>
                  </div>
                `).join('')}
              </div>
            ` : '<p style="color: #666; font-style: italic;">No new updates in this digest.</p>'}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${safeDigestUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">View All Updates</a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>You're receiving this ${escapedPeriod} digest based on your notification preferences.</p>
            <p><a href="{{{unsubscribe_url}}}" style="color: #6366f1;">Manage preferences</a> • <a href="{{{unsubscribe_url}}}" style="color: #6366f1;">Unsubscribe</a></p>
          </div>
        </body>
        </html>
      `,
      text: `
        ${escapedPeriod.charAt(0).toUpperCase() + escapedPeriod.slice(1)} Digest - Tribe

        You have ${escapedUnreadCount} new updates from your family and friends.

        ${escapedDigestUpdates.map((update) => `
        ${update.senderName} - ${update.timestamp}
        ${update.content}
        `).join('\n')}

        View all updates: ${safeDigestUrl}

        ---
        You're receiving this ${escapedPeriod} digest based on your notification preferences.
        Manage preferences: {{{unsubscribe_url}}}
      `
    }
  }

  private getSystemTemplate(data: TemplateData): EmailTemplate {
    // Validate and sanitize input data
    const validatedData = systemTemplateDataSchema.parse(data)
    const { title, content, actionUrl, actionText } = validatedData

    // Escape all user-controlled values for HTML context
    const escapedTitle = this.escapeHtml(String(title))
    const escapedContent = this.escapeHtml(String(content))
    const safeActionUrl = actionUrl ? this.sanitizeUrl(String(actionUrl)) : ''
    const escapedActionText = this.escapeHtml(String(actionText))

    return {
      subject: `${escapedTitle} - Tribe`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${escapedTitle} - Tribe</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">Tribe</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Smart baby update sharing</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937;">${escapedTitle}</h2>
            <p style="margin: 0; color: #374151;">${escapedContent}</p>
          </div>

          ${safeActionUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${safeActionUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">${escapedActionText}</a>
            </div>
          ` : ''}

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>This is a system notification from Tribe.</p>
            <p><a href="{{{unsubscribe_url}}}" style="color: #6366f1;">Manage preferences</a></p>
          </div>
        </body>
        </html>
      `,
      text: `
        ${escapedTitle} - Tribe

        ${escapedContent}

        ${safeActionUrl ? `${escapedActionText}: ${safeActionUrl}` : ''}

        ---
        This is a system notification from Tribe.
        Manage preferences: {{{unsubscribe_url}}}
      `
    }
  }

  private getPreferenceTemplate(data: TemplateData): EmailTemplate {
    // Validate and sanitize input data
    const validatedData = preferenceTemplateDataSchema.parse(data)
    const { recipientName, senderName, preferenceUrl, babyName } = validatedData

    // Escape all user-controlled values for HTML context
    const escapedRecipientName = this.escapeHtml(String(recipientName))
    const escapedSenderName = this.escapeHtml(String(senderName))
    const escapedBabyName = babyName ? this.escapeHtml(String(babyName)) : ''
    const safePreferenceUrl = this.sanitizeUrl(String(preferenceUrl))

    return {
      subject: `${escapedSenderName} wants to share${escapedBabyName ? ` ${escapedBabyName}` : ''} updates with you`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Update Sharing Invitation - Tribe</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">Tribe</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Smart baby update sharing</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937;">You're Invited!</h2>
            <p style="margin: 0 0 15px 0;">Hi ${escapedRecipientName},</p>
            <p style="margin: 0 0 15px 0;"><strong>${escapedSenderName}</strong> would like to share${escapedBabyName ? ` ${escapedBabyName}` : ''} updates with you through Tribe.</p>
            <p style="margin: 0 0 15px 0;">Tribe makes it easy to stay connected with family and friends by sharing baby updates in a private, secure way.</p>
            <p style="margin: 0;">Click below to set your preferences and start receiving updates!</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${safePreferenceUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Set My Preferences</a>
          </div>

          <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #ea580c; font-size: 16px;">What is Tribe?</h3>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #7c2d12;">Tribe is a private platform for sharing baby updates with family and friends. You control when and how you receive updates.</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #7c2d12;">
              <li>Private and secure sharing</li>
              <li>Customizable notification preferences</li>
              <li>Easy to use interface</li>
              <li>No social media required</li>
            </ul>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>You can unsubscribe or change your preferences at any time.</p>
            <p><a href="${safePreferenceUrl}" style="color: #6366f1;">Manage preferences</a></p>
          </div>
        </body>
        </html>
      `,
      text: `
        You're Invited! - Tribe

        Hi ${escapedRecipientName},

        ${escapedSenderName} would like to share${escapedBabyName ? ` ${escapedBabyName}` : ''} updates with you through Tribe.

        Tribe makes it easy to stay connected with family and friends by sharing baby updates in a private, secure way.

        Set your preferences: ${safePreferenceUrl}

        What is Tribe?
        - Private and secure sharing
        - Customizable notification preferences
        - Easy to use interface
        - No social media required

        You can unsubscribe or change your preferences at any time.
        Manage preferences: ${preferenceUrl}
      `
    }
  }

  // Test email functionality
  async sendTestEmail(to: string, type: 'response' | 'prompt' | 'digest' | 'system' = 'system'): Promise<EmailDeliveryResult> {
    const testData = {
      response: {
        senderName: 'Test User',
        updateContent: 'This is a test response to verify email delivery.',
        babyName: 'Test Baby',
        replyUrl: 'https://tribe.example.com/test'
      },
      prompt: {
        promptText: 'How is everything going?',
        babyName: 'Test Baby',
        responseUrl: 'https://tribe.example.com/respond'
      },
      digest: {
        updates: [
          { senderName: 'Alice', content: 'Baby took first steps!', timestamp: '2 hours ago' },
          { senderName: 'Bob', content: 'Sleepy baby is sleepy', timestamp: '1 day ago' }
        ],
        period: 'daily',
        unreadCount: 2,
        digestUrl: 'https://tribe.example.com/digest'
      },
      system: {
        title: 'Test Email Notification',
        content: 'This is a test email to verify that SendGrid integration is working correctly.',
        actionUrl: 'https://tribe.example.com/',
        actionText: 'Visit Tribe'
      }
    }

    return this.sendTemplatedEmail(to, type, testData[type], {
      categories: [`tribe-test-${type}`, 'tribe-test'],
      customArgs: {
        testEmail: 'true',
        testType: type
      }
    })
  }

  // Check if service is properly configured
  isConfigured(): boolean {
    return this.initialized
  }

  // Get configuration status
  getStatus(): {
    configured: boolean
    apiKey: boolean
    fromEmail: boolean
    environmentValid: boolean
    queueEnabled: boolean
    circuitBreakerState?: string
  } {
    try {
      const env = getEnv()
      const features = getFeatureFlags()

      let circuitBreakerState: string | undefined

      if (this.useQueue) {
        try {
          const emailQueue = getEmailQueue()
          circuitBreakerState = emailQueue.getCircuitBreakerState()
        } catch {
          // Queue not available
        }
      }

      return {
        configured: this.initialized,
        apiKey: !!env.SENDGRID_API_KEY,
        fromEmail: !!env.SENDGRID_FROM_EMAIL,
        environmentValid: features.emailEnabled,
        queueEnabled: this.useQueue,
        circuitBreakerState
      }
    } catch (error) {
      this.logger.warn('Failed to get environment status', { error: (error as Error).message })
      return {
        configured: false,
        apiKey: false,
        fromEmail: false,
        environmentValid: false,
        queueEnabled: false
      }
    }
  }

  // Get queue metrics (if queue is enabled)
  async getQueueMetrics() {
    if (!this.useQueue) {
      return null
    }

    try {
      const emailQueue = getEmailQueue()
      return await emailQueue.getQueueMetrics()
    } catch (error) {
      this.logger.error('Failed to get queue metrics', {
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  // Retry a failed email from dead letter queue
  async retryFailedEmail(jobId: string) {
    if (!this.useQueue) {
      throw new Error('Queue not enabled')
    }

    try {
      const emailQueue = getEmailQueue()
      return await emailQueue.retryDeadLetterJob(jobId)
    } catch (error) {
      this.logger.error('Failed to retry failed email', {
        jobId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }
}

// Export singleton instance
export const serverEmailService = new ServerEmailService()
