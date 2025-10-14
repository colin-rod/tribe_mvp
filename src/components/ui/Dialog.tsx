'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
}

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined)

function useDialogContext(component: string) {
  const context = React.useContext(DialogContext)

  if (!context) {
    throw new Error(`${component} must be used within a Dialog`)
  }

  return context
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
        {/* Content */}
        {children}
      </div>
    </DialogContext.Provider>
  )
}

const DialogContent: React.FC<DialogContentProps> = ({
  children,
  className = '',
  maxWidth = '2xl'
}) => {
  const { open } = useDialogContext('DialogContent')
  const focusTrapRef = useFocusTrap<HTMLDivElement>(open)

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full'
  }

  return (
    <div
      ref={focusTrapRef}
      className={cn(
        'relative z-50 w-full mx-4 bg-white rounded-lg shadow-xl overflow-hidden',
        maxWidthClasses[maxWidth],
        className
      )}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  )
}

const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={cn('flex items-start justify-between p-6 border-b border-gray-200', className)}>
      {children}
    </div>
  )
}

const DialogTitle: React.FC<DialogTitleProps> = ({ children, className = '' }) => {
  return (
    <h2 className={cn('text-xl font-semibold text-gray-900', className)}>
      {children}
    </h2>
  )
}

const DialogDescription: React.FC<DialogDescriptionProps> = ({ children, className = '' }) => {
  return (
    <p className={cn('mt-1 text-sm text-gray-600', className)}>
      {children}
    </p>
  )
}

interface DialogCloseProps {
  onClick?: () => void
  disabled?: boolean
  className?: string
}

const DialogClose: React.FC<DialogCloseProps> = ({ onClick, disabled = false, className = '' }) => {
  const { onOpenChange } = useDialogContext('DialogClose')

  const handleClick = () => {
    if (disabled) {
      return
    }

    onClick?.()
    onOpenChange(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      aria-label="Close dialog"
    >
      <X className="w-5 h-5" />
    </button>
  )
}

const DialogBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => {
  return (
    <div className={cn('p-6 overflow-y-auto max-h-[calc(100vh-200px)]', className)}>
      {children}
    </div>
  )
}

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogBody
}
