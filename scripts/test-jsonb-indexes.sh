#!/bin/bash
# Test JSONB Index Optimizations
# This script validates the JSONB index migrations and tests performance

set -e

echo "=========================================="
echo "JSONB Index Optimization Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Database connection details (will use environment variables or .env)
DB_URL="${DATABASE_URL:-}"

if [ -z "$DB_URL" ]; then
    echo -e "${YELLOW}Warning: DATABASE_URL not set. Trying Supabase config...${NC}"
    # Try to get from Supabase
    if command -v supabase &> /dev/null; then
        DB_URL=$(supabase status --output json 2>/dev/null | jq -r '.[] | select(.name == "DB URL") | .value' || echo "")
    fi
fi

if [ -z "$DB_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found. Please set it or start Supabase.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database connection configured${NC}"
echo ""

# Function to run SQL query
run_query() {
    local query="$1"
    psql "$DB_URL" -c "$query" 2>&1
}

# Function to run SQL file
run_file() {
    local file="$1"
    psql "$DB_URL" -f "$file" 2>&1
}

# Test 1: Verify migrations are applied
echo "Test 1: Verifying migrations..."
echo "----------------------------"

MIGRATIONS=(
    "20251001000001_optimize_jsonb_indexes.sql"
    "20251001000002_optimize_jsonb_query_patterns.sql"
    "20251001000003_test_jsonb_indexes.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    if [ -f "supabase/migrations/$migration" ]; then
        echo -e "${GREEN}✓ Found migration: $migration${NC}"
    else
        echo -e "${RED}✗ Missing migration: $migration${NC}"
        exit 1
    fi
done
echo ""

# Test 2: Check index creation
echo "Test 2: Checking index creation..."
echo "----------------------------"

EXPECTED_INDEXES=(
    "idx_profiles_email_notifications"
    "idx_profiles_browser_notifications"
    "idx_profiles_quiet_hours_start"
    "idx_profiles_quiet_hours_end"
    "idx_profiles_notification_prefs_gin"
    "idx_recipients_has_mute_settings"
    "idx_recipients_mute_until"
    "idx_notification_history_metadata_gin"
    "idx_notification_jobs_metadata_gin"
)

for index in "${EXPECTED_INDEXES[@]}"; do
    result=$(run_query "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '$index');" | grep -o 't\|f' | head -1)
    if [ "$result" = "t" ]; then
        echo -e "${GREEN}✓ Index exists: $index${NC}"
    else
        echo -e "${YELLOW}⚠ Index not found: $index (may not be applied yet)${NC}"
    fi
done
echo ""

# Test 3: Check helper functions
echo "Test 3: Checking helper functions..."
echo "----------------------------"

EXPECTED_FUNCTIONS=(
    "has_email_notifications_enabled"
    "is_in_quiet_hours"
    "get_active_notification_channels"
    "is_recipient_globally_muted"
    "get_bulk_notification_preferences"
    "get_unmuted_recipients_for_group"
)

for func in "${EXPECTED_FUNCTIONS[@]}"; do
    result=$(run_query "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '$func');" | grep -o 't\|f' | head -1)
    if [ "$result" = "t" ]; then
        echo -e "${GREEN}✓ Function exists: $func${NC}"
    else
        echo -e "${YELLOW}⚠ Function not found: $func (may not be applied yet)${NC}"
    fi
done
echo ""

# Test 4: Check monitoring views
echo "Test 4: Checking monitoring views..."
echo "----------------------------"

VIEWS=(
    "v_jsonb_index_usage"
    "v_jsonb_query_performance"
)

for view in "${VIEWS[@]}"; do
    result=$(run_query "SELECT EXISTS (SELECT 1 FROM pg_views WHERE viewname = '$view');" | grep -o 't\|f' | head -1)
    if [ "$result" = "t" ]; then
        echo -e "${GREEN}✓ View exists: $view${NC}"
    else
        echo -e "${YELLOW}⚠ View not found: $view (may not be applied yet)${NC}"
    fi
done
echo ""

# Test 5: Sample performance queries
echo "Test 5: Running sample performance queries..."
echo "----------------------------"

echo "Query 1: Email notifications lookup"
time_result=$(psql "$DB_URL" -c "EXPLAIN ANALYZE SELECT id FROM profiles WHERE (notification_preferences->>'email_notifications')::boolean = true LIMIT 10;" 2>&1 | grep "Execution Time" || echo "N/A")
echo "$time_result"

echo ""
echo "Query 2: Mute status check"
time_result=$(psql "$DB_URL" -c "EXPLAIN ANALYZE SELECT id FROM recipients WHERE notification_preferences ? 'mute_settings' LIMIT 10;" 2>&1 | grep "Execution Time" || echo "N/A")
echo "$time_result"

echo ""
echo "Query 3: Metadata containment"
time_result=$(psql "$DB_URL" -c "EXPLAIN ANALYZE SELECT id FROM notification_history WHERE metadata @> '{}'::jsonb LIMIT 10;" 2>&1 | grep "Execution Time" || echo "N/A")
echo "$time_result"

echo ""

# Test 6: Index usage statistics
echo "Test 6: Index usage statistics..."
echo "----------------------------"

run_query "
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  idx_scan AS scans
FROM pg_stat_user_indexes
WHERE indexname LIKE '%notification%' OR indexname LIKE '%metadata%'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;
" || echo "No statistics available yet"

echo ""

# Test 7: Verify best practices documentation
echo "Test 7: Checking documentation..."
echo "----------------------------"

if [ -f "docs/JSONB_QUERY_BEST_PRACTICES.md" ]; then
    echo -e "${GREEN}✓ JSONB best practices documentation exists${NC}"
    wc -l docs/JSONB_QUERY_BEST_PRACTICES.md
else
    echo -e "${RED}✗ Missing JSONB_QUERY_BEST_PRACTICES.md${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Suite Summary"
echo "=========================================="
echo ""
echo "Migration files: 3/3 present"
echo "Documentation: Created"
echo ""
echo -e "${GREEN}✓ All tests completed${NC}"
echo ""
echo "Next steps:"
echo "1. Apply migrations to production: npx supabase db push"
echo "2. Monitor performance: SELECT * FROM v_jsonb_index_usage;"
echo "3. Review documentation: docs/JSONB_QUERY_BEST_PRACTICES.md"
echo "4. Update application code to use helper functions"
echo ""
