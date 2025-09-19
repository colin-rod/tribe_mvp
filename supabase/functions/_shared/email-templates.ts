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