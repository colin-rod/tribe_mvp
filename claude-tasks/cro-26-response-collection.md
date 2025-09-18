# CRO-26: Response Collection & Display

## Issue URL
https://linear.app/crod/issue/CRO-26/phase-33-response-collection-display

## Agents Required
- `react-developer` (Primary)
- `ui-ux-designer` (Supporting)
- `real-time-developer` (Supporting)

## Dependencies
- **CRO-25**: Email Webhooks & Memory System (MUST BE COMPLETE)
- **CRO-24**: Email Distribution System (COMPLETE)
- **CRO-23**: Update Creation & AI Integration (COMPLETE)

## Objective
Build the response collection and display system with real-time updates, unified conversation threads, and parent notification management.

## Context
Once recipients reply to updates via email, parents need to see these responses in an organized, threaded view with real-time notifications and media support. The system should feel like a natural conversation flow.

## Database Schema Reference
From CRO-18, the responses table:
```sql
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  update_id UUID REFERENCES updates(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE,
  channel VARCHAR NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  external_id VARCHAR,
  content TEXT,
  media_urls VARCHAR[],
  parent_notified BOOLEAN DEFAULT false,
  received_at TIMESTAMP DEFAULT NOW()
);
```

## Tasks

### 1. Real-Time Response System
- [ ] Set up Supabase Real-time subscriptions for responses
- [ ] Create response notification hooks
- [ ] Implement live response counters
- [ ] Add real-time typing indicators (future)
- [ ] Test real-time performance and reliability

### 2. Response Display Components
- [ ] `ResponseThread.tsx` - Threaded conversation display
- [ ] `ResponseCard.tsx` - Individual response with media
- [ ] `ResponseNotification.tsx` - Real-time response alerts
- [ ] `ConversationView.tsx` - Update + responses combined
- [ ] `ResponseCounter.tsx` - Live response count badge

### 3. Response Media Handling
- [ ] Display response photos and videos
- [ ] Image gallery with lightbox functionality
- [ ] Video playback controls
- [ ] Audio message support (future WhatsApp integration)
- [ ] Media download and sharing options

### 4. Notification Management System
- [ ] Parent notification preferences integration
- [ ] Real-time browser notifications
- [ ] Digest email compilation
- [ ] Quiet hours respect
- [ ] Notification history and mark-as-read

### 5. Conversation Threading
- [ ] Group responses by update
- [ ] Chronological response ordering
- [ ] Channel indicators (email, SMS, WhatsApp)
- [ ] Response metadata display
- [ ] Conversation search and filtering

### 6. Response Analytics
- [ ] Response rate tracking per recipient
- [ ] Engagement analytics per update type
- [ ] Popular response times
- [ ] Recipient engagement insights
- [ ] Family interaction patterns

## Component Specifications

### ResponseThread.tsx
```typescript
interface ResponseThreadProps {
  updateId: string
  showNotifications?: boolean
  maxHeight?: string
}

// Features:
// - Real-time response loading
// - Chronological threading
// - Media preview and expansion
// - Sender information display
// - Response timestamp formatting
// - Auto-scroll to new responses
```

### ResponseCard.tsx
```typescript
interface ResponseCardProps {
  response: Response
  recipient: Recipient
  showChannel?: boolean
  onMediaClick?: (mediaUrl: string, index: number) => void
}

// Features:
// - Sender avatar and name
// - Response content with formatting
// - Media grid with thumbnails
// - Channel badge (email/SMS/WhatsApp)
// - Timestamp with relative formatting
// - Response actions (future: reply, heart, etc.)
```

### ConversationView.tsx
```typescript
interface ConversationViewProps {
  update: Update
  responses: Response[]
  onNewResponse?: (response: Response) => void
}

// Features:
// - Original update display at top
// - Threaded responses below
// - Real-time response additions
// - Response composition (future)
// - Conversation export
// - Family member status indicators
```

## Core Functionality Implementation

### Real-Time Response Hook
```typescript
// src/hooks/useResponses.ts
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Response {
  id: string
  update_id: string
  recipient_id: string
  channel: string
  content: string
  media_urls: string[]
  received_at: string
  recipient: {
    name: string
    relationship: string
    email: string
  }
}

export function useResponses(updateId: string) {
  const [responses, setResponses] = useState<Response[]>([])
  const [loading, setLoading] = useState(true)
  const [newResponseCount, setNewResponseCount] = useState(0)

  useEffect(() => {
    async function fetchResponses() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('responses')
        .select(`
          *,
          recipients(name, relationship, email)
        `)
        .eq('update_id', updateId)
        .order('received_at', { ascending: true })

      if (error) {
        console.error('Error fetching responses:', error)
        return
      }

      setResponses(data || [])
      setLoading(false)
    }

    fetchResponses()

    // Set up real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel(`responses_${updateId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
          filter: `update_id=eq.${updateId}`
        },
        (payload) => {
          // Fetch complete response data with recipient info
          fetchNewResponse(payload.new.id)
          setNewResponseCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [updateId])

  const fetchNewResponse = async (responseId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('responses')
      .select(`
        *,
        recipients(name, relationship, email)
      `)
      .eq('id', responseId)
      .single()

    if (data) {
      setResponses(prev => [...prev, data])
    }
  }

  const markResponsesAsRead = () => {
    setNewResponseCount(0)
  }

  return {
    responses,
    loading,
    newResponseCount,
    markResponsesAsRead
  }
}
```

### Response Notification System
```typescript
// src/hooks/useResponseNotifications.ts
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function useResponseNotifications() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    
    // Subscribe to new responses for user's updates
    const channel = supabase
      .channel('user_responses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses'
        },
        async (payload) => {
          // Verify this response is for user's update
          const { data: update } = await supabase
            .from('updates')
            .select('id, parent_id, content, children(name)')
            .eq('id', payload.new.update_id)
            .eq('parent_id', user.id)
            .single()

          if (update) {
            // Get recipient info
            const { data: recipient } = await supabase
              .from('recipients')
              .select('name, relationship')
              .eq('id', payload.new.recipient_id)
              .single()

            if (recipient) {
              showResponseNotification({
                childName: update.children.name,
                recipientName: recipient.name,
                relationship: recipient.relationship,
                content: payload.new.content,
                updateId: update.id
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])
}

function showResponseNotification(data: {
  childName: string
  recipientName: string
  relationship: string
  content: string
  updateId: string
}) {
  // Check if browser notifications are supported and permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(
      `${data.recipientName} responded to ${data.childName}'s update`,
      {
        body: data.content.substring(0, 100) + (data.content.length > 100 ? '...' : ''),
        icon: '/icons/tribe-notification.png',
        badge: '/icons/tribe-badge.png',
        tag: `response_${data.updateId}`,
        data: { updateId: data.updateId }
      }
    )

    notification.onclick = () => {
      window.focus()
      window.location.href = `/dashboard/updates/${data.updateId}`
      notification.close()
    }
  }
}
```

### Response Analytics Hook
```typescript
// src/hooks/useResponseAnalytics.ts
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ResponseAnalytics {
  totalResponses: number
  responseRate: number
  topResponders: Array<{
    recipient: string
    count: number
    relationship: string
  }>
  responsesByHour: Array<{
    hour: number
    count: number
  }>
  averageResponseTime: number
}

export function useResponseAnalytics(timeframe: '7d' | '30d' | '90d' = '30d') {
  const [analytics, setAnalytics] = useState<ResponseAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calculate date range
      const daysAgo = { '7d': 7, '30d': 30, '90d': 90 }[timeframe]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)

      // Get responses for user's updates in timeframe
      const { data: responsesData } = await supabase
        .from('responses')
        .select(`
          *,
          recipients(name, relationship),
          updates!inner(parent_id, created_at)
        `)
        .eq('updates.parent_id', user.id)
        .gte('received_at', startDate.toISOString())

      // Get total updates in timeframe for response rate
      const { data: updatesData } = await supabase
        .from('updates')
        .select('id, created_at')
        .eq('parent_id', user.id)
        .gte('created_at', startDate.toISOString())

      if (responsesData && updatesData) {
        const analytics = calculateAnalytics(responsesData, updatesData)
        setAnalytics(analytics)
      }
      
      setLoading(false)
    }

    fetchAnalytics()
  }, [timeframe])

  return { analytics, loading }
}

function calculateAnalytics(responses: any[], updates: any[]): ResponseAnalytics {
  // Calculate response rate
  const responseRate = updates.length > 0 
    ? (responses.length / updates.length) * 100 
    : 0

  // Top responders
  const responderCounts = responses.reduce((acc, response) => {
    const key = response.recipients.name
    if (!acc[key]) {
      acc[key] = {
        recipient: response.recipients.name,
        relationship: response.recipients.relationship,
        count: 0
      }
    }
    acc[key].count++
    return acc
  }, {})

  const topResponders = Object.values(responderCounts)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)

  // Responses by hour
  const hourCounts = Array(24).fill(0)
  responses.forEach(response => {
    const hour = new Date(response.received_at).getHours()
    hourCounts[hour]++
  })

  const responsesByHour = hourCounts.map((count, hour) => ({ hour, count }))

  // Average response time (placeholder - would need update timestamps)
  const averageResponseTime = 2.5 // hours

  return {
    totalResponses: responses.length,
    responseRate: Math.round(responseRate),
    topResponders,
    responsesByHour,
    averageResponseTime
  }
}
```

## UI Components Implementation

### ConversationView Component
```typescript
// src/components/responses/ConversationView.tsx
'use client'

import { useState } from 'react'
import { useResponses } from '@/hooks/useResponses'
import { ResponseThread } from './ResponseThread'
import { UpdateCard } from '@/components/updates/UpdateCard'
import { ResponseAnalytics } from './ResponseAnalytics'
import { MessageCircle, TrendingUp, Users } from 'lucide-react'

interface ConversationViewProps {
  updateId: string
  update: Update
  showAnalytics?: boolean
}

export function ConversationView({ 
  updateId, 
  update, 
  showAnalytics = false 
}: ConversationViewProps) {
  const { responses, loading, newResponseCount, markResponsesAsRead } = useResponses(updateId)
  const [activeTab, setActiveTab] = useState<'conversation' | 'analytics'>('conversation')

  // Mark responses as read when user views them
  const handleTabClick = (tab: 'conversation' | 'analytics') => {
    setActiveTab(tab)
    if (tab === 'conversation' && newResponseCount > 0) {
      markResponsesAsRead()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab Navigation */}
      {showAnalytics && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => handleTabClick('conversation')}
            className={`flex items-center px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'conversation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Conversation
            {newResponseCount > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                {newResponseCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => handleTabClick('analytics')}
            className={`flex items-center px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Insights
          </button>
        </div>
      )}

      {activeTab === 'conversation' ? (
        <div className="space-y-6">
          {/* Original Update */}
          <div className="bg-blue-50 rounded-lg p-1">
            <div className="bg-white rounded-lg">
              <UpdateCard update={update} showActions={false} />
            </div>
          </div>

          {/* Response Stats */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700">
                  {responses.length} {responses.length === 1 ? 'response' : 'responses'}
                </span>
              </div>
              
              {responses.length > 0 && (
                <div className="text-sm text-gray-500">
                  Latest: {formatDistanceToNow(new Date(responses[responses.length - 1]?.received_at), { addSuffix: true })}
                </div>
              )}
            </div>

            <div className="text-sm text-gray-500">
              Sent to {update.confirmed_recipients?.length || 0} recipients
            </div>
          </div>

          {/* Responses Thread */}
          <ResponseThread
            updateId={updateId}
            responses={responses}
            loading={loading}
          />
        </div>
      ) : (
        <ResponseAnalytics updateId={updateId} />
      )}
    </div>
  )
}
```

### ResponseCard Component
```typescript
// src/components/responses/ResponseCard.tsx
'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Mail, MessageSquare, Phone } from 'lucide-react'
import { MediaGallery } from '@/components/media/MediaGallery'

interface ResponseCardProps {
  response: Response
  showChannel?: boolean
}

export function ResponseCard({ response, showChannel = true }: ResponseCardProps) {
  const [showFullContent, setShowFullContent] = useState(false)
  const recipient = response.recipients

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-3 w-3" />
      case 'sms': return <MessageSquare className="h-3 w-3" />
      case 'whatsapp': return <Phone className="h-3 w-3" />
      default: return <Mail className="h-3 w-3" />
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
          className="rounded-lg overflow-hidden"
        />
      )}
    </div>
  )
}
```

### ResponseThread Component
```typescript
// src/components/responses/ResponseThread.tsx
'use client'

import { ResponseCard } from './ResponseCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { MessageCircle } from 'lucide-react'

interface ResponseThreadProps {
  updateId: string
  responses: Response[]
  loading: boolean
}

export function ResponseThread({ updateId, responses, loading }: ResponseThreadProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (responses.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="No responses yet"
        description="When family members reply to this update via email, their responses will appear here."
        action={{
          label: "Share Update",
          href: `/dashboard/updates/${updateId}/share`
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Family Responses
        </h3>
        <span className="text-sm text-gray-500">
          {responses.length} {responses.length === 1 ? 'response' : 'responses'}
        </span>
      </div>

      <div className="space-y-3">
        {responses.map((response) => (
          <ResponseCard
            key={response.id}
            response={response}
            showChannel={true}
          />
        ))}
      </div>
    </div>
  )
}
```

## Real-Time Notification Component
```typescript
// src/components/responses/ResponseNotifications.tsx
'use client'

import { useEffect, useState } from 'react'
import { useResponseNotifications } from '@/hooks/useResponseNotifications'
import { X, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function ResponseNotifications() {
  useResponseNotifications()
  const [notifications, setNotifications] = useState([])

  // This would integrate with a global notification system
  // For now, showing how the component would work

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-slide-in"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <MessageCircle className="h-5 w-5 text-blue-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                New Response
              </p>
              <p className="text-sm text-gray-600">
                {notification.recipientName} replied to {notification.childName}'s update
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
              </p>
            </div>

            <button
              onClick={() => dismissNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

## Testing Strategy

### Real-Time Testing
```bash
# Test real-time subscriptions
# 1. Open update in browser
# 2. Send email response via external email client
# 3. Verify response appears in real-time without refresh

# Load testing
# Multiple responses arriving simultaneously
# Network interruption and reconnection
# Browser tab switching and visibility changes
```

### Component Testing
1. Test response display with various content lengths
2. Verify media gallery works with multiple photos
3. Test notification system with different recipient types
4. Validate real-time updates don't cause memory leaks
5. Check responsive design on mobile devices

## Success Criteria
- [ ] ✅ Responses display correctly with all media types
- [ ] ✅ Real-time updates work seamlessly without page refresh
- [ ] ✅ Conversation threading shows proper chronological flow
- [ ] ✅ Notifications respect parent preferences and quiet hours
- [ ] ✅ Cross-channel responses unified properly (email, SMS, WhatsApp)
- [ ] ✅ Media responses display and can be viewed in full size
- [ ] ✅ Response analytics provide meaningful family insights
- [ ] ✅ Mobile responsive design works perfectly
- [ ] ✅ Loading states and error handling work smoothly
- [ ] ✅ Browser notifications work when tab is not active

## Performance Considerations
- Implement response pagination for very active conversations
- Cache frequently accessed response data
- Optimize media loading with lazy loading and thumbnails
- Use virtual scrolling for very long conversation threads
- Debounce real-time updates to prevent UI thrashing

## Next Steps After Completion
- Ready for CRO-31 (Profile Management System)
- Response system prepared for SMS and WhatsApp integration
- Foundation set for advanced conversation features
- Analytics system ready for family engagement insights