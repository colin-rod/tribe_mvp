#!/usr/bin/env node

/**
 * Test script for AI Analysis Edge Function
 * Run with: node scripts/test-ai-analysis.js
 */

const SUPABASE_URL = 'https://advbcfkisejskhskrmqw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdmJjZmtpc2Vqc2toc2tybXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMjYxNTQsImV4cCI6MjA3MzYwMjE1NH0.PscxgrYSa54u37Nwi08QyTmKs6TEdMEcPYdHUTxLi18'

// Test cases for different types of updates
const testCases = [
  {
    name: "First Steps Milestone",
    data: {
      update_id: "123e4567-e89b-12d3-a456-426614174000",
      content: "Emma took her first steps today! So proud of our little walker!",
      child_age_months: 13,
      milestone_type: "first_steps",
      parent_id: "123e4567-e89b-12d3-a456-426614174001"
    }
  },
  {
    name: "First Words",
    data: {
      update_id: "123e4567-e89b-12d3-a456-426614174002",
      content: "Baby said 'mama' for the first time! My heart is melting ❤️",
      child_age_months: 8,
      milestone_type: "first_words",
      parent_id: "123e4567-e89b-12d3-a456-426614174001"
    }
  },
  {
    name: "Routine Update",
    data: {
      update_id: "123e4567-e89b-12d3-a456-426614174003",
      content: "Had a good nap today, 2 hours! Sleep schedule is getting better.",
      child_age_months: 6,
      parent_id: "123e4567-e89b-12d3-a456-426614174001"
    }
  },
  {
    name: "Funny Moment",
    data: {
      update_id: "123e4567-e89b-12d3-a456-426614174004",
      content: "Caught him trying to eat his own foot again 😂 This kid is hilarious!",
      child_age_months: 4,
      parent_id: "123e4567-e89b-12d3-a456-426614174001"
    }
  },
  {
    name: "Health Concern",
    data: {
      update_id: "123e4567-e89b-12d3-a456-426614174005",
      content: "Emma has been running a fever since yesterday. Keeping an eye on her.",
      child_age_months: 18,
      parent_id: "123e4567-e89b-12d3-a456-426614174001"
    }
  }
]

async function testEdgeFunction() {
  console.log('🧪 Testing AI Analysis Edge Function')
  console.log('=====================================\\n')

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`)
    console.log(`Content: "${testCase.data.content}"`)
    console.log(`Age: ${testCase.data.child_age_months} months`)
    console.log('---')

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-analyze-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data)
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ Success!')
        console.log('Keywords:', result.analysis.keywords)
        console.log('Emotional tone:', result.analysis.emotional_tone)
        console.log('Importance level:', result.analysis.importance_level)
        console.log('Suggested recipient types:', result.analysis.suggested_recipient_types)
        console.log('Confidence score:', result.analysis.confidence_score)
        console.log('Suggested recipients count:', result.suggested_recipients?.length || 0)
      } else {
        console.log('❌ Failed!')
        console.log('Error:', result.error)
      }
    } catch (error) {
      console.log('❌ Network Error!')
      console.log('Error:', error.message)
    }

    console.log('\\n' + '='.repeat(50) + '\\n')
  }
}

// Test CORS preflight
async function testCORS() {
  console.log('🔄 Testing CORS...')

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-analyze-update`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type'
      }
    })

    if (response.ok) {
      console.log('✅ CORS preflight successful')
    } else {
      console.log('❌ CORS preflight failed')
    }
  } catch (error) {
    console.log('❌ CORS test error:', error.message)
  }
  console.log('')
}

// Test invalid requests
async function testValidation() {
  console.log('🔍 Testing input validation...')

  const invalidCases = [
    {
      name: "Missing required fields",
      data: { update_id: "test" }
    },
    {
      name: "Invalid age",
      data: {
        update_id: "test",
        content: "test content",
        child_age_months: -1,
        parent_id: "test"
      }
    }
  ]

  for (const testCase of invalidCases) {
    console.log(`Testing: ${testCase.name}`)

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-analyze-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data)
      })

      const result = await response.json()

      if (!result.success) {
        console.log('✅ Correctly rejected invalid input')
        console.log('Error:', result.error)
      } else {
        console.log('❌ Should have rejected invalid input')
      }
    } catch (error) {
      console.log('❌ Network Error:', error.message)
    }
    console.log('')
  }
}

// Main execution
async function main() {
  await testCORS()
  await testValidation()
  await testEdgeFunction()

  console.log('🎉 Testing complete!')
  console.log('\\nNext steps:')
  console.log('1. Set OpenAI API key: supabase secrets set OPENAI_API_KEY=your-key')
  console.log('2. Ensure database has recipients data for testing')
  console.log('3. Test with real update data from your application')
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { testEdgeFunction, testCORS, testValidation }