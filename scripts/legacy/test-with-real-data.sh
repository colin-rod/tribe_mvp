#!/bin/bash

echo "Testing with REAL data from database..."

# Using actual UUIDs from the Supabase dashboard
REAL_UPDATE_ID="550e8400-e29b-41d4-a716-446655444400"
REAL_RECIPIENT_ID="7a1b7f77-4317-43aa-a952-619986c20b28"

echo "Update ID: $REAL_UPDATE_ID"
echo "Recipient ID: $REAL_RECIPIENT_ID"

# Get connection details
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')

# Test the email distribution with REAL data
curl -X POST "$SUPABASE_URL/functions/v1/distribute-email" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"update_id\": \"$REAL_UPDATE_ID\",
    \"recipient_ids\": [\"$REAL_RECIPIENT_ID\"]
  }"

echo ""