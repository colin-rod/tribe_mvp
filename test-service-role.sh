#!/bin/bash

echo "Testing with service role key..."

# Get the service role key
SERVICE_ROLE_KEY=$(supabase status | grep 'service_role key' | awk '{print $3}')
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')

echo "Service Role Key: ${SERVICE_ROLE_KEY:0:20}..."

# Test the debug function with service role key
curl -X POST "$SUPABASE_URL/functions/v1/test-update-fetch" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": "421c157f-f4b6-435c-9317-36fa20a22270"
  }'

echo ""