#!/bin/bash

echo "🔍 Getting real test data from your database..."

# Check if Supabase is running
if ! supabase status &> /dev/null; then
    echo "❌ Supabase not running. Please run 'supabase start' first."
    exit 1
fi

echo "📊 Checking what data exists..."

# Get database connection info
DB_URL=$(supabase status | grep "DB URL" | awk '{print $3}')

# Check data counts
psql "$DB_URL" -c "
SELECT
    'Profiles: ' || COUNT(*) as count FROM profiles
UNION ALL
SELECT
    'Children: ' || COUNT(*) FROM children
UNION ALL
SELECT
    'Recipients: ' || COUNT(*) FROM recipients
UNION ALL
SELECT
    'Updates: ' || COUNT(*) FROM updates;
"

echo ""
echo "🎯 Looking for usable test data..."

# Try to get real test data
RESULT=$(psql "$DB_URL" -t -c "
SELECT
    'UPDATE_ID=' || u.id || ' RECIPIENT_IDS=' || string_agg(r.id, ',')
FROM updates u
JOIN recipients r ON r.parent_id = u.parent_id
WHERE r.email IS NOT NULL
    AND r.is_active = true
    AND 'email' = ANY(r.preferred_channels)
    AND u.content IS NOT NULL
GROUP BY u.id
ORDER BY u.created_at DESC
LIMIT 1;
" 2>/dev/null)

if [ -n "$RESULT" ] && [ "$RESULT" != " " ]; then
    echo "✅ Found test data:"
    UPDATE_ID=$(echo "$RESULT" | cut -d' ' -f1 | cut -d'=' -f2)
    RECIPIENT_IDS=$(echo "$RESULT" | cut -d' ' -f2 | cut -d'=' -f2 | tr ',' ' ')

    echo "UPDATE_ID: $UPDATE_ID"
    echo "RECIPIENT_IDS: [$RECIPIENT_IDS]"

    echo ""
    echo "🧪 Testing Edge Function with real data..."

    # Get anon key
    ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
    SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')

    # Format recipient IDs for JSON
    FORMATTED_IDS=$(echo "$RECIPIENT_IDS" | sed 's/\([a-f0-9-]*\)/"\1"/g' | sed 's/ /,/g')

    # Test the Edge Function
    curl -X POST "$SUPABASE_URL/functions/v1/distribute-email" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"update_id\": \"$UPDATE_ID\",
            \"recipient_ids\": [$FORMATTED_IDS]
        }"

    echo ""
    echo ""
    echo "✅ Test completed! Check your email for the message."

else
    echo "❌ No usable test data found."
    echo ""
    echo "🔧 To create test data, run these commands in your app:"
    echo "1. Go through the onboarding flow to create a profile and child"
    echo "2. Add some recipients with email addresses"
    echo "3. Create an update about your child"
    echo ""
    echo "Or run this SQL to create minimal test data:"
    echo ""
    echo "psql \"$DB_URL\" -c \""
    echo "-- Get your profile ID first"
    echo "SELECT 'Your Profile ID: ' || id FROM profiles LIMIT 1;"
    echo ""
    echo "-- Then create test recipient (replace profile-id)"
    echo "INSERT INTO recipients (parent_id, name, email, relationship, preferred_channels, is_active)"
    echo "VALUES ("
    echo "    (SELECT id FROM profiles LIMIT 1),"
    echo "    'Test Recipient',"
    echo "    'colin.rods@gmail.com',"
    echo "    'grandparent',"
    echo "    ARRAY['email'],"
    echo "    true"
    echo ") RETURNING id;"
    echo "\""
fi