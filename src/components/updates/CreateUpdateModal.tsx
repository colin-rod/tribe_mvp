'use client'

import { useCallback } from 'react'
import CreateUpdateWizard from './CreateUpdateWizard'

export type UpdateType = 'photo' | 'text' | 'video' | 'milestone'

interface CreateUpdateModalProps {
  open: boolean
  onClose: () => void
  onUpdateSent?: () => void
  onUpdateScheduled?: () => void
  initialType?: UpdateType
}

export default function CreateUpdateModal({
  open,
  onClose,
  onUpdateSent,
  onUpdateScheduled
}: CreateUpdateModalProps) {
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
        <CreateUpdateWizard
          variant="modal"
          onCancel={onClose}
          onSent={handleSent}
          onScheduled={handleScheduled}
        />
      </div>
    </div>
  )
}
