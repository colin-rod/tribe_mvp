import { createLogger } from '@/lib/logger'
import { getEnv } from '@/lib/env'
import { Twilio } from 'twilio'

export interface SMSDeliveryResult {
  success: boolean
  messageId?: string
  error?: string
  statusCode?: string
  deliveryStatus?: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered'
}

export interface SMSOptions {
  to: string
  message: string
  from?: string
}

export interface WhatsAppDeliveryResult extends SMSDeliveryResult {
  whatsappStatus?: string
}

export interface WhatsAppOptions {
  to: string
  message: string
  from?: string
  mediaUrl?: string
}

export class SMSService {
  private client: Twilio | null = null
  private initialized = false
  private logger = createLogger('SMSService')

  constructor() {
    this.initialize()
  }

  private initialize() {
    try {
      const env = getEnv()

      if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
        this.logger.warn('SMS service not configured - Twilio credentials missing')
        return
      }

      this.client = new Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
      this.initialized = true

      this.logger.info('SMSService initialized successfully', {
        accountSid: env.TWILIO_ACCOUNT_SID?.substring(0, 8) + '...'
      })
    } catch (error) {
      this.logger.errorWithStack('Failed to initialize SMSService', error as Error)
      this.initialized = false
    }
  }

  async sendSMS(options: SMSOptions): Promise<SMSDeliveryResult> {
    if (!this.initialized || !this.client) {
      return {
        success: false,
        error: 'SMS service not properly initialized'
      }
    }

    try {
      const env = getEnv()
      const fromNumber = options.from || env.TWILIO_PHONE_NUMBER

      if (!fromNumber) {
        return {
          success: false,
          error: 'No sender phone number configured'
        }
      }

      // Validate phone number format
      if (!this.isValidPhoneNumber(options.to)) {
        return {
          success: false,
          error: 'Invalid recipient phone number format'
        }
      }

      this.logger.info('Sending SMS', {
        to: this.maskPhoneNumber(options.to),
        from: this.maskPhoneNumber(fromNumber),
        messageLength: options.message.length
      })

      const message = await this.client.messages.create({
        body: options.message,
        from: fromNumber,
        to: options.to
      })

      return {
        success: true,
        messageId: message.sid,
        statusCode: message.status,
        deliveryStatus: this.mapTwilioStatus(message.status)
      }
    } catch (error) {
      this.logger.errorWithStack('Failed to send SMS', error as Error, {
        to: this.maskPhoneNumber(options.to)
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS delivery error'
      }
    }
  }

  async sendWhatsApp(options: WhatsAppOptions): Promise<WhatsAppDeliveryResult> {
    if (!this.initialized || !this.client) {
      return {
        success: false,
        error: 'WhatsApp service not properly initialized'
      }
    }

    try {
      const env = getEnv()
      const fromNumber = options.from || env.TWILIO_WHATSAPP_NUMBER || `whatsapp:${env.TWILIO_PHONE_NUMBER}`

      if (!fromNumber) {
        return {
          success: false,
          error: 'No WhatsApp sender number configured'
        }
      }

      // Ensure WhatsApp format
      const toNumber = options.to.startsWith('whatsapp:') ? options.to : `whatsapp:${options.to}`
      const fromNumberFormatted = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`

      this.logger.info('Sending WhatsApp message', {
        to: this.maskPhoneNumber(toNumber),
        from: this.maskPhoneNumber(fromNumberFormatted),
        messageLength: options.message.length,
        hasMedia: !!options.mediaUrl
      })

      const messageData: {
        body: string
        from: string
        to: string
        mediaUrl?: string[]
      } = {
        body: options.message,
        from: fromNumberFormatted,
        to: toNumber
      }

      if (options.mediaUrl) {
        messageData.mediaUrl = [options.mediaUrl]
      }

      const message = await this.client.messages.create(messageData)

      return {
        success: true,
        messageId: message.sid,
        statusCode: message.status,
        deliveryStatus: this.mapTwilioStatus(message.status),
        whatsappStatus: message.status
      }
    } catch (error) {
      this.logger.errorWithStack('Failed to send WhatsApp message', error as Error, {
        to: this.maskPhoneNumber(options.to)
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown WhatsApp delivery error'
      }
    }
  }

  async getMessageStatus(messageSid: string): Promise<{
    status: string
    deliveryStatus: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered'
    errorCode?: string
    errorMessage?: string
  } | null> {
    if (!this.initialized || !this.client) {
      return null
    }

    try {
      const message = await this.client.messages(messageSid).fetch()

      return {
        status: message.status,
        deliveryStatus: this.mapTwilioStatus(message.status),
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined
      }
    } catch (fetchError) {
      this.logger.errorWithStack('Failed to fetch message status', fetchError as Error, {
        messageSid
      })
      return null
    }
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation - should start with + and contain only digits, spaces, hyphens, parentheses
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '')
    return phoneRegex.test(cleanNumber)
  }

  private maskPhoneNumber(phoneNumber: string): string {
    // Mask phone number for logging (show first 3 and last 2 digits)
    if (phoneNumber.length < 6) return '***'
    return phoneNumber.substring(0, 3) + '***' + phoneNumber.substring(phoneNumber.length - 2)
  }

  private mapTwilioStatus(status: string): 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered' {
    switch (status) {
      case 'queued':
      case 'accepted':
        return 'queued'
      case 'sending':
      case 'sent':
        return 'sent'
      case 'delivered':
      case 'received':
        return 'delivered'
      case 'failed':
      case 'undelivered':
        return 'failed'
      default:
        return 'queued'
    }
  }

  isConfigured(): boolean {
    return this.initialized
  }

  getStatus(): {
    configured: boolean
    accountSid: boolean
    authToken: boolean
    phoneNumber: boolean
    whatsappNumber: boolean
  } {
    try {
      const env = getEnv()
      return {
        configured: this.initialized,
        accountSid: !!env.TWILIO_ACCOUNT_SID,
        authToken: !!env.TWILIO_AUTH_TOKEN,
        phoneNumber: !!env.TWILIO_PHONE_NUMBER,
        whatsappNumber: !!env.TWILIO_WHATSAPP_NUMBER
      }
    } catch {
      return {
        configured: false,
        accountSid: false,
        authToken: false,
        phoneNumber: false,
        whatsappNumber: false
      }
    }
  }
}

// Export singleton instance
export const smsService = new SMSService()