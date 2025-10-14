#!/bin/bash

# Script to check table usage in codebase
# Generated during backend audit

TABLES=(
  "ai_prompts"
  "children"
  "comments"
  "data_deletion_audit"
  "data_export_jobs"
  "delivery_jobs"
  "digest_queue"
  "digest_schedules"
  "invitation_redemptions"
  "invitations"
  "likes"
  "memories"
  "notification_delivery_logs"
  "notification_history"
  "notification_jobs"
  "notification_preferences_cache"
  "profiles"
  "prompt_suggestions"
  "prompt_templates"
  "recipient_groups"
  "recipients"
  "responses"
  "search_analytics"
  "summaries"
  "summary_memories"
  "template_analytics"
  "user_metadata_values"
)

echo "=== Table Usage Report ==="
echo ""

for table in "${TABLES[@]}"; do
  count=$(grep -r "from('$table')" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | xargs)
  if [ "$count" -eq 0 ]; then
    echo "❌ $table - NOT FOUND (0 references)"
  elif [ "$count" -lt 3 ]; then
    echo "⚠️  $table - LOW USAGE ($count references)"
  else
    echo "✅ $table - USED ($count references)"
  fi
done
