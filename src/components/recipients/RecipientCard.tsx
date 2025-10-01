'use client'

import { Recipient } from '@/lib/recipients'
import {
  RELATIONSHIP_OPTIONS,
  FREQUENCY_OPTIONS,
  CHANNEL_OPTIONS,
  CONTENT_TYPE_OPTIONS
} from '@/lib/validation/recipients'
import { Button } from '@/components/ui/Button'

interface RecipientCardProps {
  recipient: Recipient
  onEdit: (recipient: Recipient) => void
  onDelete: (recipientId: string) => void
  onSendPreferenceLink: (recipientId: string) => void
  showActions?: boolean
  isSelected?: boolean
  onSelect?: (recipientId: string, selected: boolean) => void
}

export default function RecipientCard({
  recipient,
  onEdit,
  onDelete,
  onSendPreferenceLink,
  showActions = true,
  isSelected = false,
  onSelect
}: RecipientCardProps) {
  const relationshipLabel = RELATIONSHIP_OPTIONS.find(
    option => option.value === recipient.relationship
  )?.label || recipient.relationship

  const frequencyLabel = FREQUENCY_OPTIONS.find(
    option => option.value === recipient.frequency
  )?.label || recipient.frequency

  const channelLabels = recipient.preferred_channels.map(channel =>
    CHANNEL_OPTIONS.find(option => option.value === channel)?.label || channel
  )

  const contentTypeLabels = recipient.content_types.map(contentType =>
    CONTENT_TYPE_OPTIONS.find(option => option.value === contentType)?.label || contentType
  )

  // Check if recipient settings override group defaults
  const hasOverrides = recipient.group && (
    recipient.frequency !== recipient.group.default_frequency ||
    JSON.stringify(recipient.preferred_channels.sort()) !== JSON.stringify(recipient.group.default_channels.sort())
  )

  const getContactMethods = () => {
    const methods = []
    if (recipient.email) methods.push({ type: 'email', value: recipient.email, icon: 'envelope' })
    if (recipient.phone) methods.push({ type: 'phone', value: recipient.phone, icon: 'phone' })
    return methods
  }

  const contactMethods = getContactMethods()

  return (
    <div className={`bg-white rounded-lg shadow p-6 relative hover:shadow-md transition-shadow border ${
      isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
    }`}>
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-4 left-4">
          <label className="inline-flex items-center justify-center min-touch-target cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(recipient.id, e.target.checked)}
              className="w-5 h-5 text-primary-600 focus:ring-2 focus:ring-primary-600 border-gray-300 rounded cursor-pointer"
              aria-label={`Select ${recipient.name}`}
            />
          </label>
        </div>
      )}

      {/* Status Indicator */}
      <div className={`absolute top-4 ${onSelect ? 'left-12' : 'left-4'}`}>
        <div className={`w-3 h-3 rounded-full ${
          recipient.is_active ? 'bg-green-400' : 'bg-gray-400'
        }`} title={recipient.is_active ? 'Active' : 'Inactive'} />
      </div>

      {/* Override Indicator */}
      {hasOverrides && (
        <div className={`absolute top-4 ${onSelect ? 'left-20' : 'left-12'}`}>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            Custom
          </span>
        </div>
      )}

      {/* Action buttons */}
      {showActions && (
        <div className="absolute top-4 right-4 flex space-x-1 sm:space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(recipient)}
            className="min-touch-target"
            title="Edit recipient"
            aria-label="Edit recipient"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>

          {recipient.email && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSendPreferenceLink(recipient.id)}
              className="min-touch-target"
              title="Send preference link"
              aria-label="Send preference link"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(recipient.id)}
            className="min-touch-target text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Delete recipient"
            aria-label="Delete recipient"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      )}

      {/* Recipient content */}
      <div className={`${showActions ? 'mt-12' : 'mt-8'} ${onSelect ? 'ml-8' : 'ml-4'}`}>
        {/* Name and relationship */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {recipient.name}
            </h3>
            <p className="text-sm text-gray-600 capitalize">
              {relationshipLabel}
            </p>
          </div>
        </div>

        {/* Contact methods */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Contact Information
          </p>
          <div className="space-y-1">
            {contactMethods.map((method, index) => (
              <div key={index} className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {method.icon === 'envelope' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  )}
                </svg>
                <span className="text-sm text-gray-900 truncate">{method.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Group membership */}
        {recipient.group && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Group
            </p>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {recipient.group.name}
              </span>
              {recipient.group.is_default_group && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  Default
                </span>
              )}
            </div>
          </div>
        )}

        {/* Preferences summary */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Notification Frequency
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-900">{frequencyLabel}</span>
              {recipient.group && recipient.frequency !== recipient.group.default_frequency && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  Override
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Communication Channels
            </p>
            <div className="flex flex-wrap gap-1">
              {channelLabels.map((channel, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {channel}
                </span>
              ))}
              {recipient.group && JSON.stringify(recipient.preferred_channels.sort()) !== JSON.stringify(recipient.group.default_channels.sort()) && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  Override
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Content Types
            </p>
            <div className="flex flex-wrap gap-1">
              {contentTypeLabels.map((contentType, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {contentType}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Created date */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Added {new Date(recipient.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}