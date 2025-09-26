'use client'

import { Child } from '@/lib/children'
import { calculateAge, formatAge } from '@/lib/age-utils'
import { Button } from '@/components/ui/Button'
import ChildImage from '@/components/ui/ChildImage'

interface ChildCardProps {
  child: Child
  onEdit: (child: Child) => void
  onDelete: (childId: string) => void
  showActions?: boolean
}

export default function ChildCard({ child, onEdit, onDelete, showActions = true }: ChildCardProps) {
  const age = calculateAge(child.birth_date)
  const formattedAge = formatAge(age)

  return (
    <div className="bg-white rounded-lg shadow p-6 relative hover:shadow-md transition-shadow">
      {showActions && (
        <div className="absolute top-4 right-4 flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(child)}
            className="p-2 h-8 w-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(child.id)}
            className="p-2 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      )}

      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
            <ChildImage
              childId={child.id}
              photoUrl={child.profile_photo_url}
              name={child.name}
              alt={`${child.name}'s profile`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {child.name}
          </h3>
          <p className="text-sm text-gray-600">
            {formattedAge} old
          </p>
          <p className="text-xs text-gray-500">
            Born {new Date(child.birth_date).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
