/**
 * Email Template Renderer for Digests (CRO-267)
 * Renders AI-generated narratives into beautiful HTML email templates
 */

import type { DigestNarrative, ParentDigestNarrative, MediaReference } from './digest-ai.ts'

export interface DigestEmailData {
  narrative: DigestNarrative
  recipient_name: string
  child_name: string
  date_range: string
  preference_token?: string
  app_domain?: string
}

export interface ParentDigestPrintData {
  narrative: ParentDigestNarrative
  child_name: string
  child_photo_url?: string
  date_range: string
}

/**
 * Render recipient-facing digest email
 * Beautiful, warm email template for email/SMS/WhatsApp delivery
 */
export function renderRecipientDigestEmail(data: DigestEmailData): string {
  const {
    narrative,
    recipient_name,
    child_name,
    date_range,
    preference_token,
    app_domain = 'tribe-mvp.com'
  } = data

  const preferenceLink = preference_token
    ? `https://${app_domain}/preferences/${preference_token}`
    : null

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${child_name}'s Updates</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f9fafb;
      color: #111827;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
      padding: 40px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 16px;
    }
    .narrative {
      font-size: 16px;
      line-height: 1.75;
      color: #374151;
      margin: 0 0 24px;
      white-space: pre-wrap;
    }
    .media-section {
      margin: 32px 0;
      padding: 24px;
      background-color: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }
    .media-title {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 16px;
    }
    .media-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;
      padding: 12px;
      background-color: #ffffff;
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
      border: 1px solid #e5e7eb;
      transition: all 0.2s;
    }
    .media-item:hover {
      border-color: #f97316;
      box-shadow: 0 2px 8px rgba(249, 115, 22, 0.1);
    }
    .media-icon {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background-color: #fed7aa;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-size: 24px;
    }
    .media-text {
      flex: 1;
      font-size: 14px;
      color: #374151;
      line-height: 1.5;
    }
    .closing {
      font-size: 16px;
      line-height: 1.75;
      color: #374151;
      margin: 24px 0;
      font-style: italic;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #f97316;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin: 16px 0;
      transition: background-color 0.2s;
    }
    .cta-button:hover {
      background-color: #ea580c;
    }
    .footer {
      padding: 24px;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    .footer p {
      margin: 0 0 8px;
      font-size: 13px;
      color: #6b7280;
    }
    .footer a {
      color: #f97316;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${child_name}'s Updates</h1>
      <p>${date_range}</p>
    </div>

    <!-- Main Content -->
    <div class="content">
      <!-- Greeting -->
      <p class="greeting">${narrative.intro}</p>

      <!-- Narrative -->
      <div class="narrative">${narrative.narrative}</div>

      <!-- Media Section -->
      ${narrative.media_references.length > 0 ? `
      <div class="media-section">
        <div class="media-title">📸 Photos & Videos</div>
        ${narrative.media_references.map(media => renderMediaItem(media)).join('')}
      </div>
      ` : ''}

      <!-- Closing -->
      <p class="closing">${narrative.closing}</p>

      <!-- CTA Button -->
      <center>
        <a href="https://${app_domain}/updates?ref=digest" class="cta-button">
          View All Updates
        </a>
      </center>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>You're receiving this because you're part of ${child_name}'s family circle.</p>
      ${preferenceLink ? `
        <p><a href="${preferenceLink}">Update your preferences</a> | <a href="${preferenceLink}?action=unsubscribe">Unsubscribe</a></p>
      ` : ''}
      <p style="margin-top: 16px; font-size: 12px;">
        Sent with ❤️ by <a href="https://${app_domain}">Tribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`.trim()
}

/**
 * Render single media item
 */
function renderMediaItem(media: MediaReference): string {
  const icon = media.type === 'photo' ? '📷' : media.type === 'video' ? '🎬' : '🎵'

  return `
    <a href="${media.url}" class="media-item" target="_blank">
      <div class="media-icon">${icon}</div>
      <div class="media-text">${media.reference_text}</div>
    </a>
  `
}

/**
 * Render parent-facing digest for print/archival
 * Clean, print-friendly layout suitable for memory books
 */
export function renderParentDigestPrint(data: ParentDigestPrintData): string {
  const {
    narrative,
    child_name,
    child_photo_url,
    date_range
  } = data

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${narrative.title}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
      .page-break { page-break-after: always; }
    }

    body {
      margin: 0;
      padding: 40px;
      font-family: Georgia, 'Times New Roman', serif;
      background-color: #ffffff;
      color: #111827;
      max-width: 800px;
      margin: 0 auto;
    }
    .cover {
      text-align: center;
      padding: 60px 0;
      border-bottom: 3px double #d1d5db;
      margin-bottom: 40px;
    }
    .cover-photo {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 24px;
      border: 4px solid #f97316;
    }
    h1 {
      font-size: 36px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px;
      letter-spacing: -1px;
    }
    .subtitle {
      font-size: 18px;
      color: #6b7280;
      font-style: italic;
    }
    .intro {
      font-size: 18px;
      line-height: 1.8;
      color: #374151;
      margin: 32px 0;
      text-align: justify;
    }
    .narrative {
      font-size: 16px;
      line-height: 1.9;
      color: #111827;
      margin: 32px 0;
      text-align: justify;
      white-space: pre-wrap;
    }
    .media-gallery {
      margin: 48px 0;
      padding: 32px;
      background-color: #f9fafb;
      border-radius: 8px;
    }
    .gallery-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 24px;
      color: #111827;
      text-align: center;
    }
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .media-card {
      padding: 16px;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      text-align: center;
    }
    .media-type {
      font-size: 32px;
      margin-bottom: 8px;
    }
    .media-caption {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.5;
    }
    .closing {
      font-size: 16px;
      line-height: 1.8;
      color: #374151;
      margin: 48px 0 32px;
      text-align: center;
      font-style: italic;
      padding: 24px;
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
    }
    .signature {
      text-align: right;
      font-size: 18px;
      color: #111827;
      margin-top: 48px;
      font-family: 'Brush Script MT', cursive;
    }
    .print-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 24px;
      background-color: #f97316;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
    }
    .print-button:hover {
      background-color: #ea580c;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover">
    ${child_photo_url ? `
      <img src="${child_photo_url}" alt="${child_name}" class="cover-photo">
    ` : ''}
    <h1>${narrative.title}</h1>
    <p class="subtitle">${date_range}</p>
  </div>

  <!-- Introduction -->
  <div class="intro">
    ${narrative.intro}
  </div>

  <!-- Main Narrative -->
  <div class="narrative">
    ${narrative.narrative}
  </div>

  <!-- Media Gallery -->
  ${narrative.media_references.length > 0 ? `
  <div class="media-gallery page-break">
    <div class="gallery-title">Captured Moments</div>
    <div class="media-grid">
      ${narrative.media_references.map(media => `
        <div class="media-card">
          <div class="media-type">
            ${media.type === 'photo' ? '📷' : media.type === 'video' ? '🎬' : '🎵'}
          </div>
          <div class="media-caption">${media.reference_text}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Closing -->
  <div class="closing">
    ${narrative.closing}
  </div>

  <div class="signature">
    With love,<br>
    ${child_name}'s Family ❤️
  </div>

  <!-- Print Button (hidden when printing) -->
  <button class="print-button no-print" onclick="window.print()">
    🖨️ Print This Digest
  </button>
</body>
</html>
`.trim()
}

/**
 * Render SMS/WhatsApp text version (plain text)
 */
export function renderRecipientDigestSMS(data: DigestEmailData): string {
  const { narrative, child_name, date_range } = data

  let text = `${narrative.intro}\n\n`
  text += `${narrative.narrative}\n\n`

  if (narrative.media_references.length > 0) {
    text += `📸 Photos & Videos:\n`
    narrative.media_references.forEach((media, i) => {
      text += `${i + 1}. ${media.reference_text}\n   ${media.url}\n\n`
    })
  }

  text += `${narrative.closing}\n\n`
  text += `---\n`
  text += `${child_name}'s Updates | ${date_range}`

  return text
}
