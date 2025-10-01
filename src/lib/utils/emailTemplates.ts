/**
 * Frontend Email Template Renderer for Digests
 * Mirrors the backend digest-templates.ts for preview rendering
 */

import type { DigestNarrative, MediaReference } from '@/lib/types/digest'

export interface DigestEmailData {
  narrative: DigestNarrative
  recipient_name: string
  child_name: string
  date_range: string
  app_domain?: string
}

/**
 * Render recipient-facing digest email for preview
 */
export function renderRecipientDigestEmail(data: DigestEmailData): string {
  const {
    narrative,
    child_name,
    date_range,
    app_domain = 'tribe-mvp.com'
  } = data

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
