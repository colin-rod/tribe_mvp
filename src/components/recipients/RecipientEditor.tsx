'use client'

import { useState, useEffect, useCallback } from 'react'
import { ZodError } from 'zod'
import { createLogger } from '@/lib/logger'
import { Recipient, updateRecipient } from '@/lib/recipients'
import { RecipientGroup, getUserGroups } from '@/lib/recipient-groups'
import {
  updateRecipientSchema,
  UpdateRecipientFormData,
  RELATIONSHIP_OPTIONS,
  FREQUENCY_OPTIONS,
  CHANNEL_OPTIONS,
  CONTENT_TYPE_OPTIONS
} from '@/lib/validation/recipients'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const logger = createLogger('RecipientEditor')

interface RecipientEditorProps {
  recipient: Recipient
  onRecipientUpdated: (recipient: Recipient) => void
  onCancel: () => void
  isOpen: boolean
}

export default function RecipientEditor({
  recipient,
  onRecipientUpdated,
  onCancel,
  isOpen
}: RecipientEditorProps) {
  const [formData, setFormData] = useState<UpdateRecipientFormData>({
    name: recipient.name,
    email: recipient.email || '',
    phone: recipient.phone || '',
    relationship: recipient.relationship,
    group_id: recipient.group_id || '',
    frequency: recipient.frequency,
    preferred_channels: recipient.preferred_channels,
    content_types: recipient.content_types
  })
  const [groups, setGroups] = useState<RecipientGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const loadGroups = useCallback(async () => {
    try {
      setLoadingGroups(true)
      const userGroups = await getUserGroups()
      setGroups(userGroups)
    } catch (error) {
      logger.errorWithStack('Error loading groups:', error as Error)
      setErrors({ general: 'Failed to load groups. Please refresh the page.' })
    } finally {
      setLoadingGroups(false)
    }
  }, [])

  // Load user groups on component mount
  useEffect(() => {
    if (isOpen) {
      void loadGroups()
    }
  }, [isOpen, loadGroups])

  // Reset form when recipient changes
  useEffect(() => {
    setFormData({
      name: recipient.name,
      email: recipient.email || '',
      phone: recipient.phone || '',
      relationship: recipient.relationship,
      group_id: recipient.group_id || '',
      frequency: recipient.frequency,
      preferred_channels: recipient.preferred_channels,
      content_types: recipient.content_types
    })
    setErrors({})
  }, [recipient])

  type RelationshipOptionValue = typeof RELATIONSHIP_OPTIONS[number]['value']
  type FrequencyOptionValue = typeof FREQUENCY_OPTIONS[number]['value']

  const validateForm = (): boolean => {
    const formErrors: Record<string, string> = {}

    // Validate required fields
    if (!formData.name?.trim()) {
      formErrors.name = 'Name is required'
    }

    // Validate contact method
    if (!formData.email?.trim() && !formData.phone?.trim()) {
      formErrors.contact = 'Either email or phone number is required'
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      formErrors.email = 'Invalid email address'
    }

    // Validate phone format if provided
    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone)) {
      formErrors.phone = 'Invalid phone number format'
    }

    // Validate preferences
    if (!formData.preferred_channels || formData.preferred_channels.length === 0) {
      formErrors.preferred_channels = 'At least one communication channel is required'
    }

    if (!formData.content_types || formData.content_types.length === 0) {
      formErrors.content_types = 'At least one content type is required'
    }

    // Validate channel requirements
    if (formData.preferred_channels?.includes('sms') || formData.preferred_channels?.includes('whatsapp')) {
      if (!formData.phone?.trim()) {
        formErrors.phone = 'Phone number is required for SMS or WhatsApp notifications'
      }
    }

    if (formData.preferred_channels?.includes('email') && !formData.email?.trim()) {
      formErrors.email = 'Email address is required for email notifications'
    }

    setErrors(formErrors)
    return Object.keys(formErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      // Create update object with only changed fields
      const updates: UpdateRecipientFormData = {}

      if (formData.name !== recipient.name) updates.name = formData.name?.trim()
      if (formData.email !== (recipient.email || '')) updates.email = formData.email?.trim() || undefined
      if (formData.phone !== (recipient.phone || '')) updates.phone = formData.phone?.trim() || undefined
      if (formData.relationship !== recipient.relationship) updates.relationship = formData.relationship
      if (formData.group_id !== (recipient.group_id || '')) updates.group_id = formData.group_id || undefined
      if (formData.frequency !== recipient.frequency) updates.frequency = formData.frequency
      if (JSON.stringify(formData.preferred_channels?.sort()) !== JSON.stringify(recipient.preferred_channels.sort())) {
        updates.preferred_channels = formData.preferred_channels
      }
      if (JSON.stringify(formData.content_types?.sort()) !== JSON.stringify(recipient.content_types.sort())) {
        updates.content_types = formData.content_types
      }

      // Only update if there are changes
      if (Object.keys(updates).length === 0) {
        onCancel()
        return
      }

      // Validate with schema
      updateRecipientSchema.parse(updates)

      const updatedRecipient = await updateRecipient(recipient.id, updates)
      onRecipientUpdated(updatedRecipient)
    } catch (error: unknown) {
      logger.errorWithStack('Error updating recipient', error instanceof Error ? error : new Error('Unknown error'))
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {}
        error.issues.forEach(issue => {
          if (issue.path && issue.path.length > 0) {
            newErrors[String(issue.path[0])] = issue.message
          }
        })
        setErrors(newErrors)
      } else {
        setErrors({
          general: error instanceof Error ? error.message : 'Failed to update recipient. Please try again.'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChannelToggle = (channel: 'email' | 'sms' | 'whatsapp') => {
    if (!formData.preferred_channels) return

    setFormData(prev => ({
      ...prev,
      preferred_channels: prev.preferred_channels?.includes(channel)
        ? prev.preferred_channels.filter(c => c !== channel)
        : [...(prev.preferred_channels || []), channel]
    }))
  }

  const handleContentTypeToggle = (contentType: 'photos' | 'text' | 'milestones') => {
    if (!formData.content_types) return

    setFormData(prev => ({
      ...prev,
      content_types: prev.content_types?.includes(contentType)
        ? prev.content_types.filter(ct => ct !== contentType)
        : [...(prev.content_types || []), contentType]
    }))
  }

  const selectedGroup = groups.find(g => g.id === formData.group_id)

  // Check if current settings override group defaults
  const hasOverrides = selectedGroup && (
    formData.frequency !== selectedGroup.default_frequency ||
    JSON.stringify(formData.preferred_channels?.sort()) !== JSON.stringify(selectedGroup.default_channels.sort())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onCancel}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Edit Recipient</h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* General Error */}
            {errors.general && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {loadingGroups ? (
              <div className="flex items-center justify-center p-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>

                  {/* Name */}
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter recipient's full name"
                      disabled={loading}
                      className={errors.name ? 'border-red-300' : ''}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* Contact Method Error */}
                  {errors.contact && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-700">{errors.contact}</p>
                    </div>
                  )}

                  {/* Email */}
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                      disabled={loading}
                      className={errors.email ? 'border-red-300' : ''}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="mb-4">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number (e.g., +1234567890)"
                      disabled={loading}
                      className={errors.phone ? 'border-red-300' : ''}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Relationship *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {RELATIONSHIP_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="relationship"
                            value={option.value}
                            checked={formData.relationship === option.value}
                            onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value as RelationshipOptionValue }))}
                            disabled={loading}
                            className="text-primary-600 focus:ring-primary-600 border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-900">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>

                  {/* Group Assignment */}
                  <div className="mb-6">
                    <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-2">
                      Assign to Group *
                    </label>
                    <select
                      id="group"
                      value={formData.group_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, group_id: e.target.value }))}
                      disabled={loading}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                    >
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.recipient_count} recipients)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Override Indicator */}
                  {hasOverrides && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                        </svg>
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">Custom Settings:</span> This recipient has personalized preferences that override the group defaults.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Frequency */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Notification Frequency *
                    </label>
                    <div className="space-y-3">
                      {FREQUENCY_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="frequency"
                            value={option.value}
                            checked={formData.frequency === option.value}
                            onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as FrequencyOptionValue }))}
                            disabled={loading}
                            className="mt-1 text-primary-600 focus:ring-primary-600 border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{option.label}</div>
                            <div className="text-xs text-gray-600">{option.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {selectedGroup && selectedGroup.default_frequency !== formData.frequency && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs text-blue-700">
                          <span className="font-medium">Override:</span> Group default is {FREQUENCY_OPTIONS.find(o => o.value === selectedGroup.default_frequency)?.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Communication Channels */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Communication Channels *
                    </label>
                    <div className="space-y-3">
                      {CHANNEL_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            value={option.value}
                            checked={formData.preferred_channels?.includes(option.value) || false}
                            onChange={() => handleChannelToggle(option.value as 'email' | 'sms' | 'whatsapp')}
                            disabled={loading}
                            className="mt-1 text-primary-600 focus:ring-primary-600 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{option.label}</div>
                            <div className="text-xs text-gray-600">{option.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.preferred_channels && (
                      <p className="mt-1 text-sm text-red-600">{errors.preferred_channels}</p>
                    )}
                    {selectedGroup && JSON.stringify(selectedGroup.default_channels.sort()) !== JSON.stringify(formData.preferred_channels?.sort()) && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs text-blue-700">
                          <span className="font-medium">Override:</span> Group default is {selectedGroup.default_channels.map(c => CHANNEL_OPTIONS.find(o => o.value === c)?.label).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Content Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Content Types *
                    </label>
                    <div className="space-y-3">
                      {CONTENT_TYPE_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            value={option.value}
                            checked={formData.content_types?.includes(option.value) || false}
                            onChange={() => handleContentTypeToggle(option.value as 'photos' | 'text' | 'milestones')}
                            disabled={loading}
                            className="mt-1 text-primary-600 focus:ring-primary-600 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{option.label}</div>
                            <div className="text-xs text-gray-600">{option.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.content_types && (
                      <p className="mt-1 text-sm text-red-600">{errors.content_types}</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </form>

          {/* Footer */}
          <div className="flex justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || loadingGroups}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Updating...
                </>
              ) : (
                'Update Recipient'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
