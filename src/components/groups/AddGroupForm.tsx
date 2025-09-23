'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('AddGroupForm')

import { useState } from 'react'
import { RecipientGroup, createGroup } from '@/lib/recipient-groups'
import { recipientGroupSchema, RecipientGroupFormData, FREQUENCY_OPTIONS, CHANNEL_OPTIONS } from '@/lib/validation/recipients'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AddGroupFormProps {
  onGroupAdded: (group: RecipientGroup) => void
  onCancel: () => void
}

export default function AddGroupForm({ onGroupAdded, onCancel }: AddGroupFormProps) {
  const [formData, setFormData] = useState<RecipientGroupFormData>({
    name: '',
    default_frequency: 'weekly_digest',
    default_channels: ['email']
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
      const newGroup = await createGroup({
        name: formData.name.trim(),
        default_frequency: formData.default_frequency,
        default_channels: formData.default_channels
      })

      onGroupAdded(newGroup)
    } catch (error) {
      logger.errorWithStack('Error creating group:', error as Error)
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to create group. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChannelToggle = (channel: 'email' | 'sms' | 'whatsapp') => {
    setFormData(prev => ({
      ...prev,
      default_channels: prev.default_channels.includes(channel)
        ? prev.default_channels.filter(c => c !== channel)
        : [...prev.default_channels, channel]
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Group</h2>
      </div>

      {errors.general && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      {/* Group Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Group Name *
        </label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter group name (e.g., 'Work Friends', 'Neighbors')"
          disabled={loading}
          className={errors.name ? 'border-red-300' : ''}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Choose a descriptive name for your group. This will help you organize recipients.
        </p>
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
          These settings will be applied to new recipients added to this group, but can be customized per recipient.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4 pt-4">
        <Button type="submit" disabled={loading || formData.default_channels.length === 0} className="flex-1">
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Creating Group...
            </>
          ) : (
            'Create Group'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}