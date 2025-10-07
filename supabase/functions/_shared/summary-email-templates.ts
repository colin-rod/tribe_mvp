/**
 * Memory Book Summary Email Templates
 * Supports hybrid rendering: Gallery (3+ photos) vs Narrative (<3 photos)
 */

import { RecipientSummaryNarrative, MediaReference } from './summary-ai.ts'

export interface SummaryEmailData {
  recipient_name: string
  recipient_email: string
  relationship: string
  child_name: string
  child_age: string
  summary_title: string
  date_range: string
  narrative: RecipientSummaryNarrative
  total_memories: number
  summary_id: string
}

export function calculateChildAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now = new Date()
  const ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()

  if (ageInMonths < 12) {
    return ageInMonths === 1 ? '1 month old' : `${ageInMonths} months old`
  } else {
    const years = Math.floor(ageInMonths / 12)
    const months = ageInMonths % 12
    if (months === 0) {
      return years === 1 ? '1 year old' : `${years} years old`
    } else {
      return `${years} year${years > 1 ? 's' : ''} and ${months} month${months > 1 ? 's' : ''} old`
    }
  }
}

export function getPersonalizedGreeting(recipientName: string, relationship: string): string {
  const greetings: Record<string, string[]> = {
    'grandparent': [`Dear ${recipientName}`, `Hi ${recipientName}`],
    'parent': [`Hey ${recipientName}`, `Hi ${recipientName}`],
    'sibling': [`Hey ${recipientName}`, `Hi ${recipientName}`],
    'friend': [`Hi ${recipientName}`, `Hey ${recipientName}`],
    'family': [`Hi ${recipientName}`, `Hello ${recipientName}`],
    'colleague': [`Hi ${recipientName}`, `Hello ${recipientName}`],
    'other': [`Hi ${recipientName}`, `Hello ${recipientName}`]
  }

  const options = greetings[relationship] || greetings['other']
  return options[0]
}

/**
 * Gallery Template - For summaries with 3+ photos
 * Photo-focused layout with grid and short narrative
 */
export function generateGalleryHtmlTemplate(data: SummaryEmailData): string {
  const greeting = getPersonalizedGreeting(data.recipient_name, data.relationship)
  const mediaCount = data.narrative.media_references.length

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.summary_title} - Memory Book</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            max-width: 650px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .header .date-range {
            opacity: 0.95;
            font-size: 15px;
            font-weight: 500;
        }
        .header .photo-count {
            background: rgba(255, 255, 255, 0.2);
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            margin-top: 12px;
            font-weight: 500;
        }
        .content {
            padding: 35px 30px;
        }
        .greeting {
            font-size: 17px;
            margin-bottom: 20px;
            color: #374151;
        }
        .narrative-section {
            margin: 25px 0;
        }
        .intro {
            font-size: 16px;
            color: #6366f1;
            font-weight: 500;
            margin-bottom: 15px;
        }
        .narrative {
            font-size: 16px;
            color: #1f2937;
            line-height: 1.7;
            margin: 15px 0;
        }
        .closing {
            font-size: 15px;
            color: #6b7280;
            font-style: italic;
            margin-top: 15px;
        }
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 12px;
            margin: 30px 0;
        }
        .gallery-item {
            border-radius: 12px;
            overflow: hidden;
            position: relative;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .gallery-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
        }
        .gallery-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            display: block;
        }
        .gallery-caption {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
            color: white;
            padding: 30px 12px 12px;
            font-size: 13px;
            line-height: 1.4;
        }
        .cta-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 1px solid #bae6fd;
            padding: 20px;
            border-radius: 12px;
            margin: 25px 0;
            text-align: center;
        }
        .cta-section h3 {
            margin: 0 0 8px 0;
            color: #0369a1;
            font-size: 16px;
            font-weight: 600;
        }
        .cta-section p {
            margin: 0;
            color: #075985;
            font-size: 14px;
        }
        .footer {
            background: #f9fafb;
            padding: 25px 30px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .footer .logo {
            font-size: 18px;
            font-weight: 700;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .content { padding: 25px 20px; }
            .header { padding: 30px 20px; }
            .gallery-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }
            .gallery-item img {
                height: 150px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${data.summary_title}</h1>
            <div class="date-range">${data.date_range}</div>
            <div class="photo-count">📸 ${mediaCount} ${mediaCount === 1 ? 'memory' : 'memories'} captured</div>
        </div>

        <div class="content">
            <div class="greeting">${greeting},</div>

            <div class="narrative-section">
                ${data.narrative.intro ? `<div class="intro">${data.narrative.intro}</div>` : ''}
                ${data.narrative.narrative ? `<div class="narrative">${data.narrative.narrative.replace(/\n/g, '<br>')}</div>` : ''}
            </div>

            <div class="gallery-grid">
                ${data.narrative.media_references.map(media => `
                    <div class="gallery-item">
                        <img src="${media.url}" alt="${media.reference_text}" />
                        <div class="gallery-caption">${media.reference_text}</div>
                    </div>
                `).join('')}
            </div>

            ${data.narrative.closing ? `<div class="closing">${data.narrative.closing}</div>` : ''}

            <div class="cta-section">
                <h3>💬 Want to reply?</h3>
                <p>Just hit reply to this email - your message will be shared with the family!</p>
            </div>
        </div>

        <div class="footer">
            <div class="logo">Memory Book</div>
            <p>Capturing ${data.child_name}'s precious moments, one memory at a time.</p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
                You're receiving this because you're part of ${data.child_name}'s family circle.
            </p>
        </div>
    </div>
</body>
</html>`.trim()
}

/**
 * Narrative Template - For summaries with <3 photos
 * Story-focused layout with inline media references
 */
export function generateNarrativeHtmlTemplate(data: SummaryEmailData): string {
  const greeting = getPersonalizedGreeting(data.recipient_name, data.relationship)

  // Build narrative with inline media
  let narrativeWithMedia = data.narrative.narrative || ''

  // Insert media inline where referenced
  data.narrative.media_references.forEach(media => {
    const mediaHtml = `
      <div style="margin: 20px 0;">
        <img src="${media.url}" alt="${media.reference_text}" style="width: 100%; max-width: 500px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);" />
        <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px; font-style: italic;">${media.reference_text}</p>
      </div>
    `
    // Try to insert after the first paragraph that might reference it
    if (!narrativeWithMedia.includes(mediaHtml)) {
      const paragraphs = narrativeWithMedia.split('\n\n')
      if (paragraphs.length > 1) {
        paragraphs.splice(1, 0, mediaHtml)
        narrativeWithMedia = paragraphs.join('\n\n')
      } else {
        narrativeWithMedia += '\n\n' + mediaHtml
      }
    }
  })

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.summary_title} - Memory Book</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.7;
            color: #1f2937;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 8px 0;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .header .date-range {
            opacity: 0.95;
            font-size: 15px;
            font-weight: 500;
        }
        .content {
            padding: 40px 35px;
        }
        .greeting {
            font-size: 17px;
            margin-bottom: 25px;
            color: #374151;
        }
        .narrative-section {
            margin: 25px 0;
        }
        .intro {
            font-size: 17px;
            color: #6366f1;
            font-weight: 500;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        .narrative {
            font-size: 16px;
            color: #1f2937;
            line-height: 1.8;
            margin: 20px 0;
        }
        .narrative p {
            margin: 15px 0;
        }
        .closing {
            font-size: 15px;
            color: #6b7280;
            font-style: italic;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .cta-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 1px solid #bae6fd;
            padding: 20px;
            border-radius: 12px;
            margin: 30px 0 0 0;
            text-align: center;
        }
        .cta-section h3 {
            margin: 0 0 8px 0;
            color: #0369a1;
            font-size: 16px;
            font-weight: 600;
        }
        .cta-section p {
            margin: 0;
            color: #075985;
            font-size: 14px;
        }
        .footer {
            background: #f9fafb;
            padding: 25px 30px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .footer .logo {
            font-size: 18px;
            font-weight: 700;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .content { padding: 30px 20px; }
            .header { padding: 30px 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${data.summary_title}</h1>
            <div class="date-range">${data.date_range}</div>
        </div>

        <div class="content">
            <div class="greeting">${greeting},</div>

            <div class="narrative-section">
                ${data.narrative.intro ? `<div class="intro">${data.narrative.intro}</div>` : ''}

                <div class="narrative">
                    ${narrativeWithMedia.split('\n\n').map(para =>
                        para.trim().startsWith('<div') ? para : `<p>${para.replace(/\n/g, '<br>')}</p>`
                    ).join('')}
                </div>

                ${data.narrative.closing ? `<div class="closing">${data.narrative.closing}</div>` : ''}
            </div>

            <div class="cta-section">
                <h3>💬 Want to reply?</h3>
                <p>Just hit reply to this email - your message will be shared with the family!</p>
            </div>
        </div>

        <div class="footer">
            <div class="logo">Memory Book</div>
            <p>Capturing ${data.child_name}'s precious moments, one memory at a time.</p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
                You're receiving this because you're part of ${data.child_name}'s family circle.
            </p>
        </div>
    </div>
</body>
</html>`.trim()
}

/**
 * Generate text version for both gallery and narrative modes
 */
export function generateSummaryTextTemplate(data: SummaryEmailData): string {
  const greeting = getPersonalizedGreeting(data.recipient_name, data.relationship)

  let text = `${greeting},\n\n`
  text += `${data.summary_title}\n`
  text += `${data.date_range}\n\n`

  if (data.narrative.intro) {
    text += `${data.narrative.intro}\n\n`
  }

  if (data.narrative.narrative) {
    text += `${data.narrative.narrative}\n\n`
  }

  if (data.narrative.media_references.length > 0) {
    text += `📸 Memories:\n`
    data.narrative.media_references.forEach((media, index) => {
      text += `${index + 1}. ${media.reference_text}\n   ${media.url}\n`
    })
    text += '\n'
  }

  if (data.narrative.closing) {
    text += `${data.narrative.closing}\n\n`
  }

  text += `💬 Want to reply? Just hit reply to this email - your message will be shared with the family!\n\n`
  text += `---\n`
  text += `Memory Book - Capturing ${data.child_name}'s precious moments\n`
  text += `You're receiving this because you're part of ${data.child_name}'s family circle.`

  return text
}

/**
 * Generate summary reminder email template
 */
export function generateSummaryReminderHtmlTemplate(data: {
  parent_name: string
  summary_title: string
  reminder_type: '48hr' | '24hr'
  hours_remaining: number
  total_memories: number
  total_recipients: number
  review_url: string
}): string {
  const urgency = data.reminder_type === '24hr' ? 'high' : 'medium'
  const urgencyColor = urgency === 'high' ? '#dc2626' : '#f59e0b'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Summary Auto-Publish Reminder</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            max-width: 550px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }
        .header {
            background: ${urgencyColor};
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .timer {
            background: #fef3c7;
            border: 2px solid #fbbf24;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
        }
        .timer .hours {
            font-size: 32px;
            font-weight: 700;
            color: #d97706;
            margin: 0;
        }
        .timer .label {
            font-size: 14px;
            color: #92400e;
            margin: 5px 0 0 0;
        }
        .summary-info {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .cta-button {
            display: inline-block;
            background: #6366f1;
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
        }
        .cta-button:hover {
            background: #4f46e5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ ${data.reminder_type === '48hr' ? '48 Hours' : '24 Hours'} Until Auto-Publish</h1>
        </div>

        <div class="content">
            <p>Hi ${data.parent_name},</p>

            <div class="timer">
                <div class="hours">${data.hours_remaining}h</div>
                <div class="label">remaining until auto-publish</div>
            </div>

            <p>Your summary "<strong>${data.summary_title}</strong>" will be automatically sent in ${data.hours_remaining} hours.</p>

            <div class="summary-info">
                <p style="margin: 0;"><strong>📸 Memories:</strong> ${data.total_memories}</p>
                <p style="margin: 8px 0 0 0;"><strong>👥 Recipients:</strong> ${data.total_recipients}</p>
            </div>

            <p><strong>What happens next?</strong></p>
            <ul style="color: #4b5563; line-height: 1.8;">
                <li>Review and approve now to send immediately</li>
                <li>Make any last-minute edits</li>
                <li>Or do nothing - it will auto-send when the timer runs out</li>
            </ul>

            <center>
                <a href="${data.review_url}" class="cta-button">Review Summary</a>
            </center>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                You can change your auto-publish settings anytime in your preferences.
            </p>
        </div>
    </div>
</body>
</html>`.trim()
}

/**
 * Main template router - selects gallery vs narrative based on render_style
 */
export function generateSummaryHtmlTemplate(data: SummaryEmailData): string {
  if (data.narrative.render_style === 'gallery') {
    return generateGalleryHtmlTemplate(data)
  } else {
    return generateNarrativeHtmlTemplate(data)
  }
}

export function generateReplyToAddress(summaryId: string, domain: string): string {
  return `summary-${summaryId}@${domain}`
}

export function extractSummaryIdFromReplyTo(replyToAddress: string): string | null {
  const match = replyToAddress.match(/summary-([a-f0-9-]{36})@/)
  return match ? match[1] : null
}
