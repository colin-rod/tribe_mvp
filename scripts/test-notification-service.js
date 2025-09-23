#!/usr/bin/env node

/**
 * Test script for NotificationService email integration
 *
 * This script tests the integration between NotificationService
 * and the SendGrid email service.
 *
 * Usage:
 *   node scripts/test-notification-service.js <email>
 *
 * Example:
 *   node scripts/test-notification-service.js test@example.com
 */

require('dotenv').config({ path: '.env.local' })

// Mock Supabase client since we're testing email functionality
const mockSupabaseClient = {
  from: () => ({
    insert: () => ({
      select: () => ({
        single: async () => ({
          data: {
            id: 'test-notification-id',
            user_id: 'test-user-id',
            type: 'system',
            title: 'Test Notification',
            content: 'Test notification content',
            metadata: {},
            delivery_method: 'email',
            delivery_status: 'sent',
            created_at: new Date().toISOString(),
            sent_at: new Date().toISOString()
          },
          error: null
        })
      })
    })
  })
}

// Mock the Supabase module
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

// Import the email service and notification service
const { emailService } = require('../src/lib/services/emailService.ts')

async function testEmailServiceStatus() {
  console.log('📊 Checking email service status...')

  const status = emailService.getStatus()
  console.log('   Configuration Status:', status)

  if (!status.configured) {
    console.error('❌ Email service not properly configured')
    return false
  }

  console.log('✅ Email service is properly configured')
  return true
}

async function testEmailDelivery(email) {
  console.log(`📧 Testing email delivery to ${email}...`)

  try {
    const result = await emailService.sendTestEmail(email, 'system')

    if (result.success) {
      console.log('✅ Test email sent successfully!')
      console.log(`   Message ID: ${result.messageId}`)
      console.log(`   Status Code: ${result.statusCode}`)
      return true
    } else {
      console.error('❌ Test email failed:', result.error)
      return false
    }
  } catch (error) {
    console.error('❌ Test email error:', error.message)
    return false
  }
}

async function testAllEmailTypes(email) {
  console.log('📧 Testing all email template types...')

  const types = ['system', 'response', 'prompt', 'digest', 'preference']
  const results = []

  for (const type of types) {
    try {
      console.log(`   Testing ${type} template...`)
      const result = await emailService.sendTestEmail(email, type)

      if (result.success) {
        console.log(`   ✅ ${type} template sent successfully (${result.messageId})`)
        results.push({ type, success: true, messageId: result.messageId })
      } else {
        console.log(`   ❌ ${type} template failed: ${result.error}`)
        results.push({ type, success: false, error: result.error })
      }

      // Small delay between emails to be nice to SendGrid
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.log(`   ❌ ${type} template error: ${error.message}`)
      results.push({ type, success: false, error: error.message })
    }
  }

  const successful = results.filter(r => r.success).length
  console.log(`📊 Template test results: ${successful}/${types.length} successful`)

  return results
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: node scripts/test-notification-service.js <email>')
    process.exit(1)
  }

  const email = args[0]

  console.log('🚀 Tribe Notification Service Test')
  console.log('=' .repeat(50))
  console.log(`📧 Target email: ${email}`)
  console.log('')

  // Test email service status
  if (!(await testEmailServiceStatus())) {
    process.exit(1)
  }

  console.log('')

  // Test basic email delivery
  if (!(await testEmailDelivery(email))) {
    process.exit(1)
  }

  console.log('')

  // Test all email template types
  const results = await testAllEmailTypes(email)

  console.log('')
  console.log('🎉 All tests completed!')
  console.log('📧 Check your email inbox for the test messages.')

  const failedTests = results.filter(r => !r.success)
  if (failedTests.length > 0) {
    console.log('')
    console.log('⚠️  Some tests failed:')
    failedTests.forEach(test => {
      console.log(`   - ${test.type}: ${test.error}`)
    })
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error)
    process.exit(1)
  })
}