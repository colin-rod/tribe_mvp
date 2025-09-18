'use client'

import { useState, useEffect } from 'react'
import { Child, getChildren } from '@/lib/children'
import { calculateAge, formatAgeShort } from '@/lib/age-utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import ChildImage from '@/components/ui/ChildImage'

interface ChildSelectorProps {
  selectedChildId?: string
  onChildSelect: (childId: string) => void
  placeholder?: string
  required?: boolean
}

export default function ChildSelector({
  selectedChildId,
  onChildSelect,
  placeholder = "Select a child",
  required: _required = false
}: ChildSelectorProps) {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadChildren()
  }, [])

  const loadChildren = async () => {
    try {
      setLoading(true)
      const childrenData = await getChildren()
      setChildren(childrenData)
    } catch (error) {
      console.error('Error loading children:', error)
      setError('Failed to load children')
    } finally {
      setLoading(false)
    }
  }

  const selectedChild = children.find(child => child.id === selectedChildId)

  const handleChildSelect = (childId: string) => {
    onChildSelect(childId)
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="sm" className="mr-2" />
        <span className="text-sm text-gray-600">Loading children...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-3 border border-red-300 rounded-md bg-red-50 text-red-600 text-sm">
        {error}
      </div>
    )
  }

  if (children.length === 0) {
    return (
      <div className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm">
        No children found. Add a child first.
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
      >
        <div className="flex items-center space-x-3">
          {selectedChild ? (
            <>
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                <ChildImage
                  childId={selectedChild.id}
                  photoUrl={selectedChild.profile_photo_url}
                  alt={`${selectedChild.name}'s profile`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{selectedChild.name}</p>
                <p className="text-xs text-gray-500">
                  {formatAgeShort(calculateAge(selectedChild.birth_date))}
                </p>
              </div>
            </>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {children.map((child) => {
              const age = calculateAge(child.birth_date)
              const isSelected = child.id === selectedChildId

              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleChildSelect(child.id)}
                  className={`w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                    isSelected ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    <ChildImage
                      childId={child.id}
                      photoUrl={child.profile_photo_url}
                      alt={`${child.name}'s profile`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{child.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatAgeShort(age)}
                    </p>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}