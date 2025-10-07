import type { MemoryStatus } from '../validation/memory'

/**
 * Get display text for memory status
 */
export function getStatusDisplayText(status: MemoryStatus): string {
  const statusMap: Record<MemoryStatus, string> = {
    'new': 'New',
    'approved': 'Ready',
    'compiled': 'In Summary',
    'sent': 'Sent',
    'failed': 'Failed'
  }
  return statusMap[status] || status
}

/**
 * Get color class for memory status badge
 */
export function getStatusColorClass(status: MemoryStatus): string {
  const colorMap: Record<MemoryStatus, string> = {
    'new': 'bg-blue-100 text-blue-800 border-blue-200',
    'approved': 'bg-green-100 text-green-800 border-green-200',
    'compiled': 'bg-purple-100 text-purple-800 border-purple-200',
    'sent': 'bg-gray-100 text-gray-800 border-gray-200',
    'failed': 'bg-red-100 text-red-800 border-red-200'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800 border-gray-200'
}

/**
 * Get icon for memory status
 */
export function getStatusIcon(status: MemoryStatus): string {
  const iconMap: Record<MemoryStatus, string> = {
    'new': '✨', // Sparkles for new
    'approved': '✓', // Check for approved
    'compiled': '📦', // Package for compiled
    'sent': '✉️', // Envelope for sent
    'failed': '⚠️' // Warning for failed
  }
  return iconMap[status] || ''
}

/**
 * Check if memory should show "New" badge
 */
export function shouldShowNewBadge(isNew: boolean, status: MemoryStatus): boolean {
  return isNew && status === 'new'
}

/**
 * Get action button text based on status
 */
export function getMemoryActionText(status: MemoryStatus): string {
  const actionMap: Record<MemoryStatus, string> = {
    'new': 'Mark as Ready',
    'approved': 'Ready for Summary',
    'compiled': 'In Summary',
    'sent': 'Sent',
    'failed': 'Retry'
  }
  return actionMap[status] || 'View'
}

/**
 * Check if memory can be approved
 */
export function canApproveMemory(status: MemoryStatus): boolean {
  return status === 'new'
}

/**
 * Check if memory can be edited
 */
export function canEditMemory(status: MemoryStatus): boolean {
  // Can edit if not sent or failed
  return status !== 'sent' && status !== 'failed'
}

/**
 * Check if memory can be deleted
 */
export function canDeleteMemory(status: MemoryStatus): boolean {
  // Can delete if not sent
  return status !== 'sent'
}

/**
 * Get status progression info (for UI hints)
 */
export function getStatusProgression(status: MemoryStatus): {
  current: string
  next?: string
  description: string
} {
  const progressionMap: Record<MemoryStatus, { current: string; next?: string; description: string }> = {
    'new': {
      current: 'New Memory',
      next: 'Ready',
      description: 'Mark as ready to include in next summary'
    },
    'approved': {
      current: 'Ready',
      next: 'In Summary',
      description: 'Will be included in next weekly summary'
    },
    'compiled': {
      current: 'In Summary',
      next: 'Sent',
      description: 'Included in summary awaiting approval'
    },
    'sent': {
      current: 'Sent',
      description: 'Successfully sent to recipients'
    },
    'failed': {
      current: 'Failed',
      next: 'Retry',
      description: 'Failed to send, please try again'
    }
  }
  return progressionMap[status] || {
    current: status,
    description: 'Unknown status'
  }
}
