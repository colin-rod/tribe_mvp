'use client'

import { useCallback, useMemo, useState } from 'react'
import CreateMemoryModal, { type MemoryType } from '@/components/updates/CreateMemoryModal'

interface UseCreateUpdateModalOptions {
  onMemorySent?: () => void
  onMemoryScheduled?: () => void
  // Legacy support
  onUpdateSent?: () => void
  onUpdateScheduled?: () => void
}

export function useCreateUpdateModal(options: UseCreateUpdateModalOptions = {}) {
  const {
    onMemorySent,
    onMemoryScheduled,
    onUpdateSent,
    onUpdateScheduled
  } = options

  // Support both new and legacy callback names
  const handleSent = onMemorySent || onUpdateSent
  const handleScheduled = onMemoryScheduled || onUpdateScheduled
  const [open, setOpen] = useState(false)
  const [requestedType, setRequestedType] = useState<MemoryType>('photo')
  const [initialContent, setInitialContent] = useState<string | undefined>(undefined)

  const openModal = useCallback((type: MemoryType = 'photo', content?: string) => {
    setRequestedType(type)
    setInitialContent(content)
    setOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
  }, [])

  const modal = useMemo(() => (
    <CreateMemoryModal
      open={open}
      onClose={closeModal}
      onUpdateSent={handleSent}
      onUpdateScheduled={handleScheduled}
      initialType={requestedType}
      initialContent={initialContent}
    />
  ), [open, closeModal, handleSent, handleScheduled, requestedType, initialContent])

  return {
    openCreateUpdateModal: openModal,
    closeCreateUpdateModal: closeModal,
    isCreateUpdateModalOpen: open,
    createUpdateModal: modal
  }
}
