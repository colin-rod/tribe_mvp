'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Alert } from '@/components/ui/Alert'
import { Loader2, Mail, MessageSquare, Phone, CheckCircle } from 'lucide-react'

const sendInvitationSchema = z.object({
  channel: z.enum(['email', 'sms', 'whatsapp']),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  customMessage: z.string().max(500).optional().or(z.literal('')),
  expiresInDays: z.number().min(1).max(90).optional()
}).refine(
  (data) => {
    if (data.channel === 'email') return !!data.email
    if (data.channel === 'sms' || data.channel === 'whatsapp') return !!data.phone
    return false
  },
  {
    message: 'Email is required for email invitations, phone is required for SMS/WhatsApp',
    path: ['email']
  }
)

type SendInvitationFormData = z.infer<typeof sendInvitationSchema>

interface SendInvitationFormProps {
  onSuccess?: () => void
}

export default function SendInvitationForm({ onSuccess }: SendInvitationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<SendInvitationFormData>({
    resolver: zodResolver(sendInvitationSchema),
    defaultValues: {
      channel: 'email',
      expiresInDays: 7
    }
  })

  const selectedChannel = watch('channel')

  const onSubmit = async (data: SendInvitationFormData) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Create the invitation
      const createResponse = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email || undefined,
          phone: data.phone || undefined,
          channel: data.channel,
          customMessage: data.customMessage || undefined,
          expiresInDays: data.expiresInDays || 7
        })
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || 'Failed to create invitation')
      }

      const { invitation } = await createResponse.json()

      // Send the invitation
      const sendResponse = await fetch(`/api/invitations/${invitation.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: data.channel,
          customMessage: data.customMessage || undefined
        })
      })

      if (!sendResponse.ok) {
        const errorData = await sendResponse.json()
        throw new Error(errorData.error || 'Failed to send invitation')
      }

      // Success!
      const recipient = data.email || data.phone
      setSuccess(`Invitation sent successfully to ${recipient} via ${data.channel}!`)
      reset()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Channel Selection */}
      <fieldset className="space-y-3">
        <legend className="block text-sm font-medium text-gray-700 mb-1">Delivery Method</legend>
        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <input
              id="channel-email"
              type="radio"
              value="email"
              {...register('channel')}
              checked={selectedChannel === 'email'}
              className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
              disabled={isSubmitting}
            />
            <label htmlFor="channel-email" className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
              <Mail className="h-4 w-4" />
              Email
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="channel-sms"
              type="radio"
              value="sms"
              {...register('channel')}
              checked={selectedChannel === 'sms'}
              className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
              disabled={isSubmitting}
            />
            <label htmlFor="channel-sms" className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
              <MessageSquare className="h-4 w-4" />
              SMS
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="channel-whatsapp"
              type="radio"
              value="whatsapp"
              {...register('channel')}
              checked={selectedChannel === 'whatsapp'}
              className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
              disabled={isSubmitting}
            />
            <label htmlFor="channel-whatsapp" className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
              <Phone className="h-4 w-4" />
              WhatsApp
            </label>
          </div>
        </div>
      </fieldset>

      {/* Email or Phone Input */}
      {selectedChannel === 'email' ? (
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
          <Input
            id="email"
            type="email"
            placeholder="recipient@example.com"
            {...register('email')}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
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
            Include country code (e.g., +1 for US)
          </p>
        </div>
      )}

      {/* Custom Message */}
      <div className="space-y-2">
        <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-1">Personal Message (Optional)</label>
        <Textarea
          id="customMessage"
          placeholder="Add a personal message to your invitation..."
          rows={3}
          maxLength={500}
          {...register('customMessage')}
          disabled={isSubmitting}
        />
        {errors.customMessage && (
          <p className="text-sm text-red-600">{errors.customMessage.message}</p>
        )}
      </div>

      {/* Expiration */}
      <div className="space-y-2">
        <label htmlFor="expiresInDays" className="block text-sm font-medium text-gray-700 mb-1">Expires In (Days)</label>
        <Input
          id="expiresInDays"
          type="number"
          min="1"
          max="90"
          {...register('expiresInDays', { valueAsNumber: true })}
          disabled={isSubmitting}
        />
        {errors.expiresInDays && (
          <p className="text-sm text-red-600">{errors.expiresInDays.message}</p>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <div>{error}</div>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <div>{success}</div>
        </Alert>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Invitation...
          </>
        ) : (
          'Send Invitation'
        )}
      </Button>
    </form>
  )
}
