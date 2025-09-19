#!/bin/bash

# Fixed email distribution test script

# Your anon key (get from: supabase status)
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Real UUIDs from your database
RECIPIENT_UUID="7a1b7f77-4317-43aa-a952-619986c20b28"
UPDATE_ID="421c157f-f4b6-435c-9317-36fa20a22270"

# Supabase function URL
FUNCTION_URL="http://localhost:54321/functions/v1/distribute-email"

echo "🚀 Testing Email Distribution with Real Data"
echo "============================================"
echo "Update ID: $UPDATE_ID"
echo "Recipient ID: $RECIPIENT_UUID"
echo ""

echo "📧 Sending email distribution request..."

# Test the Edge Function with detailed output
response=$(curl -v -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"update_id\": \"$UPDATE_ID\",
    \"recipient_ids\": [\"$RECIPIENT_UUID\"]
  }" 2>&1)

echo "Full Response:"
echo "$response"
echo ""

echo "📋 Let's check the function logs for more details..."
echo "Run: supabase functions logs distribute-email"
echo ""

echo "🔍 Let's also test a simpler request to see if the function is working:"

# Simple test to check if function is responding
simple_response=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' 2>&1)

echo "Simple test response: $simple_response"