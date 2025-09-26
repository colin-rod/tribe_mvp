'use client'

import { createLogger } from '@/lib/logger'

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

export interface EmailApiRequest {
  to: string
  type: 'response' | 'prompt' | 'digest' | 'system' | 'preference'
  templateData?: Record<string, unknown>
  options?: {
    from?: string
    fromName?: string
    replyTo?: string
    categories?: string[]
    customArgs?: Record<string, string>
  }
}

export interface BulkEmailRequest {
  emails: EmailApiRequest[]
}

export class ClientEmailService {
  private logger = createLogger('ClientEmailService')

  private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    return response
  }

  async sendEmail(request: EmailApiRequest): Promise<EmailDeliveryResult> {
    try {
      const response = await this.fetchApi('/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to send email',
          statusCode: response.status
        }
      }

      return {
        success: data.success,
        messageId: data.messageId,
        statusCode: data.statusCode
      }
    } catch (error) {
      this.logger.errorWithStack('Failed to send email via API', error as Error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async sendBulkEmails(requests: EmailApiRequest[]): Promise<{
    success: boolean
    results: Array<{
      to: string
      success: boolean
      messageId?: string
      error?: string
    }>
    summary: {
      total: number
      successful: number
      failed: number
    }
  }> {
    try {
      const response = await this.fetchApi('/api/notifications/send-bulk-emails', {
        method: 'POST',
        body: JSON.stringify({ emails: requests }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send bulk emails')
      }

      return data
    } catch (error) {
      this.logger.errorWithStack('Failed to send bulk emails via API', error as Error, {
        emailCount: requests.length
      })

      // Return a failed result for all emails
      const results = requests.map(req => ({
        to: req.to,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))

      return {
        success: false,
        results,
        summary: {
          total: requests.length,
          successful: 0,
          failed: requests.length
        }
      }
    }
  }

  async sendTemplatedEmail(
    to: string,
    templateType: 'response' | 'prompt' | 'digest' | 'system' | 'preference',
    templateData: Record<string, unknown> = {},
    options: Partial<EmailApiRequest['options']> = {}
  ): Promise<EmailDeliveryResult> {
    return this.sendEmail({
      to,
      type: templateType,
      templateData,
      options: {
        categories: [`tribe-${templateType}`, 'tribe-notification'],
        customArgs: {
          templateType,
          ...options.customArgs
        },
        ...options
      }
    })
  }

  // Test email functionality
  async sendTestEmail(
    to: string,
    type: 'response' | 'prompt' | 'digest' | 'system' = 'system'
  ): Promise<EmailDeliveryResult> {
    try {
      const response = await this.fetchApi('/api/notifications/send-test-email', {
        method: 'POST',
        body: JSON.stringify({ to, type }),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to send test email',
          statusCode: response.status
        }
      }

      return {
        success: data.success,
        messageId: data.messageId,
        statusCode: data.statusCode
      }
    } catch (error) {
      this.logger.errorWithStack('Failed to send test email via API', error as Error, {
        to: '[REDACTED]',
        type
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Check if service is properly configured (client-side version)
  async isConfigured(): Promise<boolean> {
    try {
      const response = await this.fetchApi('/api/notifications/status')

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.configured || false
    } catch (error) {
      this.logger.warn('Failed to check email service status', { error: String(error) })
      return false
    }
  }

  // Get configuration status (client-side version)
  async getStatus(): Promise<{ configured: boolean; apiKey: boolean; fromEmail: boolean }> {
    try {
      const response = await this.fetchApi('/api/notifications/status')

      if (!response.ok) {
        return { configured: false, apiKey: false, fromEmail: false }
      }

      const data = await response.json()
      return data
    } catch (error) {
      this.logger.warn('Failed to get email service status', { error: String(error) })
      return { configured: false, apiKey: false, fromEmail: false }
    }
  }

  // Helper methods for backward compatibility with existing code

  // Legacy sendEmail method that accepts EmailOptions
  async sendLegacyEmail(options: EmailOptions): Promise<EmailDeliveryResult> {
    // Convert legacy options to new format
    return this.sendEmail({
      to: options.to,
      type: 'system', // Default type for legacy calls
      templateData: {
        title: options.subject,
        content: options.text || options.html
      },
      options: {
        from: options.from,
        fromName: options.fromName,
        replyTo: options.replyTo,
        categories: options.categories,
        customArgs: options.customArgs
      }
    })
  }

  // Legacy bulk emails method
  async sendLegacyBulkEmails(emails: EmailOptions[]): Promise<EmailDeliveryResult[]> {
    const requests = emails.map(email => ({
      to: email.to,
      type: 'system' as const,
      templateData: {
        title: email.subject,
        content: email.text || email.html
      },
      options: {
        from: email.from,
        fromName: email.fromName,
        replyTo: email.replyTo,
        categories: email.categories,
        customArgs: email.customArgs
      }
    }))

    const result = await this.sendBulkEmails(requests)

    // Convert back to legacy format
    return result.results.map(r => ({
      success: r.success,
      messageId: r.messageId,
      error: r.error
    }))
  }
}

// Export singleton instance
export const clientEmailService = new ClientEmailService()
