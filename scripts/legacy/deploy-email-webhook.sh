#!/bin/bash

# Deploy Email Webhook to Supabase Edge Functions
# This script helps deploy the standalone email webhook

echo "🚀 Deploying Email Webhook to Supabase..."
echo "============================================"

# Check if we're in the right directory
if [ ! -f "email-webhook-standalone.ts" ]; then
    echo "❌ Error: email-webhook-standalone.ts not found!"
    echo "   Make sure you're in the project root directory."
    exit 1
fi

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found!"
    echo "   Install it with: npm install -g supabase"
    exit 1
fi

# Create the edge function directory structure
echo "📁 Creating edge function directory structure..."
mkdir -p supabase/functions/email-webhook-new

# Copy the standalone file as index.ts
echo "📋 Copying standalone webhook code..."
cp email-webhook-standalone.ts supabase/functions/email-webhook-new/index.ts

# Deploy the function
echo "🚀 Deploying to Supabase..."
supabase functions deploy email-webhook-new

if [ $? -eq 0 ]; then
    echo "✅ Email webhook deployed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Update your SendGrid webhook URL to point to the new function"
    echo "2. Test the webhook with a sample email"
    echo "3. Check the Supabase logs for debugging info"
    echo ""
    echo "🔧 Function URL should be:"
    echo "   https://[your-project-id].supabase.co/functions/v1/email-webhook-new"
else
    echo "❌ Deployment failed!"
    echo "   Check the error messages above for details."
    exit 1
fi

# Clean up temporary files
echo "🧹 Cleaning up..."
rm -rf supabase/functions/email-webhook-new

echo ""
echo "🎉 Deployment complete!"