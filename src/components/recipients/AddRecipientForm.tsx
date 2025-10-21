'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createLogger } from '@/lib/logger'
import { Recipient, createRecipient, updateRecipient } from '@/lib/recipients'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { FormFeedback } from '@/components/ui/FormFeedback'
import { checkRecipientDuplicate, type RecipientDuplicateMatch } from '@/lib/api/recipients'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const logger = createLogger('AddRecipientForm')

interface AddRecipientFormProps {
  onRecipientAdded: (recipient: Recipient) => void
  onCancel: () => void
  selectedGroupId?: string
  onRecipientMerged?: (recipient: Recipient) => void
}

interface FormData {
  name: string
  email: string
  phone: string
}

export default function AddRecipientForm({ onRecipientAdded, onCancel, onRecipientMerged }: AddRecipientFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [duplicateMatch, setDuplicateMatch] = useState<RecipientDuplicateMatch | null>(null)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)
  const [overrideDuplicate, setOverrideDuplicate] = useState(false)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const [mergeLoading, setMergeLoading] = useState(false)
  const [lastCheckedValues, setLastCheckedValues] = useState<{ email?: string; phone?: string }>({})

  const clearDuplicateState = useCallback(() => {
    setDuplicateMatch(null)
    setDuplicateError(null)
    setOverrideDuplicate(false)
  }, [])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    const hasEmail = formData.email.trim() !== ''
    const hasPhone = formData.phone.trim() !== ''

    if (!hasEmail && !hasPhone) {
      newErrors.contact = 'Please provide at least an email address or phone number'
    }

    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    if (hasPhone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number (include country code, e.g., +1234567890)'
    }

    if (duplicateMatch && !overrideDuplicate) {
      newErrors.duplicate = `${duplicateMatch.name} is already receiving updates. Review the warning below.`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const performDuplicateCheck = useCallback(async (payload: { email?: string; phone?: string }) => {
    const trimmedEmail = payload.email?.trim()
    const trimmedPhone = payload.phone?.trim()

    if (!trimmedEmail && !trimmedPhone) {
      clearDuplicateState()
      setLastCheckedValues({})
      return null
    }

    const hasChanged =
      trimmedEmail !== lastCheckedValues.email ||
      trimmedPhone !== lastCheckedValues.phone

    if (!hasChanged && duplicateMatch) {
      return duplicateMatch
    }

    setCheckingDuplicate(true)
    setDuplicateError(null)

    try {
      const { match } = await checkRecipientDuplicate({ email: trimmedEmail, phone: trimmedPhone })
      setLastCheckedValues({ email: trimmedEmail, phone: trimmedPhone })

      if (match) {
        setDuplicateMatch(match)
        setOverrideDuplicate(false)
      } else {
        clearDuplicateState()
      }

      return match
    } catch (error) {
      logger.errorWithStack('Duplicate check failed', error as Error)
      setDuplicateError(error instanceof Error ? error.message : 'Unable to check duplicates right now.')
      return null
    } finally {
      setCheckingDuplicate(false)
    }
  }, [clearDuplicateState, duplicateMatch, lastCheckedValues.email, lastCheckedValues.phone])

  const handleMergeExisting = useCallback(async () => {
    if (!duplicateMatch) return

    setMergeLoading(true)
    setErrors(prev => {
      const { duplicate, ...rest } = prev
      return rest
    })

    try {
      const updates: { name?: string; email?: string; phone?: string } = {}
      if (formData.name.trim() && formData.name.trim() !== duplicateMatch.name) {
        updates.name = formData.name.trim()
      }
      if (formData.email.trim() && formData.email.trim() !== (duplicateMatch.email || '')) {
        updates.email = formData.email.trim()
      }
      if (formData.phone.trim() && formData.phone.trim() !== (duplicateMatch.phone || '')) {
        updates.phone = formData.phone.trim()
      }

      if (Object.keys(updates).length === 0) {
        setDuplicateError('The existing recipient already has these details. You can edit them from the recipient list.')
        return
      }

      const updatedRecipient = await updateRecipient(duplicateMatch.id, updates)
      onRecipientMerged?.(updatedRecipient)
      setErrors({})
      clearDuplicateState()
      setFormData({ name: '', email: '', phone: '' })
    } catch (error) {
      logger.errorWithStack('Error merging with existing recipient', error as Error)
      setDuplicateError(error instanceof Error ? error.message : 'Failed to update the existing recipient. Please try again.')
    } finally {
      setMergeLoading(false)
    }
  }, [clearDuplicateState, duplicateMatch, formData.email, formData.name, formData.phone, onRecipientMerged])

  const handleViewExisting = useCallback(() => {
    if (!duplicateMatch) return

    try {
      router.push(`/dashboard/recipients?recipientId=${duplicateMatch.id}`)
    } catch (error) {
      logger.warn('Failed to navigate to recipient details', { error })
      window.open(`/dashboard/recipients?recipientId=${duplicateMatch.id}`, '_blank', 'noopener')
    }
  }, [duplicateMatch, router])

  const duplicateSummary = useMemo(() => {
    if (!duplicateMatch) return ''

    if (duplicateMatch.source === 'email' && duplicateMatch.email) {
      return `${duplicateMatch.name} already uses ${duplicateMatch.email}`
    }

    if (duplicateMatch.source === 'phone' && duplicateMatch.phone) {
      return `${duplicateMatch.name} already uses ${duplicateMatch.phone}`
    }

    return `${duplicateMatch.name} is already on your list.`
  }, [duplicateMatch])

  const handleOverride = () => {
    setOverrideDuplicate(true)
    setErrors(prev => {
      const { duplicate, ...rest } = prev
      return rest
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const match = await performDuplicateCheck({
      email: formData.email,
      phone: formData.phone
    })

    if (match && !overrideDuplicate) {
      setErrors(prev => ({
        ...prev,
        duplicate: `${match.name} is already receiving updates. Choose an action below or create a new entry anyway.`
      }))
      return
    }

    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      const newRecipient = await createRecipient({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        relationship: 'other'
      })

      onRecipientAdded(newRecipient)
      clearDuplicateState()
      setFormData({ name: '', email: '', phone: '' })
    } catch (error: unknown) {
      logger.errorWithStack('Error creating recipient', error instanceof Error ? error : new Error('Unknown error'))
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to create recipient. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Add New Recipient</h2>
        <p className="text-sm text-gray-600">
          Add someone to receive your baby updates. They&apos;ll get a magic link to set their own preferences.
        </p>
      </div>

      {errors.general && (
        <FormFeedback
          type="error"
          message={errors.general}
          dismissible
          onDismiss={() => setErrors(prev => {
            const { general: _general, ...rest } = prev
            return rest
          })}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            onBlur={validateForm}
            placeholder="Enter recipient's full name"
            className={errors.name ? 'border-red-300' : ''}
            autoFocus
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {errors.contact && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-700">{errors.contact}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => {
              const value = e.target.value
              setFormData(prev => ({ ...prev, email: value }))
              if (duplicateMatch?.source === 'email' && duplicateMatch.email?.toLowerCase() !== value.trim().toLowerCase()) {
                clearDuplicateState()
              }
            }}
            onBlur={() => {
              void performDuplicateCheck({ email: formData.email })
              validateForm()
            }}
            placeholder="email@example.com"
            className={errors.email ? 'border-red-300' : ''}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => {
              const value = e.target.value
              setFormData(prev => ({ ...prev, phone: value }))
              if (duplicateMatch?.source === 'phone' && duplicateMatch.phone !== value.trim()) {
                clearDuplicateState()
              }
            }}
            onBlur={() => {
              void performDuplicateCheck({ phone: formData.phone })
              validateForm()
            }}
            placeholder="+1234567890"
            className={errors.phone ? 'border-red-300' : ''}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Include country code for international numbers
          </p>
        </div>

        {(checkingDuplicate || duplicateMatch || duplicateError) && (
          <div className="space-y-3" aria-live="polite">
            {checkingDuplicate && (
              <div className="flex items-center text-sm text-gray-600 gap-2" role="status">
                <LoadingSpinner size="sm" />
                Checking for existing recipients...
              </div>
            )}
            {duplicateMatch && (
              <FormFeedback
                type="warning"
                title="Possible duplicate found"
                message={duplicateSummary}
                actions={(
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleViewExisting}>
                      View recipient
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleMergeExisting()}
                      loading={mergeLoading}
                    >
                      Merge details
                    </Button>
                    <Button
                      variant={overrideDuplicate ? 'warning' : 'ghost'}
                      size="sm"
                      onClick={handleOverride}
                    >
                      {overrideDuplicate ? 'Override enabled' : 'Create new anyway'}
                    </Button>
                  </div>
                )}
              />
            )}
            {duplicateError && (
              <div className="flex items-start gap-2 text-sm text-red-600">
                <ExclamationTriangleIcon className="h-4 w-4 mt-0.5" aria-hidden="true" />
                <span>{duplicateError}</span>
              </div>
            )}
          </div>
        )}

        {errors.duplicate && (
          <p className="text-sm text-red-600" role="alert">{errors.duplicate}</p>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1 text-sm">What happens next?</h4>
              <div className="text-sm text-blue-800 space-y-1">
                {formData.email && (
                  <div>• {formData.name || 'They'} will receive a magic link via email</div>
                )}
                {formData.phone && !formData.email && (
                  <div>• {formData.name || 'They'} will receive a magic link via SMS</div>
                )}
                <div>• They can set their own notification preferences</div>
                <div>• They can unsubscribe anytime</div>
                <div>• You control what content they see</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? 'Adding...' : 'Add Recipient'}
          </Button>
        </div>
      </form>
    </div>
  )
}
