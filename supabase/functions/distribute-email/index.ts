import { corsHeaders } from '../_shared/cors.ts'
import { validateDistributeEmailRequest, validateEmail } from '../_shared/validation.ts'
import {
  DistributeEmailRequest,
  DistributeEmailResponse,
  DeliveryJobInfo,
  EmailTemplateData
} from '../_shared/types.ts'
import {
  createSupabaseClient,
  fetchUpdateWithDetails,
  fetchRecipientsWithDetails,
  createDeliveryJob,
  updateDeliveryJobStatus,
  markUpdateAsSent
} from '../_shared/database.ts'
import {
  generateHtmlTemplate,
  generateTextTemplate,
  generateReplyToAddress,
  calculateChildAge
} from '../_shared/email-templates.ts'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!
const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL')!
const SENDGRID_FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') || 'Tribe'
const REPLY_TO_DOMAIN = Deno.env.get('REPLY_TO_DOMAIN')!

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
        }
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

async function processDistribution(request: DistributeEmailRequest): Promise<DistributeEmailResponse> {
  const supabase = createSupabaseClient()

  try {
    // Fetch update details
    const updateDetails = await fetchUpdateWithDetails(supabase, request.update_id)
    if (!updateDetails) {
      return {
        success: false,
        error: 'Update not found'
      }
    }

    // Fetch recipient details
    const recipients = await fetchRecipientsWithDetails(supabase, request.recipient_ids)
    if (recipients.length === 0) {
      return {
        success: false,
        error: 'No valid recipients found'
      }
    }

    const deliveryJobs: DeliveryJobInfo[] = []
    const replyToAddress = generateReplyToAddress(request.update_id, REPLY_TO_DOMAIN)
    const childAge = calculateChildAge(updateDetails.child.birth_date)

    // Process each recipient
    for (const recipient of recipients) {
      if (!recipient.email || !validateEmail(recipient.email)) {
        console.log(`Skipping recipient ${recipient.id}: invalid email`)
        continue
      }

      // Check if email is in preferred channels
      if (!recipient.preferred_channels.includes('email')) {
        console.log(`Skipping recipient ${recipient.id}: email not in preferred channels`)
        continue
      }

      // Create delivery job
      const jobId = await createDeliveryJob(supabase, request.update_id, recipient.id, 'email')
      if (!jobId) {
        console.error(`Failed to create delivery job for recipient ${recipient.id}`)
        continue
      }

      // Prepare email template data
      const templateData: EmailTemplateData = {
        recipient_name: recipient.name,
        relationship: recipient.relationship,
        child_name: updateDetails.child.name,
        child_age: childAge,
        content: updateDetails.content,
        milestone_type: updateDetails.milestone_type,
        media_urls: updateDetails.media_urls,
        reply_to_address: replyToAddress,
        update_id: request.update_id
      }

      // Generate email content
      const htmlContent = generateHtmlTemplate(templateData)
      const textContent = generateTextTemplate(templateData)

      // Create subject line
      let subject = `Update about ${updateDetails.child.name}`
      if (updateDetails.milestone_type) {
        const milestoneMap: Record<string, string> = {
          'first_smile': 'First Smile',
          'rolling': 'Rolling Over',
          'sitting': 'Sitting Up',
          'crawling': 'Crawling',
          'first_steps': 'First Steps',
          'first_words': 'First Words',
          'first_tooth': 'First Tooth',
          'walking': 'Walking',
          'potty_training': 'Potty Training',
          'first_day_school': 'First Day of School',
          'birthday': 'Birthday',
          'other': 'Special Milestone'
        }
        const milestoneName = milestoneMap[updateDetails.milestone_type] || 'Special Milestone'
        subject = `🎉 ${updateDetails.child.name}'s ${milestoneName}!`
      }

      // Custom args for tracking
      const customArgs = {
        update_id: request.update_id,
        recipient_id: recipient.id,
        job_id: jobId
      }

      // Send email
      const emailResult = await sendEmailViaSendGrid(
        recipient.email,
        subject,
        htmlContent,
        textContent,
        replyToAddress,
        customArgs
      )

      if (emailResult.success) {
        // Update delivery job with SendGrid message ID
        await updateDeliveryJobStatus(
          supabase,
          jobId,
          'sent',
          emailResult.messageId
        )

        deliveryJobs.push({
          id: jobId,
          recipient_id: recipient.id,
          status: 'sent',
          external_id: emailResult.messageId
        })
      } else {
        // Update delivery job with error
        await updateDeliveryJobStatus(
          supabase,
          jobId,
          'failed',
          undefined,
          emailResult.error
        )

        deliveryJobs.push({
          id: jobId,
          recipient_id: recipient.id,
          status: 'failed',
          error_message: emailResult.error
        })
      }
    }

    // Check if any emails were sent successfully
    const successfulJobs = deliveryJobs.filter(job => job.status === 'sent')
    if (successfulJobs.length > 0) {
      // Mark update as sent
      await markUpdateAsSent(supabase, request.update_id)
    }

    return {
      success: true,
      delivery_jobs: deliveryJobs
    }

  } catch (error) {
    console.error('Error processing distribution:', error)
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
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const requestData = await req.json()

    // Validate request data
    if (!validateDistributeEmailRequest(requestData)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request data. Required: update_id (string), recipient_ids (string[])'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate environment variables
    if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL || !REPLY_TO_DOMAIN) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required environment variables'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Process the distribution
    const result = await processDistribution(requestData)

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})