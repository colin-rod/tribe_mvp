'use client'

import { User } from '@supabase/supabase-js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@/components/ui/Dialog'
import { ProfileManager } from './ProfileManager'

interface ProfileModalProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent maxWidth="5xl" className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Profile & Settings</DialogTitle>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>
        <DialogBody className="flex-1 p-0">
          <ProfileManager />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
