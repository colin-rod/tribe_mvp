#!/bin/bash
# Find Database Object References in Codebase
#
# This script searches your codebase for references to database objects
# to help determine if they're actually used.
#
# Usage:
#   chmod +x scripts/find-database-references.sh
#   ./scripts/find-database-references.sh table_name
#   ./scripts/find-database-references.sh function_name
#   ./scripts/find-database-references.sh policy_name

set -e

OBJECT_NAME="${1:-}"

if [ -z "$OBJECT_NAME" ]; then
  echo "Usage: $0 <object_name>"
  echo ""
  echo "Examples:"
  echo "  $0 users"
  echo "  $0 get_user_profile"
  echo "  $0 user_read_policy"
  exit 1
fi

echo "🔍 Searching for references to: $OBJECT_NAME"
echo ""

# Search in source code
echo "📂 Source Code (src/):"
if grep -r "$OBJECT_NAME" src/ 2>/dev/null; then
  echo "✅ Found references in source code"
else
  echo "❌ No references found in source code"
fi
echo ""

# Search for Supabase client calls
echo "🔌 Supabase Client Calls:"
echo "  • from() calls:"
if grep -r "from('$OBJECT_NAME')" src/ 2>/dev/null || grep -r "from(\"$OBJECT_NAME\")" src/ 2>/dev/null; then
  echo "    ✅ Found from() references"
else
  echo "    ❌ No from() references"
fi

echo "  • rpc() calls:"
if grep -r "rpc('$OBJECT_NAME')" src/ 2>/dev/null || grep -r "rpc(\"$OBJECT_NAME\")" src/ 2>/dev/null; then
  echo "    ✅ Found rpc() references"
else
  echo "    ❌ No rpc() references"
fi
echo ""

# Search in migrations
echo "🗄️  Migration Files:"
if grep -r "$OBJECT_NAME" supabase/migrations/ 2>/dev/null; then
  echo "✅ Found in migrations"
else
  echo "❌ Not found in migrations"
fi
echo ""

# Search in tests
echo "🧪 Test Files:"
if grep -r "$OBJECT_NAME" src/**/*.test.* 2>/dev/null || grep -r "$OBJECT_NAME" src/**/__tests__/ 2>/dev/null; then
  echo "✅ Found in tests"
else
  echo "❌ Not found in tests"
fi
echo ""

# Search in API routes
echo "🛣️  API Routes:"
if grep -r "$OBJECT_NAME" src/app/api/ 2>/dev/null || grep -r "$OBJECT_NAME" pages/api/ 2>/dev/null; then
  echo "✅ Found in API routes"
else
  echo "❌ Not found in API routes"
fi
echo ""

# Count total occurrences
TOTAL=$(grep -r "$OBJECT_NAME" src/ supabase/migrations/ 2>/dev/null | wc -l | xargs)
echo "📊 Total References: $TOTAL"
echo ""

if [ "$TOTAL" -eq 0 ]; then
  echo "⚠️  WARNING: No references found anywhere!"
  echo "   This object might be unused and could be a candidate for deprecation."
  echo ""
  echo "   Before removing, verify:"
  echo "   1. Not used in database triggers"
  echo "   2. Not used in RLS policies"
  echo "   3. Not called from external services"
  echo "   4. Not used in scheduled jobs"
else
  echo "✅ Object appears to be in use (found $TOTAL references)"
  echo ""
  echo "   Review the references above to confirm usage."
fi
echo ""

# Provide SQL queries to check database usage
echo "💡 Additional Checks:"
echo ""
echo "   Run these queries in Supabase SQL Editor:"
echo ""
echo "   -- Check if function is used in policies"
echo "   SELECT schemaname, tablename, policyname, qual, with_check"
echo "   FROM pg_policies"
echo "   WHERE qual::text LIKE '%$OBJECT_NAME%' OR with_check::text LIKE '%$OBJECT_NAME%';"
echo ""
echo "   -- Check if function is used in triggers"
echo "   SELECT trigger_schema, event_object_table, trigger_name, action_statement"
echo "   FROM information_schema.triggers"
echo "   WHERE action_statement LIKE '%$OBJECT_NAME%';"
echo ""
echo "   -- Check if table has foreign key references"
echo "   SELECT tc.table_name, tc.constraint_name, ccu.table_name as references_table"
echo "   FROM information_schema.table_constraints tc"
echo "   JOIN information_schema.constraint_column_usage ccu"
echo "     ON tc.constraint_name = ccu.constraint_name"
echo "   WHERE tc.constraint_type = 'FOREIGN KEY'"
echo "     AND (tc.table_name = '$OBJECT_NAME' OR ccu.table_name = '$OBJECT_NAME');"
echo ""
