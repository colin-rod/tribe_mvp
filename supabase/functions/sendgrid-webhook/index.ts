import { corsHeaders } from '../_shared/cors.ts'
import { SendGridWebhookEvent } from '../_shared/types.ts'
import {
  createSupabaseClient,
  updateDeliveryJobByExternalId
} from '../_shared/database.ts'
import { extractUpdateIdFromReplyTo } from '../_shared/email-templates.ts'

const WEBHOOK_SECRET = Deno.env.get('SENDGRID_WEBHOOK_SECRET')

// SendGrid webhook signature verification
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): Promise<boolean> {
  if (!secret) {
    console.warn('No webhook secret configured, skipping verification')
    return true // Allow in development mode
  }

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signedPayload = timestamp + payload
    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    )

    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return signature === expectedSignatureHex
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

async function processWebhookEvents(events: SendGridWebhookEvent[]): Promise<void> {
  const supabase = createSupabaseClient()

  for (const event of events) {
    try {
      // Map SendGrid events to our delivery status
      let deliveryStatus: string
      let errorMessage: string | undefined

      switch (event.event) {
        case 'delivered':
          deliveryStatus = 'delivered'
          break
        case 'bounce':
        case 'dropped':
          deliveryStatus = 'failed'
          errorMessage = event.reason || `Email ${event.event}`
          break
        case 'processed':
          // Email was processed by SendGrid but not yet delivered
          continue // Skip processing for now
        case 'deferred':
          // Email delivery was temporarily delayed
          continue // Skip processing for now
        case 'open':
        case 'click':
          // These are engagement events, not delivery status changes
          console.log(`Engagement event: ${event.event} for ${event.email}`)
          continue
        case 'spamreport':
        case 'unsubscribe':
        case 'group_unsubscribe':
        case 'group_resubscribe':
          // These are user preference events
          console.log(`User preference event: ${event.event} for ${event.email}`)
          // TODO: Update recipient preferences in database
          continue
        default:
          console.log(`Unhandled event type: ${event.event}`)
          continue
      }

      // Update delivery job status using SendGrid message ID
      if (event.sg_message_id) {
        const success = await updateDeliveryJobByExternalId(
          supabase,
          event.sg_message_id,
          deliveryStatus,
          errorMessage
        )

        if (success) {
          console.log(`Updated delivery job for message ${event.sg_message_id}: ${deliveryStatus}`)
        } else {
          console.error(`Failed to update delivery job for message ${event.sg_message_id}`)
        }
      } else {
        console.warn(`No message ID in event: ${JSON.stringify(event)}`)
      }

      // Handle reply emails if this is a reply-to address
      if (event.event === 'delivered' && event.email) {
        const updateId = extractUpdateIdFromReplyTo(event.email)
        if (updateId) {
          console.log(`Reply-to email detected for update ${updateId}`)
          // TODO: Process incoming reply email
          // This would require additional setup to capture reply content
        }
      }

    } catch (error) {
      console.error('Error processing webhook event:', error, event)
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the raw payload for signature verification
    const payload = await req.text()

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = req.headers.get('X-Twilio-Email-Event-Webhook-Signature')
      const timestamp = req.headers.get('X-Twilio-Email-Event-Webhook-Timestamp')

      if (!signature || !timestamp) {
        return new Response(
          JSON.stringify({ error: 'Missing webhook signature headers' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const isValid = await verifyWebhookSignature(payload, signature, timestamp, WEBHOOK_SECRET)
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Parse the webhook events
    let events: SendGridWebhookEvent[]
    try {
      events = JSON.parse(payload)
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate that we received an array of events
    if (!Array.isArray(events)) {
      return new Response(
        JSON.stringify({ error: 'Expected array of events' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Process the webhook events
    await processWebhookEvents(events)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        processed: events.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in webhook handler:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})