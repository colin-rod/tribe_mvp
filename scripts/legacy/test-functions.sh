#!/bin/bash

# Get fresh connection details
echo "Getting Supabase connection details..."
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')

echo "Testing functions with fresh credentials..."
echo "API URL: $SUPABASE_URL"
echo "Anon Key: ${ANON_KEY:0:20}..."

# Test 1: Simple function
echo ""
echo "🧪 Test 1: Simple function test"
curl -X POST "$SUPABASE_URL/functions/v1/simple-email-test" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": "421c157f-f4b6-435c-9317-36fa20a22270",
    "recipient_ids": ["7a1b7f77-4317-43aa-a952-619986c20b28"]
  }'

echo ""
echo ""
echo "🧪 Test 2: Debug update fetch"
curl -X POST "$SUPABASE_URL/functions/v1/test-update-fetch" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": "421c157f-f4b6-435c-9317-36fa20a22270"
  }'

echo ""
echo ""
echo "🧪 Test 3: Original email distribution"
curl -X POST "$SUPABASE_URL/functions/v1/distribute-email" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": "421c157f-f4b6-435c-9317-36fa20a22270",
    "recipient_ids": ["7a1b7f77-4317-43aa-a952-619986c20b28"]
  }'

echo ""