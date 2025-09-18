# CRO-32: Notification Management System

## Issue URL
https://linear.app/crod/issue/CRO-32/phase-35-notification-management-system

## Agents Required
- `react-developer` (Primary)
- `notification-developer` (Supporting)
- `ui-ux-designer` (Supporting)

## Dependencies
- **CRO-31**: Profile Management System (COMPLETE)
- **CRO-26**: Response Collection & Display (COMPLETE)
- **CRO-24**: Email Distribution System (COMPLETE)

## Objective
Build comprehensive notification management system allowing users to control all aspects of notifications, delivery timing, quiet hours, digest settings, and granular notification preferences for different types of platform activities.

## Context
Parents need fine-grained control over when and how they receive notifications about responses, AI prompts, system updates, and delivery confirmations. The system should respect user preferences, time zones, and provide both immediate and digest options.

## Database Schema Extensions
```sql
-- Extend profiles table for detailed notification preferences
ALTER TABLE profiles ALTER COLUMN notification_preferences SET DEFAULT '{
  "response_notifications": "immediate",
  "prompt_frequency": "every_3_days",
  "enabled_prompt_types": ["milestone", "activity", "fun"],
  "quiet_hours": {"start": "22:00", "end": "07:00"},
  "delivery_notifications": true,
  "system_notifications": true,
  "weekly_digest": true,
  "weekly_digest_day": "sunday",
  "monthly_summary": false,
  "browser_notifications": true,
  "email_notifications": true,
  "digest_email_time": "09:00"
}'::jsonb;

-- Notification history table
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL CHECK (type IN ('response', 'prompt', 'delivery', 'system', 'digest')),
  title VARCHAR NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP,
  sent_at TIMESTAMP DEFAULT NOW(),
  delivery_method VARCHAR NOT NULL CHECK (delivery_method IN ('browser', 'email', 'digest')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Digest queue table
CREATE TABLE digest_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  digest_type VARCHAR NOT NULL CHECK (digest_type IN ('daily', 'weekly', 'monthly')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Tasks

### 1. Notification Preferences Interface
- [ ] Build comprehensive notification settings UI
- [ ] Implement granular control toggles for each notification type
- [ ] Create quiet hours configuration with timezone awareness
- [ ] Add notification preview and testing functionality
- [ ] Build notification schedule visualization

### 2. Browser Notification System
- [ ] Implement Web Push API integration
- [ ] Create notification permission request flow
- [ ] Build real-time notification delivery system
- [ ] Add notification action buttons and handling
- [ ] Create notification history and management

### 3. Digest System Implementation
- [ ] Build daily, weekly, and monthly digest compilation
- [ ] Create email digest templates with rich content
- [ ] Implement digest scheduling and delivery
- [ ] Add digest customization preferences
- [ ] Build digest analytics and engagement tracking

### 4. Quiet Hours and Smart Timing
- [ ] Implement timezone-aware quiet hours
- [ ] Build smart delivery timing based on user activity
- [ ] Create holiday and vacation mode settings
- [ ] Add urgent notification override system
- [ ] Build notification batching and throttling

### 5. Notification Testing and Debugging
- [ ] Create notification testing interface for users
- [ ] Build notification delivery status tracking
- [ ] Implement notification failure retry logic
- [ ] Add notification analytics dashboard
- [ ] Create notification debugging tools

### 6. Advanced Notification Features
- [ ] Build notification categories and filtering
- [ ] Implement notification snoozing and reminders
- [ ] Create smart notification grouping
- [ ] Add notification sound and vibration preferences
- [ ] Build cross-device notification sync

## Component Specifications

### NotificationManager.tsx
```typescript
interface NotificationManagerProps {
  user: User
  preferences: NotificationPreferences
  onPreferencesUpdate: (prefs: NotificationPreferences) => Promise<void>
}

// Features:
// - Tabbed interface for different notification categories
// - Real-time preference updates with visual feedback
// - Notification testing and preview functionality
// - Schedule visualization for digests and quiet hours
// - Permission management for browser notifications
```

### QuietHoursConfig.tsx
```typescript
interface QuietHoursConfigProps {
  quietHours: { start: string, end: string }
  timezone: string
  onUpdate: (hours: { start: string, end: string }) => void
}

// Features:
// - Visual time range selector
// - Timezone-aware time display
// - Quiet hours preview with example times
// - Weekday-specific quiet hours (future)
// - Holiday mode toggle
```

### DigestSettings.tsx
```typescript
interface DigestSettingsProps {
  digestPrefs: DigestPreferences
  onUpdate: (prefs: DigestPreferences) => void
}

// Features:
// - Digest frequency selection (daily/weekly/monthly)
// - Content type filtering for digests
// - Delivery time scheduling
// - Preview digest functionality
// - Digest history and analytics
```

## Core Functionality Implementation

### Notification Management Hook
```typescript
// src/hooks/useNotificationManager.ts
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface NotificationPreferences {
  response_notifications: 'immediate' | 'hourly' | 'daily_digest' | 'off'
  prompt_frequency: 'daily' | 'every_3_days' | 'weekly' | 'off'
  enabled_prompt_types: string[]
  quiet_hours: { start: string, end: string }
  delivery_notifications: boolean
  system_notifications: boolean
  weekly_digest: boolean
  weekly_digest_day: string
  monthly_summary: boolean
  browser_notifications: boolean
  email_notifications: boolean
  digest_email_time: string
}

export function useNotificationManager() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()

      if (error) throw error
      
      setPreferences(data.notification_preferences || getDefaultPreferences())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return false

    setSaving(true)
    setError(null)

    try {
      const newPreferences = { ...preferences, ...updates }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: newPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      