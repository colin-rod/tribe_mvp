'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('ChildManager')

import { useState, useEffect } from 'react'
import { Child, getChildren, deleteChild } from '@/lib/children'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import ChildCard from './ChildCard'
import AddChildForm from './AddChildForm'
import EditChildModal from './EditChildModal'

export default function ChildManager() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null)

  useEffect(() => {
    loadChildren()
  }, [])

  const loadChildren = async () => {
    try {
      setLoading(true)
      setError(null)
      const childrenData = await getChildren()
      setChildren(childrenData)
    } catch (error) {
      logger.errorWithStack('Error loading children:', error as Error)
      setError('Failed to load children. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChildAdded = (newChild: Child) => {
    setChildren(prev => [newChild, ...prev])
    setShowAddForm(false)
  }

  const handleChildUpdated = (updatedChild: Child) => {
    setChildren(prev =>
      prev.map(child => child.id === updatedChild.id ? updatedChild : child)
    )
    setEditingChild(null)
  }

  const handleDeleteChild = async (childId: string) => {
    if (!window.confirm('Are you sure you want to delete this child? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingChildId(childId)
      await deleteChild(childId)
      setChildren(prev => prev.filter(child => child.id !== childId))
    } catch (error) {
      logger.errorWithStack('Error deleting child:', error as Error)
      alert('Failed to delete child. Please try again.')
    } finally {
      setDeletingChildId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" className="mr-3" />
        <span className="text-lg text-gray-600">Loading children...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <Button variant="secondary" onClick={loadChildren}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Actions (header removed; controlled by parent ChildrenSection) */}
      {!showAddForm && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setShowAddForm(true)}>
            Add Child
          </Button>
        </div>
      )}

      {/* Add Child Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <AddChildForm
            onChildAdded={handleChildAdded}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Children List */}
      {children.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg bg-gray-50">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">No children yet</h3>
          <p className="text-sm text-gray-600 mb-6">
            Add your first child to start sharing updates with your circle.
          </p>
          {!showAddForm && (
            <Button variant="primary" onClick={() => setShowAddForm(true)}>
              Add Child
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => (
            <div key={child.id} className="relative">
              {deletingChildId === child.id && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                  <LoadingSpinner size="sm" />
                </div>
              )}
              <ChildCard
                child={child}
                onEdit={setEditingChild}
                onDelete={handleDeleteChild}
                showActions={true}
              />
            </div>
          ))}
        </div>
      )}

      {/* Edit Child Modal */}
      {editingChild && (
        <EditChildModal
          child={editingChild}
          onChildUpdated={handleChildUpdated}
          onClose={() => setEditingChild(null)}
        />
      )}
    </div>
  )
}
