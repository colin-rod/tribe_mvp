export function validateAnalyzeRequest(data: any): boolean {
  return (
    typeof data.update_id === 'string' &&
    typeof data.content === 'string' &&
    typeof data.parent_id === 'string' &&
    typeof data.child_age_months === 'number' &&
    data.child_age_months >= 0 &&
    data.child_age_months <= 216 // Max 18 years
  )
}

export function validateDistributeEmailRequest(data: any): boolean {
  return (
    typeof data.update_id === 'string' &&
    Array.isArray(data.recipient_ids) &&
    data.recipient_ids.length > 0 &&
    data.recipient_ids.every((id: any) => typeof id === 'string' && id.length > 0)
  )
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function sanitizeContent(content: string): string {
  // Remove any potentially harmful content
  return content
    .trim()
    .substring(0, 2000) // Limit length
    .replace(/<[^>]*>/g, '') // Remove HTML tags
}

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization for email content
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}