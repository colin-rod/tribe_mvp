#!/bin/bash

# Comprehensive test script for email webhook functionality
# Tests all scenarios including attachments, error cases, and edge cases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get Supabase local URL and keys
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')

if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
    echo -e "${RED}Error: Supabase not running. Please run 'supabase start' first.${NC}"
    exit 1
fi

WEBHOOK_URL="${SUPABASE_URL}/functions/v1/email-webhook"

echo -e "${YELLOW}Testing Email Webhook Functionality${NC}"
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Test 1: Memory Email (Happy Path)
echo -e "${YELLOW}Test 1: Memory Email - Happy Path${NC}"
curl -s -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Authorization: Bearer $ANON_KEY" \
  -d 'to=memory@colinrodrigues.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Emma took her first steps!' \
  -d 'text=She walked from the couch to the coffee table! So proud of our little girl!' \
  -d 'html=<p>She walked from the couch to the coffee table!</p>' \
  -d 'attachments=0' \
  -d 'envelope={"from":["parent@example.com"],"to":["memory@colinrodrigues.com"]}' \
  -d 'SPF=pass' | jq '.'
echo ""

# Test 2: Memory Email with Child Specification
echo -e "${YELLOW}Test 2: Memory Email - With Child Name${NC}"
curl -s -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Authorization: Bearer $ANON_KEY" \
  -d 'to=memory@colinrodrigues.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Memory for Emma: First day at daycare' \
  -d 'text=Emma had a great first day! She made friends and loved the playground.' \
  -d 'attachments=0' \
  -d 'envelope={"from":["parent@example.com"],"to":["memory@colinrodrigues.com"]}' \
  -d 'SPF=pass' | jq '.'
echo ""

# Test 3: Update Response Email
echo -e "${YELLOW}Test 3: Update Response Email${NC}"
curl -s -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Authorization: Bearer $ANON_KEY" \
  -d 'to=update-550e8400-e29b-41d4-a716-446655440000@colinrodrigues.com' \
  -d 'from=grandma@example.com' \
  -d 'subject=Re: Emma'\''s First Steps' \
  -d 'text=So wonderful! Can'\''t wait to see her walk more!' \
  -d 'html=<p>So wonderful! Can'\''t wait to see her walk more!</p>' \
  -d 'attachments=0' \
  -d 'envelope={"from":["grandma@example.com"],"to":["update-550e8400-e29b-41d4-a716-446655440000@colinrodrigues.com"]}' \
  -d 'SPF=pass' | jq '.'
echo ""

# Test 4: Email with Attachments (Simulated)
echo -e "${YELLOW}Test 4: Memory Email - With Attachments${NC}"
curl -s -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Authorization: Bearer $ANON_KEY" \
  -d 'to=memory@colinrodrigues.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Emma at the park' \
  -d 'text=Had so much fun at the park today!' \
  -d 'attachments=2' \
  -d 'attachment-info={"photo1.jpg":{"filename":"photo1.jpg","type":"image/jpeg","content":"base64encodedcontent"},"photo2.jpg":{"filename":"photo2.jpg","type":"image/jpeg","content":"base64encodedcontent"}}' \
  -d 'envelope={"from":["parent@example.com"],"to":["memory@colinrodrigues.com"]}' \
  -d 'SPF=pass' | jq '.'
echo ""

# Test 5: Invalid Email Address
echo -e "${YELLOW}Test 5: Unknown Email Type${NC}"
curl -s -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Authorization: Bearer $ANON_KEY" \
  -d 'to=unknown@colinrodrigues.com' \
  -d 'from=someone@example.com' \
  -d 'subject=Random email' \
  -d 'text=This is a random email' \
  -d 'attachments=0' \
  -d 'SPF=pass' | jq '.'
echo ""

# Test 6: Missing Required Fields
echo -e "${YELLOW}Test 6: Missing Required Fields${NC}"
curl -s -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Authorization: Bearer $ANON_KEY" \
  -d 'subject=Test email' \
  -d 'text=This email is missing to and from fields' | jq '.'
echo ""

# Test 7: SPF Failure
echo -e "${YELLOW}Test 7: SPF Authentication Failure${NC}"
curl -s -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Authorization: Bearer $ANON_KEY" \
  -d 'to=memory@colinrodrigues.com' \
  -d 'from=suspicious@example.com' \
  -d 'subject=Suspicious email' \
  -d 'text=This email should fail SPF check' \
  -d 'attachments=0' \
  -d 'SPF=fail' | jq '.'
echo ""

# Test 8: Email Content Cleaning
echo -e "${YELLOW}Test 8: Email Content Cleaning${NC}"
curl -s -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Authorization: Bearer $ANON_KEY" \
  -d 'to=memory@colinrodrigues.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Test content cleaning' \
  -d 'text=This is the actual content.

--
Sent from my iPhone

On Jan 1, 2024, at 12:00 PM, someone@example.com wrote:
> This is quoted content that should be removed' \
  -d 'attachments=0' \
  -d 'envelope={"from":["parent@example.com"],"to":["memory@colinrodrigues.com"]}' \
  -d 'SPF=pass' | jq '.'
echo ""

# Test 9: CORS Preflight
echo -e "${YELLOW}Test 9: CORS Preflight Request${NC}"
curl -s -X OPTIONS "$WEBHOOK_URL" \
  -H "Authorization: Bearer $ANON_KEY" | jq '.'
echo ""

# Test 10: Wrong HTTP Method
echo -e "${YELLOW}Test 10: Wrong HTTP Method${NC}"
curl -s -X GET "$WEBHOOK_URL" \
  -H "Authorization: Bearer $ANON_KEY" | jq '.'
echo ""

echo -e "${GREEN}All tests completed!${NC}"
echo ""
echo -e "${YELLOW}To check the results:${NC}"
echo "1. Check the Supabase logs for processing details"
echo "2. Query the updates table for memory emails"
echo "3. Query the responses table for update responses"
echo "4. Check the database for any created records"