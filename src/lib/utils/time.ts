/**
 * Time utilities for displaying relative timestamps
 */

export function getTimeAgo(date: Date | string): string {
  const now = new Date()
  const past = new Date(date)
  const diffInMs = now.getTime() - past.getTime()
  const diffInSeconds = Math.floor(diffInMs / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)
  const diffInWeeks = Math.floor(diffInDays / 7)
  const diffInMonths = Math.floor(diffInDays / 30)
  const diffInYears = Math.floor(diffInDays / 365)

  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`
  } else {
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`
  }
}

export function formatTimestamp(date: Date | string, options: {
  includeTime?: boolean
  format?: 'short' | 'medium' | 'long'
} = {}): string {
  const { includeTime = false, format = 'medium' } = options
  const d = new Date(date)

  if (format === 'short') {
    const month = d.getMonth() + 1
    const day = d.getDate()
    const year = d.getFullYear()
    const time = includeTime ? ` ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''
    return `${month}/${day}/${year}${time}`
  } else if (format === 'long') {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
    if (includeTime) {
      options.hour = 'numeric'
      options.minute = '2-digit'
      options.hour12 = true
    }
    return d.toLocaleDateString('en-US', options)
  } else {
    // medium format (default)
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
    if (includeTime) {
      options.hour = 'numeric'
      options.minute = '2-digit'
      options.hour12 = true
    }
    return d.toLocaleDateString('en-US', options)
  }
}

export function isToday(date: Date | string): boolean {
  const today = new Date()
  const checkDate = new Date(date)

  return today.getDate() === checkDate.getDate() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getFullYear() === checkDate.getFullYear()
}

export function isYesterday(date: Date | string): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const checkDate = new Date(date)

  return yesterday.getDate() === checkDate.getDate() &&
    yesterday.getMonth() === checkDate.getMonth() &&
    yesterday.getFullYear() === checkDate.getFullYear()
}

export function isThisWeek(date: Date | string): boolean {
  const now = new Date()
  const checkDate = new Date(date)
  const diffInMs = now.getTime() - checkDate.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  return diffInDays <= 7
}