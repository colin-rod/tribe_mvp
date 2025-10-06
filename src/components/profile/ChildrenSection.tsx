'use client'

import { User } from '@supabase/supabase-js'
import ChildManager from '@/components/children/ChildManager'

// Children tab should visually match other Profile tabs.
// Add a consistent header block (title + description)
// and keep content spacing aligned with other sections.

interface ChildrenSectionProps {
  user: User
}

export function ChildrenSection({ user: _user }: ChildrenSectionProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Children</h2>
        <p className="text-sm text-gray-600">
          Manage your children’s profiles, photos, and basic information.
        </p>
      </div>

      <ChildManager />
    </div>
  )
}
