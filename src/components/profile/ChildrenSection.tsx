'use client'

import { User } from '@supabase/supabase-js'
import ChildManager from '@/components/children/ChildManager'

interface ChildrenSectionProps {
  user: User
}

export function ChildrenSection({ user: _user }: ChildrenSectionProps) {
  return (
    <div className="p-6">
      <ChildManager />
    </div>
  )
}
