import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/database.ts'
import {
  generateDigestHtmlTemplate,
  generateDigestTextTemplate,
  generateDigestReplyToAddress,
  calculateChildAge,
  type DigestEmailData,
  type DigestUpdateEmailData
} from '../_shared/email-templates.ts'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!
const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL')!
const SENDGRID_FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') || 'Tribe'
const REPLY_TO_DOMAIN = Deno.env.get('REPLY_TO_DOMAIN')!
const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://tribe.example.com'

interface SendDigestEmailsRequest {
  digest_id: string
}

interface SendDigestEmailsResponse {
  success: boolean
  sent_count?: number
  failed_count?: number
  errors?: Array<{
    recipient_id: string
    recipient_name: string
    error: string
  }>
  error?: string
}

interface SendGridResponse {
  success: boolean
  messageId?: string
  error?: string
}

async function sendEmailViaSendGrid(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  replyToAddress: string,
  customArgs: Record<string, string>
): Promise<SendGridResponse> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          custom_args: customArgs
        }],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: SENDGRID_FROM_NAME
        },
        reply_to: {
          email: replyToAddress
        },
        subject,
        content: [
          {
            type: 'text/plain',
            value: textContent
          },
          {
            type: 'text/html',
            value: htmlContent
          }
        ],
        tracking_settings: {
          click_tracking: {
            enable: true,
            enable_text: false
          },
          open_tracking: {
            enable: true
          }
        },
        categories: ['tribe-digest']
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SendGrid API error:', response.status, errorText)
      return {
        success: false,
        error: `SendGrid API error: ${response.status} ${errorText}`
      }
    }

    // SendGrid returns the message ID in the X-Message-Id header
    const messageId = response.headers.get('X-Message-Id')

    return {
      success: true,
      messageId
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function sendDigestEmails(request: SendDigestEmailsRequest): Promise<SendDigestEmailsResponse> {
  const supabase = createSupabaseClient()

  try {
    // Fetch digest
    const { data: digest, error: digestError } = await supabase
      .from('summaries')
      .select('*')
      .eq('id', request.digest_id)
      .single()

    if (digestError || !digest) {
      return {
        success: false,
        error: 'Digest not found'
      }
    }

    // Update digest status to 'sending'
    await supabase
      .from('summaries')
      .update({ status: 'sending' })
      .eq('id', request.digest_id)

    // Fetch all digest_updates with recipient and update details
    const { data: digestUpdates, error: updatesError } = await supabase
      .from('summary_memories')
      .select(`
        *,
        recipients:recipient_id(id, name, email, relationship, frequency, notification_preferences),
        updates:update_id(id, content, subject, media_urls, milestone_type, created_at, children:child_id(name, birth_date))
      `)
      .eq('digest_id', request.digest_id)
      .eq('included', true)
      .order('recipient_id')
      .order('display_order')

    if (updatesError) {
      throw new Error(`Failed to fetch digest updates: ${updatesError.message}`)
    }

    // Group updates by recipient
    const recipientMap = new Map<string, {
      recipient: Record<string, unknown>
      updates: Array<Record<string, unknown> & { custom_caption?: string }>
      narrative?: Record<string, unknown>
    }>()

    for (const du of digestUpdates || []) {
      const recipientId = du.recipient_id as string
      const recipient = du.recipients as unknown as Record<string, unknown>
      const update = du.updates as unknown as Record<string, unknown>

      if (!recipientMap.has(recipientId)) {
        recipientMap.set(recipientId, {
          recipient,
          updates: [],
          narrative: du.narrative_data as Record<string, unknown> | undefined
        })
      }

      recipientMap.get(recipientId)!.updates.push({
        ...update,
        custom_caption: du.custom_caption as string | undefined
      })
    }

    const errors: Array<{ recipient_id: string; recipient_name: string; error: string }> = []
    let sentCount = 0
    let failedCount = 0

    const replyToAddress = generateDigestReplyToAddress(request.digest_id, REPLY_TO_DOMAIN)

    // Send email to each recipient
    for (const [recipientId, data] of recipientMap.entries()) {
      const recipient = data.recipient
      const recipientEmail = recipient.email as string | undefined

      if (!recipientEmail) {
        console.log(`Skipping recipient ${recipientId}: no email address`)
        failedCount++
        errors.push({
          recipient_id: recipientId,
          recipient_name: recipient.name as string,
          error: 'No email address'
        })
        continue
      }

      // Check email notification preferences
      const notificationPrefs = recipient.notification_preferences as Record<string, unknown> | undefined
      if (notificationPrefs && notificationPrefs.email_notifications === false) {
        console.log(`Skipping recipient ${recipientId}: email notifications disabled`)
        continue
      }

      // Prepare digest email data
      const firstUpdate = data.updates[0]
      const children = (firstUpdate.children as Record<string, unknown>) || {}
      const childName = children.name as string || 'your child'

      const digestEmailUpdates: DigestUpdateEmailData[] = data.updates.map(update => {
        const updateChildren = (update.children as Record<string, unknown>) || {}
        const childAge = calculateChildAge(updateChildren.birth_date as string)

        return {
          update_id: update.id as string,
          content: update.content as string || '',
          subject: update.subject as string | undefined,
          child_name: updateChildren.name as string || childName,
          child_age: childAge,
          milestone_type: update.milestone_type as string | undefined,
          media_urls: (update.media_urls as string[]) || [],
          created_at: update.created_at as string,
          custom_caption: update.custom_caption as string | undefined
        }
      })

      const digestEmailData: DigestEmailData = {
        recipient_name: recipient.name as string,
        relationship: recipient.relationship as string,
        child_name: childName,
        digest_title: digest.title as string,
        digest_date: digest.digest_date as string,
        updates: digestEmailUpdates,
        narrative: data.narrative ? {
          intro: (data.narrative.intro as string) || '',
          narrative: (data.narrative.narrative as string) || '',
          closing: (data.narrative.closing as string) || '',
          media_references: (data.narrative.media_references as Array<{
            id: string
            reference_text: string
            url: string
            type: 'photo' | 'video' | 'audio'
          }>) || []
        } : undefined,
        reply_to_address: replyToAddress,
        digest_id: request.digest_id,
        unsubscribe_url: `${APP_URL}/settings/notifications?recipient_id=${recipientId}`
      }

      // Generate email content
      const htmlContent = generateDigestHtmlTemplate(digestEmailData)
      const textContent = generateDigestTextTemplate(digestEmailData)
      const subject = digest.title as string || `Your digest for ${childName}`

      // Custom args for tracking
      const customArgs = {
        digest_id: request.digest_id,
        recipient_id: recipientId,
        type: 'digest'
      }

      // Send email via SendGrid
      const sendResult = await sendEmailViaSendGrid(
        recipientEmail,
        subject,
        htmlContent,
        textContent,
        replyToAddress,
        customArgs
      )

      if (sendResult.success) {
        sentCount++

        // Create delivery job record for tracking
        await supabase
          .from('delivery_jobs')
          .insert({
            update_id: data.updates[0].id as string, // Use first update ID for reference
            recipient_id: recipientId,
            channel: 'email',
            status: 'sent',
            external_id: sendResult.messageId,
            metadata: {
              digest_id: request.digest_id,
              update_count: data.updates.length
            }
          })

        // Record in notification_history
        await supabase
          .from('notification_history')
          .insert({
            user_id: recipient.id as string,
            type: 'digest',
            delivery_method: 'email',
            delivery_status: 'sent',
            metadata: {
              digest_id: request.digest_id,
              update_count: data.updates.length,
              message_id: sendResult.messageId
            }
          })
      } else {
        failedCount++
        errors.push({
          recipient_id: recipientId,
          recipient_name: recipient.name as string,
          error: sendResult.error || 'Unknown error'
        })

        // Record failed delivery
        await supabase
          .from('notification_history')
          .insert({
            user_id: recipient.id as string,
            type: 'digest',
            delivery_method: 'email',
            delivery_status: 'failed',
            metadata: {
              digest_id: request.digest_id,
              error: sendResult.error
            }
          })
      }
    }

    // Update digest status and counts
    const finalStatus = failedCount > 0 && sentCount === 0 ? 'failed' : 'sent'
    await supabase
      .from('summaries')
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount
      })
      .eq('id', request.digest_id)

    // Update related updates to 'sent_in_digest' status
    const updateIds = Array.from(recipientMap.values())
      .flatMap(data => data.updates.map(u => u.id as string))
      .filter((id, index, self) => self.indexOf(id) === index) // unique IDs

    if (updateIds.length > 0) {
      await supabase
        .from('memories')
        .update({ distribution_status: 'sent_in_digest' })
        .in('id', updateIds)
    }

    return {
      success: true,
      sent_count: sentCount,
      failed_count: failedCount,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    console.error('Error sending digest emails:', error)

    // Update digest to failed status
    await supabase
      .from('summaries')
      .update({ status: 'failed' })
      .eq('id', request.digest_id)

    return {
      success: false,
      error: error.message
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: SendDigestEmailsRequest = await req.json()

    if (!request.digest_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'digest_id is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await sendDigestEmails(request)

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Request handling error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
