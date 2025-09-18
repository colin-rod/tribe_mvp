'use client'

import { useState, useEffect } from 'react'
import {
  Recipient,
  getRecipients,
  deleteRecipient,
  bulkUpdateRecipients,
  resendPreferenceLink,
  RecipientFilters
} from '@/lib/recipients'
import { RecipientGroup, getUserGroups } from '@/lib/recipient-groups'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import AddRecipientForm from './AddRecipientForm'
import RecipientCard from './RecipientCard'
import RecipientSearch from './RecipientSearch'
import RecipientEditor from './RecipientEditor'

interface RecipientManagerProps {
  selectedGroupId?: string
}

type ViewMode = 'list' | 'add' | 'import'

export default function RecipientManager({ selectedGroupId }: RecipientManagerProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [groups, setGroups] = useState<RecipientGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set())
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null)
  const [filters, setFilters] = useState<RecipientFilters>({
    group_id: selectedGroupId,
    is_active: true // Default to showing only active recipients
  })
  const [bulkOperation, setBulkOperation] = useState<string>('')
  const [bulkLoading, setBulkLoading] = useState(false)

  // Load data on component mount and when filters change
  useEffect(() => {
    loadData()
  }, [filters])

  // Update filters when selectedGroupId changes
  useEffect(() => {
    if (selectedGroupId && selectedGroupId !== filters.group_id) {
      setFilters(prev => ({ ...prev, group_id: selectedGroupId }))
    }
  }, [selectedGroupId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [recipientsData, groupsData] = await Promise.all([
        getRecipients(filters),
        getUserGroups()
      ])

      setRecipients(recipientsData)
      setGroups(groupsData)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load recipients. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRecipientAdded = (newRecipient: Recipient) => {
    setRecipients(prev => [newRecipient, ...prev])
    setViewMode('list')
  }

  const handleRecipientUpdated = (updatedRecipient: Recipient) => {
    setRecipients(prev =>
      prev.map(r => r.id === updatedRecipient.id ? updatedRecipient : r)
    )
    setEditingRecipient(null)
  }

  const handleDeleteRecipient = async (recipientId: string) => {
    if (!confirm('Are you sure you want to delete this recipient? They will no longer receive updates.')) {
      return
    }

    try {
      await deleteRecipient(recipientId)
      setRecipients(prev => prev.filter(r => r.id !== recipientId))
      setSelectedRecipients(prev => {
        const updated = new Set(prev)
        updated.delete(recipientId)
        return updated
      })
    } catch (error) {
      console.error('Error deleting recipient:', error)
      alert('Failed to delete recipient. Please try again.')
    }
  }

  const handleSendPreferenceLink = async (recipientId: string) => {
    try {
      await resendPreferenceLink(recipientId)
      alert('Preference link sent successfully!')
    } catch (error) {
      console.error('Error sending preference link:', error)
      alert('Failed to send preference link. Please try again.')
    }
  }

  const handleSelectRecipient = (recipientId: string, selected: boolean) => {
    setSelectedRecipients(prev => {
      const updated = new Set(prev)
      if (selected) {
        updated.add(recipientId)
      } else {
        updated.delete(recipientId)
      }
      return updated
    })
  }

  const handleSelectAll = () => {
    if (selectedRecipients.size === recipients.length) {
      setSelectedRecipients(new Set())
    } else {
      setSelectedRecipients(new Set(recipients.map(r => r.id)))
    }
  }

  const handleBulkOperation = async () => {
    if (selectedRecipients.size === 0 || !bulkOperation) return

    const recipientIds = Array.from(selectedRecipients)

    try {
      setBulkLoading(true)

      switch (bulkOperation) {
        case 'delete':
          if (!confirm(`Are you sure you want to delete ${recipientIds.length} recipients?`)) {
            return
          }
          await Promise.all(recipientIds.map(id => deleteRecipient(id)))
          setRecipients(prev => prev.filter(r => !recipientIds.includes(r.id)))
          break

        case 'deactivate':
          await bulkUpdateRecipients(recipientIds, { is_active: false })
          loadData() // Reload to reflect changes
          break

        case 'reactivate':
          await bulkUpdateRecipients(recipientIds, { is_active: true })
          loadData() // Reload to reflect changes
          break

        case 'send_links':
          const emailRecipients = recipients.filter(r =>
            recipientIds.includes(r.id) && r.email && r.is_active
          )
          await Promise.all(emailRecipients.map(r => resendPreferenceLink(r.id)))
          alert(`Preference links sent to ${emailRecipients.length} recipients with email addresses.`)
          break

        default:
          break
      }

      setSelectedRecipients(new Set())
      setBulkOperation('')
    } catch (error) {
      console.error('Error performing bulk operation:', error)
      alert('Failed to perform bulk operation. Please try again.')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleClearFilters = () => {
    setFilters({ is_active: true })
  }

  const handleExportRecipients = () => {
    const csvHeaders = ['Name', 'Email', 'Phone', 'Relationship', 'Group', 'Frequency', 'Channels', 'Status']
    const csvData = recipients.map(r => [
      r.name,
      r.email || '',
      r.phone || '',
      r.relationship,
      r.group?.name || 'Unassigned',
      r.frequency,
      r.preferred_channels.join(';'),
      r.is_active ? 'Active' : 'Inactive'
    ])

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recipients-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (viewMode === 'add') {
    return (
      <AddRecipientForm
        onRecipientAdded={handleRecipientAdded}
        onCancel={() => setViewMode('list')}
        selectedGroupId={selectedGroupId}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipient Management</h1>
          <p className="text-gray-600">
            Manage your family and friends who receive baby updates
          </p>
        </div>
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={handleExportRecipients}
            disabled={recipients.length === 0}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </Button>
          <Button onClick={() => setViewMode('add')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Recipient
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <RecipientSearch
        groups={groups}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
        totalResults={recipients.length}
        loading={loading}
      />

      {/* Bulk Operations */}
      {selectedRecipients.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedRecipients.size} recipient{selectedRecipients.size !== 1 ? 's' : ''} selected
              </span>
              <select
                value={bulkOperation}
                onChange={(e) => setBulkOperation(e.target.value)}
                className="rounded-md border border-blue-300 bg-white px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={bulkLoading}
              >
                <option value="">Choose action...</option>
                <option value="delete">Delete selected</option>
                <option value="deactivate">Deactivate selected</option>
                <option value="reactivate">Reactivate selected</option>
                <option value="send_links">Send preference links</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRecipients(new Set())}
                disabled={bulkLoading}
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                onClick={handleBulkOperation}
                disabled={!bulkOperation || bulkLoading}
              >
                {bulkLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  'Apply'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recipients List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : recipients.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {Object.keys(filters).some(key => filters[key as keyof RecipientFilters] !== undefined && key !== 'is_active')
              ? 'No recipients match your filters'
              : 'No recipients yet'
            }
          </h3>
          <p className="mt-2 text-gray-600">
            {Object.keys(filters).some(key => filters[key as keyof RecipientFilters] !== undefined && key !== 'is_active')
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first recipient to share baby updates with.'
            }
          </p>
          <div className="mt-6 space-x-4">
            {Object.keys(filters).some(key => filters[key as keyof RecipientFilters] !== undefined && key !== 'is_active') && (
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
            <Button onClick={() => setViewMode('add')}>
              Add Your First Recipient
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* List Controls */}
          <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRecipients.size === recipients.length && recipients.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-600 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({recipients.length})
                </span>
              </label>
            </div>
            <div className="text-sm text-gray-600">
              Showing {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Recipients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipients.map((recipient) => (
              <RecipientCard
                key={recipient.id}
                recipient={recipient}
                onEdit={setEditingRecipient}
                onDelete={handleDeleteRecipient}
                onSendPreferenceLink={handleSendPreferenceLink}
                isSelected={selectedRecipients.has(recipient.id)}
                onSelect={handleSelectRecipient}
              />
            ))}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingRecipient && (
        <RecipientEditor
          recipient={editingRecipient}
          onRecipientUpdated={handleRecipientUpdated}
          onCancel={() => setEditingRecipient(null)}
          isOpen={!!editingRecipient}
        />
      )}
    </div>
  )
}