#!/bin/bash

echo "Starting automated schema fixes..."

# Replace group_memberships table references
echo "1. Replacing group_memberships with recipients..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -exec sed -i '' "s/from('group_memberships')/from('recipients')/g" {} +

# Replace notification_frequency with frequency
echo "2. Replacing notification_frequency with frequency..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -exec sed -i '' 's/notification_frequency/frequency/g' {} +

# Replace group_preferences with digest_preferences
echo "3. Replacing group_preferences with digest_preferences..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -exec sed -i '' 's/group_preferences/digest_preferences/g' {} +

# Replace child_updates with delivery_jobs (common case)
echo "4. Replacing child_updates with delivery_jobs..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -exec sed -i '' "s/from('child_updates')/from('delivery_jobs')/g" {} +

# Remove notification_settings from select queries
echo "5. Removing notification_settings references..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -exec sed -i '' 's/, notification_settings//g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -exec sed -i '' 's/notification_settings, //g' {} +

# Remove access_settings from select queries
echo "6. Removing access_settings references..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -exec sed -i '' 's/, access_settings//g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -exec sed -i '' 's/access_settings, //g' {} +

# Remove last_seen_at references
echo "7. Removing last_seen_at references..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -exec sed -i '' 's/, last_seen_at//g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -exec sed -i '' 's/last_seen_at, //g' {} +

# Replace joined_at with created_at in group membership contexts
echo "8. Replacing joined_at with created_at..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -exec sed -i '' 's/joined_at/created_at/g' {} +

echo "✅ Automated fixes complete!"
echo ""
echo "Next steps:"
echo "1. Execute migrations in Supabase SQL Editor:"
echo "   - supabase/migrations/20251005000002_add_children_columns.sql"
echo "   - supabase/migrations/20251005000003_add_profiles_columns.sql"
echo ""
echo "2. Regenerate Supabase types:"
echo "   npx supabase gen types typescript --project-id advbcfkisejskhskrmqw > src/lib/types/database.types.ts"
echo "   cp src/lib/types/database.types.ts src/lib/types/database.ts"
echo ""
echo "3. Run type check:"
echo "   npx tsc --noEmit"
echo ""
echo "4. Review and manually fix remaining type errors"
