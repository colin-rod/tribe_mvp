#!/bin/bash

# Corrected email distribution test script
# Tests the actual Edge Function with real database UUIDs

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

# Test the Edge Function with correct parameters
response=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"update_id\": \"$UPDATE_ID\",
    \"recipient_ids\": [\"$RECIPIENT_UUID\"]
  }")

# Parse response
http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | head -n -1)

echo "Response Code: $http_code"
echo "Response Body: $response_body"
echo ""

if [ "$http_code" = "200" ]; then
    echo "✅ SUCCESS! Email sent successfully!"
    echo "Check your email inbox for the message."

    # Parse the JSON response for more details
    if command -v jq &> /dev/null; then
        echo ""
        echo "📊 Distribution Details:"
        echo "$response_body" | jq '.'
    fi

elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    echo "❌ AUTHENTICATION ERROR"
    echo "Please check your anon key is correct."
    echo "Run 'supabase status' to get the current anon key."

elif [ "$http_code" = "500" ]; then
    echo "❌ SERVER ERROR"
    echo "Check the Edge Function logs:"
    echo "supabase functions logs distribute-email"

else
    echo "⚠️  UNEXPECTED RESPONSE"
    echo "HTTP Code: $http_code"
    echo "Response: $response_body"
fi

echo ""
echo "📋 Next Steps:"
echo "1. If successful, check your email inbox"
echo "2. Check delivery status in the dashboard"
echo "3. View function logs: supabase functions logs distribute-email"
echo "4. Check database: SELECT * FROM delivery_jobs ORDER BY created_at DESC;"