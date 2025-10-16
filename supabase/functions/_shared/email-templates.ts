import { EmailTemplateData } from './types.ts'

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

export function getMilestoneDisplayName(milestoneType: string): string {
  const milestoneMap: Record<string, string> = {
    'first_smile': 'First Smile',
    'rolling': 'Rolling Over',
    'sitting': 'Sitting Up',
    'crawling': 'Crawling',
    'first_steps': 'First Steps',
    'first_words': 'First Words',
    'first_tooth': 'First Tooth',
    'walking': 'Walking',
    'potty_training': 'Potty Training',
    'first_day_school': 'First Day of School',
    'birthday': 'Birthday',
    'other': 'Special Milestone'
  }
  return milestoneMap[milestoneType] || 'Special Milestone'
}

export function getPersonalizedGreeting(recipientName: string, relationship: string): string {
  const greetings: Record<string, string[]> = {
    'grandparent': [
      `Dear ${recipientName}`,
      `Hi ${recipientName}`,
      `Hello ${recipientName}`
    ],
    'parent': [
      `Hey ${recipientName}`,
      `Hi ${recipientName}`,
      `Hello ${recipientName}`
    ],
    'sibling': [
      `Hey ${recipientName}`,
      `Hi ${recipientName}`
    ],
    'friend': [
      `Hi ${recipientName}`,
      `Hey ${recipientName}`,
      `Hello ${recipientName}`
    ],
    'family': [
      `Hi ${recipientName}`,
      `Hello ${recipientName}`,
      `Dear ${recipientName}`
    ],
    'colleague': [
      `Hi ${recipientName}`,
      `Hello ${recipientName}`
    ],
    'other': [
      `Hi ${recipientName}`,
      `Hello ${recipientName}`
    ]
  }

  const options = greetings[relationship] || greetings['other']
  return options[0] // Use first option for consistency
}

export function generateHtmlTemplate(data: EmailTemplateData): string {
  const greeting = getPersonalizedGreeting(data.recipient_name, data.relationship)
  const milestoneTitle = data.milestone_type ? getMilestoneDisplayName(data.milestone_type) : null

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${milestoneTitle ? `${data.child_name}'s ${milestoneTitle}` : `Update about ${data.child_name}`}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #4a5568;
        }
        .milestone-badge {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            color: #0369a1;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            font-weight: 500;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .update-content {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }
        .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .media-item {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .media-item img {
            width: 100%;
            height: auto;
            display: block;
        }
        .footer {
            background: #f8fafc;
            padding: 20px 30px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
        .reply-note {
            background: #ecfdf5;
            border: 1px solid #bbf7d0;
            color: #166534;
            padding: 12px;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
            .header {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${milestoneTitle ? `${data.child_name}'s ${milestoneTitle}!` : `New update about ${data.child_name}`}</h1>
            <p>${data.child_name} is ${data.child_age}</p>
        </div>

        <div class="content">
            <div class="greeting">${greeting},</div>

            ${milestoneTitle ? `<div class="milestone-badge">🎉 ${milestoneTitle}</div>` : ''}

            ${data.content ? `
            <div class="update-content">
                ${data.content.replace(/\n/g, '<br>')}
            </div>
            ` : ''}

            ${data.media_urls && data.media_urls.length > 0 ? `
            <div class="media-grid">
                ${data.media_urls.map(url => `
                    <div class="media-item">
                        <img src="${url}" alt="Photo of ${data.child_name}" />
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <div class="reply-note">
                💬 Want to reply? Just hit reply to this email - your message will be shared with the family!
            </div>
        </div>

        <div class="footer">
            <p>Sent with ❤️ from Tribe</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">
                This email was sent to you because you're part of ${data.child_name}'s family circle.
            </p>
        </div>
    </div>
</body>
</html>`.trim()
}

export function generateTextTemplate(data: EmailTemplateData): string {
  const greeting = getPersonalizedGreeting(data.recipient_name, data.relationship)
  const milestoneTitle = data.milestone_type ? getMilestoneDisplayName(data.milestone_type) : null

  let text = `${greeting},\n\n`

  if (milestoneTitle) {
    text += `🎉 Exciting news! ${data.child_name} reached a special milestone: ${milestoneTitle}!\n\n`
  } else {
    text += `Here's a new update about ${data.child_name} (${data.child_age}):\n\n`
  }

  if (data.content) {
    text += `${data.content}\n\n`
  }

  if (data.media_urls && data.media_urls.length > 0) {
    text += `📸 Photos/Videos:\n`
    data.media_urls.forEach((url, index) => {
      text += `${index + 1}. ${url}\n`
    })
    text += '\n'
  }

  text += `💬 Want to reply? Just hit reply to this email - your message will be shared with the family!\n\n`
  text += `Sent with ❤️ from Tribe\n`
  text += `This email was sent to you because you're part of ${data.child_name}'s family circle.`

  return text
}

export function generateReplyToAddress(updateId: string, domain: string): string {
  // Generate a unique reply-to address for this update
  return `update-${updateId}@${domain}`
}

export function extractUpdateIdFromReplyTo(replyToAddress: string): string | null {
  const match = replyToAddress.match(/update-([a-f0-9-]{36})@/)
  return match ? match[1] : null
}

// Digest Email Template Types
export interface DigestEmailData {
  recipient_name: string
  relationship: string
  child_name: string
  digest_title: string
  digest_date: string
  updates: DigestUpdateEmailData[]
  narrative?: {
    intro: string
    narrative: string
    closing: string
    media_references: Array<{
      id: string
      reference_text: string
      url: string
      type: 'photo' | 'video' | 'audio'
    }>
  }
  reply_to_address: string
  digest_id: string
  unsubscribe_url?: string
}

export interface DigestUpdateEmailData {
  update_id: string
  content: string
  subject?: string
  child_name: string
  child_age: string
  milestone_type?: string
  media_urls: string[]
  created_at: string
  custom_caption?: string
}

export function generateDigestHtmlTemplate(data: DigestEmailData): string {
  const greeting = getPersonalizedGreeting(data.recipient_name, data.relationship)
  const formattedDate = new Date(data.digest_date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  // If we have an AI narrative, use that approach
  if (data.narrative) {
    return generateNarrativeDigestHtml(data, greeting, formattedDate)
  }

  // Otherwise, use traditional update-by-update approach
  return generateTraditionalDigestHtml(data, greeting, formattedDate)
}

function generateNarrativeDigestHtml(
  data: DigestEmailData,
  greeting: string,
  formattedDate: string
): string {
  const narrative = data.narrative!

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.digest_title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #4a5568;
        }
        .digest-badge {
            background: #fef3c7;
            border: 1px solid #fcd34d;
            color: #92400e;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            font-weight: 500;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .narrative-section {
            background: #f8fafc;
            padding: 24px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }
        .narrative-intro {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 16px;
            font-style: italic;
        }
        .narrative-body {
            font-size: 15px;
            color: #1e293b;
            line-height: 1.8;
            margin-bottom: 16px;
            white-space: pre-wrap;
        }
        .narrative-closing {
            font-size: 15px;
            color: #64748b;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
        }
        .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 24px 0;
        }
        .media-item {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .media-item img {
            width: 100%;
            height: auto;
            display: block;
        }
        .media-caption {
            font-size: 13px;
            color: #64748b;
            padding: 8px;
            background: #f8fafc;
        }
        .footer {
            background: #f8fafc;
            padding: 20px 30px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .reply-note {
            background: #ecfdf5;
            border: 1px solid #bbf7d0;
            color: #166534;
            padding: 12px;
            border-radius: 6px;
            margin-top: 24px;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
            .header {
                padding: 20px;
            }
            .narrative-section {
                padding: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${data.digest_title}</h1>
            <p>${formattedDate}</p>
        </div>

        <div class="content">
            <div class="greeting">${greeting},</div>

            <div class="digest-badge">📬 Your Digest for ${data.child_name}</div>

            <div class="narrative-section">
                ${narrative.intro ? `<div class="narrative-intro">${narrative.intro}</div>` : ''}

                <div class="narrative-body">${narrative.narrative}</div>

                ${narrative.closing ? `<div class="narrative-closing">${narrative.closing}</div>` : ''}
            </div>

            ${narrative.media_references && narrative.media_references.length > 0 ? `
            <div class="media-grid">
                ${narrative.media_references.map(media => `
                    <div class="media-item">
                        ${media.type === 'photo' ? `<img src="${media.url}" alt="Photo of ${data.child_name}" />` :
                          media.type === 'video' ? `<video controls style="width: 100%; border-radius: 8px;"><source src="${media.url}" /></video>` :
                          ''}
                        ${media.reference_text ? `<div class="media-caption">${media.reference_text}</div>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <div class="reply-note">
                💬 Want to reply? Just hit reply to this email - your message will be shared with the family!
            </div>
        </div>

        <div class="footer">
            <p>Sent with ❤️ from Tribe</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">
                This email was sent to you because you're part of ${data.child_name}'s family circle.
            </p>
            ${data.unsubscribe_url ? `<p style="margin: 10px 0 0 0; font-size: 12px;"><a href="${data.unsubscribe_url}">Manage email preferences</a></p>` : ''}
        </div>
    </div>
</body>
</html>`.trim()
}

function generateTraditionalDigestHtml(
  data: DigestEmailData,
  greeting: string,
  formattedDate: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.digest_title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #4a5568;
        }
        .digest-badge {
            background: #fef3c7;
            border: 1px solid #fcd34d;
            color: #92400e;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            font-weight: 500;
            font-size: 14px;
            margin-bottom: 24px;
        }
        .update-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .update-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        .update-meta {
            font-size: 13px;
            color: #64748b;
        }
        .milestone-badge {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            color: #0369a1;
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: 500;
            font-size: 12px;
        }
        .update-content {
            font-size: 15px;
            color: #1e293b;
            line-height: 1.7;
            margin: 12px 0;
            white-space: pre-wrap;
        }
        .custom-caption {
            background: #fef3c7;
            border-left: 3px solid #fcd34d;
            padding: 8px 12px;
            font-size: 14px;
            color: #78350f;
            margin-top: 12px;
            border-radius: 4px;
        }
        .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 12px;
        }
        .media-item {
            border-radius: 6px;
            overflow: hidden;
        }
        .media-item img {
            width: 100%;
            height: auto;
            display: block;
        }
        .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e2e8f0, transparent);
            margin: 24px 0;
        }
        .footer {
            background: #f8fafc;
            padding: 20px 30px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .reply-note {
            background: #ecfdf5;
            border: 1px solid #bbf7d0;
            color: #166534;
            padding: 12px;
            border-radius: 6px;
            margin-top: 24px;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
            .header {
                padding: 20px;
            }
            .update-card {
                padding: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${data.digest_title}</h1>
            <p>${formattedDate}</p>
        </div>

        <div class="content">
            <div class="greeting">${greeting},</div>

            <div class="digest-badge">📬 ${data.updates.length} Update${data.updates.length !== 1 ? 's' : ''} for ${data.child_name}</div>

            ${data.updates.map((update, index) => {
              const milestoneTitle = update.milestone_type ? getMilestoneDisplayName(update.milestone_type) : null
              const updateDate = new Date(update.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })

              return `
              <div class="update-card">
                  <div class="update-header">
                      <div class="update-meta">
                          ${update.child_name} • ${update.child_age} • ${updateDate}
                      </div>
                      ${milestoneTitle ? `<div class="milestone-badge">🎉 ${milestoneTitle}</div>` : ''}
                  </div>

                  ${update.subject ? `<div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #1e293b;">${update.subject}</div>` : ''}

                  <div class="update-content">${update.content || ''}</div>

                  ${update.custom_caption ? `<div class="custom-caption">✨ ${update.custom_caption}</div>` : ''}

                  ${update.media_urls && update.media_urls.length > 0 ? `
                  <div class="media-grid">
                      ${update.media_urls.map(url => `
                          <div class="media-item">
                              <img src="${url}" alt="Photo of ${update.child_name}" />
                          </div>
                      `).join('')}
                  </div>
                  ` : ''}
              </div>
              ${index < data.updates.length - 1 ? '<div class="divider"></div>' : ''}
              `
            }).join('')}

            <div class="reply-note">
                💬 Want to reply? Just hit reply to this email - your message will be shared with the family!
            </div>
        </div>

        <div class="footer">
            <p>Sent with ❤️ from Tribe</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">
                This email was sent to you because you're part of ${data.child_name}'s family circle.
            </p>
            ${data.unsubscribe_url ? `<p style="margin: 10px 0 0 0; font-size: 12px;"><a href="${data.unsubscribe_url}">Manage email preferences</a></p>` : ''}
        </div>
    </div>
</body>
</html>`.trim()
}

export function generateDigestTextTemplate(data: DigestEmailData): string {
  const greeting = getPersonalizedGreeting(data.recipient_name, data.relationship)
  const formattedDate = new Date(data.digest_date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  // If we have an AI narrative, use that approach
  if (data.narrative) {
    let text = `${greeting},\n\n`
    text += `📬 Your Digest for ${data.child_name} - ${formattedDate}\n\n`
    text += `${data.digest_title}\n`
    text += `${'='.repeat(data.digest_title.length)}\n\n`

    if (data.narrative.intro) {
      text += `${data.narrative.intro}\n\n`
    }

    text += `${data.narrative.narrative}\n\n`

    if (data.narrative.closing) {
      text += `${data.narrative.closing}\n\n`
    }

    if (data.narrative.media_references && data.narrative.media_references.length > 0) {
      text += `📸 Photos & Videos:\n`
      data.narrative.media_references.forEach((media, index) => {
        text += `${index + 1}. ${media.reference_text}\n   ${media.url}\n`
      })
      text += '\n'
    }

    text += `💬 Want to reply? Just hit reply to this email - your message will be shared with the family!\n\n`
    text += `Sent with ❤️ from Tribe\n`
    text += `This email was sent to you because you're part of ${data.child_name}'s family circle.`

    return text
  }

  // Traditional update-by-update approach
  let text = `${greeting},\n\n`
  text += `📬 Your Digest: ${data.digest_title}\n`
  text += `${formattedDate}\n\n`
  text += `Here are ${data.updates.length} update${data.updates.length !== 1 ? 's' : ''} about ${data.child_name}:\n\n`
  text += `${'='.repeat(60)}\n\n`

  data.updates.forEach((update, index) => {
    const milestoneTitle = update.milestone_type ? getMilestoneDisplayName(update.milestone_type) : null
    const updateDate = new Date(update.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })

    text += `Update ${index + 1}\n`
    text += `${update.child_name} • ${update.child_age} • ${updateDate}\n`
    if (milestoneTitle) {
      text += `🎉 ${milestoneTitle}\n`
    }
    text += `\n`

    if (update.subject) {
      text += `${update.subject}\n\n`
    }

    if (update.content) {
      text += `${update.content}\n`
    }

    if (update.custom_caption) {
      text += `\n✨ ${update.custom_caption}\n`
    }

    if (update.media_urls && update.media_urls.length > 0) {
      text += `\n📸 Photos/Videos:\n`
      update.media_urls.forEach((url, i) => {
        text += `${i + 1}. ${url}\n`
      })
    }

    text += `\n${'-'.repeat(60)}\n\n`
  })

  text += `💬 Want to reply? Just hit reply to this email - your message will be shared with the family!\n\n`
  text += `Sent with ❤️ from Tribe\n`
  text += `This email was sent to you because you're part of ${data.child_name}'s family circle.`

  return text
}

export function generateDigestReplyToAddress(digestId: string, domain: string): string {
  // Generate a unique reply-to address for this digest
  return `digest-${digestId}@${domain}`
}

export function extractDigestIdFromReplyTo(replyToAddress: string): string | null {
  const match = replyToAddress.match(/digest-([a-f0-9-]{36})@/)
  return match ? match[1] : null
}