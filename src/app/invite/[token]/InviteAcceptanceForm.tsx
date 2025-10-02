'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Loader2, Heart, AlertCircle } from 'lucide-react'

const redeemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  relationship: z.enum(['grandparent', 'family', 'friend', 'other']),
  frequency: z.enum(['instant', 'daily_digest', 'weekly_digest']).optional(),
  preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).optional(),
  content_types: z.array(z.enum(['photos', 'videos', 'text', 'milestones'])).optional()
}).refine(
  (data) => !!data.email || !!data.phone,
  {
    message: 'Either email or phone is required',
    path: ['email']
  }
)

type RedeemFormData = z.infer<typeof redeemSchema>

interface ValidationResult {
  valid: boolean
  invitation?: {
    type: string
    parentName: string
    babyName?: string
    customMessage?: string
    expiresAt?: string
  }
  error?: string
}

export default function InviteAcceptanceForm({ token }: { token: string }) {
  const router = useRouter()
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<RedeemFormData>({
    resolver: zodResolver(redeemSchema),
    defaultValues: {
      relationship: 'family',
      frequency: 'weekly_digest',
      preferred_channels: ['email'],
      content_types: ['photos', 'text']
    }
  })

  // Validate invitation on mount
  useEffect(() => {
    validateInvitation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const validateInvitation = async () => {
    setIsValidating(true)
    try {
      const response = await fetch(`/api/invitations/validate/${token}`)
      const data = await response.json()
      setValidation(data)

      if (!data.valid) {
        setError(data.error || 'This invitation is no longer valid')
      }
    } catch {
      setError('Failed to validate invitation. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const onSubmit = async (data: RedeemFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/invitations/redeem/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          relationship: data.relationship,
          frequency: data.frequency || 'weekly_digest',
          preferred_channels: data.preferred_channels || ['email'],
          content_types: data.content_types || ['photos', 'text']
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to accept invitation')
      }

      // Redirect to success page
      router.push(`/invite/${token}/success`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const preferredChannels = watch('preferred_channels') || []
  const contentTypes = watch('content_types') || []

  if (isValidating) {
    return (
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </Card>
    )
  }

  if (!validation?.valid) {
    return (
      <Card className="w-full max-w-md p-8">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Invalid Invitation</h1>
          <p className="text-gray-600">{error || 'This invitation link is not valid.'}</p>
          {validation?.error?.includes('expired') && (
            <p className="text-sm text-gray-500">
              Please contact the sender to request a new invitation link.
            </p>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl p-8">
      <div className="text-center mb-8">
        <Heart className="h-12 w-12 text-pink-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          You&apos;re Invited!
        </h1>
        <p className="text-lg text-gray-600">
          {validation.invitation?.parentName} wants to share baby updates with you
          {validation.invitation?.babyName && ` about ${validation.invitation.babyName}`}
        </p>
        {validation.invitation?.customMessage && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-gray-700 italic">
              &quot;{validation.invitation.customMessage}&quot;
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
          <Input
            id="name"
            placeholder="Enter your name"
            {...register('name')}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            {...register('email')}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1234567890"
            {...register('phone')}
            disabled={isSubmitting}
          />
          {errors.phone && (
            <p className="text-sm text-red-600">{errors.phone.message}</p>
          )}
          <p className="text-xs text-gray-500">
            Provide at least email or phone number
          </p>
        </div>

        {/* Relationship */}
        <fieldset className="space-y-2">
          <legend className="block text-sm font-medium text-gray-700 mb-1">Relationship *</legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                value="grandparent"
                id="grandparent"
                {...register('relationship')}
                checked={watch('relationship') === 'grandparent'}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
              />
              <label htmlFor="grandparent" className="cursor-pointer text-sm font-medium text-gray-700">Grandparent</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                value="family"
                id="family"
                {...register('relationship')}
                checked={watch('relationship') === 'family'}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
              />
              <label htmlFor="family" className="cursor-pointer text-sm font-medium text-gray-700">Family</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                value="friend"
                id="friend"
                {...register('relationship')}
                checked={watch('relationship') === 'friend'}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
              />
              <label htmlFor="friend" className="cursor-pointer text-sm font-medium text-gray-700">Friend</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                value="other"
                id="other"
                {...register('relationship')}
                checked={watch('relationship') === 'other'}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
              />
              <label htmlFor="other" className="cursor-pointer text-sm font-medium text-gray-700">Other</label>
            </div>
          </div>
        </fieldset>

        {/* Frequency */}
        <fieldset className="space-y-2">
          <legend className="block text-sm font-medium text-gray-700 mb-1">How often do you want updates?</legend>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                value="instant"
                id="instant"
                {...register('frequency')}
                checked={watch('frequency') === 'instant'}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
              />
              <label htmlFor="instant" className="cursor-pointer text-sm font-medium text-gray-700">
                Instant (as they happen)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                value="daily_digest"
                id="daily"
                {...register('frequency')}
                checked={watch('frequency') === 'daily_digest'}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
              />
              <label htmlFor="daily" className="cursor-pointer text-sm font-medium text-gray-700">
                Daily digest
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                value="weekly_digest"
                id="weekly"
                {...register('frequency')}
                checked={watch('frequency') === 'weekly_digest'}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
              />
              <label htmlFor="weekly" className="cursor-pointer text-sm font-medium text-gray-700">
                Weekly digest (recommended)
              </label>
            </div>
          </div>
        </fieldset>

        {/* Preferred Channels */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">How do you want to receive updates?</label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="channel-email"
                checked={preferredChannels.includes('email')}
                onChange={(e) => {
                  const newChannels = e.target.checked
                    ? [...preferredChannels, 'email']
                    : preferredChannels.filter(c => c !== 'email')
                  setValue('preferred_channels', newChannels as RedeemFormData['preferred_channels'])
                }}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
              />
              <label htmlFor="channel-email" className="cursor-pointer text-sm font-medium text-gray-700">Email</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="channel-sms"
                checked={preferredChannels.includes('sms')}
                onChange={(e) => {
                  const newChannels = e.target.checked
                    ? [...preferredChannels, 'sms']
                    : preferredChannels.filter(c => c !== 'sms')
                  setValue('preferred_channels', newChannels as RedeemFormData['preferred_channels'])
                }}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
              />
              <label htmlFor="channel-sms" className="cursor-pointer text-sm font-medium text-gray-700">SMS</label>
            </div>
          </div>
        </div>

        {/* Content Types */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">What content do you want to receive?</label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="content-photos"
                checked={contentTypes.includes('photos')}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...contentTypes, 'photos']
                    : contentTypes.filter(t => t !== 'photos')
                  setValue('content_types', newTypes as RedeemFormData['content_types'])
                }}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
              />
              <label htmlFor="content-photos" className="cursor-pointer text-sm font-medium text-gray-700">Photos</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="content-text"
                checked={contentTypes.includes('text')}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...contentTypes, 'text']
                    : contentTypes.filter(t => t !== 'text')
                  setValue('content_types', newTypes as RedeemFormData['content_types'])
                }}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
              />
              <label htmlFor="content-text" className="cursor-pointer text-sm font-medium text-gray-700">Text Updates</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="content-milestones"
                checked={contentTypes.includes('milestones')}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...contentTypes, 'milestones']
                    : contentTypes.filter(t => t !== 'milestones')
                  setValue('content_types', newTypes as RedeemFormData['content_types'])
                }}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
              />
              <label htmlFor="content-milestones" className="cursor-pointer text-sm font-medium text-gray-700">Milestones</label>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="error">
            <div>{error}</div>
          </Alert>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining...
            </>
          ) : (
            'Accept Invitation & Subscribe'
          )}
        </Button>

        {validation.invitation?.expiresAt && (
          <p className="text-xs text-center text-gray-500">
            This invitation expires on{' '}
            {new Date(validation.invitation.expiresAt).toLocaleDateString()}
          </p>
        )}
      </form>
    </Card>
  )
}
