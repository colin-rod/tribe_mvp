'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { getPrivacyMessageForStep } from '@/lib/onboarding'
import { validateEmail, validatePhone, validateContactMethod, RELATIONSHIP_OPTIONS } from '@/lib/validation/recipients'
import type { RecipientSetupData } from '@/hooks/useOnboarding'
import type { CreateRecipientData } from '@/lib/recipients'
import { UsersIcon, LockClosedIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { FormFeedback } from '@/components/ui/FormFeedback'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { checkRecipientDuplicate, type RecipientDuplicateMatch } from '@/lib/api/recipients'

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

interface RecipientDuplicateState {
  match: RecipientDuplicateMatch | null
  override: boolean
  checking: boolean
  error?: string
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
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({})
  const [duplicateState, setDuplicateState] = useState<Record<string, RecipientDuplicateState>>({})

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
    const recipientData = recipients.map(({ id: _id, ...recipient }) => recipient)
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

    if ('email' in updates || 'phone' in updates) {
      setDuplicateState(prev => {
        if (!prev[id]) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })

      setErrors(prev => {
        if (!prev[id]?.duplicate) return prev
        const next = { ...prev }
        const { duplicate: _duplicate, ...rest } = next[id]
        if (Object.keys(rest).length === 0) {
          delete next[id]
        } else {
          next[id] = rest
        }
        return next
      })
    }
  }

  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id))
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[id]
      return newErrors
    })
    setDuplicateState(prev => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleDuplicateCheck = useCallback(async (id: string): Promise<RecipientDuplicateMatch | null> => {
    const recipient = recipients.find(r => r.id === id)
    if (!recipient) return null

    const email = recipient.email?.trim()
    const phone = recipient.phone?.trim()

    if (!email && !phone) {
      setDuplicateState(prev => {
        if (!prev[id]) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })
      return null
    }

    setDuplicateState(prev => ({
      ...prev,
      [id]: {
        match: prev[id]?.match ?? null,
        override: prev[id]?.override ?? false,
        checking: true,
        error: undefined
      }
    }))

    try {
      const { match } = await checkRecipientDuplicate({ email, phone })
      setDuplicateState(prev => ({
        ...prev,
        [id]: {
          match: match || null,
          override: match ? false : prev[id]?.override ?? false,
          checking: false,
          error: undefined
        }
      }))
      return match ?? null
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to check duplicates right now.'
      setDuplicateState(prev => ({
        ...prev,
        [id]: {
          match: null,
          override: prev[id]?.override ?? false,
          checking: false,
          error: message
        }
      }))
      return null
    }
  }, [recipients])

  const handleOverrideDuplicate = (id: string) => {
    setDuplicateState(prev => ({
      ...prev,
      [id]: {
        match: prev[id]?.match ?? null,
        override: true,
        checking: false,
        error: prev[id]?.error
      }
    }))

    setErrors(prev => {
      if (!prev[id]?.duplicate) return prev
      const next = { ...prev }
      const { duplicate: _duplicate, ...rest } = next[id]
      if (Object.keys(rest).length === 0) {
        delete next[id]
      } else {
        next[id] = rest
      }
      return next
    })
  }

  const handleUseExistingRecipient = (id: string) => {
    removeRecipient(id)
  }

  const handlePrefillFromExisting = (id: string) => {
    const duplicate = duplicateState[id]?.match
    if (!duplicate) return

    setRecipients(prev => prev.map(r => r.id === id ? {
      ...r,
      name: duplicate.name,
      email: duplicate.email || '',
      phone: duplicate.phone || '',
    } : r))
  }

  const handleViewExistingRecipient = (id: string) => {
    const duplicate = duplicateState[id]?.match
    if (!duplicate) return
    window.open(`/dashboard/recipients?recipientId=${duplicate.id}`, '_blank', 'noopener')
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

    const duplicate = duplicateState[recipient.id]
    if (duplicate?.match && !duplicate.override) {
      errors.duplicate = `${duplicate.match.name} is already on your list. Choose an action or continue with "Keep both".`
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

  const handleNext = async () => {
    if (recipients.length === 0) {
      if (canSkip) {
        onNext()
      }
      return
    }

    await Promise.all(recipients.map(recipient => handleDuplicateCheck(recipient.id)))
    await new Promise(resolve => setTimeout(resolve, 0))

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
              I&apos;ll add them manually
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
                duplicate={duplicateState[recipient.id]}
                onUpdate={(updates) => updateRecipient(recipient.id, updates)}
                onRemove={() => removeRecipient(recipient.id)}
                onCheckDuplicate={() => { void handleDuplicateCheck(recipient.id) }}
                onOverrideDuplicate={() => handleOverrideDuplicate(recipient.id)}
                onUseExisting={() => handleUseExistingRecipient(recipient.id)}
                onPrefillExisting={() => handlePrefillFromExisting(recipient.id)}
                onViewExisting={() => handleViewExistingRecipient(recipient.id)}
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
      <Alert
        variant="info"
        title="Recipient privacy"
        icon={<LockClosedIcon className="h-5 w-5" aria-hidden="true" />}
        className="text-left"
      >
        <p className="text-sm">{privacyMessage}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>Recipients can set their own preferences</li>
          <li>They can unsubscribe anytime</li>
          <li>You control what content they see</li>
        </ul>
      </Alert>

      {/* Benefits */}
      {recipients.length > 0 && (
        <Alert
          variant="success"
          title="Great! Here&apos;s what happens next"
          className="text-left"
        >
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>Recipients will get a welcome email with their preference link</li>
            <li>They can customize what updates they want to receive</li>
            <li>Our AI will suggest who should get each update based on content</li>
            <li>You always have final control over who sees what</li>
          </ul>
        </Alert>
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
            onClick={() => { void handleNext() }}
            disabled={
              (recipients.length > 0 && Object.keys(errors).length > 0) ||
              Object.values(duplicateState).some(state => state.checking || (state.match && !state.override))
            }
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
  duplicate?: RecipientDuplicateState
  onUpdate: (updates: Partial<RecipientFormData>) => void
  onRemove: () => void
  onCheckDuplicate: () => void
  onOverrideDuplicate: () => void
  onUseExisting: () => void
  onPrefillExisting: () => void
  onViewExisting: () => void
}

function RecipientCard({
  recipient,
  errors,
  duplicate,
  onUpdate,
  onRemove,
  onCheckDuplicate,
  onOverrideDuplicate,
  onUseExisting,
  onPrefillExisting,
  onViewExisting
}: RecipientCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const duplicateSummary = duplicate?.match
    ? duplicate.match.email
      ? `${duplicate.match.name} already uses ${duplicate.match.email}`
      : duplicate.match.phone
        ? `${duplicate.match.name} already uses ${duplicate.match.phone}`
        : `${duplicate.match.name} is already on your list.`
    : ''

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
            onBlur={onCheckDuplicate}
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

      {(duplicate?.checking || duplicate?.match || duplicate?.error) && (
        <div className="space-y-2" aria-live="polite">
          {duplicate?.checking && (
            <div className="flex items-center gap-2 text-sm text-gray-600" role="status">
              <LoadingSpinner size="sm" />
              Checking for existing recipients...
            </div>
          )}
          {duplicate?.match && (
            <FormFeedback
              type="warning"
              title="Possible duplicate found"
              message={duplicateSummary}
              actions={(
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={onViewExisting}>
                    Review existing
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onPrefillExisting}>
                    Prefill from existing
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onUseExisting}>
                    Use existing only
                  </Button>
                  <Button
                    variant={duplicate.override ? 'warning' : 'ghost'}
                    size="sm"
                    onClick={onOverrideDuplicate}
                  >
                    {duplicate.override ? 'Keep both (override enabled)' : 'Keep both'}
                  </Button>
                </div>
              )}
            />
          )}
          {duplicate?.error && (
            <div className="flex items-start gap-2 text-sm text-red-600">
              <ExclamationTriangleIcon className="h-4 w-4 mt-0.5" aria-hidden="true" />
              <span>{duplicate.error}</span>
            </div>
          )}
        </div>
      )}

      {errors.duplicate && (
        <p className="text-sm text-red-600">{errors.duplicate}</p>
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
            onBlur={onCheckDuplicate}
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
