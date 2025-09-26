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

  const openModal = useCallback((type: UpdateType = 'photo') => {
    setRequestedType(type)
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
    />
  ), [open, closeModal, onUpdateSent, onUpdateScheduled, requestedType])

  return {
    openCreateUpdateModal: openModal,
    closeCreateUpdateModal: closeModal,
    isCreateUpdateModalOpen: open,
    createUpdateModal: modal
  }
}
