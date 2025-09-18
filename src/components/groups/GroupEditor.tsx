'use client'

import { useState } from 'react'
import { RecipientGroup, updateGroup } from '@/lib/recipient-groups'
import { recipientGroupSchema, RecipientGroupFormData, FREQUENCY_OPTIONS, CHANNEL_OPTIONS } from '@/lib/validation/recipients'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface GroupEditorProps {
  group: RecipientGroup
  onGroupUpdated: (group: RecipientGroup) => void
  onClose: () => void
}

export default function GroupEditor({ group, onGroupUpdated, onClose }: GroupEditorProps) {
  const [formData, setFormData] = useState<RecipientGroupFormData>({
    name: group.name,
    default_frequency: group.default_frequency,
    default_channels: group.default_channels
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    default_frequency?: string
    default_channels?: string
    general?: string
  }>({})

  const validateForm = () => {
    try {
      recipientGroupSchema.parse(formData)
      setErrors({})
      return true
    } catch (error: any) {
      const newErrors: typeof errors = {}

      if (error.errors) {
        error.errors.forEach((err: any) => {
          if (err.path && err.path.length > 0) {
            const field = err.path[0] as keyof typeof errors
            newErrors[field] = err.message
          }
        })
      }

      setErrors(newErrors)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      const updates: any = {}

      // Only include changed fields
      if (formData.name !== group.name) {
        updates.name = formData.name.trim()
      }
      if (formData.default_frequency !== group.default_frequency) {
        updates.default_frequency = formData.default_frequency
      }
      if (JSON.stringify(formData.default_channels) !== JSON.stringify(group.default_channels)) {
        updates.default_channels = formData.default_channels
      }

      // If no changes, just close
      if (Object.keys(updates).length === 0) {
        onClose()
        return
      }

      const updatedGroup = await updateGroup(group.id, updates)
      onGroupUpdated(updatedGroup)
    } catch (error) {
      console.error('Error updating group:', error)
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to update group. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChannelToggle = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      default_channels: prev.default_channels.includes(channel)
        ? prev.default_channels.filter(c => c !== channel)
        : [...prev.default_channels, channel]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Group</h2>
              {group.is_default_group && (
                <p className="text-sm text-gray-600 mt-1">
                  Default groups can only have their preferences updated
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="p-2 h-8 w-8"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Group Name */}
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
                Group Name *
              </label>
              <Input
                id="edit-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter group name"
                disabled={loading || group.is_default_group}
                className={errors.name ? 'border-red-300' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              {group.is_default_group && (
                <p className="mt-1 text-xs text-gray-500">
                  Default group names cannot be changed
                </p>
              )}
            </div>

            {/* Default Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Default Notification Frequency *
              </label>
              <div className="space-y-3">
                {FREQUENCY_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value={option.value}
                      checked={formData.default_frequency === option.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, default_frequency: e.target.value as any }))}
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
              {errors.default_frequency && (
                <p className="mt-1 text-sm text-red-600">{errors.default_frequency}</p>
              )}
            </div>

            {/* Default Channels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Default Communication Channels *
              </label>
              <div className="space-y-3">
                {CHANNEL_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={formData.default_channels.includes(option.value)}
                      onChange={() => handleChannelToggle(option.value)}
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
              {errors.default_channels && (
                <p className="mt-1 text-sm text-red-600">{errors.default_channels}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                These settings apply to new recipients added to this group. Existing recipients keep their current preferences.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <Button type="submit" disabled={loading || formData.default_channels.length === 0} className="flex-1">
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Group'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}