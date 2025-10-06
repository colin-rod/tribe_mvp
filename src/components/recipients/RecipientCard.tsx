'use client'

import { Recipient } from '@/lib/recipients'
import {
  RELATIONSHIP_OPTIONS,
  FREQUENCY_OPTIONS,
  CHANNEL_OPTIONS,
  CONTENT_TYPE_OPTIONS
} from '@/lib/validation/recipients'
import { Button } from '@/components/ui/Button'
import { useState, useRef, useEffect } from 'react'

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
  const [showDetails, setShowDetails] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])
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

      {/* Kebab menu */}
      {showActions && (
        <div className="absolute top-4 right-4" ref={menuRef}>
          <Button variant="ghost" size="icon" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 21a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
          </Button>
          {menuOpen && (
            <div role="menu" className="mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-md">
              <button role="menuitem" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { onEdit(recipient); setMenuOpen(false) }}>
                Edit
              </button>
              {recipient.email && (
                <button role="menuitem" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { onSendPreferenceLink(recipient.id); setMenuOpen(false) }}>
                  Send preference link
                </button>
              )}
              <button role="menuitem" className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => { onDelete(recipient.id); setMenuOpen(false) }}>
                Delete
              </button>
            </div>
          )}
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

        {/* Quick contact + group */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            {contactMethods[0] && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {contactMethods[0].value}
              </span>
            )}
            {recipient.group && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {recipient.group.name}
              </span>
            )}
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

        {/* Details expander */}
        <div className="mb-2">
          <Button variant="tertiary" size="sm" onClick={() => setShowDetails(!showDetails)} aria-expanded={showDetails}>
            {showDetails ? 'Hide details' : 'Show details'}
          </Button>
        </div>

        {showDetails && (
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
        )}

        {/* Created date */}
        {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Added {new Date(recipient.created_at).toLocaleDateString()}
          </p>
        </div>
        )}
      </div>
    </div>
  )
}
