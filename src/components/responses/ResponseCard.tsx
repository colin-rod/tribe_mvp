'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { EnvelopeIcon, ChatBubbleLeftEllipsisIcon, PhoneIcon } from '@heroicons/react/24/outline'
import { MediaGallery } from '@/components/media/MediaGallery'

interface ResponseCardProps {
  response: {
    id: string
    update_id: string
    recipient_id: string
    channel: 'email' | 'whatsapp' | 'sms'
    content: string | null
    media_urls: string[]
    received_at: string
    recipients: {
      id: string
      name: string
      relationship: string
      email: string | null
    }
  }
  showChannel?: boolean
  onMediaClick?: (mediaUrl: string, index: number) => void
}

export function ResponseCard({ response, showChannel = true, onMediaClick }: ResponseCardProps) {
  const [showFullContent, setShowFullContent] = useState(false)
  const recipient = response.recipients

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <EnvelopeIcon className="h-3 w-3" />
      case 'sms': return <ChatBubbleLeftEllipsisIcon className="h-3 w-3" />
      case 'whatsapp': return <PhoneIcon className="h-3 w-3" />
      default: return <EnvelopeIcon className="h-3 w-3" />
    }
  }

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-800'
      case 'sms': return 'bg-green-100 text-green-800'
      case 'whatsapp': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const shouldTruncate = response.content && response.content.length > 200
  const displayContent = shouldTruncate && !showFullContent
    ? response.content.substring(0, 200) + '...'
    : response.content

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
            {recipient.name.charAt(0).toUpperCase()}
          </div>

          {/* Sender Info */}
          <div>
            <h4 className="font-medium text-gray-900">{recipient.name}</h4>
            <p className="text-xs text-gray-500 capitalize">
              {recipient.relationship}
            </p>
          </div>
        </div>

        {/* Channel and Timestamp */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {showChannel && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${getChannelColor(response.channel)}`}>
              {getChannelIcon(response.channel)}
              <span className="capitalize">{response.channel}</span>
            </span>
          )}
          <span>
            {formatDistanceToNow(new Date(response.received_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Content */}
      {response.content && (
        <div className="mb-3">
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {displayContent}
          </p>

          {shouldTruncate && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-blue-600 text-sm mt-1 hover:underline"
            >
              {showFullContent ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Media */}
      {response.media_urls && response.media_urls.length > 0 && (
        <MediaGallery
          mediaUrls={response.media_urls}
          maxPreview={4}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
          onMediaClick={onMediaClick}
        />
      )}
    </div>
  )
}