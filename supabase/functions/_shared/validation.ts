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

export function sanitizeContent(content: string): string {
  // Remove any potentially harmful content
  return content
    .trim()
    .substring(0, 2000) // Limit length
    .replace(/<[^>]*>/g, '') // Remove HTML tags
}