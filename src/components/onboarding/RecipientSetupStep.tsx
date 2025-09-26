'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { getPrivacyMessageForStep } from '@/lib/onboarding'
import { validateEmail, validatePhone, validateContactMethod, RELATIONSHIP_OPTIONS } from '@/lib/validation/recipients'
import type { RecipientSetupData } from '@/hooks/useOnboarding'
import type { CreateRecipientData } from '@/lib/recipients'
import { UsersIcon, LockClosedIcon } from '@heroicons/react/24/outline'

interface RecipientSetupStepProps {
  data: Partial<RecipientSetupData>
  onUpdate: (data: Partial<RecipientSetupData>) => void
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
  canSkip: boolean
  className?: string
}

interface RecipientFormData extends CreateRecipientData {
  id: string // temporary ID for form management
}

export function RecipientSetupStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  onSkip,
  canSkip,
  className
}: RecipientSetupStepProps) {
  const [recipients, setRecipients] = useState<RecipientFormData[]>(
    data.recipients?.map((r, index) => ({ ...r, id: `temp-${index}` })) || []
  )
  const [quickAddEnabled, setQuickAddEnabled] = useState(data.quickAddEnabled ?? true)
  const [isAddingRecipient, setIsAddingRecipient] = useState(false)
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({})

  const privacyMessage = getPrivacyMessageForStep('recipient-setup')

  // Predefined quick-add suggestions
  const quickAddSuggestions = [
    { name: 'Grandma', relationship: 'grandparent' },
    { name: 'Grandpa', relationship: 'grandparent' },
    { name: 'Mom', relationship: 'parent' },
    { name: 'Dad', relationship: 'parent' },
    { name: 'Sister', relationship: 'sibling' },
    { name: 'Brother', relationship: 'sibling' },
    { name: 'Best Friend', relationship: 'friend' },
    { name: 'Aunt', relationship: 'family' },
    { name: 'Uncle', relationship: 'family' }
  ]

  // Update parent state when recipients change
  useEffect(() => {
    const recipientData = recipients.map(({ id, ...recipient }) => recipient)
    onUpdate({ recipients: recipientData, quickAddEnabled })
  }, [recipients, quickAddEnabled, onUpdate])

  const addNewRecipient = () => {
    const newId = `temp-${Date.now()}`
    setRecipients(prev => [...prev, {
      id: newId,
      name: '',
      email: '',
      phone: '',
      relationship: 'family',
      frequency: 'weekly_digest',
      preferred_channels: ['email'],
      content_types: ['photos', 'text']
    }])
    setIsAddingRecipient(true)
  }

  const addQuickRecipient = (suggestion: { name: string; relationship: string }) => {
    const newId = `temp-${Date.now()}`
    setRecipients(prev => [...prev, {
      id: newId,
      name: suggestion.name,
      email: '',
      phone: '',
      relationship: suggestion.relationship,
      frequency: 'weekly_digest',
      preferred_channels: ['email'],
      content_types: ['photos', 'text']
    }])
  }

  const updateRecipient = (id: string, updates: Partial<RecipientFormData>) => {
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id))
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[id]
      return newErrors
    })
  }

  const validateRecipient = (recipient: RecipientFormData): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!recipient.name.trim()) {
      errors.name = 'Name is required'
    }

    const contactError = validateContactMethod(recipient.email, recipient.phone)
    if (contactError) {
      errors.contact = contactError
    }

    if (recipient.email) {
      const emailError = validateEmail(recipient.email)
      if (emailError) errors.email = emailError
    }

    if (recipient.phone) {
      const phoneError = validatePhone(recipient.phone)
      if (phoneError) errors.phone = phoneError
    }

    return errors
  }

  const validateAllRecipients = () => {
    const newErrors: Record<string, Record<string, string>> = {}
    let hasErrors = false

    recipients.forEach(recipient => {
      const recipientErrors = validateRecipient(recipient)
      if (Object.keys(recipientErrors).length > 0) {
        newErrors[recipient.id] = recipientErrors
        hasErrors = true
      }
    })

    setErrors(newErrors)
    return !hasErrors
  }

  const handleNext = () => {
    if (recipients.length === 0) {
      if (canSkip) {
        onNext()
      }
      return
    }

    if (validateAllRecipients()) {
      onNext()
    }
  }

  const handleSkip = () => {
    if (canSkip) {
      onSkip()
    }
  }

  return (
    <div className={cn('max-w-4xl mx-auto space-y-8', className)}>
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
          <UsersIcon className="h-10 w-10 text-primary-600" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Build Your Circle
        </h1>
        <p className="text-lg text-gray-600">
          Add family and friends who want to stay connected with your child&apos;s journey
        </p>
        {canSkip && (
          <p className="text-sm text-gray-500">
            This step is optional - you can add recipients later
          </p>
        )}
      </div>

      {/* Quick Add Section */}
      {quickAddEnabled && recipients.length === 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-primary-900 mb-4 text-center">
            Quick Start: Who do you usually share updates with?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickAddSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => addQuickRecipient(suggestion)}
                className="p-3 bg-white border border-primary-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">{suggestion.name}</div>
                <div className="text-sm text-gray-600 capitalize">{suggestion.relationship}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setQuickAddEnabled(false)}
              size="sm"
            >
              I'll add them manually
            </Button>
          </div>
        </div>
      )}

      {/* Recipients List */}
      {recipients.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Recipients ({recipients.length})
            </h3>
            <Button
              onClick={addNewRecipient}
              variant="outline"
              size="sm"
            >
              Add Another
            </Button>
          </div>

          <div className="space-y-4">
            {recipients.map((recipient) => (
              <RecipientCard
                key={recipient.id}
                recipient={recipient}
                errors={errors[recipient.id] || {}}
                onUpdate={(updates) => updateRecipient(recipient.id, updates)}
                onRemove={() => removeRecipient(recipient.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add First Recipient */}
      {recipients.length === 0 && !quickAddEnabled && (
        <div className="text-center space-y-4">
          <div className="text-gray-500 text-lg">No recipients added yet</div>
          <Button onClick={addNewRecipient}>
            Add Your First Recipient
          </Button>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600">
            <LockClosedIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Recipient Privacy</h4>
            <p className="text-sm text-blue-800">{privacyMessage}</p>
            <div className="mt-2 text-xs text-blue-700">
              • Recipients can set their own preferences<br/>
              • They can unsubscribe anytime<br/>
              • You control what content they see
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      {recipients.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Great! Here's what happens next:</h4>
          <div className="text-sm text-green-800 space-y-1">
            <div>• Recipients will get a welcome email with their preference link</div>
            <div>• They can customize what updates they want to receive</div>
            <div>• Our AI will suggest who should get each update based on content</div>
            <div>• You always have final control over who sees what</div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
        >
          ← Previous
        </Button>

        <div className="flex space-x-3">
          {canSkip && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={recipients.length > 0 && Object.keys(errors).length > 0}
            className="px-8"
          >
            {recipients.length > 0 ? 'Continue' : canSkip ? 'Skip' : 'Add Recipients'} →
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-500">
          You can add, remove, or modify recipients anytime from your dashboard
        </p>
        <div className="text-xs text-gray-400">
          Tip: Start with close family members and add more people as you get comfortable with the platform
        </div>
      </div>
    </div>
  )
}

// Individual recipient card component
interface RecipientCardProps {
  recipient: RecipientFormData
  errors: Record<string, string>
  onUpdate: (updates: Partial<RecipientFormData>) => void
  onRemove: () => void
}

function RecipientCard({ recipient, errors, onUpdate, onRemove }: RecipientCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Basic Info */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Name *
          </label>
          <Input
            value={recipient.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Full name"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Email
          </label>
          <Input
            type="email"
            value={recipient.email || ''}
            onChange={(e) => onUpdate({ email: e.target.value })}
            placeholder="email@example.com"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Relationship *
          </label>
          <select
            value={recipient.relationship}
            onChange={(e) => onUpdate({ relationship: e.target.value })}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {RELATIONSHIP_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errors.contact && (
        <p className="text-sm text-red-600">{errors.contact}</p>
      )}

      {/* Advanced Options */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          {isExpanded ? 'Hide' : 'Show'} advanced options
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Remove
        </Button>
      </div>

      {isExpanded && (
        <div className="border-t pt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Update Frequency
              </label>
              <select
                value={recipient.frequency}
                onChange={(e) => onUpdate({ frequency: e.target.value })}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="every_update">Every Update</option>
                <option value="daily_digest">Daily Digest</option>
                <option value="weekly_digest">Weekly Digest</option>
                <option value="milestones_only">Milestones Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Phone (for SMS)
              </label>
              <Input
                type="tel"
                value={recipient.phone || ''}
                onChange={(e) => onUpdate({ phone: e.target.value })}
                placeholder="+1234567890"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
