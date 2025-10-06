'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SnackbarProps {
  open: boolean
  message: string
  actionLabel?: string
  onAction?: () => void
  onClose: () => void
  duration?: number
  type?: 'info' | 'success' | 'warning' | 'error'
}

const typeClasses: Record<NonNullable<SnackbarProps['type']>, string> = {
  info: 'bg-neutral-900 text-white',
  success: 'bg-green-600 text-white',
  warning: 'bg-yellow-600 text-white',
  error: 'bg-red-600 text-white'
}

export function Snackbar({ open, message, actionLabel, onAction, onClose, duration = 5000, type = 'info' }: SnackbarProps) {
  useEffect(() => {
    if (!open) return
    const id = setTimeout(onClose, duration)
    return () => clearTimeout(id)
  }, [open, duration, onClose])

  if (!open) return null

  return (
    <div className="fixed bottom-4 right-4 z-[120]">
      <div className={cn('min-w-[280px] max-w-sm shadow-lg rounded-lg px-4 py-3 flex items-center gap-3', typeClasses[type])} role="status" aria-live="polite">
        <span className="flex-1 text-sm">{message}</span>
        {actionLabel && (
          <button
            className="text-sm font-semibold underline underline-offset-4"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
        <button className="ml-1/5 text-white/80 hover:text-white" aria-label="Dismiss" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  )
}

export default Snackbar

