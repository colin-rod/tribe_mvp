import { NotificationContent } from './groupNotificationService'
import { sanitizeText } from '@/lib/validation/security'

export interface NotificationTemplate {
  subject?: string // For email
  message: string // For SMS/WhatsApp
  html?: string // For email
}

export interface TemplateData extends NotificationContent {
  recipient_name?: string
  baby_name?: string
  update_content?: string
  sender_name?: string
  group_name?: string
  update_type?: string
  preference_token?: string
  app_domain?: string
}

export class NotificationTemplateService {

  generateEmailTemplate(
    notificationType: 'immediate' | 'digest' | 'milestone',
    data: TemplateData
  ): NotificationTemplate {
    const sanitizedData = this.sanitizeTemplateData(data)

    switch (notificationType) {
      case 'immediate':
        return this.generateImmediateEmailTemplate(sanitizedData)
      case 'digest':
        return this.generateDigestEmailTemplate(sanitizedData)
      case 'milestone':
        return this.generateMilestoneEmailTemplate(sanitizedData)
      default:
        return this.generateDefaultEmailTemplate(sanitizedData)
    }
  }

  generateSMSTemplate(
    notificationType: 'immediate' | 'digest' | 'milestone',
    data: TemplateData
  ): NotificationTemplate {
    const sanitizedData = this.sanitizeTemplateData(data)

    switch (notificationType) {
      case 'immediate':
        return this.generateImmediateSMSTemplate(sanitizedData)
      case 'digest':
        return this.generateDigestSMSTemplate(sanitizedData)
      case 'milestone':
        return this.generateMilestoneSMSTemplate(sanitizedData)
      default:
        return this.generateDefaultSMSTemplate(sanitizedData)
    }
  }

  generateWhatsAppTemplate(
    notificationType: 'immediate' | 'digest' | 'milestone',
    data: TemplateData
  ): NotificationTemplate {
    const sanitizedData = this.sanitizeTemplateData(data)

    // WhatsApp templates are similar to SMS but can be slightly longer
    switch (notificationType) {
      case 'immediate':
        return this.generateImmediateWhatsAppTemplate(sanitizedData)
      case 'digest':
        return this.generateDigestWhatsAppTemplate(sanitizedData)
      case 'milestone':
        return this.generateMilestoneWhatsAppTemplate(sanitizedData)
      default:
        return this.generateDefaultWhatsAppTemplate(sanitizedData)
    }
  }

  private sanitizeTemplateData(data: TemplateData): TemplateData {
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeText(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  private generateImmediateEmailTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      sender_name = 'Someone',
      baby_name = '',
      update_content = '',
      group_name = '',
      app_domain = 'localhost:3000'
    } = data

    const babyText = baby_name ? ` about ${baby_name}` : ''
    const groupText = group_name ? ` in ${group_name}` : ''

    return {
      subject: `New memory${babyText} from ${sender_name}`,
      message: `Hi ${recipient_name}! ${sender_name} shared a new memory${babyText}${groupText}: "${update_content}". View on Tribe: https://${app_domain}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Memory${babyText}</h2>
          <p>Hi ${recipient_name}!</p>
          <p><strong>${sender_name}</strong> shared a new memory${groupText}:</p>
          <blockquote style="border-left: 4px solid #6366f1; padding-left: 16px; margin: 16px 0;">
            "${update_content}"
          </blockquote>
          <p><a href="https://${app_domain}" style="color: #6366f1;">View on Tribe</a></p>
        </div>
      `
    }
  }

  private generateDigestEmailTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      group_name = '',
      app_domain = 'localhost:3000'
    } = data

    const groupText = group_name ? ` from ${group_name}` : ''

    return {
      subject: `Your daily update digest${groupText}`,
      message: `Hi ${recipient_name}! Your daily digest${groupText} is ready. View all updates on Tribe: https://${app_domain}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Daily Update Digest${groupText}</h2>
          <p>Hi ${recipient_name}!</p>
          <p>Your daily digest is ready with new updates from your family and friends.</p>
          <p><a href="https://${app_domain}" style="color: #6366f1;">View All Updates</a></p>
        </div>
      `
    }
  }

  private generateMilestoneEmailTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      sender_name = 'Someone',
      baby_name = '',
      update_content = '',
      group_name = '',
      app_domain = 'localhost:3000'
    } = data

    const babyText = baby_name ? ` about ${baby_name}` : ''
    const groupText = group_name ? ` in ${group_name}` : ''

    return {
      subject: `🎉 Milestone update${babyText} from ${sender_name}`,
      message: `Hi ${recipient_name}! ${sender_name} shared a milestone${babyText}${groupText}: "${update_content}". View on Tribe: https://${app_domain}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🎉 Milestone Update${babyText}</h2>
          <p>Hi ${recipient_name}!</p>
          <p><strong>${sender_name}</strong> shared an important milestone${groupText}:</p>
          <blockquote style="border-left: 4px solid #10b981; padding-left: 16px; margin: 16px 0; background: #f0fdf4; padding: 16px; border-radius: 4px;">
            "${update_content}"
          </blockquote>
          <p><a href="https://${app_domain}" style="color: #6366f1;">View on Tribe</a></p>
        </div>
      `
    }
  }

  private generateDefaultEmailTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      app_domain = 'localhost:3000'
    } = data

    return {
      subject: 'New memory from Tribe',
      message: `Hi ${recipient_name}! You have a new memory on Tribe: https://${app_domain}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Memory</h2>
          <p>Hi ${recipient_name}!</p>
          <p>You have a new memory on Tribe.</p>
          <p><a href="https://${app_domain}" style="color: #6366f1;">View Memory</a></p>
        </div>
      `
    }
  }

  private generateImmediateSMSTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      sender_name = 'Someone',
      baby_name = '',
      update_content = '',
      app_domain = 'localhost:3000'
    } = data

    const babyText = baby_name ? ` about ${baby_name}` : ''
    // Truncate content for SMS
    const truncatedContent = update_content.length > 50
      ? update_content.substring(0, 47) + '...'
      : update_content

    return {
      message: `Hi ${recipient_name}! ${sender_name} shared an update${babyText}: "${truncatedContent}" - View on Tribe: https://${app_domain}`
    }
  }

  private generateDigestSMSTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      group_name = '',
      app_domain = 'localhost:3000'
    } = data

    const groupText = group_name ? ` from ${group_name}` : ''

    return {
      message: `Hi ${recipient_name}! Your daily digest${groupText} is ready. View updates: https://${app_domain}`
    }
  }

  private generateMilestoneSMSTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      sender_name = 'Someone',
      baby_name = '',
      update_content = '',
      app_domain = 'localhost:3000'
    } = data

    const babyText = baby_name ? ` about ${baby_name}` : ''
    const truncatedContent = update_content.length > 40
      ? update_content.substring(0, 37) + '...'
      : update_content

    return {
      message: `🎉 ${recipient_name}! ${sender_name} shared a milestone${babyText}: "${truncatedContent}" - View: https://${app_domain}`
    }
  }

  private generateDefaultSMSTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      app_domain = 'localhost:3000'
    } = data

    return {
      message: `Hi ${recipient_name}! New memory on Tribe: https://${app_domain}`
    }
  }

  private generateImmediateWhatsAppTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      sender_name = 'Someone',
      baby_name = '',
      update_content = '',
      group_name = '',
      app_domain = 'localhost:3000'
    } = data

    const babyText = baby_name ? ` about ${baby_name}` : ''
    const groupText = group_name ? ` in ${group_name}` : ''

    return {
      message: `Hi ${recipient_name}! 👶\n\n${sender_name} shared a new update${babyText}${groupText}:\n\n"${update_content}"\n\nView on Tribe: https://${app_domain}`
    }
  }

  private generateDigestWhatsAppTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      group_name = '',
      app_domain = 'localhost:3000'
    } = data

    const groupText = group_name ? ` from ${group_name}` : ''

    return {
      message: `Hi ${recipient_name}! 📋\n\nYour daily digest${groupText} is ready with new updates from your family and friends.\n\nView all updates: https://${app_domain}`
    }
  }

  private generateMilestoneWhatsAppTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      sender_name = 'Someone',
      baby_name = '',
      update_content = '',
      group_name = '',
      app_domain = 'localhost:3000'
    } = data

    const babyText = baby_name ? ` about ${baby_name}` : ''
    const groupText = group_name ? ` in ${group_name}` : ''

    return {
      message: `🎉 ${recipient_name}!\n\n${sender_name} shared an important milestone${babyText}${groupText}:\n\n"${update_content}"\n\nView on Tribe: https://${app_domain}`
    }
  }

  private generateDefaultWhatsAppTemplate(data: TemplateData): NotificationTemplate {
    const {
      recipient_name = 'there',
      app_domain = 'localhost:3000'
    } = data

    return {
      message: `Hi ${recipient_name}! 👶\n\nYou have a new update on Tribe.\n\nView update: https://${app_domain}`
    }
  }
}

// Export singleton instance
export const notificationTemplateService = new NotificationTemplateService()