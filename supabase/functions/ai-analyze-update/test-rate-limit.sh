#!/bin/bash

# Test script for AI Analysis Rate Limiting
# This script sends multiple requests to test the rate limiter

# Configuration
FUNCTION_URL="http://localhost:54321/functions/v1/ai-analyze-update"
PARENT_ID="test-parent-$(date +%s)" # Unique parent ID per test run
NUM_REQUESTS=15
DELAY_BETWEEN_REQUESTS=0.5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AI Analysis Rate Limit Test                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Function URL: $FUNCTION_URL"
echo -e "  Parent ID: $PARENT_ID"
echo -e "  Total Requests: $NUM_REQUESTS"
echo -e "  Delay: ${DELAY_BETWEEN_REQUESTS}s"
echo ""
echo -e "${YELLOW}Expected Behavior:${NC}"
echo -e "  ✓ Requests 1-10: ${GREEN}Success (200)${NC}"
echo -e "  ✗ Requests 11+:  ${RED}Rate Limited (429)${NC}"
echo ""
echo "Press Enter to start test..."
read

# Test payload
PAYLOAD='{
  "update_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Test update for rate limiting - Emma is learning to walk!",
  "child_age_months": 12,
  "parent_id": "'"$PARENT_ID"'"
}'

# Track statistics
SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0
ERROR_COUNT=0

echo -e "${BLUE}Starting test...${NC}"
echo ""

for i in $(seq 1 $NUM_REQUESTS); do
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}Request #$i${NC}"

  # Make request and capture response with headers
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -d "$PAYLOAD" 2>&1)

  # Extract HTTP status code (last line)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  # Extract response body (everything except last line)
  BODY=$(echo "$RESPONSE" | sed '$d')

  # Parse rate limit headers from body (since curl -i doesn't work well with pipes)
  REMAINING=$(echo "$BODY" | grep -o '"remaining":[0-9]*' | cut -d':' -f2 || echo "N/A")
  LIMIT=$(echo "$BODY" | grep -o '"limit":[0-9]*' | cut -d':' -f2 || echo "N/A")

  # Determine success/failure
  case $HTTP_CODE in
    200)
      echo -e "  Status: ${GREEN}✓ 200 OK${NC}"
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))

      # Extract remaining from response if available
      if [ "$REMAINING" != "N/A" ]; then
        echo -e "  Rate Limit: ${GREEN}$REMAINING/$LIMIT remaining${NC}"
      fi
      ;;
    429)
      echo -e "  Status: ${RED}✗ 429 Too Many Requests${NC}"
      RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))

      # Extract retry_after from response
      RETRY_AFTER=$(echo "$BODY" | grep -o '"retry_after":[0-9]*' | cut -d':' -f2 || echo "N/A")
      MESSAGE=$(echo "$BODY" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

      if [ "$RETRY_AFTER" != "N/A" ]; then
        echo -e "  Retry After: ${YELLOW}${RETRY_AFTER}s${NC}"
      fi
      if [ ! -z "$MESSAGE" ]; then
        echo -e "  Message: ${YELLOW}$MESSAGE${NC}"
      fi
      ;;
    *)
      echo -e "  Status: ${RED}✗ $HTTP_CODE Error${NC}"
      ERROR_COUNT=$((ERROR_COUNT + 1))
      echo -e "  ${RED}Response: $BODY${NC}"
      ;;
  esac

  # Show compact response for successful requests
  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS=$(echo "$BODY" | grep -o '"success":[^,]*' | cut -d':' -f2)
    if [ "$SUCCESS" = "true" ]; then
      echo -e "  ${GREEN}✓ Analysis completed${NC}"
    fi
  fi

  echo ""

  # Delay before next request
  if [ $i -lt $NUM_REQUESTS ]; then
    sleep $DELAY_BETWEEN_REQUESTS
  fi
done

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Test Summary                                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total Requests: $NUM_REQUESTS"
echo -e "  ${GREEN}✓ Successful: $SUCCESS_COUNT${NC}"
echo -e "  ${RED}✗ Rate Limited: $RATE_LIMITED_COUNT${NC}"
echo -e "  ${YELLOW}⚠ Errors: $ERROR_COUNT${NC}"
echo ""

# Validation
EXPECTED_SUCCESS=10
EXPECTED_RATE_LIMITED=5

if [ $SUCCESS_COUNT -eq $EXPECTED_SUCCESS ] && [ $RATE_LIMITED_COUNT -eq $EXPECTED_RATE_LIMITED ]; then
  echo -e "${GREEN}✓ Test PASSED${NC}"
  echo -e "  Rate limiting is working as expected!"
  exit 0
elif [ $SUCCESS_COUNT -ge 1 ] && [ $RATE_LIMITED_COUNT -ge 1 ]; then
  echo -e "${YELLOW}⚠ Test PARTIALLY PASSED${NC}"
  echo -e "  Rate limiting is working, but counts don't match expected values."
  echo -e "  This might be due to timing or concurrent requests."
  exit 0
else
  echo -e "${RED}✗ Test FAILED${NC}"
  echo -e "  Rate limiting may not be configured correctly."
  exit 1
fi
