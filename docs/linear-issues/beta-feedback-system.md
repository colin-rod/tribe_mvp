# Beta Feedback Collection System

**Priority**: High
**Category**: Beta Launch
**Effort**: Medium
**Labels**: beta, feedback, analytics, user-research

## Description

Implement a comprehensive feedback collection system for beta testers to report bugs, request features, and provide general feedback about the Tribe MVP.

## Problem Statement

During beta launch, we need structured ways to:
- Collect bug reports from testers
- Gather feature requests and suggestions
- Track user sentiment and satisfaction
- Identify usability issues quickly
- Prioritize improvements based on feedback
- Communicate with testers about their feedback

Without a proper system:
- Feedback gets lost in emails/messages
- Hard to track what's been addressed
- Difficult to prioritize issues
- No visibility into feedback status
- Testers don't know if feedback was received

## Feedback Channels

### 1. In-App Feedback Widget
**When to use:** Quick feedback, bugs, suggestions

**Features:**
- Always accessible (floating button)
- Quick feedback form
- Screenshot annotation
- Automatic context capture (page, user, browser)
- Optional email for follow-up

### 2. Bug Report Form
**When to use:** Detailed bug reports

**Fields:**
- Bug description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/screen recordings
- Browser/device info (auto-captured)
- Severity level (auto-suggested)

### 3. Feature Request Form
**When to use:** Product suggestions

**Fields:**
- Feature description
- Use case / problem it solves
- Importance level
- Any workarounds currently used
- Supporting details

### 4. Beta Survey
**When to use:** Periodic feedback collection

**Topics:**
- Overall satisfaction (NPS score)
- Specific feature ratings
- Most/least valuable features
- Missing features
- Performance perception
- Would you recommend?

### 5. User Interviews
**When to use:** Deep insights

**Format:**
- 30-minute video calls
- Scheduled through app
- Moderated sessions
- Screen sharing
- Recording (with consent)

## Technical Implementation

### 1. Feedback Widget Component

```tsx
// components/feedback/FeedbackWidget.tsx
'use client'

import { useState } from 'react'
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline'

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-colors"
        aria-label="Send feedback"
      >
        <ChatBubbleLeftIcon className="h-6 w-6" />
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <FeedbackModal onClose={() => setIsOpen(false)} />
      )}
    </>
  )
}
```

### 2. Feedback Form

```tsx
// components/feedback/FeedbackModal.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

interface FeedbackFormData {
  type: 'bug' | 'feature' | 'feedback'
  title: string
  description: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  email?: string
  screenshot?: File
}

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const { register, handleSubmit, watch } = useForm<FeedbackFormData>()
  const feedbackType = watch('type')

  const onSubmit = async (data: FeedbackFormData) => {
    // Capture context
    const context = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      sessionId: getSessionId(),
    }

    // Upload screenshot if provided
    let screenshotUrl
    if (data.screenshot) {
      screenshotUrl = await uploadScreenshot(data.screenshot)
    }

    // Submit feedback
    await submitFeedback({
      ...data,
      context,
      screenshotUrl,
    })

    // Show success
    setStep(3)

    // Close after delay
    setTimeout(onClose, 2000)
  }

  return (
    <Modal open onClose={onClose} size="lg">
      {step === 1 && (
        <FeedbackTypeSelector
          onSelect={(type) => {
            setValue('type', type)
            setStep(2)
          }}
        />
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <FeedbackForm
            type={feedbackType}
            register={register}
          />
          <SubmitButton loading={isSubmitting}>
            Send Feedback
          </SubmitButton>
        </form>
      )}

      {step === 3 && (
        <SuccessMessage>
          Thank you for your feedback! We'll review it shortly.
        </SuccessMessage>
      )}
    </Modal>
  )
}
```

### 3. Screenshot Annotation

```tsx
// components/feedback/ScreenshotCapture.tsx
'use client'

import html2canvas from 'html2canvas'

export function ScreenshotCapture({ onCapture }: { onCapture: (blob: Blob) => void }) {
  const captureScreen = async () => {
    const canvas = await html2canvas(document.body, {
      allowTaint: true,
      useCORS: true,
    })

    canvas.toBlob((blob) => {
      if (blob) onCapture(blob)
    })
  }

  return (
    <Button onClick={captureScreen}>
      <CameraIcon /> Capture Screenshot
    </Button>
  )
}
```

### 4. Feedback API

```typescript
// app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await request.json()
  const {
    type,
    title,
    description,
    severity,
    email,
    screenshotUrl,
    context,
  } = body

  // Save to database
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      user_id: user?.id,
      type,
      title,
      description,
      severity,
      contact_email: email || user?.email,
      screenshot_url: screenshotUrl,
      context: context,
      status: 'new',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send notification to team
  await notifyTeam({
    type,
    title,
    severity,
    feedbackId: data.id,
    userId: user?.id,
  })

  // Create Linear issue if critical bug
  if (type === 'bug' && severity === 'critical') {
    await createLinearIssue({
      title: `[CRITICAL] ${title}`,
      description: description,
      priority: 0, // Urgent
      teamId: process.env.LINEAR_TEAM_ID,
      labels: ['bug', 'critical', 'beta'],
    })
  }

  return NextResponse.json({ success: true, id: data.id })
}
```

### 5. Feedback Dashboard (Admin)

```tsx
// app/admin/feedback/page.tsx
'use client'

import { useFeedback } from '@/hooks/useFeedback'

export default function FeedbackDashboard() {
  const { feedback, stats, filters, setFilters } = useFeedback()

  return (
    <div className="space-y-6">
      <FeedbackStats stats={stats} />

      <FeedbackFilters
        filters={filters}
        onChange={setFilters}
      />

      <FeedbackList
        items={feedback}
        onStatusChange={updateStatus}
        onReply={sendReply}
      />
    </div>
  )
}
```

## Database Schema

```sql
-- Feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'feedback')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  contact_email TEXT,
  screenshot_url TEXT,
  context JSONB, -- Browser, page, device info
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'wont_fix')),
  assigned_to UUID REFERENCES auth.users(id),
  linear_issue_id TEXT, -- Link to Linear issue
  resolution_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
)

-- Feedback comments (for team communication)
CREATE TABLE feedback_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  internal BOOLEAN DEFAULT false, -- Internal note vs user-facing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)

-- Beta surveys
CREATE TABLE beta_surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  most_valuable_feature TEXT,
  least_valuable_feature TEXT,
  missing_features TEXT,
  would_recommend BOOLEAN,
  additional_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)

-- Indexes
CREATE INDEX idx_feedback_user_id ON feedback(user_id)
CREATE INDEX idx_feedback_status ON feedback(status)
CREATE INDEX idx_feedback_type ON feedback(type)
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC)
```

## NPS Survey Implementation

```tsx
// components/feedback/NPSSurvey.tsx
'use client'

import { useState } from 'react'

export function NPSSurvey() {
  const [score, setScore] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const submitNPS = async (score: number, comment: string) => {
    await fetch('/api/surveys/nps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, comment }),
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <h3>Thank you for your feedback! 🎉</h3>
        <p>Your input helps us improve Tribe.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2>How likely are you to recommend Tribe to a friend?</h2>

      <div className="flex gap-2 justify-center">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
          <button
            key={value}
            onClick={() => setScore(value)}
            className={cn(
              'w-12 h-12 rounded border-2',
              score === value
                ? 'border-primary-600 bg-primary-50'
                : 'border-neutral-300 hover:border-neutral-400'
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="flex justify-between text-sm text-neutral-600">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>

      {score !== null && (
        <textarea
          placeholder="What's the main reason for your score?"
          className="w-full p-3 border rounded"
          rows={4}
          onChange={(e) => setComment(e.target.value)}
        />
      )}

      <Button
        onClick={() => submitNPS(score!, comment)}
        disabled={score === null}
      >
        Submit
      </Button>
    </div>
  )
}
```

## Integrations

### 1. Linear Integration

Automatically create Linear issues for critical bugs:

```typescript
// lib/integrations/linear.ts
import { LinearClient } from '@linear/sdk'

const linear = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY,
})

export async function createLinearIssue({
  title,
  description,
  priority,
  teamId,
  labels,
}: {
  title: string
  description: string
  priority: number
  teamId: string
  labels: string[]
}) {
  const issue = await linear.createIssue({
    teamId,
    title,
    description,
    priority,
    labelIds: await getLabelIds(labels),
  })

  return issue.id
}
```

### 2. Slack Notifications

Send feedback alerts to team Slack:

```typescript
// lib/integrations/slack.ts
export async function notifyTeam({
  type,
  title,
  severity,
  feedbackId,
  userId,
}: {
  type: string
  title: string
  severity?: string
  feedbackId: string
  userId?: string
}) {
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `New ${type}: ${title}`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Type:* ${type}`,
            },
            {
              type: 'mrkdwn',
              text: `*Severity:* ${severity || 'N/A'}`,
            },
            {
              type: 'mrkdwn',
              text: `*User:* ${userId || 'Anonymous'}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View in Dashboard',
              },
              url: `https://tribe-app.com/admin/feedback/${feedbackId}`,
            },
          ],
        },
      ],
    }),
  })
}
```

### 3. Email Notifications

Send confirmation email to user:

```typescript
// lib/email/feedback-confirmation.ts
export async function sendFeedbackConfirmation({
  email,
  type,
  feedbackId,
}: {
  email: string
  type: string
  feedbackId: string
}) {
  await sendEmail({
    to: email,
    subject: `Thank you for your ${type} feedback`,
    template: 'feedback-confirmation',
    data: {
      type,
      feedbackId,
      trackingUrl: `https://tribe-app.com/feedback/${feedbackId}`,
    },
  })
}
```

## Acceptance Criteria

### Functional Requirements
- [ ] Feedback widget accessible on all pages
- [ ] Bug report form captures all required info
- [ ] Feature request form easy to use
- [ ] Screenshot capture works on all browsers
- [ ] Context auto-captured (page, browser, etc.)
- [ ] Email confirmation sent to user
- [ ] Team notifications sent (Slack/email)
- [ ] Critical bugs create Linear issues
- [ ] Admin dashboard shows all feedback
- [ ] Feedback can be filtered/sorted
- [ ] Status can be updated
- [ ] Comments/notes can be added
- [ ] NPS survey triggers at right time

### User Experience
- [ ] Widget doesn't obstruct content
- [ ] Forms are intuitive and fast
- [ ] Progress indication during submission
- [ ] Clear success confirmation
- [ ] Can track feedback status
- [ ] Optional anonymous feedback
- [ ] Mobile-friendly interface

### Admin Experience
- [ ] Easy to triage feedback
- [ ] Can assign to team members
- [ ] Can link to Linear issues
- [ ] Can reply to users
- [ ] Can see user context
- [ ] Analytics/reporting available
- [ ] Export feedback data

## Testing Checklist

- [ ] Submit bug report
- [ ] Submit feature request
- [ ] Submit general feedback
- [ ] Capture screenshot
- [ ] Test on different browsers
- [ ] Test on mobile
- [ ] Verify email confirmation
- [ ] Verify Slack notification
- [ ] Verify Linear issue creation
- [ ] Test admin dashboard
- [ ] Test status updates
- [ ] Test filtering/sorting
- [ ] Complete NPS survey

## Beta Launch Strategy

### Week 1-2: Initial Feedback
- Active feedback widget
- Daily review of submissions
- Quick response to bug reports
- Personal follow-ups with testers

### Week 3-4: Structured Surveys
- Send NPS survey
- Feature priority survey
- Usability questionnaire
- Interview requests

### Week 5-6: Deep Dives
- Schedule user interviews
- Watch session recordings
- Analyze usage patterns
- Synthesize insights

## Files to Create

- `/src/components/feedback/FeedbackWidget.tsx`
- `/src/components/feedback/FeedbackModal.tsx`
- `/src/components/feedback/BugReportForm.tsx`
- `/src/components/feedback/FeatureRequestForm.tsx`
- `/src/components/feedback/ScreenshotCapture.tsx`
- `/src/components/feedback/NPSSurvey.tsx`
- `/src/app/api/feedback/route.ts`
- `/src/app/api/surveys/nps/route.ts`
- `/src/app/admin/feedback/page.tsx`
- `/src/hooks/useFeedback.ts`
- `/src/lib/integrations/linear.ts`
- `/src/lib/integrations/slack.ts`
- `/supabase/migrations/*_feedback_tables.sql`

## Dependencies

- Linear SDK (`@linear/sdk`)
- html2canvas (screenshot capture)
- React Hook Form
- Slack webhooks
- SendGrid (email)

## Related Issues

- Error Pages (for feedback on errors)
- Browser Compatibility (for device info)

## Estimated Effort

- Widget & Forms: 16 hours
- API & Database: 12 hours
- Admin Dashboard: 16 hours
- Integrations: 12 hours
- Testing: 8 hours
- **Total: 64 hours** (~8 days, 1.5 weeks with 2 devs)

## Success Metrics

- **Feedback Volume**: >50% of beta users submit feedback
- **Response Time**: <24 hours for critical bugs
- **Resolution Rate**: >80% of bugs fixed in beta
- **NPS Score**: >40 (good for beta)
- **User Satisfaction**: >70% satisfied with feedback process
