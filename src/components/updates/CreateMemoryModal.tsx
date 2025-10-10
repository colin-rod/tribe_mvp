'use client'

import { useCallback } from 'react'
import CreateMemoryWizard from './CreateMemoryWizard'

export type MemoryType = 'photo' | 'text' | 'video' | 'milestone'

interface CreateMemoryModalProps {
  open: boolean
  onClose: () => void
  onUpdateSent?: () => void  // Keep name for backward compatibility
  onUpdateScheduled?: () => void  // Keep name for backward compatibility
  initialType?: MemoryType
  initialContent?: string
}

export default function CreateMemoryModal({
  open,
  onClose,
  onUpdateSent,
  onUpdateScheduled,
  initialContent
}: CreateMemoryModalProps) {
  const handleSent = useCallback(() => {
    onUpdateSent?.()
    onClose()
  }, [onUpdateSent, onClose])

  const handleScheduled = useCallback(() => {
    onUpdateScheduled?.()
    onClose()
  }, [onUpdateScheduled, onClose])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        <CreateMemoryWizard
          variant="modal"
          onCancel={onClose}
          onMemorySent={handleSent}
          onMemoryScheduled={handleScheduled}
          initialContent={initialContent}
        />
      </div>
    </div>
  )
}
