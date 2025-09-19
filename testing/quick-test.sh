#!/bin/bash

# Quick Email Distribution Testing Script
# Fast tests for immediate feedback during development

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🚀 Quick Email Distribution Test"
echo "================================"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_error ".env.local not found. Please create it with your SendGrid API key."
    exit 1
fi

source .env.local

# Test 1: SendGrid API Connection
echo "🔗 Testing SendGrid API..."
if [ "$SENDGRID_API_KEY" = "your_sendgrid_api_key_here" ]; then
    print_warning "SendGrid API key not configured"
else
    response=$(curl -s -w "%{http_code}" -X POST "https://api.sendgrid.com/v3/mail/send" \
        -H "Authorization: Bearer $SENDGRID_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"personalizations\":[{\"to\":[{\"email\":\"test@example.com\"}]}],\"from\":{\"email\":\"$SENDGRID_FROM_EMAIL\"},\"subject\":\"Quick Test\",\"content\":[{\"type\":\"text/plain\",\"value\":\"Test\"}]}" \
        -o /dev/null)

    if [ "$response" = "202" ]; then
        print_success "SendGrid API working"
    else
        print_error "SendGrid API failed (HTTP $response)"
    fi
fi

# Test 2: Generate Email Templates
echo "📧 Generating email templates..."
if node testing/test-email-templates.js > /dev/null 2>&1; then
    print_success "Email templates generated"
    echo "   📁 Check testing/email-outputs/ for preview files"
else
    print_error "Email template generation failed"
fi

# Test 3: Check Supabase Status
echo "🗄️  Checking Supabase..."
if command -v supabase &> /dev/null; then
    if supabase status > /dev/null 2>&1; then
        print_success "Supabase services running"

        # Get connection details
        SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
        echo "   🔗 API URL: $SUPABASE_URL"

        # Quick function test
        echo "⚡ Testing Edge Function..."
        response=$(curl -s -w "%{http_code}" -X POST "$SUPABASE_URL/functions/v1/distribute-email" \
            -H "Content-Type: application/json" \
            -d '{"test":"data"}' -o /dev/null)

        if [ "$response" = "401" ] || [ "$response" = "403" ]; then
            print_success "Edge Function responding (auth required)"
        elif [ "$response" = "400" ] || [ "$response" = "422" ]; then
            print_success "Edge Function responding (validation working)"
        else
            print_warning "Edge Function response: HTTP $response"
        fi
    else
        print_warning "Supabase not running. Run 'supabase start' first."
    fi
else
    print_warning "Supabase CLI not installed"
fi

echo ""
echo "🎯 Quick Test Summary:"
echo "• SendGrid API connection tested"
echo "• Email templates generated"
echo "• Edge Function basic test completed"
echo ""
echo "📋 Next Steps:"
echo "1. Open testing/email-outputs/mobile-preview-test.html to see email previews"
echo "2. Run './testing/run-all-tests.sh' for comprehensive testing"
echo "3. Follow testing/EMAIL_TESTING_GUIDE.md for manual testing"