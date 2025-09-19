#!/bin/bash

# Test script for email webhook

echo "Testing Memory Email..."
curl -X POST 'http://127.0.0.1:54321/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  -d 'to=memory@colinrodrigues.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Emma took her first steps!' \
  -d 'text=She walked from the couch to the coffee table! So proud of our little girl!' \
  -d 'html=<p>She walked from the couch to the coffee table!</p>' \
  -d 'attachments=0' \
  -d 'envelope={"from":["parent@example.com"],"to":["memory@colinrodrigues.com"]}' \
  -d 'SPF=pass'

echo -e "\n\nTesting Update Response Email..."
curl -X POST 'http://127.0.0.1:54321/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  -d 'to=update-550e8400-e29b-41d4-a716-446655440000@colinrodrigues.com' \
  -d 'from=grandma@example.com' \
  -d 'subject=Re: Emma'\''s First Steps' \
  -d 'text=So wonderful! Can'\''t wait to see her walk more!' \
  -d 'html=<p>So wonderful! Can'\''t wait to see her walk more!</p>' \
  -d 'attachments=0' \
  -d 'envelope={"from":["grandma@example.com"],"to":["update-550e8400-e29b-41d4-a716-446655440000@colinrodrigues.com"]}' \
  -d 'SPF=pass'

echo -e "\n\nTesting Unknown Email Type..."
curl -X POST 'http://127.0.0.1:54321/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  -d 'to=unknown@colinrodrigues.com' \
  -d 'from=someone@example.com' \
  -d 'subject=Random email' \
  -d 'text=This is a random email' \
  -d 'attachments=0' \
  -d 'SPF=pass'