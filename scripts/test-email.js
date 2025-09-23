#!/usr/bin/env node

/**
 * Test script for SendGrid email integration
 *
 * This script tests the email service functionality by sending
 * test emails for different notification types.
 *
 * Usage:
 *   node scripts/test-email.js <email> [type]
 *
 * Where:
 *   email - The recipient email address
 *   type  - The notification type (response|prompt|digest|system|preference)
 *           Default: system
 *
 * Examples:
 *   node scripts/test-email.js test@example.com
 *   node scripts/test-email.js test@example.com response
 *   node scripts/test-email.js test@example.com preference
 */

require('dotenv').config({ path: '.env.local' })

const sgMail = require('@sendgrid/mail')

// Configuration check
function checkConfiguration() {
  const required = [
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`   - ${key}`))
    console.error('\nPlease check your .env.local file.')
    process.exit(1)
  }

  console.log('✅ Environment configuration verified')
  return true
}

// Initialize SendGrid
function initializeSendGrid() {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    console.log('✅ SendGrid initialized')
    return true
  } catch (error) {
    console.error('❌ Failed to initialize SendGrid:', error.message)
    return false
  }
}

// Test templates for different notification types
const testTemplates = {
  system: {
    subject: 'Test System Notification - Tribe',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test System Notification - Tribe</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Tribe</h1>
        <h2>Test System Notification</h2>
        <p>This is a test email to verify that SendGrid integration is working correctly.</p>
        <p>If you received this email, the email service is properly configured!</p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is a test email from Tribe MVP.</p>
      </body>
      </html>
    `,
    text: `
      Test System Notification - Tribe

      This is a test email to verify that SendGrid integration is working correctly.

      If you received this email, the email service is properly configured!

      ---
      This is a test email from Tribe MVP.
    `
  },

  response: {
    subject: 'Alice responded to your update about Baby Emma',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Response - Tribe</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Tribe</h1>
        <h2>New Response</h2>
        <p><strong>Alice</strong> responded to your update about Baby Emma:</p>
        <blockquote style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 15px; margin: 15px 0;">
          "So adorable! Can't wait to see her again soon! 💕"
        </blockquote>
        <p><a href="#" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Response</a></p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is a test email from Tribe MVP.</p>
      </body>
      </html>
    `,
    text: `
      New Response - Tribe

      Alice responded to your update about Baby Emma:

      "So adorable! Can't wait to see her again soon! 💕"

      View Response: #

      ---
      This is a test email from Tribe MVP.
    `
  },

  prompt: {
    subject: 'Update request about Baby Emma',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Update Request - Tribe</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Tribe</h1>
        <h2>Update Request</h2>
        <p>Someone would love to hear an update about Baby Emma!</p>
        <blockquote style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0;">
          "How is Emma doing? Any new milestones or cute moments to share?"
        </blockquote>
        <p><a href="#" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Share Update</a></p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is a test email from Tribe MVP.</p>
      </body>
      </html>
    `,
    text: `
      Update Request - Tribe

      Someone would love to hear an update about Baby Emma!

      "How is Emma doing? Any new milestones or cute moments to share?"

      Share Update: #

      ---
      This is a test email from Tribe MVP.
    `
  },

  digest: {
    subject: 'Your daily update digest (3 new updates)',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Daily Digest - Tribe</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Tribe</h1>
        <h2>Daily Digest</h2>
        <p>You have 3 new updates from your family and friends.</p>

        <div style="background: white; border-radius: 6px; padding: 15px; margin: 10px 0; border-left: 4px solid #6366f1;">
          <div style="font-weight: 500; margin-bottom: 5px;">Sarah</div>
          <div style="color: #666; font-size: 14px; margin-bottom: 8px;">2 hours ago</div>
          <div>Baby Emma took her first steps today! So exciting! 👶👣</div>
        </div>

        <div style="background: white; border-radius: 6px; padding: 15px; margin: 10px 0; border-left: 4px solid #6366f1;">
          <div style="font-weight: 500; margin-bottom: 5px;">Mike</div>
          <div style="color: #666; font-size: 14px; margin-bottom: 8px;">5 hours ago</div>
          <div>Sleepy baby is having the best nap ever 😴</div>
        </div>

        <div style="background: white; border-radius: 6px; padding: 15px; margin: 10px 0; border-left: 4px solid #6366f1;">
          <div style="font-weight: 500; margin-bottom: 5px;">Lisa</div>
          <div style="color: #666; font-size: 14px; margin-bottom: 8px;">1 day ago</div>
          <div>Emma loved her first taste of bananas! 🍌</div>
        </div>

        <p><a href="#" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View All Updates</a></p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is a test email from Tribe MVP.</p>
      </body>
      </html>
    `,
    text: `
      Daily Digest - Tribe

      You have 3 new updates from your family and friends.

      Sarah - 2 hours ago
      Baby Emma took her first steps today! So exciting! 👶👣

      Mike - 5 hours ago
      Sleepy baby is having the best nap ever 😴

      Lisa - 1 day ago
      Emma loved her first taste of bananas! 🍌

      View All Updates: #

      ---
      This is a test email from Tribe MVP.
    `
  },

  preference: {
    subject: 'Sarah wants to share Baby Emma updates with you',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Update Sharing Invitation - Tribe</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Tribe</h1>
        <h2>You're Invited!</h2>
        <p>Hi there,</p>
        <p><strong>Sarah</strong> would like to share Baby Emma updates with you through Tribe.</p>
        <p>Tribe makes it easy to stay connected with family and friends by sharing baby updates in a private, secure way.</p>
        <p>Click below to set your preferences and start receiving updates!</p>

        <p><a href="#" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Set My Preferences</a></p>

        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #ea580c; font-size: 16px;">What is Tribe?</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #7c2d12;">
            <li>Private and secure sharing</li>
            <li>Customizable notification preferences</li>
            <li>Easy to use interface</li>
            <li>No social media required</li>
          </ul>
        </div>

        <hr>
        <p style="font-size: 12px; color: #666;">This is a test email from Tribe MVP.</p>
      </body>
      </html>
    `,
    text: `
      You're Invited! - Tribe

      Hi there,

      Sarah would like to share Baby Emma updates with you through Tribe.

      Tribe makes it easy to stay connected with family and friends by sharing baby updates in a private, secure way.

      Set your preferences: #

      What is Tribe?
      - Private and secure sharing
      - Customizable notification preferences
      - Easy to use interface
      - No social media required

      ---
      This is a test email from Tribe MVP.
    `
  }
}

// Send test email
async function sendTestEmail(to, type = 'system') {
  const template = testTemplates[type]

  if (!template) {
    console.error(`❌ Unknown email type: ${type}`)
    console.error('Available types:', Object.keys(testTemplates).join(', '))
    process.exit(1)
  }

  const msg = {
    to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: process.env.SENDGRID_FROM_NAME || 'Tribe'
    },
    subject: template.subject,
    html: template.html,
    text: template.text,
    categories: [`tribe-test-${type}`, 'tribe-test'],
    customArgs: {
      testEmail: 'true',
      testType: type,
      timestamp: new Date().toISOString()
    }
  }

  try {
    console.log(`📧 Sending ${type} test email to ${to}...`)
    const [response] = await sgMail.send(msg)

    console.log('✅ Email sent successfully!')
    console.log(`   Status Code: ${response.statusCode}`)
    console.log(`   Message ID: ${response.headers['x-message-id'] || 'N/A'}`)
    console.log(`   Subject: ${template.subject}`)

    return true
  } catch (error) {
    console.error('❌ Failed to send email:', error.message)

    if (error.response) {
      console.error('   Status:', error.response.status)
      console.error('   Body:', JSON.stringify(error.response.body, null, 2))
    }

    return false
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: node scripts/test-email.js <email> [type]')
    console.log('')
    console.log('Available types:')
    Object.keys(testTemplates).forEach(type => {
      console.log(`  - ${type}`)
    })
    process.exit(1)
  }

  const email = args[0]
  const type = args[1] || 'system'

  console.log('🚀 Tribe Email Service Test')
  console.log('=' .repeat(40))

  if (!checkConfiguration()) return
  if (!initializeSendGrid()) return

  await sendTestEmail(email, type)
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error)
    process.exit(1)
  })
}

module.exports = {
  checkConfiguration,
  initializeSendGrid,
  sendTestEmail
}