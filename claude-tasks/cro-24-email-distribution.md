# CRO-24: Email Distribution System

## Issue URL
https://linear.app/crod/issue/CRO-24/phase-31-email-distribution-system

## Agents Required
- `api-developer` (Primary)
- `email-developer` (Supporting)
- `react-developer` (Supporting)

## Dependencies
- **CRO-18**: Supabase Project Setup & Database Schema (COMPLETE)
- **CRO-19**: AI Analysis Edge Function (COMPLETE)
- **CRO-20**: Next.js Project Setup & Authentication (COMPLETE)
- **CRO-21**: Child Management System (COMPLETE)
- **CRO-22**: Recipient & Group Management (COMPLETE)
- **CRO-23**: Update Creation & AI Integration (COMPLETE)

## Objective
Implement SendGrid email distribution system with template rendering, delivery tracking, and personalized content for each recipient.

## Context
When parents confirm an update for distribution, the system needs to send personalized emails to selected recipients via SendGrid, track delivery status, and set up reply-to addresses for response threading.

## Environment Variables Required
```bash
# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=updates@yourdomain.com
SENDGRID_FROM_NAME=Your Family Updates

# Domain Configuration
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
REPLY_TO_DOMAIN=yourdomain.com
```

## Tasks

### 1. SendGrid Setup & Integration
- [ ] Set up SendGrid account and API key
- [ ] Configure domain authentication (SPF, DKIM)
- [ ] Create SendGrid webhook endpoints for delivery tracking
- [ ] Test API connection and email sending
- [ ] Set up email templates in SendGrid

### 2. Email Distribution Edge Function
- [ ] Create `distribute-email` Edge Function
- [ ] Implement recipient processing and personalization
- [ ] Add email template rendering system
- [ ] Create delivery job tracking
- [ ] Handle email sending errors and retries

### 3. Email Template System
- [ ] Design responsive HTML email template
- [ ] Create text-only fallback template
- [ ] Add dynamic content injection (child name, photos, etc.)
- [ ] Implement personalization based on recipient relationship
- [ ] Test template rendering across email clients

### 4. Delivery Status Tracking
- [ ] Create delivery job management system
- [ ] Implement webhook handlers for SendGrid events
- [ ] Add real-time delivery status updates
- [ ] Create retry logic for failed deliveries
- [ ] Build delivery status dashboard for parents

### 5. Reply-To Threading System
- [ ] Set up unique reply-to addresses per update
- [ ] Configure MX records for email receiving
- [ ] Create email routing for response collection
- [ ] Test email threading functionality
- [ ] Handle bounce and spam notifications

### 6. Frontend Integration
- [ ] Create delivery status components
- [ ] Add "Send Update" confirmation flow
- [ ] Display delivery progress in real-time
- [ ] Show delivery history and statistics
- [ ] Handle sending errors gracefully

## Edge Function Implementation

### distribute-email/index.ts
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DistributeEmailRequest {
  update_id: string
  recipient_ids: string[]
}

const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL')!
const fromName = Deno.env.get('SENDGRID_FROM_NAME')!
const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL')!
const replyToDomain = Deno.env.get('REPLY_TO_DOMAIN')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const requestData: DistributeEmailRequest = await req.json()
    
    if (!requestData.update_id || !requestData.recipient_ids?.length) {
      throw new Error('Missing required fields: update_id, recipient_ids')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get update details with child info
    const { data: update } = await supabase
      .from('updates')
      .select(`
        *,
        children(name, birth_date, profile_photo_url),
        profiles(name)
      `)
      .eq('id', requestData.update_id)
      .single()

    if (!update) {
      throw new Error('Update not found')
    }

    // Get recipients details
    const { data: recipients } = await supabase
      .from('recipients')
      .select('*')
      .in('id', requestData.recipient_ids)
      .eq('is_active', true)

    if (!recipients?.length) {
      throw new Error('No valid recipients found')
    }

    // Create delivery jobs
    const deliveryJobs = recipients
      .filter(r => r.preferred_channels.includes('email') && r.email)
      .map(recipient => ({
        update_id: requestData.update_id,
        recipient_id: recipient.id,
        channel: 'email',
        status: 'queued'
      }))

    const { data: createdJobs, error: jobError } = await supabase
      .from('delivery_jobs')
      .insert(deliveryJobs)
      .select()

    if (jobError) throw jobError

    // Send emails to each recipient
    const emailPromises = createdJobs.map(async (job) => {
      const recipient = recipients.find(r => r.id === job.recipient_id)!
      
      try {
        const emailContent = await generateEmailContent(update, recipient)
        const messageId = await sendEmail(emailContent, job.id)
        
        // Update job status
        await supabase
          .from('delivery_jobs')
          .update({
            status: 'sent',
            external_id: messageId,
            sent_at: new Date().toISOString()
          })
          .eq('id', job.id)

        return { success: true, recipient_id: recipient.id, job_id: job.id }
      } catch (error) {
        // Update job with error
        await supabase
          .from('delivery_jobs')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', job.id)

        return { success: false, recipient_id: recipient.id, error: error.message }
      }
    })

    const results = await Promise.all(emailPromises)
    const successCount = results.filter(r => r.success).length
    
    // Update overall update status
    if (successCount > 0) {
      await supabase
        .from('updates')
        .update({
          distribution_status: successCount === results.length ? 'sent' : 'partially_sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', requestData.update_id)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        total_recipients: results.length,
        successful_sends: successCount,
        results
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Email distribution error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function generateEmailContent(update: any, recipient: any) {
  const child = update.children
  const parent = update.profiles
  const replyToEmail = `update-${update.id}@${replyToDomain}`
  
  // Personalize greeting based on relationship
  const greeting = getPersonalizedGreeting(recipient.relationship, recipient.name, child.name)
  
  // Generate email subject
  const subject = update.milestone_type 
    ? `${child.name}'s ${formatMilestone(update.milestone_type)} 🎉`
    : `Update from ${child.name}`

  // Generate HTML content
  const htmlContent = await generateHtmlEmail({
    greeting,
    childName: child.name,
    parentName: parent.name,
    content: update.content,
    milestoneType: update.milestone_type,
    mediaUrls: update.media_urls || [],
    childAge: calculateAge(child.birth_date),
    replyToEmail,
    siteUrl
  })

  // Generate text content
  const textContent = generateTextEmail({
    greeting,
    childName: child.name,
    parentName: parent.name,
    content: update.content,
    milestoneType: update.milestone_type,
    mediaCount: update.media_urls?.length || 0,
    replyToEmail
  })

  return {
    to: recipient.email,
    subject,
    html: htmlContent,
    text: textContent,
    replyTo: replyToEmail,
    recipient,
    update
  }
}

async function sendEmail(emailContent: any, jobId: string) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendGridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: emailContent.to }],
        custom_args: {
          update_id: emailContent.update.id,
          recipient_id: emailContent.recipient.id,
          job_id: jobId
        }
      }],
      from: {
        email: fromEmail,
        name: fromName
      },
      reply_to: {
        email: emailContent.replyTo
      },
      subject: emailContent.subject,
      content: [
        {
          type: 'text/plain',
          value: emailContent.text
        },
        {
          type: 'text/html',
          value: emailContent.html
        }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SendGrid API error: ${response.status} - ${error}`)
  }

  // Extract message ID from response headers
  const messageId = response.headers.get('X-Message-Id')
  return messageId
}

function getPersonalizedGreeting(relationship: string, recipientName: string, childName: string): string {
  const greetings = {
    grandparent: `Dear ${recipientName}, here's what your grandchild ${childName} has been up to!`,
    parent: `Hi ${recipientName}! Here's an update about ${childName}.`,
    sibling: `Hey ${recipientName}! Your ${getSiblingRelation()} ${childName} has something to share.`,
    friend: `Hi ${recipientName}! Thought you'd love to see what ${childName} is up to.`,
    family: `Hello ${recipientName}! Here's the latest news about ${childName}.`,
    colleague: `Hi ${recipientName}, sharing a sweet update about ${childName}!`,
    other: `Hello ${recipientName}! Here's an update about ${childName}.`
  }
  
  return greetings[relationship] || greetings.other
}

function formatMilestone(milestoneType: string): string {
  const milestones = {
    first_smile: 'First Smile',
    rolling: 'Rolling Over',
    sitting: 'Sitting Up',
    crawling: 'First Crawl',
    first_steps: 'First Steps',
    first_words: 'First Words',
    first_tooth: 'First Tooth',
    walking: 'Walking',
    potty_training: 'Potty Training',
    first_day_school: 'First Day of School',
    birthday: 'Birthday',
    other: 'Special Milestone'
  }
  
  return milestones[milestoneType] || 'Update'
}
```

### HTML Email Template
```html
<!-- Email template with responsive design -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        /* Responsive email styles */
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            text-align: center; 
            padding: 30px 20px; 
            border-radius: 10px 10px 0 0; 
        }
        .content { 
            background: white; 
            padding: 30px; 
            border: 1px solid #e1e1e1; 
        }
        .photo-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 10px; 
            margin: 20px 0; 
        }
        .photo-grid img { 
            width: 100%; 
            height: 150px; 
            object-fit: cover; 
            border-radius: 8px; 
        }
        .milestone-badge { 
            background: #f0f9ff; 
            color: #0369a1; 
            padding: 8px 16px; 
            border-radius: 20px; 
            display: inline-block; 
            margin: 10px 0; 
            font-weight: bold; 
        }
        .reply-section { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 8px; 
            margin-top: 20px; 
            text-align: center; 
        }
        .footer { 
            text-align: center; 
            color: #6b7280; 
            font-size: 14px; 
            padding: 20px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{childName}}'s Update</h1>
            <p>{{childAge}} • From {{parentName}}</p>
        </div>
        
        <div class="content">
            <p>{{greeting}}</p>
            
            {{#milestoneType}}
            <div class="milestone-badge">
                🎉 {{formattedMilestone}}
            </div>
            {{/milestoneType}}
            
            <div style="font-size: 16px; margin: 20px 0;">
                {{content}}
            </div>
            
            {{#hasPhotos}}
            <div class="photo-grid">
                {{#mediaUrls}}
                <img src="{{.}}" alt="Photo of {{childName}}" />
                {{/mediaUrls}}
            </div>
            {{/hasPhotos}}
            
            <div class="reply-section">
                <h3>Share Your Thoughts!</h3>
                <p>Reply to this email to send a message back to the family. You can even attach photos!</p>
                <p><strong>Reply to:</strong> {{replyToEmail}}</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This update was sent via <a href="{{siteUrl}}">Tribe Family Platform</a></p>
            <p>To change your preferences, <a href="{{preferencesUrl}}">click here</a></p>
        </div>
    </div>
</body>
</html>
```

### Webhook Handler for Delivery Tracking
```typescript
// Edge Function: sendgrid-webhook
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const events = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    for (const event of events) {
      const jobId = event.job_id // From custom_args
      const messageId = event.sg_message_id
      
      let status = 'sent'
      let deliveredAt = null
      let errorMessage = null

      switch (event.event) {
        case 'delivered':
          status = 'delivered'
          deliveredAt = new Date(event.timestamp * 1000).toISOString()
          break
        case 'bounce':
        case 'blocked':
        case 'dropped':
          status = 'failed'
          errorMessage = event.reason || 'Delivery failed'
          break
      }

      await supabase
        .from('delivery_jobs')
        .update({
          status,
          delivered_at: deliveredAt,
          error_message: errorMessage,
          external_id: messageId
        })
        .eq('id', jobId)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Error', { status: 500 })
  }
})
```

## Frontend Integration

### useEmailDistribution Hook
```typescript
// src/hooks/useEmailDistribution.ts
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useEmailDistribution() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const distributeUpdate = async (updateId: string, recipientIds: string[]) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('distribute-email', {
        body: { update_id: updateId, recipient_ids: recipientIds }
      })

      if (error) throw error
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send update'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  return { distributeUpdate, loading, error }
}
```

### DeliveryStatus Component
```typescript
// src/components/updates/DeliveryStatus.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DeliveryStatusProps {
  updateId: string
}

export function DeliveryStatus({ updateId }: DeliveryStatusProps) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDeliveryJobs() {
      const supabase = createClient()
      const { data } = await supabase
        .from('delivery_jobs')
        .select(`
          *,
          recipients(name, email, relationship)
        `)
        .eq('update_id', updateId)

      setJobs(data || [])
      setLoading(false)
    }

    fetchDeliveryJobs()

    // Subscribe to real-time updates
    const supabase = createClient()
    const channel = supabase
      .channel('delivery_status')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'delivery_jobs',
          filter: `update_id=eq.${updateId}`
        }, 
        (payload) => {
          setJobs(prev => prev.map(job => 
            job.id === payload.new.id ? { ...job, ...payload.new } : job
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [updateId])

  if (loading) return <div>Loading delivery status...</div>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Delivery Status</h3>
      {jobs.map((job) => (
        <div key={job.id} className="flex items-center justify-between p-3 border rounded">
          <div>
            <p className="font-medium">{job.recipients.name}</p>
            <p className="text-sm text-gray-600">{job.recipients.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <DeliveryStatusBadge status={job.status} />
            {job.error_message && (
              <span className="text-xs text-red-600">{job.error_message}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

## Testing Strategy

### Local Testing
```bash
# Test SendGrid connection
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "updates@yourdomain.com"},
    "subject": "Test Email",
    "content": [{"type": "text/plain", "value": "Test content"}]
  }'

# Test Edge Function locally
curl -X POST 'http://localhost:54321/functions/v1/distribute-email' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "update_id": "test-uuid",
    "recipient_ids": ["recipient-uuid-1", "recipient-uuid-2"]
  }'
```

### Email Template Testing
1. Test HTML rendering in different email clients
2. Verify image loading and compression
3. Test responsive design on mobile email apps
4. Validate text-only fallback
5. Check spam score with tools like Mail Tester

## Success Criteria
- [ ] ✅ SendGrid integration working with proper authentication
- [ ] ✅ Email templates render correctly with photos and content
- [ ] ✅ Delivery status tracking functional with real-time updates
- [ ] ✅ Reply-to addresses set up correctly for threading
- [ ] ✅ Multiple recipients receive personalized emails
- [ ] ✅ Delivery jobs update status correctly via webhooks
- [ ] ✅ Error handling works for failed deliveries
- [ ] ✅ Mobile-responsive email templates
- [ ] ✅ Spam score is acceptable (< 3.0)
- [ ] ✅ Email deliverability meets standards (>95%)

## Monitoring and Analytics
- Track email open rates and click rates
- Monitor delivery failure rates by recipient domain
- Alert on high bounce rates or spam complaints
- Log SendGrid API usage and costs

## Next Steps After Completion
- Ready for CRO-25 (Email Webhooks & Memory System)
- Foundation set for response collection and threading
- Email infrastructure prepared for system notifications