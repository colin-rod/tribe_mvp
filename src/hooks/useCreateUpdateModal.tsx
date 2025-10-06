'use client'

import { useCallback, useMemo, useState } from 'react'
import CreateUpdateModal, { type UpdateType } from '@/components/updates/CreateUpdateModal'

interface UseCreateUpdateModalOptions {
  onUpdateSent?: () => void
  onUpdateScheduled?: () => void
}

export function useCreateUpdateModal(options: UseCreateUpdateModalOptions = {}) {
  const { onUpdateSent, onUpdateScheduled } = options
  const [open, setOpen] = useState(false)
  const [requestedType, setRequestedType] = useState<UpdateType>('photo')
  const [initialContent, setInitialContent] = useState<string | undefined>(undefined)

  const openModal = useCallback((type: UpdateType = 'photo', content?: string) => {
    setRequestedType(type)
    setInitialContent(content)
    setOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
  }, [])

  const modal = useMemo(() => (
    <CreateUpdateModal
      open={open}
      onClose={closeModal}
      onUpdateSent={onUpdateSent}
      onUpdateScheduled={onUpdateScheduled}
      initialType={requestedType}
      initialContent={initialContent}
    />
  ), [open, closeModal, onUpdateSent, onUpdateScheduled, requestedType, initialContent])

  return {
    openCreateUpdateModal: openModal,
    closeCreateUpdateModal: closeModal,
    isCreateUpdateModalOpen: open,
    createUpdateModal: modal
  }
}
