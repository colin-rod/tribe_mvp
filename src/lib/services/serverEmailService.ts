import * as sgMail from '@sendgrid/mail'
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
  templateData?: Record<string, any>
  categories?: string[]
  customArgs?: Record<string, string>
}

export interface EmailDeliveryResult {
  success: boolean
  messageId?: string
  error?: string
  statusCode?: number
}

export class ServerEmailService {
  private initialized = false
  private logger = createLogger('ServerEmailService')

  constructor() {
    this.initialize()
  }

  private initialize() {
    try {
      const apiKey = process.env.SENDGRID_API_KEY
      if (!apiKey) {
        throw new Error('SENDGRID_API_KEY environment variable is required')
      }

      sgMail.setApiKey(apiKey)
      this.initialized = true
    } catch (error) {
      this.logger.errorWithStack('Failed to initialize ServerEmailService', error as Error)
      this.initialized = false
    }
  }

  private getDefaultFrom(): { email: string; name?: string } {
    const email = process.env.SENDGRID_FROM_EMAIL || 'updates@colinrodrigues.com'
    const name = process.env.SENDGRID_FROM_NAME || 'Tribe'
    return { email, name }
  }

  private generateMessageId(): string {
    return `tribe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  async sendEmail(options: EmailOptions): Promise<EmailDeliveryResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Email service not properly initialized'
      }
    }

    try {
      const defaultFrom = this.getDefaultFrom()
      const messageId = this.generateMessageId()

      const msg = {
        to: options.to,
        from: {
          email: options.from || defaultFrom.email,
          name: options.fromName || defaultFrom.name
        },
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html,
        text: options.text,
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
    } catch (error: any) {
      this.logger.errorWithStack('SendGrid email error', error as Error, {
        to: options.to,
        subject: options.subject
      })

      let errorMessage = 'Unknown email delivery error'
      let statusCode: number | undefined

      if (error.response) {
        statusCode = error.response.status
        errorMessage = error.response.body?.errors?.[0]?.message || error.message
      } else if (error.message) {
        errorMessage = error.message
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
    templateData: Record<string, any> = {},
    options: Partial<EmailOptions> = {}
  ): Promise<EmailDeliveryResult> {
    const template = this.getEmailTemplate(templateType, templateData)

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
    data: Record<string, any>
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

  private getResponseTemplate(data: Record<string, any>): EmailTemplate {
    const { senderName = 'Someone', updateContent = '', babyName = '', replyUrl = '#' } = data

    return {
      subject: `${senderName} responded to your update${babyName ? ` about ${babyName}` : ''}`,
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
            <p style="margin: 0 0 10px 0;"><strong>${senderName}</strong> responded to your update:</p>
            <div style="background: white; border-left: 4px solid #6366f1; padding: 15px; margin: 15px 0; border-radius: 4px;">
              <p style="margin: 0; font-style: italic;">"${updateContent}"</p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${replyUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">View Response</a>
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

        ${senderName} responded to your update${babyName ? ` about ${babyName}` : ''}:

        "${updateContent}"

        View response: ${replyUrl}

        ---
        You're receiving this because you opted in to response notifications.
        Manage preferences: {{{unsubscribe_url}}}
      `
    }
  }

  private getPromptTemplate(data: Record<string, any>): EmailTemplate {
    const { promptText = '', babyName = '', responseUrl = '#' } = data

    return {
      subject: `Update request${babyName ? ` about ${babyName}` : ''}`,
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
            <p style="margin: 0 0 15px 0;">Someone would love to hear an update${babyName ? ` about ${babyName}` : ''}!</p>
            ${promptText ? `<div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; border-radius: 4px;">
              <p style="margin: 0; font-style: italic;">"${promptText}"</p>
            </div>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${responseUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Share Update</a>
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

        Someone would love to hear an update${babyName ? ` about ${babyName}` : ''}!

        ${promptText ? `"${promptText}"` : ''}

        Share update: ${responseUrl}

        ---
        You're receiving this because you opted in to prompt notifications.
        Manage preferences: {{{unsubscribe_url}}}
      `
    }
  }

  private getDigestTemplate(data: Record<string, any>): EmailTemplate {
    const { updates = [], period = 'daily', unreadCount = 0, digestUrl = '#' } = data

    return {
      subject: `Your ${period} update digest (${unreadCount} new updates)`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${period.charAt(0).toUpperCase() + period.slice(1)} Digest - Tribe</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">Tribe</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Smart baby update sharing</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937;">${period.charAt(0).toUpperCase() + period.slice(1)} Digest</h2>
            <p style="margin: 0 0 15px 0;">You have ${unreadCount} new updates from your family and friends.</p>

            ${updates.length > 0 ? `
              <div style="margin: 20px 0;">
                ${updates.map((update: any) => `
                  <div style="background: white; border-radius: 6px; padding: 15px; margin: 10px 0; border-left: 4px solid #6366f1;">
                    <div style="font-weight: 500; color: #1f2937; margin-bottom: 5px;">${update.senderName || 'Someone'}</div>
                    <div style="color: #666; font-size: 14px; margin-bottom: 8px;">${update.timestamp || ''}</div>
                    <div style="color: #374151;">${update.content || ''}</div>
                  </div>
                `).join('')}
              </div>
            ` : '<p style="color: #666; font-style: italic;">No new updates in this digest.</p>'}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${digestUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">View All Updates</a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>You're receiving this ${period} digest based on your notification preferences.</p>
            <p><a href="{{{unsubscribe_url}}}" style="color: #6366f1;">Manage preferences</a> • <a href="{{{unsubscribe_url}}}" style="color: #6366f1;">Unsubscribe</a></p>
          </div>
        </body>
        </html>
      `,
      text: `
        ${period.charAt(0).toUpperCase() + period.slice(1)} Digest - Tribe

        You have ${unreadCount} new updates from your family and friends.

        ${updates.map((update: any) => `
        ${update.senderName || 'Someone'} - ${update.timestamp || ''}
        ${update.content || ''}
        `).join('\n')}

        View all updates: ${digestUrl}

        ---
        You're receiving this ${period} digest based on your notification preferences.
        Manage preferences: {{{unsubscribe_url}}}
      `
    }
  }

  private getSystemTemplate(data: Record<string, any>): EmailTemplate {
    const { title = 'System Notification', content = '', actionUrl = '', actionText = 'View Details' } = data

    return {
      subject: `${title} - Tribe`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title} - Tribe</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">Tribe</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Smart baby update sharing</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937;">${title}</h2>
            <p style="margin: 0; color: #374151;">${content}</p>
          </div>

          ${actionUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${actionUrl}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">${actionText}</a>
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
        ${title} - Tribe

        ${content}

        ${actionUrl ? `${actionText}: ${actionUrl}` : ''}

        ---
        This is a system notification from Tribe.
        Manage preferences: {{{unsubscribe_url}}}
      `
    }
  }

  private getPreferenceTemplate(data: Record<string, any>): EmailTemplate {
    const { recipientName = '', senderName = '', preferenceUrl = '#', babyName = '' } = data

    return {
      subject: `${senderName} wants to share${babyName ? ` ${babyName}` : ''} updates with you`,
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
            <p style="margin: 0 0 15px 0;">Hi ${recipientName},</p>
            <p style="margin: 0 0 15px 0;"><strong>${senderName}</strong> would like to share${babyName ? ` ${babyName}` : ''} updates with you through Tribe.</p>
            <p style="margin: 0 0 15px 0;">Tribe makes it easy to stay connected with family and friends by sharing baby updates in a private, secure way.</p>
            <p style="margin: 0;">Click below to set your preferences and start receiving updates!</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${preferenceUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Set My Preferences</a>
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
            <p><a href="${preferenceUrl}" style="color: #6366f1;">Manage preferences</a></p>
          </div>
        </body>
        </html>
      `,
      text: `
        You're Invited! - Tribe

        Hi ${recipientName},

        ${senderName} would like to share${babyName ? ` ${babyName}` : ''} updates with you through Tribe.

        Tribe makes it easy to stay connected with family and friends by sharing baby updates in a private, secure way.

        Set your preferences: ${preferenceUrl}

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
  getStatus(): { configured: boolean; apiKey: boolean; fromEmail: boolean } {
    return {
      configured: this.initialized,
      apiKey: !!process.env.SENDGRID_API_KEY,
      fromEmail: !!process.env.SENDGRID_FROM_EMAIL
    }
  }
}

// Export singleton instance
export const serverEmailService = new ServerEmailService()