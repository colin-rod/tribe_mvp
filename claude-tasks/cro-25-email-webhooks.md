# CRO-25: Email Webhooks & Memory System

## Issue URL
https://linear.app/crod/issue/CRO-25/phase-32-email-webhooks-memory-system

## Agents Required
- `api-developer` (Primary)
- `email-developer` (Supporting)
- `devops-engineer` (Supporting)

## Dependencies
- **CRO-24**: Email Distribution System (MUST BE COMPLETE)
- **Domain Access**: Required for MX record configuration
- **SendGrid Inbound Parse**: Premium feature required

## Objective
Implement email webhook system to handle incoming responses and email-to-memory feature, enabling recipients to reply to updates and parents to create updates via email.

## Context
Recipients should be able to reply to update emails, and parents should be able to create new updates by sending emails to memory@yourdomain.com. This requires email webhook processing, attachment handling, and response threading.

## Environment Variables Required
```bash
# Email Configuration
INBOUND_EMAIL_DOMAIN=yourdomain.com
MEMORY_EMAIL=memory@yourdomain.com
WEBHOOK_SECRET=your-webhook-secret

# Already from CRO-24
SENDGRID_API_KEY=your-sendgrid-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Tasks

### 1. Domain and MX Record Setup
- [ ] Configure MX records for email receiving
- [ ] Set up SendGrid Inbound Parse webhook
- [ ] Test email receiving functionality
- [ ] Configure subdomain for email processing
- [ ] Verify DNS propagation and email routing

### 2. Email Webhook Edge Function
- [ ] Create `email-webhook` Edge Function
- [ ] Implement SendGrid Inbound Parse handling
- [ ] Add email parsing and content extraction
- [ ] Handle multipart emails with attachments
- [ ] Create email threading and routing logic

### 3. Response Processing System
- [ ] Parse incoming replies to updates
- [ ] Extract response content and media
- [ ] Create response records in database
- [ ] Notify parents of new responses
- [ ] Handle email threading (In-Reply-To headers)

### 4. Email-to-Memory System
- [ ] Process emails sent to memory@yourdomain.com
- [ ] Extract photos and videos from attachments
- [ ] Create updates automatically from emails
- [ ] Handle sender authentication and validation
- [ ] Support multiple children via email subject parsing

### 5. Email Content Processing
- [ ] Clean email content (remove signatures, forwarding)
- [ ] Extract meaningful content from HTML and text
- [ ] Process image attachments with compression
- [ ] Handle various email client formats
- [ ] Parse email headers for threading

### 6. Error Handling and Security
- [ ] Validate webhook signatures
- [ ] Handle malformed emails gracefully
- [ ] Prevent spam and abuse
- [ ] Rate limiting for email processing
- [ ] Error notification system

## DNS Configuration

### MX Records Setup
```
Type: MX
Name: @
Value: mx.sendgrid.net
Priority: 10

Type: MX
Name: mail
Value: mx.sendgrid.net
Priority: 10
```

### SendGrid Inbound Parse Configuration
```
Hostname: yourdomain.com
Destination URL: https://your-project.supabase.co/functions/v1/email-webhook
Send Raw: Yes (for attachment handling)
```

## Edge Function Implementation

### email-webhook/index.ts
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface InboundEmail {
  to: string
  from: string
  subject: string
  text: string
  html: string
  attachments: number
  attachment_info: any
  envelope: string
  charsets: string
  SPF: string
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const memoryEmail = Deno.env.get('MEMORY_EMAIL')!
const webhookSecret = Deno.env.get('WEBHOOK_SECRET')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Verify webhook signature (if configured)
    if (webhookSecret) {
      const signature = req.headers.get('X-Webhook-Signature')
      // Implement signature verification
    }

    // Parse form data from SendGrid
    const formData = await req.formData()
    const emailData = parseInboundEmail(formData)
    
    console.log('Received email:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      attachments: emailData.attachments
    })

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Determine email type and route accordingly
    if (emailData.to.includes(memoryEmail)) {
      // Email-to-Memory system
      await handleMemoryEmail(emailData, supabase)
    } else if (emailData.to.match(/^update-([a-f0-9-]+)@/)) {
      // Response to existing update
      await handleUpdateResponse(emailData, supabase)
    } else {
      console.log('Unhandled email type:', emailData.to)
    }

    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('Email webhook error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})

function parseInboundEmail(formData: FormData): InboundEmail {
  return {
    to: formData.get('to') as string,
    from: formData.get('from') as string,
    subject: formData.get('subject') as string || '',
    text: formData.get('text') as string || '',
    html: formData.get('html') as string || '',
    attachments: parseInt(formData.get('attachments') as string || '0'),
    attachment_info: formData.get('attachment-info') ? JSON.parse(formData.get('attachment-info') as string) : {},
    envelope: formData.get('envelope') as string || '{}',
    charsets: formData.get('charsets') as string || '{}',
    SPF: formData.get('SPF') as string || ''
  }
}

async function handleMemoryEmail(emailData: InboundEmail, supabase: any) {
  console.log('Processing memory email from:', emailData.from)
  
  // Find parent by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', emailData.from)
    .single()

  if (!profile) {
    console.log('Unknown sender for memory email:', emailData.from)
    return
  }

  // Extract child name from subject if specified
  // Subject format: "Memory for [Child Name]: [content]" or just content
  let childId = null
  let content = emailData.subject
  
  const childMatch = emailData.subject.match(/^Memory for ([^:]+):\s*(.+)$/i)
  if (childMatch) {
    const childName = childMatch[1].trim()
    content = childMatch[2].trim()
    
    // Find child by name
    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('parent_id', profile.id)
      .ilike('name', childName)
      .single()
      
    if (child) childId = child.id
  }

  // If no specific child found, use the first child
  if (!childId) {
    const { data: children } = await supabase
      .from('children')
      .select('id')
      .eq('parent_id', profile.id)
      .order('birth_date', { ascending: false })
      .limit(1)

    if (children?.length) childId = children[0].id
  }

  if (!childId) {
    console.log('No child found for memory email')
    return
  }

  // Process attachments
  const mediaUrls = await processEmailAttachments(emailData, profile.id, supabase)

  // Create update from email content
  const updateContent = cleanEmailContent(emailData.text || emailData.html)
  
  const { data: update, error } = await supabase
    .from('updates')
    .insert({
      parent_id: profile.id,
      child_id: childId,
      content: updateContent,
      media_urls: mediaUrls,
      distribution_status: 'draft' // Parent can review and send later
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create update from email:', error)
    return
  }

  console.log('Created update from email:', update.id)
  
  // Optionally notify parent that update was created
  await sendMemoryConfirmationEmail(emailData.from, update, supabase)
}

async function handleUpdateResponse(emailData: InboundEmail, supabase: any) {
  // Extract update ID from email address (update-{uuid}@domain.com)
  const updateMatch = emailData.to.match(/^update-([a-f0-9-]+)@/)
  if (!updateMatch) {
    console.log('Invalid update email format:', emailData.to)
    return
  }

  const updateId = updateMatch[1]
  
  // Verify update exists
  const { data: update } = await supabase
    .from('updates')
    .select('id, parent_id')
    .eq('id', updateId)
    .single()

  if (!update) {
    console.log('Update not found for response:', updateId)
    return
  }

  // Find recipient by email
  const { data: recipient } = await supabase
    .from('recipients')
    .select('id, name')
    .eq('parent_id', update.parent_id)
    .eq('email', emailData.from)
    .single()

  if (!recipient) {
    console.log('Unknown recipient for response:', emailData.from)
    return
  }

  // Process attachments
  const mediaUrls = await processEmailAttachments(emailData, update.parent_id, supabase)

  // Clean response content
  const responseContent = cleanEmailContent(emailData.text || emailData.html)

  // Create response record
  const { data: response, error } = await supabase
    .from('responses')
    .insert({
      update_id: updateId,
      recipient_id: recipient.id,
      channel: 'email',
      content: responseContent,
      media_urls: mediaUrls,
      external_id: extractMessageId(emailData)
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create response:', error)
    return
  }

  console.log('Created response from email:', response.id)
  
  // Notify parent of new response (based on their preferences)
  await notifyParentOfResponse(update.parent_id, recipient.name, responseContent, supabase)
}

async function processEmailAttachments(emailData: InboundEmail, parentId: string, supabase: any): Promise<string[]> {
  if (emailData.attachments === 0) return []

  const mediaUrls: string[] = []
  
  try {
    const attachmentInfo = emailData.attachment_info
    
    for (const [filename, info] of Object.entries(attachmentInfo)) {
      if (isImageFile(filename) || isVideoFile(filename)) {
        // In a real implementation, you'd need to:
        // 1. Decode the base64 attachment content
        // 2. Upload to Supabase Storage
        // 3. Generate public URL
        
        // For now, this is a placeholder
        console.log('Processing attachment:', filename, info)
        
        // const publicUrl = await uploadAttachmentToStorage(
        //   filename, 
        //   attachmentContent, 
        //   parentId, 
        //   supabase
        // )
        // mediaUrls.push(publicUrl)
      }
    }
  } catch (error) {
    console.error('Failed to process attachments:', error)
  }

  return mediaUrls
}

function cleanEmailContent(content: string): string {
  if (!content) return ''
  
  // Remove common email signatures and forwarding markers
  let cleaned = content
    .replace(/^On .+ wrote:[\s\S]*$/m, '') // Remove forwarded content
    .replace(/^From: .+$/gm, '') // Remove email headers in forwarded content
    .replace(/^Sent from my .+$/gm, '') // Remove mobile signatures
    .replace(/^Get Outlook for .+$/gm, '') // Remove Outlook signatures
    .replace(/--[\s\S]*$/, '') // Remove everything after signature delimiter
    .replace(/<[^>]+>/g, '') // Strip HTML tags
    .replace(/&[^;]+;/g, '') // Remove HTML entities
    .trim()

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n')
  
  return cleaned.substring(0, 2000) // Limit length
}

function extractMessageId(emailData: InboundEmail): string {
  try {
    const envelope = JSON.parse(emailData.envelope)
    return envelope.message_id || `email-${Date.now()}`
  } catch {
    return `email-${Date.now()}`
  }
}

function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic']
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm']
  return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

async function sendMemoryConfirmationEmail(to: string, update: any, supabase: any) {
  // Send confirmation that memory email was processed
  console.log('Sending memory confirmation to:', to)
  // Implementation would use SendGrid to notify parent
}

async function notifyParentOfResponse(parentId: string, recipientName: string, content: string, supabase: any) {
  // Get parent's notification preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_preferences, email')
    .eq('id', parentId)
    .single()

  if (!profile) return

  const prefs = profile.notification_preferences || {}
  
  if (prefs.response_notifications === 'immediate') {
    // Send immediate notification
    console.log('Sending immediate response notification to:', profile.email)
    // Implementation would use SendGrid
  } else if (prefs.response_notifications === 'daily_digest') {
    // Add to daily digest queue
    console.log('Adding to daily digest for:', profile.email)
  }
## Attachment Processing Utility
```typescript
// src/lib/email-attachment-processor.ts
export async function uploadAttachmentToStorage(
  filename: string,
  content: string, // base64 encoded
  parentId: string,
  supabase: any
): Promise<string> {
  try {
    // Decode base64 content
    const binaryContent = Uint8Array.from(atob(content), c => c.charCodeAt(0))
    
    // Generate unique filename
    const timestamp = Date.now()
    const extension = filename.split('.').pop()
    const uniqueFilename = `${timestamp}-${crypto.randomUUID()}.${extension}`
    const filePath = `${parentId}/email-attachments/${uniqueFilename}`
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, binaryContent, {
        contentType: getMimeType(filename),
        upsert: false
      })
      
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)
      
    return publicUrl
  } catch (error) {
    console.error('Failed to upload attachment:', error)
    return ''
  }
}

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo'
  }
  
  return mimeTypes[ext || ''] || 'application/octet-stream'
}
```

## Frontend Components

### EmailToMemoryGuide Component
```typescript
// src/components/updates/EmailToMemoryGuide.tsx
'use client'

import { Copy, Mail, Camera, Smartphone } from 'lucide-react'
import { useState } from 'react'

export function EmailToMemoryGuide() {
  const [copied, setCopied] = useState(false)
  const memoryEmail = 'memory@yourdomain.com'

  const copyEmail = () => {
    navigator.clipboard.writeText(memoryEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <Mail className="h-6 w-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-blue-900">Email-to-Memory</h3>
      </div>
      
      <p className="text-blue-800 mb-4">
        Create updates instantly by emailing photos and text directly to your family platform.
      </p>
      
      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <code className="text-blue-700 font-mono">{memoryEmail}</code>
          <button
            onClick={copyEmail}
            className="ml-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            {copied ? 'Copied!' : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <Camera className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="font-medium">Attach Photos</p>
          <p className="text-blue-700">Add up to 10 photos per email</p>
        </div>
        
        <div className="text-center">
          <Smartphone className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="font-medium">From Any Device</p>
          <p className="text-blue-700">Phone, tablet, or computer</p>
        </div>
        
        <div className="text-center">
          <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="font-medium">Auto-Creation</p>
          <p className="text-blue-700">Updates created as drafts</p>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-blue-100 rounded text-xs text-blue-800">
        <strong>Pro tip:</strong> Use subject line "Memory for [Child Name]: [description]" to specify which child the update is about.
      </div>
    </div>
  )
}
```

### ResponseThread Component
```typescript
// src/components/responses/ResponseThread.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface ResponseThreadProps {
  updateId: string
}

export function ResponseThread({ updateId }: ResponseThreadProps) {
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchResponses() {
      const supabase = createClient()
      const { data } = await supabase
        .from('responses')
        .select(`
          *,
          recipients(name, relationship, email)
        `)
        .eq('update_id', updateId)
        .order('received_at', { ascending: true })

      setResponses(data || [])
      setLoading(false)
    }

    fetchResponses()

    // Subscribe to new responses
    const supabase = createClient()
    const channel = supabase
      .channel('responses')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'responses',
          filter: `update_id=eq.${updateId}`
        }, 
        (payload) => {
          // Fetch the complete response with recipient info
          fetchResponses()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [updateId])

  if (loading) {
    return <div className="animate-pulse">Loading responses...</div>
  }

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No responses yet. Recipients can reply via email to share their thoughts!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Responses ({responses.length})</h3>
      
      {responses.map((response) => (
        <div key={response.id} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-700 font-medium text-sm">
                  {response.recipients.name[0]}
                </span>
              </div>
              <div>
                <p className="font-medium">{response.recipients.name}</p>
                <p className="text-xs text-gray-600 capitalize">
                  {response.recipients.relationship} • via {response.channel}
                </p>
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(response.received_at), { addSuffix: true })}
            </span>
          </div>
          
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{response.content}</p>
          </div>
          
          {response.media_urls && response.media_urls.length > 0 && (
            <div className="mt-3">
              <div className="flex gap-2 overflow-x-auto">
                {response.media_urls.map((url, index) => (
                  <img 
                    key={index}
                    src={url} 
                    alt={`Response media ${index + 1}`}
                    className="h-20 w-20 object-cover rounded-lg flex-shrink-0"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

## Testing Strategy

### Email Processing Tests
```bash
# Test email webhook locally
curl -X POST 'http://localhost:54321/functions/v1/email-webhook' \
  -H 'Content-Type: multipart/form-data' \
  -F 'to=memory@yourdomain.com' \
  -F 'from=parent@example.com' \
  -F 'subject=Emma took her first steps!' \
  -F 'text=She walked from the couch to the coffee table! So proud!' \
  -F 'attachments=1' \
  -F 'attachment1=@test-photo.jpg'

# Test update response
curl -X POST 'http://localhost:54321/functions/v1/email-webhook' \
  -H 'Content-Type: multipart/form-data' \
  -F 'to=update-550e8400-e29b-41d4-a716-446655440000@yourdomain.com' \
  -F 'from=grandma@example.com' \
  -F 'subject=Re: Emma'\''s First Steps' \
  -F 'text=So wonderful! Can'\''t wait to see her walk more!'
```

### DNS and Email Routing Tests
1. Send test email to memory@yourdomain.com
2. Verify MX record resolution: `dig MX yourdomain.com`
3. Test SendGrid Inbound Parse configuration
4. Check webhook endpoint accessibility
5. Monitor SendGrid webhook delivery logs

## Success Criteria
- [ ] ✅ MX records configured and emails routing to webhook
- [ ] ✅ SendGrid Inbound Parse webhook receiving emails
- [ ] ✅ Email-to-memory creates updates with photos successfully
- [ ] ✅ Email responses create response records correctly
- [ ] ✅ Email content cleaning removes signatures and forwarding
- [ ] ✅ Attachment processing uploads photos to storage
- [ ] ✅ Response threading works with In-Reply-To headers
- [ ] ✅ Parent notifications work based on preferences
- [ ] ✅ Error handling prevents webhook failures from crashes
- [ ] ✅ Email validation prevents spam and abuse

## Security Considerations

### Webhook Security
- Verify webhook signatures from SendGrid
- Rate limiting on email processing
- Validate sender authentication (SPF, DKIM)
- Prevent email loops and bounce handling

### Spam Protection
- Implement sender whitelist for memory emails
- Content filtering for inappropriate material
- Attachment size and type restrictions
- Monitor for abuse patterns

## Monitoring and Alerts
- Track email processing success rates
- Alert on webhook failures or high error rates
- Monitor attachment processing performance
- Log suspicious email activity

## Next Steps After Completion
- Ready for CRO-26 (Response Collection & Display)
- Email-to-memory system functional for parents
- Response threading prepared for frontend display
- Foundation set for two-way family communication
```