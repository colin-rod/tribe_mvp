'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('AddRecipientForm')
import { useState, useEffect } from 'react'
import { Recipient, createRecipient } from '@/lib/recipients'
import { RecipientGroup, getUserGroups } from '@/lib/recipient-groups'
import {
  addRecipientSchema,
  AddRecipientFormData,
  RELATIONSHIP_OPTIONS,
  FREQUENCY_OPTIONS,
  CHANNEL_OPTIONS,
  CONTENT_TYPE_OPTIONS
} from '@/lib/validation/recipients'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AddRecipientFormProps {
  onRecipientAdded: (recipient: Recipient) => void
  onCancel: () => void
  selectedGroupId?: string
}

type FormStep = 'contact' | 'preferences' | 'review'

export default function AddRecipientForm({ onRecipientAdded, onCancel, selectedGroupId }: AddRecipientFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('contact')
  const [formData, setFormData] = useState<AddRecipientFormData>({
    name: '',
    email: '',
    phone: '',
    relationship: 'friend',
    group_id: selectedGroupId || '',
    frequency: 'weekly_digest',
    preferred_channels: ['email'],
    content_types: ['photos', 'text']
  })
  const [groups, setGroups] = useState<RecipientGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load user groups on component mount
  useEffect(() => {
    loadGroups()
  }, [])

  // Set default group if provided
  useEffect(() => {
    if (selectedGroupId && formData.group_id !== selectedGroupId) {
      setFormData(prev => ({ ...prev, group_id: selectedGroupId }))
    }
  }, [selectedGroupId])

  const loadGroups = async () => {
    try {
      setLoadingGroups(true)
      const userGroups = await getUserGroups()
      setGroups(userGroups)

      // Set default group if none selected
      if (!formData.group_id && userGroups.length > 0) {
        const friendsGroup = userGroups.find(g => g.name === 'Friends')
        setFormData(prev => ({
          ...prev,
          group_id: friendsGroup?.id || userGroups[0].id
        }))
      }
    } catch (error) {
      logger.errorWithStack('Error loading groups:', error as Error)
      setErrors({ general: 'Failed to load groups. Please refresh the page.' })
    } finally {
      setLoadingGroups(false)
    }
  }

  const validateCurrentStep = (): boolean => {
    const stepErrors: Record<string, string> = {}

    if (currentStep === 'contact') {
      // Validate required fields for contact step
      if (!formData.name.trim()) {
        stepErrors.name = 'Name is required'
      }
      if (!formData.email?.trim() && !formData.phone?.trim()) {
        stepErrors.contact = 'Either email or phone number is required'
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        stepErrors.email = 'Invalid email address'
      }
      if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone)) {
        stepErrors.phone = 'Invalid phone number format'
      }
    } else if (currentStep === 'preferences') {
      // Validate preferences step
      if (formData.preferred_channels.length === 0) {
        stepErrors.preferred_channels = 'At least one communication channel is required'
      }
      if (formData.content_types.length === 0) {
        stepErrors.content_types = 'At least one content type is required'
      }
      // Validate channel requirements
      if (formData.preferred_channels.includes('sms') || formData.preferred_channels.includes('whatsapp')) {
        if (!formData.phone?.trim()) {
          stepErrors.phone = 'Phone number is required for SMS or WhatsApp notifications'
        }
      }
      if (formData.preferred_channels.includes('email') && !formData.email?.trim()) {
        stepErrors.email = 'Email address is required for email notifications'
      }
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep === 'contact') {
        setCurrentStep('preferences')
      } else if (currentStep === 'preferences') {
        setCurrentStep('review')
      }
    }
  }

  const handleBack = () => {
    if (currentStep === 'preferences') {
      setCurrentStep('contact')
    } else if (currentStep === 'review') {
      setCurrentStep('preferences')
    }
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return

    setLoading(true)
    setErrors({})

    try {
      // Final validation with schema
      addRecipientSchema.parse(formData)

      const newRecipient = await createRecipient({
        name: formData.name.trim(),
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        relationship: formData.relationship,
        group_id: formData.group_id || undefined,
        frequency: formData.frequency,
        preferred_channels: formData.preferred_channels,
        content_types: formData.content_types
      })

      onRecipientAdded(newRecipient)
    } catch (error: any) {
      logger.errorWithStack('Error creating recipient:', error as Error)
      if (error.errors) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err: any) => {
          if (err.path && err.path.length > 0) {
            newErrors[err.path[0]] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        setErrors({
          general: error instanceof Error ? error.message : 'Failed to create recipient. Please try again.'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChannelToggle = (channel: 'email' | 'sms' | 'whatsapp') => {
    setFormData(prev => ({
      ...prev,
      preferred_channels: prev.preferred_channels.includes(channel)
        ? prev.preferred_channels.filter(c => c !== channel)
        : [...prev.preferred_channels, channel]
    }))
  }

  const handleContentTypeToggle = (contentType: 'photos' | 'text' | 'milestones') => {
    setFormData(prev => ({
      ...prev,
      content_types: prev.content_types.includes(contentType)
        ? prev.content_types.filter(ct => ct !== contentType)
        : [...prev.content_types, contentType]
    }))
  }

  const selectedGroup = groups.find(g => g.id === formData.group_id)
  const magicLinkUrl = formData.email ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/preferences/[token]` : null

  if (loadingGroups) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Step Indicator */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Recipient</h2>

        {/* Step Indicator */}
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'contact' ? 'bg-primary-600 text-white' : 'bg-green-600 text-white'
            }`}>
              {currentStep === 'contact' ? '1' : '✓'}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900">Contact Info</span>
          </div>

          <div className="flex-1 mx-4">
            <div className={`h-1 rounded-full ${
              ['preferences', 'review'].includes(currentStep) ? 'bg-green-600' : 'bg-gray-300'
            }`} />
          </div>

          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'preferences' ? 'bg-primary-600 text-white' :
              currentStep === 'review' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {currentStep === 'review' ? '✓' : '2'}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900">Preferences</span>
          </div>

          <div className="flex-1 mx-4">
            <div className={`h-1 rounded-full ${
              currentStep === 'review' ? 'bg-green-600' : 'bg-gray-300'
            }`} />
          </div>

          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'review' ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900">Review</span>
          </div>
        </div>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 'contact' && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter recipient's full name"
              className={errors.name ? 'border-red-300' : ''}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Contact Method Error */}
          {errors.contact && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-700">{errors.contact}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
              className={errors.email ? 'border-red-300' : ''}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number (e.g., +1234567890)"
              className={errors.phone ? 'border-red-300' : ''}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Include country code for international numbers
            </p>
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
                    onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value as any }))}
                    className="text-primary-600 focus:ring-primary-600 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentStep === 'preferences' && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>

          {/* Group Assignment */}
          <div>
            <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Group *
            </label>
            <select
              id="group"
              value={formData.group_id}
              onChange={(e) => setFormData(prev => ({ ...prev, group_id: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.recipient_count} recipients)
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Recipients inherit default settings from their group, but can customize them below
            </p>
          </div>

          {/* Frequency */}
          <div>
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
                    onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
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
                  <span className="font-medium">Override:</span> Group default is "{FREQUENCY_OPTIONS.find(o => o.value === selectedGroup.default_frequency)?.label}"
                </p>
              </div>
            )}
          </div>

          {/* Communication Channels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Communication Channels *
            </label>
            <div className="space-y-3">
              {CHANNEL_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={formData.preferred_channels.includes(option.value)}
                    onChange={() => handleChannelToggle(option.value as 'email' | 'sms' | 'whatsapp')}
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
            {selectedGroup && JSON.stringify(selectedGroup.default_channels.sort()) !== JSON.stringify(formData.preferred_channels.sort()) && (
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
                    checked={formData.content_types.includes(option.value)}
                    onChange={() => handleContentTypeToggle(option.value as 'photos' | 'text' | 'milestones')}
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
      )}

      {currentStep === 'review' && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Review & Confirm</h3>

          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
            {/* Contact Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Contact Information</h4>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900">{formData.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Relationship</dt>
                  <dd className="text-sm text-gray-900">
                    {RELATIONSHIP_OPTIONS.find(r => r.value === formData.relationship)?.label}
                  </dd>
                </div>
                {formData.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">{formData.email}</dd>
                  </div>
                )}
                {formData.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="text-sm text-gray-900">{formData.phone}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Group & Preferences */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Preferences</h4>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Group</dt>
                  <dd className="text-sm text-gray-900">{selectedGroup?.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Frequency</dt>
                  <dd className="text-sm text-gray-900">
                    {FREQUENCY_OPTIONS.find(f => f.value === formData.frequency)?.label}
                    {selectedGroup && selectedGroup.default_frequency !== formData.frequency && (
                      <span className="ml-2 text-xs text-blue-600 font-medium">(Override)</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Channels</dt>
                  <dd className="text-sm text-gray-900">
                    {formData.preferred_channels.map(c => CHANNEL_OPTIONS.find(o => o.value === c)?.label).join(', ')}
                    {selectedGroup && JSON.stringify(selectedGroup.default_channels.sort()) !== JSON.stringify(formData.preferred_channels.sort()) && (
                      <span className="ml-2 text-xs text-blue-600 font-medium">(Override)</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Content Types</dt>
                  <dd className="text-sm text-gray-900">
                    {formData.content_types.map(ct => CONTENT_TYPE_OPTIONS.find(o => o.value === ct)?.label).join(', ')}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Magic Link Preview */}
            {magicLinkUrl && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Preference Management</h4>
                <p className="text-sm text-gray-600 mb-2">
                  A personalized link will be sent to {formData.email} allowing them to update their preferences:
                </p>
                <div className="bg-white p-3 border border-gray-300 rounded-md">
                  <code className="text-xs text-gray-800">{magicLinkUrl}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <div>
          {currentStep !== 'contact' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </Button>
          )}
        </div>

        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>

          {currentStep === 'review' ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Adding Recipient...
                </>
              ) : (
                'Add Recipient'
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}